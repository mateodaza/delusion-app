import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import type { AppProps } from 'next/app';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { midnightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';

import { config } from '../wagmi';

const client = new QueryClient({
  defaultOptions: {
    queries: {
      structuralSharing: false,
    },
  },
});

function AppContent({ Component, pageProps }: AppProps) {
  return (
    <RainbowKitProvider
      modalSize='compact'
      theme={midnightTheme({ accentColor: 'grey' })}
    >
      <Component {...pageProps} />
    </RainbowKitProvider>
  );
}

function MyApp(props: AppProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>
        <AppContent {...props} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default MyApp;
