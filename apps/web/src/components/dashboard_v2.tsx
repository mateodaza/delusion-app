import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  usePublicClient,
  useWaitForTransactionReceipt,
} from 'wagmi';
import {
  Terminal,
  Send,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Apple,
  LightbulbIcon,
  Computer,
  Flame,
  BarChart2,
} from 'lucide-react';
import { Tooltip, TooltipProvider } from '@/shadcn/tooltip';
import { TooltipContent, TooltipTrigger } from '@radix-ui/react-tooltip';
import useTheme from '@/hooks/useTheme';
import { useGameState } from '@/hooks/useGameState';
import SentimentGauge from './sentimentGauge';
import { galadriel } from '@/wagmi';

interface Message {
  role: string;
  content: Array<{ contentType: string; value: string }>;
}

type LoadingState = 'idle' | 'sending' | 'mining' | 'fetching' | 'ready';

interface ChatHistoryItem {
  id: string;
  owner: string;
  timestamp: string;
}

const Dashboard = ({ ABI, ADDRESS }: { ABI: any; ADDRESS: `0x${string}` }) => {
  const [chatId, setChatId] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [customScenario, setCustomScenario] = useState('');
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false);
  const [images, setImages] = useState<{ [key: string]: string }>({});
  const [lastFetchedMessageIndex, setLastFetchedMessageIndex] =
    useState<number>(-1);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');

  const [loading, setIsLoading] = useState(false);

  const { isCyanTheme, toggleTheme } = useTheme();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const {
    data: messageHistory,
    refetch: refetchMessages,
    isLoading: messageHistoryLoading,
  } = useReadContract({
    address: ADDRESS,
    abi: ABI,
    functionName: 'getMessageHistory',
    args: chatId ? [BigInt(chatId)] : undefined,
  }) as any;

  const {
    currentStep,
    totalSteps,
    goToPreviousStep,
    goToNextStep,
    isFirstStep,
    isLastStep,
  } = useGameState(messageHistory, chatId);
  useEffect(() => {
    console.log('Updated images:', images);
  }, [images]);
  const { data: imageData, refetch: refetchImages } = useReadContract({
    address: ADDRESS,
    abi: ABI,
    functionName: 'getAllChatImages',
    args: chatId
      ? [BigInt(chatId), BigInt(messageHistory?.length - 1 || 0)]
      : undefined,
  }) as any;

  console.log('Chat ID:', chatId);
  console.log('Message History Length:', messageHistory?.length);
  console.log('Raw imageData:', imageData);

  if (imageData) {
    const [indices, urls, count] = imageData;
    console.log('Image count from getAllChatImages:', count);
    console.log('Indices:', indices);
    console.log('URLs:', urls);
  }

  const { data: imageCount } = useReadContract({
    address: ADDRESS,
    abi: ABI,
    functionName: 'getImageCount',
    args: chatId ? [BigInt(chatId)] : undefined,
  }) as any;

  console.log('Image Count from getImageCount:', imageCount);

  const {
    data: hash,
    isPending: txIsPending,
    writeContract,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
      chainId: galadriel.id,
    });

  const isLoading =
    loading || isConfirming || messageHistoryLoading || txIsPending;

  useEffect(() => {
    if (isConfirmed && isCreatingNewChat) {
      fetchLatestChat().then(() => {
        setIsCreatingNewChat(false);
      });
    }
  }, [isConfirmed, isCreatingNewChat]);

  useEffect(() => {
    if (isConfirmed && hash) {
      setLoadingState('fetching');
      fetchLatestChat();
    }
  }, [isConfirmed, hash]);

  useEffect(() => {
    if (messageHistory && messageHistory.length >= 3 && currentStep.gameState) {
      setLoadingState('ready');
    }
  }, [messageHistory, currentStep.gameState]);

  useEffect(() => {
    fetchAndUpdateImages();
  }, [messageHistory, currentStep, chatId]);

  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!address) {
        setChatHistory([]);
        return;
      }
      try {
        setIsLoading(true);
        const logs: any = await publicClient?.getContractEvents({
          address: ADDRESS,
          eventName: 'ChatCreated',
          abi: ABI,
          fromBlock: 34042583n,
          toBlock: 'latest',
        });

        const newChatHistory = logs
          .filter((log: any) => log.args?.owner === address) // Filter chats by the current wallet address
          .map((log: any) => ({
            id: log.args?.chatId?.toString() ?? '',
            hash: log?.transactionHash ?? '',
            owner: log.args?.owner ?? '',
            timestamp: new Date(
              Number(log.blockNumber) * 1000
            ).toLocaleString(),
          }));

        setChatHistory(newChatHistory.reverse());
      } catch (error) {
        console.error('Failed to fetch chat history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (address) {
      fetchChatHistory();
    }
  }, [ABI, ADDRESS, publicClient, address]);

  const fetchAndUpdateImages = async () => {
    if (chatId && currentStep) {
      await refetchImages();
      if (imageData) {
        const [indices, urls] = imageData;
        const newImages = { ...images };
        indices.forEach((index: bigint, i: number) => {
          newImages[Number(index)] = urls[i];
        });
        setImages(newImages);
      }
    }
  };

  const checkSpecificImage = async (messageIndex: number) => {
    if (chatId && publicClient) {
      const { data: imageInfo }: any = await publicClient.readContract({
        address: ADDRESS,
        abi: ABI,
        functionName: 'debugImageStorage',
        args: [BigInt(chatId), BigInt(messageIndex)],
      });
      console.log(`Image for message ${messageIndex}:`, imageInfo);
    }
  };

  useEffect(() => {
    if (messageHistory) {
      messageHistory.forEach((_: any, index: any) => {
        checkSpecificImage(index);
      });
    }
  }, [messageHistory, chatId]);

  const fetchLatestChat = async () => {
    try {
      setLoadingState('fetching');
      const logs: any = await publicClient?.getContractEvents({
        address: ADDRESS,
        eventName: 'ChatCreated',
        abi: ABI,
        fromBlock: 34042583n,
        toBlock: 'latest',
      });

      if (logs && logs.length > 0) {
        const latestChat = logs[logs.length - 1];
        const newChatId = latestChat.args?.chatId?.toString();
        if (newChatId) {
          setChatId(newChatId);
          await refetchMessages();
        }
      }
    } catch (error) {
      console.error('Failed to fetch latest chat:', error);
    }
    // Note: We're not setting the state to 'ready' here.
    // The useEffect watching messageHistory and currentStep.gameState will handle that.
  };

  const handleStartGame = async () => {
    if (isConnected) {
      try {
        setIsCreatingNewChat(true);
        const initialMessage = customScenario
          ? `${customScenario}.`
          : 'Start a new game. reply with JSON only';

        const result: any = await writeContract({
          address: ADDRESS,
          abi: ABI,
          functionName: 'startChat',
          args: [initialMessage],
        });
        console.log({ result });
        // Wait for the transaction to be mined
        await publicClient?.waitForTransactionReceipt({ hash: result?.hash });

        // Fetch the latest chat ID
        await fetchLatestChat();

        // Wait for the AI's response to be generated
        // This might take some time, so we'll need to poll or wait for an event
        await waitForAIResponse();

        // Now request an image for the AI's response (which is the second message, index 1)
        if (chatId) {
          const aiResponseContent = messageHistory[1].content[0].value;
          await writeContract({
            address: ADDRESS,
            abi: ABI,
            functionName: 'requestImage',
            args: [BigInt(chatId), 1n, aiResponseContent],
          });
        }

        setIsCreatingNewChat(false);
      } catch (error) {
        console.error('Failed to start game or request initial image:', error);
        setIsCreatingNewChat(false);
      }
    }
  };

  const waitForAIResponse = async () => {
    const maxAttempts = 10;
    const delayBetweenAttempts = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await refetchMessages();
      if (messageHistory && messageHistory.length >= 2) {
        // AI response is available
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, delayBetweenAttempts));
    }

    throw new Error('Timeout waiting for AI response');
  };

  const handleSendMessage = async (option?: string) => {
    if (isConnected && chatId !== null) {
      try {
        setLoadingState('sending');
        const messageToSend = option || userInput;
        if (!messageToSend) return;
        await writeContract({
          address: ADDRESS,
          abi: ABI,
          functionName: 'addMessage',
          args: [messageToSend, BigInt(chatId)],
        });
        setUserInput('');
        setSelectedOption(null);
        setLoadingState('mining');

        // Wait for the message to be mined and the state to update
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Adjust this delay as needed

        // Request image generation for the new message
        const currentMessageIndex = messageHistory ? messageHistory.length : 0;
        await writeContract({
          address: ADDRESS,
          abi: ABI,
          functionName: 'requestImage',
          args: [BigInt(chatId), BigInt(currentMessageIndex), messageToSend],
        });
      } catch (error) {
        console.error('Failed to send message or request image:', error);
        setLoadingState('ready');
      }
    }
  };

  const handleChatSelect = (selectedChatId: string) => {
    setChatId(selectedChatId);
  };

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    handleSendMessage(option);
  };

  const getThemeClass = (greenClass: string, cyanClass: string) => {
    return isCyanTheme ? cyanClass : greenClass;
  };

  const renderCompactStepper = () => {
    if (!messageHistory || messageHistory.length < 3) return null;

    return (
      <div
        className='flex items-center justify-between mb-4 p-2 rounded-lg bg-opacity-50'
        style={{
          backgroundColor: getThemeClass(
            'rgba(34, 197, 94, 0.2)',
            'rgba(6, 182, 212, 0.2)'
          ),
        }}
      >
        <button
          onClick={goToPreviousStep}
          disabled={isFirstStep}
          className={getThemeClass(
            'text-green-300 disabled:text-green-700',
            'text-cyan-300 disabled:text-cyan-700'
          )}
        >
          <ChevronLeft size={20} />
        </button>
        <span className={getThemeClass('text-green-300', 'text-cyan-300')}>
          Turn {currentStep.index + 1} of {totalSteps}
        </span>
        <button
          onClick={goToNextStep}
          disabled={isLastStep}
          className={getThemeClass(
            'text-green-300 disabled:text-green-700',
            'text-cyan-300 disabled:text-cyan-700'
          )}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    );
  };

  const renderCurrentMessage = () => {
    if (loadingState !== 'ready' || !currentStep.gameState) {
      return (
        <div className='text-center text-xl'>
          <Terminal className='inline-block mr-2' />x
          {loadingState === 'idle' && 'Initializing DELUSION interface...'}
          {loadingState === 'sending' && 'Sending your decision...'}
          {loadingState === 'mining' && 'Mining transaction...'}
          {loadingState === 'fetching' && 'Updating game state...'}
          {loadingState === 'ready' &&
            !currentStep.gameState &&
            'Preparing game state...'}
        </div>
      );
    }

    const handleGenerateImage = async () => {
      if (isConnected && chatId !== null && currentStep) {
        try {
          setLoadingState('sending');
          await writeContract({
            address: ADDRESS,
            abi: ABI,
            functionName: 'requestImage',
            args: [
              BigInt(chatId),
              BigInt(currentStep.index),
              currentStep.userMessage,
            ],
          });
          setLoadingState('mining');
          // Wait for the image to be generated and fetched
          await new Promise((resolve) => setTimeout(resolve, 5000)); // Adjust this delay as needed
          await fetchAndUpdateImages();
          setLoadingState('ready');
        } catch (error) {
          console.error('Failed to generate image:', error);
          setLoadingState('ready');
        }
      }
    };

    return (
      <>
        {currentStep.gameState.Title && (
          <div className='mb-4'>
            <h2
              className={
                getThemeClass('text-green-300', 'text-cyan-300') +
                ' text-2xl font-bold mb-2'
              }
            >
              {currentStep.gameState.Title}
            </h2>
          </div>
        )}
        {images[currentStep.index] ? (
          <div className='mb-4'>
            <img
              src={images[currentStep.index]}
              alt={`Generated image for step ${currentStep.index + 1}`}
              className='max-w-full h-auto rounded-lg shadow-lg'
            />
          </div>
        ) : (
          <div className='mb-4'>
            <button
              onClick={handleGenerateImage}
              className={
                getThemeClass(
                  'bg-green-600 hover:bg-green-500',
                  'bg-cyan-600 hover:bg-cyan-500'
                ) +
                ' text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out'
              }
            >
              Generate Image for this scenario
            </button>
          </div>
        )}

        {currentStep.gameState.Challenge && (
          <div className='mb-4'>
            <h2
              className={
                getThemeClass('text-green-300', 'text-cyan-300') +
                ' text-xl font-bold mb-2'
              }
            >
              Challenge:
            </h2>
            <p
              className={
                getThemeClass('text-green-100', 'text-cyan-100') + ' text-lg'
              }
            >
              {currentStep.gameState.Challenge}
            </p>
          </div>
        )}

        <div className='mb-4'>
          <h2
            className={
              getThemeClass('text-green-300', 'text-cyan-300') +
              ' text-2xl font-bold mb-2'
            }
          >
            Current Scenario:
          </h2>
          <p className={getThemeClass('text-green-100', 'text-cyan-100')}>
            {currentStep.userMessage}
          </p>
        </div>

        {currentStep.gameState.Metrics && (
          <>
            <SentimentGauge
              metrics={currentStep.gameState.Metrics}
              getThemeClass={getThemeClass}
            />
            {renderMetrics(currentStep.gameState.Metrics)}
          </>
        )}

        {isLastStep ? (
          <>
            {currentStep.gameState.Options && (
              <div className='mb-4'>
                <h2
                  className={
                    getThemeClass('text-green-300', 'text-cyan-300') +
                    ' text-xl font-bold mb-2'
                  }
                >
                  Strategic Options:
                </h2>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {currentStep.gameState.Options.map((option, index) => (
                    <TooltipProvider key={index}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={
                              getThemeClass(
                                'bg-green-800 bg-opacity-40 hover:bg-green-700',
                                'bg-cyan-800 bg-opacity-40 hover:bg-cyan-700'
                              ) +
                              ' p-3 rounded-lg hover:bg-opacity-50 transition duration-200 ease-in-out cursor-pointer'
                            }
                            onClick={() => {
                              handleOptionSelect(option.Description);
                            }}
                          >
                            {getOptionIcon(index)}
                            <span
                              className={getThemeClass(
                                'text-green-100',
                                'text-cyan-100'
                              )}
                            >
                              {option.Description}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          className={
                            getThemeClass('bg-black', 'bg-gray-800') +
                            ' p-2 max-w-xs'
                          }
                        >
                          <p className='text-sm'>{option.Outcome}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
            )}
            <div className='mt-4'>
              <div
                className={
                  getThemeClass(
                    'bg-green-800 bg-opacity-40',
                    'bg-cyan-800 bg-opacity-40'
                  ) + ' flex items-center rounded-lg overflow-hidden'
                }
              >
                <input
                  type='text'
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className={
                    getThemeClass(
                      'bg-transparent py-2 px-3 text-green-100 placeholder-green-500',
                      'bg-transparent py-2 px-3 text-cyan-100 placeholder-cyan-500'
                    ) + ' flex-grow focus:outline-none'
                  }
                  placeholder='Or input your own strategic decision...'
                />
                <button
                  onClick={() => handleSendMessage()}
                  className={
                    getThemeClass(
                      'bg-green-600 hover:bg-green-500',
                      'bg-cyan-600 hover:bg-cyan-500'
                    ) +
                    ' text-white font-bold py-2 px-4 transition duration-300 ease-in-out'
                  }
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          !isFirstStep && (
            <div className='mt-4'>
              <h2
                className={
                  getThemeClass('text-green-300', 'text-cyan-300') +
                  ' text-lg font-bold mb-2'
                }
              >
                Your Decision:
              </h2>
              <p className={getThemeClass('text-green-100', 'text-cyan-100')}>
                {currentStep.userMessage}
              </p>
            </div>
          )
        )}
      </>
    );
  };

  const renderMetrics = (metrics: Record<string, number | string>) => {
    const getMetricColor = (value: number) => {
      if (value >= 70) return 'text-green-500';
      if (value >= 40) return 'text-yellow-500';
      return 'text-red-500';
    };

    return (
      <div className='mb-4'>
        <h3
          className={
            getThemeClass('text-green-300', 'text-cyan-300') +
            ' text-lg font-bold mb-2 flex items-center'
          }
        >
          <BarChart2 className='mr-2' size={20} />
          Metrics
        </h3>
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2'>
          {Object.entries(metrics).map(([key, value]) => (
            <div
              key={key}
              className={
                getThemeClass(
                  'bg-green-800 bg-opacity-40',
                  'bg-cyan-800 bg-opacity-40'
                ) + ' p-2 rounded-md text-sm'
              }
            >
              <strong
                className={getThemeClass('text-green-300', 'text-cyan-300')}
              >
                {key}:
              </strong>{' '}
              <span
                className={
                  typeof value === 'number'
                    ? getMetricColor(value)
                    : getThemeClass('text-green-100', 'text-cyan-100')
                }
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getOptionIcon = (index: number) => {
    const icons = [Apple, LightbulbIcon, Computer, Flame];
    const Icon = icons[index % icons.length];
    return <Icon className='inline-block mr-2 mb-1' size={20} />;
  };

  return (
    <div
      className={
        getThemeClass('text-green-300 bg-black', 'text-cyan-300 bg-gray-900') +
        ' min-h-screen font-mono'
      }
    >
      <div className='container mx-auto px-4 py-8 flex flex-col lg:flex-row h-screen'>
        {/* Sidebar for scenarios */}
        <div
          className={
            getThemeClass(
              'bg-green-900 bg-opacity-30 border-green-500',
              'bg-cyan-900 bg-opacity-30 border-[#00bcbcd9]'
            ) +
            ' w-full max-w-[300px] p-4 mt-10 mb-4 lg:mb-0 lg:mr-4 rounded-lg border-2 overflow-y-auto'
          }
        >
          <h2
            className={
              getThemeClass('text-green-300', 'text-cyan-300') +
              ' text-xl font-bold mb-4'
            }
          >
            {address ? 'Past Scenarios' : '±?___----__:)'}
          </h2>
          {address && !!chatHistory && chatHistory?.length > 0 && (
            <ul className='space-y-2'>
              {chatHistory.map((chat: any) => (
                <li
                  key={chat.id}
                  className={`
          ${getThemeClass('hover:bg-green-800', 'hover:bg-cyan-800')}
          cursor-pointer hover:bg-opacity-40 p-2 rounded
          ${chat.id === chatId ? 'border-b-2 border-current' : ''}
        `}
                  onClick={() => handleChatSelect(chat.id)}
                >
                  <Clock className='inline-block mr-2' size={16} />
                  Scenario {chat?.hash.slice(-8)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Main content */}
        <div className='flex-grow flex flex-col'>
          <div className='flex justify-between items-center mb-4'>
            <div className='flex flex-row text-center items-center'>
              <p>As long as there is</p>
              <h1
                className={
                  getThemeClass('text-green-300', 'text-cyan-300') +
                  ' text-4xl font-bold px-2'
                }
              >
                {' '}
                DELUSION
              </h1>
              <p>there is hope</p>
            </div>
            <div className='flex items-center'>
              <ConnectButton />
              <button
                onClick={() => toggleTheme()}
                className={
                  getThemeClass(
                    'bg-green-700 hover:bg-green-600',
                    'bg-cyan-700 hover:bg-cyan-600'
                  ) + ' text-black font-bold p-2 rounded-full ml-2'
                }
              >
                {isCyanTheme ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>

          <div
            className={
              getThemeClass(
                'bg-green-900 bg-opacity-30 border-green-500',
                'bg-cyan-900 bg-opacity-30 border-[#00bcbcd9]'
              ) + ' shadow-lg rounded-lg p-4 border-2 flex-grow overflow-y-auto'
            }
          >
            {!isConnected ? (
              <p className='text-center text-xl mt-8'>Get a wallet to start.</p>
            ) : isCreatingNewChat ? (
              <div className='text-center text-xl'>
                <Terminal className='inline-block mr-2' />
                Creating new scenario...
              </div>
            ) : !chatId ? (
              <div className='h-full flex flex-col items-center justify-center space-y-8 p-6'>
                <p
                  className={
                    getThemeClass('text-green-100', 'text-cyan-100') +
                    ' text-lg text-center max-w-2xl'
                  }
                >
                  Hello friend
                  <br /> <br />
                  Dare to challenge any reality? be our guest. <br /> This game
                  has no end.
                  <br /> Check your metrics and see how they evolve.
                  <br />
                  <br />
                </p>
                <textarea
                  value={customScenario}
                  onChange={(e) => setCustomScenario(e.target.value)}
                  placeholder='Describe your reality >>insert text<<'
                  className={
                    getThemeClass(
                      'bg-green-800 bg-opacity-40 text-green-100 placeholder-green-500',
                      'bg-cyan-800 bg-opacity-40 text-cyan-100 placeholder-cyan-500'
                    ) +
                    ' w-full max-w-md p-4 rounded-lg border-2 border-opacity-50 focus:outline-none focus:border-opacity-100 transition duration-300'
                  }
                  rows={4}
                />
                <button
                  onClick={handleStartGame}
                  className={
                    getThemeClass(
                      'bg-green-700 hover:bg-green-600 border-green-400',
                      'bg-cyan-700 hover:bg-cyan-600 border-[#00bcbcd9]'
                    ) +
                    ' text-white font-bold py-4 px-8 rounded-lg text-xl transition duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg border-2'
                  }
                >
                  {isConfirming ? 'Processing...' : 'Enter'}
                </button>
                <p
                  className={
                    getThemeClass('text-green-400', 'text-cyan-400') +
                    ' text-sm italic'
                  }
                >
                  Hint: We will challenge any scenario you propose. Be creative.
                </p>
              </div>
            ) : loadingState === 'idle' ? (
              <div className='text-center text-xl'>
                <Terminal className='inline-block mr-2' />
                Initializing DELUSION interface...
              </div>
            ) : loadingState !== 'ready' || !currentStep.gameState ? (
              <div className='text-center text-xl'>
                <Terminal className='inline-block mr-2' />
                {loadingState === 'sending' && 'Sending your decision...'}
                {loadingState === 'mining' && 'Mining transaction...'}
                {loadingState === 'fetching' && 'Updating game state...'}
                {loadingState === 'ready' &&
                  !currentStep.gameState &&
                  'Preparing game state...'}
              </div>
            ) : messageHistory && messageHistory.length >= 3 ? (
              <>
                {renderCompactStepper()}
                {renderCurrentMessage()}
              </>
            ) : (
              <div className='text-center text-xl'>
                <Terminal className='inline-block mr-2' />
                Unexpected state. Please refresh the page.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
