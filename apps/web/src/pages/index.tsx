import { NextPage } from 'next';
import Head from 'next/head';
import ECON from '../artifacts/ECON.sol/ECON.json';
import Dashboard from '@/components/dashboard';

const ECON_ABI = ECON.abi;
// const ECON_ADDRESS = '0x4c632d7244B456Eb0715132DfbE2955eb1861744'; // initial version, clunky

const ECON_ADDRESS = '0x1C49d41217866d6C42DA95b1cD502eD4C13834F6'; // working version until it stopped replying
// ALT
// const ECON_ADDRESS ="0xCc953565047fa2E3AC700c0F3Bbb729b062980A7"

// const ECON_ADDRESS = '0xcf68Da7F566267B1aB3A90F7F5679a7685Ac076f'; // third version just in case

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>DELUSION</title>
        <meta
          name='description'
          content='DELUSION - A strategic decision-making game on the blockchain'
        />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <Dashboard ECON_ABI={ECON_ABI} ECON_ADDRESS={ECON_ADDRESS} />
    </div>
  );
};

export default Home;
