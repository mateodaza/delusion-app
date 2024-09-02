import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

export const galadriel = /*#__PURE__*/ defineChain({
  id: 696969,
  name: 'Galadriel',
  nativeCurrency: { name: 'GAL', symbol: 'GAL', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://devnet.galadriel.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Galadriel',
      url: 'https://explorer.galadriel.com/',
      apiUrl: 'https://explorer.galadriel.com//api',
    },
  },
  contracts: {},
});

export const config = getDefaultConfig({
  appName: 'RainbowKit App',
  projectId: 'YOUR_PROJECT_ID',
  chains: [galadriel],
  ssr: true,
});
