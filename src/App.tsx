import React, { useState, useEffect } from 'react';
import { VersionedTransaction } from '@solana/web3.js';
import { Instagram, Linkedin, Github, X, Send } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import {
  Zap,
  Wallet,
  Database,
  TrendingUp,
  Loader2,
  Share2,
  History,
} from 'lucide-react';
import { TransactionMessage } from '@solana/web3.js';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createCloseAccountInstruction,
} from '@solana/spl-token';
import '@solana/wallet-adapter-react-ui/styles.css';
import { saveLog, fetchLogs, fetchDynamicStats } from './supabaseFunctions';
import AboutUs from './pages/AboutUs'; // Import About Us page

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

const socialLinks = [
  {
    name: 'Instagram',
    icon: Instagram,
    href: 'https://instagram.com/eliaskortbawii',
    color: 'hover:text-pink-600',
  },
  {
    name: 'LinkedIn',
    icon: Linkedin,
    href: 'https://www.linkedin.com/in/elias-kortbawi-6671bb196/',
    color: 'hover:text-blue-700',
  },
  {
    name: 'GitHub',
    icon: Github,
    href: 'https://github.com/supernetflix',
    color: 'hover:text-gray-700',
  },
  {
    name: 'X (Twitter)',
    icon: X,
    href: 'https://x.com/elias_cortbawi',
    color: 'hover:text-blue-400',
  },
  {
    name: 'Telegram',
    icon: Send,
    href: 'https://t.me/super_netflix',
    color: 'hover:text-blue-500',
  }, // New Telegram link
];
const DONATION_PERCENTAGE = 5;
const REFERRAL_PERCENTAGE = 5;
const DONATION_WALLET = new PublicKey(
  '9uPrBhLnv2mt4LV28G33tG1AinY16PpX4cy3dr7Q7aBZ'
);

function SuccessPopup({
  isVisible,
  onClose,
  accountsClosed,
  solRecovered,
}: {
  isVisible: boolean;
  onClose: () => void;
  accountsClosed: number;
  solRecovered: number;
}) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Success!</h2>
        <p className="text-gray-700 mb-4">
          You successfully closed <strong>{accountsClosed}</strong>{' '}
          {accountsClosed === 1 ? 'account' : 'accounts'} and recovered{' '}
          <strong>{solRecovered.toFixed(4)} SOL</strong>.
        </p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}

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
  onToggleAll,
  allSelected,
}: {
  accounts: TokenAccount[];
  onSelect: (pubkey: string) => void;
  onCloseAccounts: () => void;
  isClosing: boolean;
  onToggleAll: () => void;
  allSelected: boolean;
}) {
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
      {/* Transaction Summary at the Top */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Transaction Summary</h3>
        {selectedAccounts.length > 0 ? (
          <div className="space-y-2">
            {/* Added Selected/Total Accounts */}
            <div className="flex justify-between text-gray-600">
              <span>Accounts Selected</span>
              <span className="font-semibold">
                {selectedAccounts.length} / {accounts.length}
              </span>
            </div>

            {/* Total Recoverable SOL */}
            <div className="flex justify-between">
              <span>Total Recoverable SOL</span>
              <span className="font-semibold">{totalRentSol} SOL</span>
            </div>

            {/* Processing Fee */}
            <div className="flex justify-between text-gray-600">
              <span>Processing fee ({DONATION_PERCENTAGE}%)</span>
              <span>{donationAmount} SOL</span>
            </div>

            {/* You Receive */}
            <div className="flex justify-between font-bold text-purple-600 pt-2 border-t">
              <span>You Receive</span>
              <span>{userReceives} SOL</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">No accounts selected.</p>
        )}
      </div>

      {/* Select All Checkbox */}
      <div
        className="flex items-center mb-4 cursor-pointer"
        onClick={onToggleAll} // Trigger the toggle function when clicking anywhere in the row
      >
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(e) => e.stopPropagation()} // Prevent event bubbling from the checkbox
          className="h-4 w-4 text-purple-600"
        />
        <label className="ml-2 text-gray-800 font-medium">Select All</label>
      </div>

      {/* List of Accounts */}
      <div className="space-y-2">
        {accounts.length > 0 ? (
          accounts.map((account) => (
            <div
              key={account.pubkey}
              className={`bg-white p-4 rounded-lg shadow-sm flex justify-between items-center hover:bg-purple-50 ${
                account.selected ? 'ring-2 ring-purple-500' : ''
              }`}
              onClick={() => onSelect(account.pubkey)} // Parent row click
            >
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={account.selected}
                  onClick={(e) => e.stopPropagation()} // Prevent row click when checkbox is clicked
                  onChange={() => onSelect(account.pubkey)} // Handle checkbox toggle
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
          ))
        ) : (
          <div className="text-center text-gray-600">
            No empty token accounts found.
          </div>
        )}
      </div>
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
                    Closed {tx.accountsClosed}{' '}
                    {tx.accountsClosed === 1 ? 'account' : 'accounts'}
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

  const [allSelected, setAllSelected] = useState(false);

  const toggleAllAccounts = () => {
    setAllSelected((prev) => !prev);
    setEmptyAccounts((accounts) =>
      accounts.map((account) => ({ ...account, selected: !allSelected }))
    );
  };

  const fetchAndSetStats = async () => {
    try {
      console.log('Fetching dynamic stats...');

      // Fetch calculated stats from logs
      const statsFromLogs = await fetchDynamicStats();
      console.log('Fetched stats from logs:', statsFromLogs);

      // Ensure statsFromLogs contains valid data
      if (statsFromLogs) {
        setStats((prevStats) => ({
          totalSolRecovered: statsFromLogs.total_sol_recovered || 0,
          accountsNuked: statsFromLogs.total_accounts_nuked || 0,
          currentTPS: prevStats.currentTPS || 0, // Preserve current TPS value
        }));
        console.log('Stats updated successfully:', {
          totalSolRecovered: statsFromLogs.total_sol_recovered || 0,
          accountsNuked: statsFromLogs.total_accounts_nuked || 0,
        });
      } else {
        console.warn('Stats from logs are empty or invalid.');
        setStats((prevStats) => ({
          totalSolRecovered: 0,
          accountsNuked: 0,
          currentTPS: prevStats.currentTPS || 0, // Preserve current TPS value
        }));
      }
    } catch (error) {
      // Log and gracefully handle errors
      console.error('Error in fetchAndSetStats:', error.message || error);

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

  const closeSelectedAccounts = async (): Promise<void> => {
    if (!publicKey || isClosing) return;

    const selectedAccounts = emptyAccounts.filter((acc) => acc.selected);
    if (selectedAccounts.length === 0) return;

    setIsClosing(true);
    setError(null);

    try {
      let totalRentLamports = 0;
      const batches: TransactionInstruction[][] = [];
      let currentBatch: TransactionInstruction[] = [];

      // Prepare batches of up to 15 accounts
      selectedAccounts.forEach((account, index) => {
        totalRentLamports += account.rentLamports;
        currentBatch.push(
          createCloseAccountInstruction(
            new PublicKey(account.pubkey),
            publicKey,
            publicKey
          )
        );

        if ((index + 1) % 18 === 0 || index === selectedAccounts.length - 1) {
          batches.push([...currentBatch]);
          currentBatch = [];
        }
      });

      // Calculate donation and referral amounts
      const donationAmount = Math.floor(
        (totalRentLamports * DONATION_PERCENTAGE) / 100
      );
      const params = new URLSearchParams(window.location.search);
      const referrer = params.get('ref'); // Get referrer wallet from URL

      let referralAmount = 0;
      let donationAfterReferral = donationAmount;

      if (referrer) {
        referralAmount = Math.floor(
          (donationAmount * REFERRAL_PERCENTAGE) / 100
        );
        donationAfterReferral = donationAmount - referralAmount; // Deduct referral amount from donation
      }

      // Add donation transfer instruction
      if (donationAfterReferral > 0) {
        batches.push([
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: DONATION_WALLET,
            lamports: donationAfterReferral,
          }),
        ]);
      }

      // Add referral transfer instruction if applicable
      if (referrer && referralAmount > 0) {
        batches.push([
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(referrer),
            lamports: referralAmount,
          }),
        ]);
      }

      // Prepare transactions for all batches
      const transactions = await Promise.all(
        batches.map(async (instructions) => {
          const message = new TransactionMessage({
            payerKey: publicKey,
            recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
            instructions, // Instructions for this batch
          }).compileToV0Message();

          return new VersionedTransaction(message);
        })
      );

      // Phantom's method to sign all transactions
      const signedTransactions = await (
        window as any
      ).phantom.solana.signAllTransactions(transactions);
      console.log('Transactions signed successfully.');

      // Send all signed transactions
      const sendResults = await Promise.all(
        signedTransactions.map((tx: VersionedTransaction) =>
          connection.sendRawTransaction(tx.serialize())
        )
      );

      // Confirm all transactions
      await Promise.all(
        sendResults.map((signature: string) =>
          connection.confirmTransaction(signature, 'finalized')
        )
      );

      const solRecovered = totalRentLamports / LAMPORTS_PER_SOL;
      const accountsClosed = selectedAccounts.length;

      // Save log and update stats
      // Log the first transaction signature as an example
      await saveLog(
        `Recovered ${solRecovered.toFixed(
          4
        )} SOL from ${accountsClosed} accounts in ${
          batches.length
        } transactions.`,
        sendResults.join(', '), // Join all transaction signatures into a string
        publicKey.toString(),
        solRecovered,
        accountsClosed
      );

      await scanAccounts(); // Refresh empty accounts
      setPopupData({ accountsClosed, solRecovered });
      setIsPopupVisible(true);
      console.log(
        `All ${accountsClosed} accounts closed successfully in ${batches.length} transactions.`
      );
    } catch (err: any) {
      console.error('Error closing accounts:', err);
      setError(err.message || 'Failed to close accounts. Please try again.');
    } finally {
      setIsClosing(false);
    }
  };

  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupData, setPopupData] = useState({
    accountsClosed: 0,
    solRecovered: 0,
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        await fetchAndSetStats();
        await fetchAndSetLogs(); // Add your second function here
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchInitialData();

    // Set up intervals for both fetches
    const statsInterval = setInterval(fetchAndSetStats, 3000);
    const logsInterval = setInterval(fetchAndSetLogs, 5000); // Example interval for logs

    // Cleanup intervals on component unmount
    return () => {
      clearInterval(statsInterval);
      clearInterval(logsInterval);
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
        <nav className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <img
                  src="/logo.jpg"
                  alt="SolCleaner Logo"
                  className="w-10 h-10"
                />
                <Link
                  to="/"
                  className="ml-2 text-xl font-bold text-gray-800 hover:text-purple-600"
                >
                  SolCleaner
                </Link>
              </div>

              <div className="flex items-center space-x-6">
                <Link
                  to="/about"
                  className="text-gray-600 hover:text-purple-600 font-medium"
                >
                  About Us
                </Link>
                <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
              </div>
            </div>
          </div>
        </nav>

        {/* Success Popup */}
        <SuccessPopup
          isVisible={isPopupVisible}
          onClose={() => setIsPopupVisible(false)}
          accountsClosed={popupData.accountsClosed}
          solRecovered={popupData.solRecovered}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Routes>
            {/* Home Page */}
            <Route
              path="/"
              element={
                <div>
                  <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                      Clean Your Solana Token Accounts
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                      Recover SOL from empty token accounts safely and
                      efficiently. Connect your wallet to start cleaning and
                      claim your SOL back.
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
                      title="Tokens Closed"
                      value={stats.accountsNuked.toString()}
                    />
                    <StatsCard
                      icon={TrendingUp}
                      title="Current TPS"
                      value={stats.currentTPS.toString()}
                    />
                  </div>

                  {publicKey ? (
                    <div className="bg-white rounded-lg shadow-md p-8 mb-8">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                          Your Empty Token Accounts
                        </h2>
                        <div className="flex items-center space-x-4">
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
                              'Scan Accounts'
                            )}
                          </button>

                          <button
                            onClick={closeSelectedAccounts}
                            disabled={
                              isClosing ||
                              !emptyAccounts.some((acc) => acc.selected)
                            }
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            {isClosing ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Closing...
                              </>
                            ) : (
                              'Close Selected Accounts'
                            )}
                          </button>
                        </div>
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
                          onToggleAll={toggleAllAccounts}
                          allSelected={allSelected}
                        />
                      )}
                    </div>
                  ) : null}

                  <TransactionHistorySection
                    history={history}
                    isLoading={isScanning}
                  />
                  {publicKey ? (
                    <ReferralSection walletAddress={publicKey.toString()} />
                  ) : null}
                </div>
              }
            />

            {/* About Us Page */}
            <Route path="/about" element={<AboutUs />} />
          </Routes>
        </main>

        <footer className="bg-white border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
                Connect With Us
              </h3>
              <ul className="mt-4 flex justify-center space-x-6">
                {socialLinks.map((social) => (
                  <li key={social.name}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-gray-400 transition-colors ${social.color}`}
                      title={social.name}
                    >
                      <social.icon className="h-6 w-6" />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-base text-gray-400">
                © {new Date().getFullYear()} SolCleaner. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
