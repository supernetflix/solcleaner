import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import App from './App';
import './index.css';
import { Buffer } from 'buffer';

// Polyfill global Buffer
window.Buffer = Buffer;
const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
];

// Using QuickNode's public RPC endpoint
const endpoint = 'https://solana-mainnet.rpc.extrnode.com/c2c0b269-b314-4769-98ff-62a5db627585';

const config = {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
  wsEndpoint: undefined,
  disableRetryOnRateLimit: false
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConnectionProvider endpoint={endpoint} config={config}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </StrictMode>
);