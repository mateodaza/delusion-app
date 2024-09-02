import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  usePublicClient,
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

interface Message {
  role: string;
  content: Array<{ contentType: string; value: string }>;
}

interface GameState {
  Challenge: string;
  Metrics: Record<string, number | string>;
  Options: Array<{
    Description: string;
    Outcome: string;
  }>;
  Summary: string;
}

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
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isCyanTheme, setIsCyanTheme] = useState(false);
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const { data: messageHistory, refetch: refetchMessages } = useReadContract({
    address: ECON_ADDRESS,
    abi: ECON_ABI,
    functionName: 'getMessageHistory',
    args: chatId ? [BigInt(chatId)] : undefined,
  }) as { data: Message[] | undefined; refetch: () => void };

  const { writeContract } = useWriteContract();

  useEffect(() => {
    const fetchChatHistory = async () => {
      const logs: any = await publicClient?.getContractEvents({
        address: ECON_ADDRESS,
        eventName: 'ChatCreated',
        abi: ECON_ABI,
        fromBlock: 34042583n,
        toBlock: 'latest',
      });

      const newChatHistory = logs.map((log: any) => ({
        id: log.args?.chatId?.toString() ?? '',
        hash: log?.transactionHash ?? '',
        owner: log.args?.owner ?? '',
        timestamp: new Date(Number(log.blockNumber) * 1000).toLocaleString(),
      }));

      setChatHistory(newChatHistory.reverse());
    };

    fetchChatHistory();
  }, [ECON_ABI, ECON_ADDRESS, publicClient]);

  useEffect(() => {
    if (messageHistory && messageHistory.length > 0) {
      setCurrentMessageIndex(messageHistory.length - 1);
      const lastMessage = messageHistory[messageHistory.length - 1];
      if (lastMessage.role === 'assistant') {
        try {
          setGameState(JSON.parse(lastMessage.content[0].value));
        } catch (error) {
          console.error('Failed to parse game state:', error);
        }
      }
    }
  }, [messageHistory]);

  const handleStartGame = async () => {
    if (isConnected) {
      try {
        const result: any = await writeContract({
          address: ECON_ADDRESS,
          abi: ECON_ABI,
          functionName: 'startChat',
          args: ['Start a new game'],
        });
        if (result) {
          setChatId(result.toString());
          refetchMessages();
        }
      } catch (error) {
        console.error('Failed to start game:', error);
      }
    }
  };

  const handleSendMessage = async () => {
    if (isConnected && chatId !== null) {
      try {
        await writeContract({
          address: ECON_ADDRESS,
          abi: ECON_ABI,
          functionName: 'addMessage',
          args: [userInput, BigInt(chatId)],
        });
        setUserInput('');
        refetchMessages();
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };

  const handleChatSelect = (selectedChatId: string) => {
    setChatId(selectedChatId);
    setCurrentMessageIndex(0);
  };

  const getThemeClass = (greenClass: string, cyanClass: string) => {
    return isCyanTheme ? cyanClass : greenClass;
  };

  const renderCompactStepper = () => {
    if (!messageHistory || messageHistory.length < 3) return null;

    const assistantIndices = messageHistory
      .map((msg, index) => (msg.role === 'assistant' ? index : -1))
      .filter((index) => index !== -1);

    const totalSteps = assistantIndices.length;
    const currentStepIndex = assistantIndices.findIndex(
      (index) => index >= currentMessageIndex
    );
    const currentStep =
      currentStepIndex !== -1 ? currentStepIndex : totalSteps - 1;

    const goToPreviousStep = () => {
      if (currentStep > 0) {
        setCurrentMessageIndex(assistantIndices[currentStep - 1]);
      }
    };

    const goToNextStep = () => {
      if (currentStep < totalSteps - 1) {
        setCurrentMessageIndex(assistantIndices[currentStep + 1]);
      }
    };

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
          disabled={currentStep === 0}
          className={getThemeClass(
            'text-green-300 disabled:text-green-700',
            'text-cyan-300 disabled:text-cyan-700'
          )}
        >
          <ChevronLeft size={20} />
        </button>
        <span className={getThemeClass('text-green-300', 'text-cyan-300')}>
          Turn {currentStep + 1} of {totalSteps}
        </span>
        <button
          onClick={goToNextStep}
          disabled={currentStep === totalSteps - 1}
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
    if (!messageHistory || messageHistory.length < 3) return null;

    let assistantMessage, userMessage;

    // Find the nearest assistant message at or before the current index
    for (let i = currentMessageIndex; i >= 1; i--) {
      if (messageHistory[i].role === 'assistant') {
        assistantMessage = messageHistory[i];
        userMessage = messageHistory[i - 1];
        break;
      }
    }

    if (!assistantMessage || !userMessage) return null;

    const gameState = JSON.parse(assistantMessage.content[0].value);

    return (
      <>
        {renderMetrics(gameState.Metrics)}
        <div className='mb-4'>
          <h2
            className={
              getThemeClass('text-green-300', 'text-cyan-300') +
              ' text-2xl font-bold mb-2'
            }
          >
            Challenge:
          </h2>
          <p
            className={
              getThemeClass('text-green-100', 'text-cyan-100') + ' text-lg'
            }
          >
            {gameState.Challenge}
          </p>
        </div>
        <div className='mb-4'>
          <h2
            className={
              getThemeClass('text-green-300', 'text-cyan-300') +
              ' text-xl font-bold mb-2'
            }
          >
            Your Decision:
          </h2>
          <p className={getThemeClass('text-green-100', 'text-cyan-100')}>
            {userMessage.content[0].value}
          </p>
        </div>
        <div className='mb-4'>
          <h2
            className={
              getThemeClass('text-green-300', 'text-cyan-300') +
              ' text-xl font-bold mb-2'
            }
          >
            Summary:
          </h2>
          <p className={getThemeClass('text-green-100', 'text-cyan-100')}>
            {gameState.Summary}
          </p>
        </div>
      </>
    );
  };

  const renderMetrics = (metrics: Record<string, number | string>) => {
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
                className={getThemeClass('text-green-100', 'text-cyan-100')}
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
            ' w-full max-w-[300px] p-4 mb-4 lg:mb-0 lg:mr-4 rounded-lg border-2 overflow-y-auto'
          }
        >
          <h2
            className={
              getThemeClass('text-green-300', 'text-cyan-300') +
              ' text-xl font-bold mb-4'
            }
          >
            Past Scenarios
          </h2>
          <ul className='space-y-2'>
            {chatHistory.map((chat: any) => (
              <li
                key={chat.id}
                className={
                  getThemeClass('hover:bg-green-800', 'hover:bg-cyan-800') +
                  ' cursor-pointer hover:bg-opacity-40 p-2 rounded'
                }
                onClick={() => handleChatSelect(chat.id)}
              >
                <Clock className='inline-block mr-2' size={16} />
                Scenario {chat?.hash.slice(-4)}
              </li>
            ))}
          </ul>
        </div>

        {/* Main content */}
        <div className='flex-grow flex flex-col'>
          <div className='flex justify-between items-center mb-4'>
            <h1
              className={
                getThemeClass('text-green-300', 'text-cyan-300') +
                ' text-4xl font-bold'
              }
            >
              DELUSION
            </h1>
            <div className='flex items-center'>
              <ConnectButton />
              <button
                onClick={() => setIsCyanTheme(!isCyanTheme)}
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
              ) +
              ' shadow-lg rounded-lg p-4 mb-4 border-2 flex-grow overflow-y-auto'
            }
          >
            {!isConnected ? (
              <p className='text-center text-xl'>
                Please connect your wallet to play.
              </p>
            ) : !chatId ? (
              <div className='text-center'>
                <button
                  onClick={handleStartGame}
                  className={
                    getThemeClass(
                      'bg-green-700 hover:bg-green-600 border-green-400',
                      'bg-cyan-700 hover:bg-cyan-600 border-[#00bcbcd9]'
                    ) +
                    ' text-white font-bold py-3 px-6 rounded-lg text-xl transition duration-300 ease-in-out transform hover:scale-105 border-2'
                  }
                >
                  Start a new DELUSION
                </button>
              </div>
            ) : messageHistory && messageHistory.length >= 3 ? (
              <>
                {renderCompactStepper()}
                {renderCurrentMessage()}

                {currentMessageIndex === messageHistory.length - 1 &&
                  gameState && (
                    <>
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
                          {gameState.Options.map((option, index) => (
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

                      <div className='mt-4'>
                        <h2
                          className={
                            getThemeClass('text-green-300', 'text-cyan-300') +
                            ' text-lg font-bold mb-2'
                          }
                        >
                          Custom Decision:
                        </h2>
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
                            placeholder='Input your custom strategic decision...'
                          />
                          <button
                            onClick={handleSendMessage}
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
                  )}
              </>
            ) : (
              <div className='text-center text-xl'>
                <Terminal className='inline-block mr-2' />
                Initializing DELUSION interface...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
