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
import { useImageGenerator } from '@/hooks/useImageGenerator';
import Link from 'next/link';

type LoadingState = 'idle' | 'sending' | 'mining' | 'fetching' | 'ready';

interface ChatHistoryItem {
  id: string;
  owner: string;
  timestamp: string;
}

const Dashboard = ({
  ECON_ABI,
  ECON_ADDRESS,
}: {
  ECON_ABI: any;
  ECON_ADDRESS: `0x${string}`;
}) => {
  const [chatId, setChatId] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [customScenario, setCustomScenario] = useState('');
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false);
  const [newChatTransactionHash, setNewChatTransactionHash] = useState<
    `0x${string}` | null
  >(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');

  const [loading, setIsLoading] = useState(false);

  const { images, isGenerating, generateImage } = useImageGenerator();

  const { isCyanTheme, toggleTheme } = useTheme();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const {
    data: messageHistory,
    refetch: refetchMessages,
    isLoading: messageHistoryLoading,
  } = useReadContract({
    address: ECON_ADDRESS,
    abi: ECON_ABI,
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
  } = useGameState(messageHistory);

  const {
    data: hash,
    isPending: txIsPending,
    writeContract,
  } = useWriteContract();
  const hashData = useWaitForTransactionReceipt({
    hash,
  });
  const { isLoading: isConfirming, isSuccess: isConfirmed } = hashData;
  const isLoading =
    loading || isConfirming || messageHistoryLoading || txIsPending;

  const handleGenerateImage = async () => {
    if (currentStep.gameState) {
      const imagePrompt = `${currentStep.gameState.Title}: ${currentStep.gameState.Challenge}`;
      await generateImage(currentStep.index, imagePrompt);
    }
  };

  useEffect(() => {
    if (isConfirmed && isCreatingNewChat) {
      fetchLatestChat().then(() => {
        setIsCreatingNewChat(false);
      });
    }
  }, [isConfirmed, isCreatingNewChat]);

  useEffect(() => {
    if (isConfirmed && hash) {
      const updateAfterConfirmation = async () => {
        setLoadingState('fetching');
        const updatedHistory = await fetchChatHistory();
        if (updatedHistory.length > 0) {
          const latestChatId = updatedHistory[0].id;
          setChatId(latestChatId);
          await refetchMessages();
        }
        setIsCreatingNewChat(false);
        setLoadingState('ready');
      };

      updateAfterConfirmation();
    }
  }, [isConfirmed, hash]);

  useEffect(() => {
    if (messageHistory && messageHistory.length >= 3 && currentStep.gameState) {
      setLoadingState('ready');
    }
  }, [messageHistory, currentStep.gameState]);

  const fetchChatHistory = async () => {
    if (!address) {
      setChatHistory([]);
      return [];
    }
    try {
      setIsLoading(true);
      setLoadingState('fetching');
      console.log({ publicClient, ECON_ADDRESS, ECON_ABI });
      const logs: any = await publicClient?.getContractEvents({
        address: ECON_ADDRESS,
        eventName: 'ChatCreated',
        abi: ECON_ABI,
        fromBlock: 34042583n,
        toBlock: 'latest',
      });

      const newChatHistory = logs
        .filter((log: any) => log.args?.owner === address)
        .map((log: any) => ({
          id: log.args?.chatId?.toString() ?? '',
          hash: log?.transactionHash ?? '',
          owner: log.args?.owner ?? '',
          timestamp: new Date(Number(log.blockNumber) * 1000).toLocaleString(),
        }));

      const sortedHistory = newChatHistory.reverse();
      setChatHistory(sortedHistory);
      setLoadingState('ready');
      return sortedHistory;
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
      return [];
    } finally {
      setIsLoading(false);
      setLoadingState('ready');
      setIsCreatingNewChat(false);
    }
  };
  useEffect(() => {
    if (address) {
      fetchChatHistory();
    }
  }, [ECON_ABI, ECON_ADDRESS, publicClient, address]);

  const fetchLatestChat = async () => {
    try {
      setLoadingState('fetching');
      const logs: any = await publicClient?.getContractEvents({
        address: ECON_ADDRESS,
        eventName: 'ChatCreated',
        abi: ECON_ABI,
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
        setLoadingState('sending');
        await writeContract({
          address: ECON_ADDRESS,
          abi: ECON_ABI,
          functionName: 'startChat',
          args: [
            customScenario
              ? `${customScenario}.`
              : 'Start a new game. reply with JSON only',
          ],
        });
        // The transaction has been sent, but not yet mined
        setLoadingState('mining');

        setTimeout(() => {
          fetchChatHistory();
        }, 5000);
      } catch (error) {
        console.error('Failed to start game:', error);
        setIsCreatingNewChat(false);
        setLoadingState('idle');
      }
    }
  };
  const handleSendMessage = async (option?: string) => {
    if (isConnected && chatId !== null) {
      try {
        setLoadingState('sending');
        const messageToSend = option || userInput;
        if (!messageToSend) return;
        await writeContract({
          address: ECON_ADDRESS,
          abi: ECON_ABI,
          functionName: 'addMessage',
          args: [messageToSend, BigInt(chatId)],
        });
        setUserInput('');
        setSelectedOption(null);
        setLoadingState('mining');
      } catch (error) {
        console.error('Failed to send message:', error);
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

        <div className='mt-4'>
          <h2
            className={
              getThemeClass('text-green-300', 'text-cyan-300') +
              ' text-2xl font-bold mb-2'
            }
          >
            Scenario Visualization:
          </h2>
          {images[currentStep.index] ? (
            <img
              src={images[currentStep.index]}
              alt={`Scenario: ${currentStep.gameState.Title}`}
              className='w-full max-w-md mx-auto rounded-lg shadow-lg mb-4'
            />
          ) : (
            <button
              onClick={handleGenerateImage}
              disabled={isGenerating}
              className={
                getThemeClass(
                  'bg-green-700 hover:bg-green-600 border-green-400',
                  'bg-cyan-700 hover:bg-cyan-600 border-[#00bcbcd9]'
                ) +
                ' text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg border-2'
              }
            >
              {isGenerating ? 'Generating...' : 'Generate Image for This Step'}
            </button>
          )}
        </div>

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
              <Link href='/'>
                <h1
                  className={
                    getThemeClass('text-green-300', 'text-cyan-300') +
                    ' text-4xl font-bold px-2'
                  }
                >
                  {' '}
                  DELUSION
                </h1>
              </Link>
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
