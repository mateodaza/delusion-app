import { NextPage } from 'next';
import Head from 'next/head';
import DELUSION from '../../../hardhat/artifacts/contracts/DELUSION.sol/DELUSION.json';
import Dashboard from '@/components/dashboard_v2';

const DELUSION_ABI = DELUSION.abi;
const DELUSION_ADDRESS = '0x0957777E66aC6947f92884471E53DC31Ca5B9353'; // with image features

const WithImages: NextPage = () => {
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

      <Dashboard ABI={DELUSION_ABI} ADDRESS={DELUSION_ADDRESS} />
    </div>
  );
};

export default WithImages;
