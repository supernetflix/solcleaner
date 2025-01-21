import React, { useState, useEffect } from 'react';
import {
  Zap,
  Wallet,
  Database,
  TrendingUp,
  Loader2,
  Share2,
  History,
  CheckCircle2,
} from 'lucide-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createCloseAccountInstruction,
} from '@solana/spl-token';
import '@solana/wallet-adapter-react-ui/styles.css';
import {
  saveLog,
  updateStats,
  fetchLogs,
  fetchStats,
  fetchDynamicStats,
} from './supabaseFunctions';

interface TokenAccount {
  pubkey: string;
  mint: string;
  rentLamports: number;
  selected?: boolean;
}

interface TransactionHistory {
  date: string;
  accountsClosed: number;
  solRecovered: number;
  walletAddress: string;
}

const DONATION_PERCENTAGE = 20;
const REFERRAL_PERCENTAGE = 20;
const DONATION_WALLET = new PublicKey(
  '9uPrBhLnv2mt4LV28G33tG1AinY16PpX4cy3dr7Q7aBZ'
);

function StatsCard({
  icon: Icon,
  title,
  value,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center space-x-3 mb-2">
        <Icon className="w-6 h-6 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <p className="text-2xl font-bold text-purple-600">{value}</p>
    </div>
  );
}

function ReferralSection({ walletAddress }: { walletAddress: string }) {
  const referralLink = `${window.location.origin}?ref=${walletAddress}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8 mb-8">
      <div className="flex items-center space-x-3 mb-4">
        <Share2 className="w-6 h-6 text-purple-600" />
        <h2 className="text-2xl font-bold text-gray-900">Your Referral Link</h2>
      </div>
      <p className="text-gray-600 mb-4">
        Share your referral link and earn {REFERRAL_PERCENTAGE}% of donations
        from referred users!
      </p>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={referralLink}
          readOnly
          className="flex-1 p-2 border rounded-lg bg-gray-50"
        />
        <button
          onClick={copyToClipboard}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Copy
        </button>
      </div>
    </div>
  );
}

function TokenAccountsList({
  accounts,
  onSelect,
  onCloseAccounts,
  isClosing,
}: {
  accounts: TokenAccount[];
  onSelect: (pubkey: string) => void;
  onCloseAccounts: () => void;
  isClosing: boolean;
}) {
  if (!accounts.length) {
    return (
      <div className="text-center py-8 text-gray-600">
        No empty token accounts found.
      </div>
    );
  }

  const selectedAccounts = accounts.filter((acc) => acc.selected);
  const totalRentLamports = selectedAccounts.reduce(
    (sum, account) => sum + account.rentLamports,
    0
  );
  const totalRentSol = (totalRentLamports / LAMPORTS_PER_SOL).toFixed(4);
  const donationAmount = (
    (totalRentLamports * DONATION_PERCENTAGE) /
    100 /
    LAMPORTS_PER_SOL
  ).toFixed(4);
  const userReceives = (
    (totalRentLamports * (100 - DONATION_PERCENTAGE)) /
    100 /
    LAMPORTS_PER_SOL
  ).toFixed(4);

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 p-4 rounded-lg">
        <p className="text-purple-800 font-semibold">
          Found {accounts.length} empty token accounts with {totalRentSol} SOL
          in recoverable rent
        </p>
      </div>
      <div className="space-y-2">
        {accounts.map((account) => (
          <div
            key={account.pubkey}
            className={`bg-white p-4 rounded-lg shadow-sm flex justify-between items-center cursor-pointer hover:bg-purple-50 ${
              account.selected ? 'ring-2 ring-purple-500' : ''
            }`}
            onClick={() => onSelect(account.pubkey)}
          >
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={account.selected}
                onChange={() => onSelect(account.pubkey)}
                className="h-4 w-4 text-purple-600"
              />
              <div>
                <p className="font-mono text-sm text-gray-600">
                  {account.pubkey.slice(0, 4)}...{account.pubkey.slice(-4)}
                </p>
                <p className="text-sm text-gray-500">
                  Mint: {account.mint.slice(0, 4)}...{account.mint.slice(-4)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-purple-600">
                {(account.rentLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL
              </p>
            </div>
          </div>
        ))}
      </div>
      {selectedAccounts.length > 0 && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Transaction Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total Recoverable SOL</span>
              <span className="font-semibold">{totalRentSol} SOL</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Donation ({DONATION_PERCENTAGE}%)</span>
              <span>{donationAmount} SOL</span>
            </div>
            <div className="flex justify-between font-bold text-purple-600 pt-2 border-t">
              <span>You Receive</span>
              <span>{userReceives} SOL</span>
            </div>
          </div>
          <button
            onClick={onCloseAccounts}
            disabled={isClosing}
            className="w-full mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
          >
            {isClosing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Closing Accounts...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Close Selected Accounts
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function TransactionHistorySection({
  history,
  isLoading,
}: {
  history: TransactionHistory[];
  isLoading: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-8 mb-8">
      <div className="flex items-center space-x-3 mb-6">
        <History className="w-6 h-6 text-purple-600" />
        <h2 className="text-2xl font-bold text-gray-900">
          Transaction History
        </h2>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-600">
          Loading transaction history...
        </div>
      ) : history.length > 0 ? (
        <div className="space-y-4">
          {history.map((tx, index) => (
            <div key={index} className="border-b pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">
                    {new Date(tx.date).toLocaleString()}
                  </p>
                  <p className="font-semibold">
                    Closed {tx.accountsClosed} accounts
                  </p>
                  <p className="text-sm text-gray-500">
                    Wallet:{' '}
                    <a
                      href={`https://solscan.io/account/${tx.walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 underline"
                    >
                      {tx.walletAddress.slice(0, 5)}...
                      {tx.walletAddress.slice(-3)}
                    </a>
                  </p>
                </div>
                <p className="text-purple-600 font-bold">
                  {tx.solRecovered.toFixed(4)} SOL
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-600">
          No transaction history found yet.
        </div>
      )}
    </div>
  );
}

function App() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [emptyAccounts, setEmptyAccounts] = useState<TokenAccount[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TransactionHistory[]>([]);
  const [stats, setStats] = useState({
    totalSolRecovered: 0,
    accountsNuked: 0,
    currentTPS: 0,
  });

const fetchAndSetStats = async () => {
  try {
    console.log("Fetching dynamic stats...");
    
    // Fetch calculated stats from logs
    const statsFromLogs = await fetchDynamicStats();
    console.log("Fetched stats from logs:", statsFromLogs);

    // Ensure statsFromLogs contains valid data
    if (statsFromLogs) {
      setStats((prevStats) => ({
        totalSolRecovered: statsFromLogs.total_sol_recovered || 0,
        accountsNuked: statsFromLogs.total_accounts_nuked || 0,
        currentTPS: prevStats.currentTPS || 0, // Preserve current TPS value
      }));
      console.log("Stats updated successfully:", {
        totalSolRecovered: statsFromLogs.total_sol_recovered || 0,
        accountsNuked: statsFromLogs.total_accounts_nuked || 0,
      });
    } else {
      console.warn("Stats from logs are empty or invalid.");
      setStats((prevStats) => ({
        totalSolRecovered: 0,
        accountsNuked: 0,
        currentTPS: prevStats.currentTPS || 0, // Preserve current TPS value
      }));
    }
  } catch (error) {
    // Log and gracefully handle errors
    console.error("Error in fetchAndSetStats:", error.message || error);

    // Optionally, reset stats to avoid stale data in the UI
    setStats((prevStats) => ({
      totalSolRecovered: 0,
      accountsNuked: 0,
      currentTPS: prevStats.currentTPS || 0,
    }));
  }
};




// Fetch and Set Logs
const fetchAndSetLogs = async () => {
  try {
    const logsFromDB = await fetchLogs();
    if (logsFromDB) {
      setHistory(
        logsFromDB.map((log) => ({
          date: log.date || new Date().toISOString(), // Default to current time if missing
          accountsClosed: log.accountsClosed || 0, // Directly use accounts_closed from DB
          solRecovered: log.solRecovered || 0.0, // Directly use sol_recovered from DB
          walletAddress: log.walletAddress || 'Unknown', // Default to 'Unknown' if null
        }))
      );
    }
  } catch (error) {
    console.error('Error fetching logs:', error);
  }
};
  const fetchTPS = async () => {
    try {
      const recentPerformance = await connection.getRecentPerformanceSamples(1);
      console.log('Performance Data:', recentPerformance); // Log for debugging

      if (recentPerformance && recentPerformance.length > 0) {
        const { samplePeriodSecs, numTransactions } = recentPerformance[0];
        const tps = Math.round(numTransactions / samplePeriodSecs);
        console.log(
          `Sample Period: ${samplePeriodSecs}, Transactions: ${numTransactions}, TPS: ${tps}`
        );
        setStats((prev) => ({
          ...prev,
          currentTPS: tps,
        }));
      } else {
        console.warn('No recent performance samples available');
        setStats((prev) => ({
          ...prev,
          currentTPS: 0,
        }));
      }
    } catch (error) {
      console.error('Error fetching TPS:', error);
      setStats((prev) => ({
        ...prev,
        currentTPS: 0,
      }));
    }
  };

  useEffect(() => {
    fetchTPS(); // Initial fetch
    const interval = setInterval(fetchTPS, 5000); // Fetch TPS every 5 seconds
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  const scanAccounts = async () => {
    if (!publicKey) {
      console.error('Public Key is undefined. Wallet not connected.');
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const accounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      console.log('Found total token accounts:', accounts.value.length);

      const emptyAccounts = accounts.value
        .filter(({ account }) => {
          const parsedInfo = account.data.parsed.info;
          return parsedInfo.tokenAmount.uiAmount === 0;
        })
        .map(({ pubkey, account }) => ({
          pubkey: pubkey.toString(),
          mint: account.data.parsed.info.mint,
          rentLamports: account.lamports,
          selected: false,
        }));

      console.log('Found empty accounts:', emptyAccounts.length);

      setEmptyAccounts(emptyAccounts);

      if (emptyAccounts.length === 0) {
        setError('No empty token accounts found.');
      }
    } catch (err) {
      console.error('Error scanning token accounts:', err);
      setError('Failed to scan token accounts. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleAccountSelection = (pubkey: string) => {
    setEmptyAccounts((accounts) =>
      accounts.map((account) =>
        account.pubkey === pubkey
          ? { ...account, selected: !account.selected }
          : account
      )
    );
  };

const closeSelectedAccounts = async () => {
  if (!publicKey || isClosing) return;

  const selectedAccounts = emptyAccounts.filter((acc) => acc.selected);
  if (selectedAccounts.length === 0) return;

  setIsClosing(true);
  setError(null);

  try {
    const recentBlockhash = await connection.getLatestBlockhash();
    const transaction = new Transaction({
      feePayer: publicKey,
      ...recentBlockhash,
    });

    let totalRentLamports = 0;

    selectedAccounts.forEach((account) => {
      totalRentLamports += account.rentLamports;
      transaction.add(
        createCloseAccountInstruction(
          new PublicKey(account.pubkey),
          publicKey,
          publicKey
        )
      );
    });

    const donationAmount = Math.floor(
      (totalRentLamports * DONATION_PERCENTAGE) / 100
    );
    if (donationAmount > 0) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: DONATION_WALLET,
          lamports: donationAmount,
        })
      );
    }

    const signature = await sendTransaction(transaction, connection);
    console.log('Transaction sent:', signature);

    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash: recentBlockhash.blockhash,
        lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
      },
      'confirmed'
    );

    if (confirmation.value.err) {
      throw new Error('Transaction failed to confirm');
    }

    const solRecovered = totalRentLamports / LAMPORTS_PER_SOL;
    const accountsClosed = selectedAccounts.length;

    // Save log and update stats
    await saveLog(
      `Recovered ${solRecovered.toFixed(4)} SOL from ${accountsClosed} accounts.`,
      '',
      publicKey.toString(),
      solRecovered,
      accountsClosed
    );

    await updateStats(accountsClosed, solRecovered); // Increment stats in the database
    await fetchAndSetLogs(); // Update logs in the UI
    await fetchAndSetStats(); // Update stats in the UI

    await scanAccounts(); // Refresh empty accounts
  } catch (err) {
    console.error('Error closing accounts:', err);
    setError(err.message || 'Failed to close accounts. Please try again.');
  } finally {
    setIsClosing(false);
  }
};


// Single useEffect for Initial Data Fetch
useEffect(() => {
  const fetchInitialData = async () => {
    try {
      await fetchAndSetStats();
      await fetchAndSetLogs();
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  fetchInitialData();
}, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Zap className="w-8 h-8 text-purple-600" />
              <span className="ml-2 text-xl font-bold text-gray-800">
                SolCleaner
              </span>
            </div>
            <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Clean Your Solana Token Accounts
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Recover SOL from empty token accounts safely and efficiently.
            Connect your wallet to start cleaning and claim your SOL back.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <StatsCard
            icon={Wallet}
            title="Total SOL Recovered"
            value={`${stats.totalSolRecovered.toFixed(2)} SOL`}
          />
          <StatsCard
            icon={Database}
            title="Accounts Nuked"
            value={stats.accountsNuked.toString()}
          />
          <StatsCard
            icon={TrendingUp}
            title="Current TPS"
            value={stats.currentTPS.toString()}
          />
        </div>
        <TransactionHistorySection history={history} />
        {publicKey ? (
          <>
            <ReferralSection walletAddress={publicKey.toString()} />

            <div className="bg-white rounded-lg shadow-md p-8 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Your Empty Token Accounts
                </h2>
                <button
                  onClick={scanAccounts}
                  disabled={isScanning}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    'Rescan Accounts'
                  )}
                </button>
              </div>
              {error ? (
                <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-4">
                  {error}
                </div>
              ) : (
                <TokenAccountsList
                  accounts={emptyAccounts}
                  onSelect={toggleAccountSelection}
                  onCloseAccounts={closeSelectedAccounts}
                  isClosing={isClosing}
                />
              )}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  1. Connect Wallet
                </h3>
                <p className="text-gray-600">
                  Connect your Solana wallet to get started
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Database className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">2. Scan Accounts</h3>
                <p className="text-gray-600">
                  We'll find empty token accounts you can clean
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">3. Recover SOL</h3>
                <p className="text-gray-600">
                  Clean accounts and get your SOL back
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-500">
            © 2025 SolCleaner. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
