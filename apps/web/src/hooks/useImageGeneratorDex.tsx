import { galadriel } from '@/wagmi';
import { useState, useCallback, useEffect } from 'react';
import { createPublicClient, http, parseAbi } from 'viem';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';

const contractABI = parseAbi([
  'function initializeDalleCall(string memory message) public returns (uint)',
  'function getLastResponse() public view returns (string memory, bool)',
  'function getResponseById(uint callId) public view returns (string memory, bool)',
  'event NewResponseReceived(uint indexed callId, string response)',
]);

const contractAddress = '0xE8AeB4006CAB2cA6f42152Cf7aD42b147c378B5A';

export function useImageGeneratorDex(initialMessageId?: string) {
  const { address } = useAccount();
  const [images, setImages] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [publicClient, setPublicClient] = useState<ReturnType<
    typeof createPublicClient
  > | null>(null);
  const [currentMessageId, setCurrentMessageId] = useState<string | undefined>(
    initialMessageId
  );
  const [currentCallId, setCurrentCallId] = useState<number | null>(null);

  const { writeContract, data: writeData } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: writeData,
      chainId: galadriel.id,
    });

  useEffect(() => {
    const newPublicClient = createPublicClient({
      chain: galadriel,
      transport: http(),
    });
    setPublicClient(newPublicClient);
  }, []);

  const checkExistingImage = useCallback(
    async (messageId: string): Promise<string | null> => {
      try {
        const response = await fetch(`/api/check-image?messageId=${messageId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.imageUrl) {
            setImages((prevImages) => ({
              ...prevImages,
              [messageId]: data.imageUrl,
            }));
            return data.imageUrl;
          }
        }
        return null;
      } catch (error) {
        console.error('Error checking existing image:', error);
        return null;
      }
    },
    []
  );

  const saveImageToDatabase = async (messageId: string, imageUrl: string) => {
    try {
      await fetch('/api/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, imageUrl }),
      });
    } catch (error) {
      console.error('Error saving image to database:', error);
    }
  };

  const generateImage = useCallback(
    async (messageId: string, prompt: string) => {
      setCurrentMessageId(messageId);

      // Check for existing image first
      const existingImage = await checkExistingImage(messageId);
      if (existingImage) {
        setImages((prevImages) => ({
          ...prevImages,
          [messageId]: existingImage,
        }));
        setGenerationStatus('Existing image found');
        return existingImage;
      }

      if (!publicClient) {
        console.error('Public client not initialized');
        return null;
      }

      setIsGenerating(true);
      setGenerationStatus('Initializing image generation...');

      try {
        // Capture the initial response
        const initialResponse = (await publicClient.readContract({
          address: contractAddress,
          abi: contractABI,
          functionName: 'getLastResponse',
          account: address,
        })) as [string, boolean];

        setGenerationStatus('Sending transaction...');
        await writeContract({
          address: contractAddress,
          abi: contractABI,
          functionName: 'initializeDalleCall',
          args: [prompt],
        });

        setGenerationStatus('Waiting for transaction confirmation...');
        // Wait for confirmation is handled by useWaitForTransaction hook

        setGenerationStatus(
          'Transaction confirmed. Waiting for image generation...'
        );

        // Function to check for response
        const checkForResponse = async (): Promise<string> => {
          const [response, isReady] = (await publicClient.readContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'getLastResponse',
            account: address,
          })) as [string, boolean];

          console.log({ isReady, response, initialResponse });
          if (isReady && response !== '' && response !== initialResponse[0]) {
            return response;
          }
          throw new Error('Response not ready');
        };

        // Wait for the response using polling
        return new Promise<string>((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 60; // 5 minutes total (60 * 5 seconds)

          const pollingInterval = setInterval(async () => {
            attempts++;
            setGenerationStatus(
              `Checking for image... Attempt ${attempts}/${maxAttempts}`
            );
            try {
              const response = await checkForResponse();
              clearInterval(pollingInterval);
              setImages((prevImages) => ({
                ...prevImages,
                [messageId]: response,
              }));
              await saveImageToDatabase(messageId, response);
              setGenerationStatus('Image generated successfully!');
              setIsGenerating(false);
              resolve(response);
            } catch (error) {
              if (attempts >= maxAttempts) {
                clearInterval(pollingInterval);
                setGenerationStatus(
                  'Image generation timed out. Please try again.'
                );
                setIsGenerating(false);
                reject(new Error('Timeout waiting for image generation'));
              }
            }
          }, 5000); // Poll every 5 seconds
        });
      } catch (error) {
        console.error('Error generating image:', error);
        setGenerationStatus('Error generating image. Please try again.');
        setIsGenerating(false);
        return null;
      }
    },
    [publicClient, writeContract, address, checkExistingImage]
  );

  return {
    images,
    isGenerating,
    generateImage,
    checkExistingImage,
    generationStatus,
    setCurrentMessageId,
    currentCallId,
    isConfirming,
    isConfirmed,
  };
}
