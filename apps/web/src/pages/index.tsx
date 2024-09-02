import { NextPage } from 'next';
import Head from 'next/head';
import ECON from '../artifacts/ECON.sol/ECON.json';
import Dashboard from '@/components/dashboard';

const ECON_ABI = ECON.abi;
const ECON_ADDRESS = '0x4c632d7244B456Eb0715132DfbE2955eb1861744';

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>ECON</title>
        <meta
          name='description'
          content='ECON - A strategic decision-making game on the blockchain'
        />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <Dashboard ECON_ABI={ECON_ABI} ECON_ADDRESS={ECON_ADDRESS} />
    </div>
  );
};

export default Home;
