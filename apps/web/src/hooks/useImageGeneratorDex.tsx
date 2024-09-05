import { galadriel } from '@/wagmi';
import { useState, useCallback, useEffect } from 'react';
import {
  createPublicClient,
  http,
  createWalletClient,
  custom,
  parseAbi,
} from 'viem';

const contractABI = parseAbi([
  'function initializeDalleCall(string memory message) public returns (uint)',
  'function lastResponse() public view returns (string)',
]);

const contractAddress = '0x307f7A1f57221931fEbB4ba64d9D1ca7B73d2453';

export function useImageGeneratorDex() {
  const [images, setImages] = useState<Record<number, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
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

  const generateImage = useCallback(
    async (stepIndex: number, prompt: string) => {
      if (!publicClient || !walletClient) {
        console.error('Clients not initialized');
        return null;
      }

      setIsGenerating(true);

      try {
        const [address] = await walletClient.getAddresses();

        const { request } = await publicClient.simulateContract({
          address: contractAddress,
          abi: contractABI,
          functionName: 'initializeDalleCall',
          args: [prompt],
          account: address,
        });

        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });

        let lastResponse = '';
        let newResponse = lastResponse;

        while (newResponse === lastResponse) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const result = await publicClient.readContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'lastResponse',
          });
          newResponse = result as string;
        }

        setImages((prevImages) => ({
          ...prevImages,
          [stepIndex]: newResponse,
        }));

        return newResponse;
      } catch (error) {
        console.error('Error generating image:', error);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [publicClient, walletClient]
  );

  return {
    images,
    isGenerating,
    generateImage,
  };
}
