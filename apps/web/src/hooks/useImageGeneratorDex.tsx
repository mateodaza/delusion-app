import { galadriel } from '@/wagmi';
import { useState, useCallback, useEffect } from 'react';
import {
  createPublicClient,
  http,
  createWalletClient,
  custom,
  parseAbi,
} from 'viem';
import { kv } from '@vercel/kv';

const contractABI = parseAbi([
  'function initializeDalleCall(string memory message) public returns (uint)',
  'function getLastResponse() public view returns (string, bool)',
  'event NewResponseReceived(string response)',
]);

const contractAddress = '0xCc10E4380994BD5e0E88b34D5d5234919A24A470';

export function useImageGeneratorDex() {
  const [images, setImages] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [publicClient, setPublicClient] = useState<ReturnType<
    typeof createPublicClient
  > | null>(null);
  const [walletClient, setWalletClient] = useState<ReturnType<
    typeof createWalletClient
  > | null>(null);

  useEffect(() => {
    const initializeClients = async () => {
      if (typeof window.ethereum !== 'undefined') {
        const newPublicClient = createPublicClient({
          chain: galadriel,
          transport: http(),
        });

        const newWalletClient = createWalletClient({
          chain: galadriel,
          transport: custom(window.ethereum),
        });

        setPublicClient(newPublicClient);
        setWalletClient(newWalletClient);
      } else {
        console.error(
          'Ethereum object not found, do you have MetaMask installed?'
        );
      }
    };

    initializeClients();
  }, []);

  const checkExistingImage = async (
    messageId: string
  ): Promise<string | null> => {
    try {
      const existingImage = await kv.get<string>(`image:${messageId}`);
      return existingImage || null;
    } catch (error) {
      console.error('Error checking existing image:', error);
      return null;
    }
  };

  const saveImageToDatabase = async (messageId: string, imageUrl: string) => {
    try {
      await kv.set(`image:${messageId}`, imageUrl);
    } catch (error) {
      console.error('Error saving image to database:', error);
    }
  };

  const generateImage = useCallback(
    async (messageId: string, prompt: string) => {
      if (!publicClient || !walletClient) {
        console.error('Clients not initialized');
        return null;
      }

      // Check if image already exists in the database
      const existingImage = await checkExistingImage(messageId);
      if (existingImage) {
        setImages((prevImages) => ({
          ...prevImages,
          [messageId]: existingImage,
        }));
        return existingImage;
      }

      setIsGenerating(true);
      setGenerationStatus('Initializing image generation...');

      try {
        const [address] = await walletClient.getAddresses();

        setGenerationStatus('Simulating contract call...');
        const { request } = await publicClient.simulateContract({
          address: contractAddress,
          abi: contractABI,
          functionName: 'initializeDalleCall',
          args: [prompt],
          account: address,
        });

        setGenerationStatus('Sending transaction...');
        const hash = await walletClient.writeContract(request);

        setGenerationStatus('Waiting for transaction confirmation...');
        await publicClient.waitForTransactionReceipt({ hash });

        setGenerationStatus(
          'Transaction confirmed. Waiting for image generation...'
        );

        // Function to check for response
        const checkForResponse = async (): Promise<string> => {
          const [response, isReady] = (await publicClient.readContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'getLastResponse',
          })) as [string, boolean];

          if (isReady && response !== '') {
            return response;
          }
          throw new Error('Response not ready');
        };

        // Wait for the response using both event and polling
        return new Promise<string>((resolve, reject) => {
          let resolved = false;
          let attempts = 0;
          const maxAttempts = 60; // 5 minutes total (60 * 5 seconds)

          const unwatch = publicClient.watchContractEvent({
            address: contractAddress,
            abi: contractABI,
            eventName: 'NewResponseReceived',
            onLogs: async (logs) => {
              if (!resolved) {
                resolved = true;
                unwatch();
                clearInterval(pollingInterval);
                console.log({ logs });
                const response = logs[0].args.response as string;
                setImages((prevImages) => ({
                  ...prevImages,
                  [messageId]: response,
                }));
                await saveImageToDatabase(messageId, response);
                setGenerationStatus('Image generated successfully!');
                setIsGenerating(false);
                resolve(response);
              }
            },
          });

          // Polling as a backup
          const pollingInterval = setInterval(async () => {
            attempts++;
            setGenerationStatus(
              `Checking for image... Attempt ${attempts}/${maxAttempts}`
            );
            try {
              const response = await checkForResponse();
              if (!resolved) {
                resolved = true;
                unwatch();
                clearInterval(pollingInterval);
                setImages((prevImages) => ({
                  ...prevImages,
                  [messageId]: response,
                }));
                await saveImageToDatabase(messageId, response);
                setGenerationStatus('Image generated successfully!');
                setIsGenerating(false);
                resolve(response);
              }
            } catch (error) {
              if (attempts >= maxAttempts) {
                unwatch();
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
    [publicClient, walletClient]
  );

  return {
    images,
    isGenerating,
    generateImage,
    generationStatus,
  };
}
