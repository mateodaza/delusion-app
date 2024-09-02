import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import {
  useAccount,
  useReadContract,
  useWatchContractEvent,
  useWriteContract,
} from 'wagmi';
import ECON from '../artifacts/ECON.sol/ECON.json';
import { DynamicMusicPlayer } from '@/components/audio';

const ECON_ABI = ECON.abi;
const ECON_ADDRESS = '0x4c632d7244B456Eb0715132DfbE2955eb1861744';

const Home: NextPage = () => {
  const [chatId, setChatId] = useState<bigint | null>(null);
  const [userInput, setUserInput] = useState('');
  const [gameState, setGameState] = useState<any>(null);
  const { address, isConnected } = useAccount();

  const { data: messageHistory }: any = useReadContract({
    address: ECON_ADDRESS,
    abi: ECON_ABI,
    functionName: 'getMessageHistory',
    args: chatId ? [chatId] : ['1'],
  });

  const { data: hash, writeContract } = useWriteContract();

  const chatEvents = useWatchContractEvent({
    address: ECON_ADDRESS,
    abi: ECON_ABI,
    eventName: 'ChatCreated',
    fromBlock: 34042583n,
    onLogs(logs) {
      console.log('New logs!', logs);
    },
  });
  console.log({ chatEvents });

  useEffect(() => {
    if (messageHistory && messageHistory.length > 0) {
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
          args: [userInput, chatId],
        });
        setUserInput('');
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-b from-blue-900 to-blue-700 text-white'>
      <DynamicMusicPlayer />
      <Head>
        <title>ECON Game</title>
        <meta
          name='description'
          content='ECON - A strategic decision-making game on the blockchain'
        />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <main className='container mx-auto px-4 py-8'>
        <h1 className='text-5xl font-bold mb-8 text-center text-yellow-300 shadow-text'>
          ECON Game
        </h1>

        <div className='flex justify-center mb-8'>
          <ConnectButton />
        </div>

        {!isConnected ? (
          <p className='text-center text-xl'>
            Please connect your wallet to play.
          </p>
        ) : chatId === null ? (
          <div className='text-center'>
            <button
              onClick={handleStartGame}
              className='bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-bold py-3 px-6 rounded-lg text-xl transition duration-300 ease-in-out transform hover:scale-105'
            >
              Start New Game
            </button>
          </div>
        ) : gameState ? (
          <div className='bg-blue-800 shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4 border border-blue-500'>
            <h2 className='text-3xl font-bold mb-4 text-yellow-300'>
              Challenge:
            </h2>
            <p className='mb-6 text-lg'>{gameState.challenge}</p>

            <h2 className='text-2xl font-bold mb-3 text-yellow-300'>
              Options:
            </h2>
            <ul className='list-none mb-6'>
              {gameState.options.map((option: any, index: number) => (
                <li
                  key={index}
                  className='mb-3 bg-blue-700 p-3 rounded-md hover:bg-blue-600 transition duration-300 ease-in-out'
                >
                  <strong className='text-yellow-300'>{option.text}:</strong>{' '}
                  {option.hint}
                </li>
              ))}
            </ul>

            <h2 className='text-2xl font-bold mb-3 text-yellow-300'>
              Metrics:
            </h2>
            <div className='grid grid-cols-2 gap-4 mb-6'>
              {Object.entries(gameState.metrics).map(
                ([key, value]: [string, any]) => (
                  <div key={key} className='bg-blue-700 p-3 rounded-md'>
                    <strong className='text-yellow-300'>{key}:</strong> {value}
                  </div>
                )
              )}
            </div>

            <h2 className='text-2xl font-bold mb-3 text-yellow-300'>
              Summary:
            </h2>
            <p className='mb-6 text-lg'>{gameState.summary}</p>

            <div className='mt-6'>
              <input
                type='text'
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className='shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent'
                placeholder='Enter your decision...'
              />
              <button
                onClick={handleSendMessage}
                className='mt-4 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-bold py-3 px-6 rounded-lg w-full transition duration-300 ease-in-out transform hover:scale-105'
              >
                Send Decision
              </button>
            </div>
          </div>
        ) : (
          <p className='text-center text-xl'>Loading game state...</p>
        )}
      </main>
    </div>
  );
};

export default Home;

<style jsx global>{`
  .shadow-text {
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  }
`}</style>;
