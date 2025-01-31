import React, { useState, useEffect } from 'react';
import {
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Connection,
  VersionedTransaction,
  TransactionMessage,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getMint,
  createBurnInstruction,
  createCloseAccountInstruction,
} from '@solana/spl-token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

import { fetchLogs, fetchDynamicStats, saveLog } from '../supabaseFunctions';

// ----------------------------------------------------------------------------------
// 1) Inline Components
// ----------------------------------------------------------------------------------

/** Success Popup */
function SuccessPopup({
  isVisible,
  onClose,
  accountsClosed,
  solRecovered,
  actionType = 'burned',
}: {
  isVisible: boolean;
  onClose: () => void;
  accountsClosed: number;
  solRecovered: number;
  actionType?: string;
}) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-50">Success!</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          You successfully {actionType}{' '}
          <strong>{accountsClosed}</strong> {accountsClosed === 1 ? 'account' : 'accounts'} and
          recovered <strong>{solRecovered.toFixed(4)} SOL</strong>.
        </p>
        <button
          onClick={onClose}
          className="block w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}

/** Stats Card */
function StatsCard({
  icon: Icon,
  title,
  value,
}: {
  icon?: React.ElementType;
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-colors duration-200">
      <div className="flex items-center space-x-3 mb-2">
        {Icon ? <Icon className="w-6 h-6 text-purple-600" /> : null}
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
      </div>
      <p className="text-2xl font-bold text-purple-600">{value}</p>
    </div>
  );
}

/** Transaction History Section */
interface TransactionHistory {
  date: string;
  accountsClosed: number;
  solRecovered: number;
  walletAddress: string;
}

function TransactionHistorySection({
  history,
  isLoading,
}: {
  history: TransactionHistory[];
  isLoading: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8 transition-colors duration-200">
      <div className="flex items-center space-x-3 mb-4">
        <svg
          className="w-6 h-6 text-purple-600"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 6h13M8 12h9m-9 6h13M3 6h.01M3 12h.01M3 18h.01"
          />
        </svg>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Transaction History</h2>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-600 dark:text-gray-400">
          Loading transaction history...
        </div>
      ) : history.length > 0 ? (
        <div className="space-y-4">
          {history.map((tx, index) => (
            <div key={index} className="border-b dark:border-gray-700 pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(tx.date).toLocaleString()}
                  </p>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    Closed {tx.accountsClosed}{' '}
                    {tx.accountsClosed === 1 ? 'account' : 'accounts'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Wallet:{' '}
                    <a
                      href={`https://solscan.io/account/${tx.walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 underline"
                    >
                      {tx.walletAddress.slice(0, 5)}...
                      {tx.walletAddress.slice(-3)}
                    </a>
                  </p>
                </div>
                <p className="text-purple-600 dark:text-purple-400 font-bold">
                  {tx.solRecovered.toFixed(4)} SOL
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-600 dark:text-gray-400">
          No transaction history found yet.
        </div>
      )}
    </div>
  );
}

/** Referral Section */
function ReferralSection({ walletAddress }: { walletAddress: string }) {
  const REFERRAL_PERCENTAGE = 5;
  const referralLink = `${window.location.origin}?ref=${walletAddress}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8 transition-colors duration-200">
      <div className="flex items-center space-x-3 mb-4">
        <svg
          className="w-6 h-6 text-purple-600"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v16c0 .552.448 1 1 1h14a1 1 0 001-1V4m-2 0H6"
          />
        </svg>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Referral Link</h2>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Share your referral link and earn {REFERRAL_PERCENTAGE}% of donations from referred users!
      </p>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={referralLink}
          readOnly
          className="flex-1 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
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

// ----------------------------------------------------------------------------------
// 2) BurnPage Implementation
// ----------------------------------------------------------------------------------

const MAX_PER_TX = 256; // chunk size
const DONATION_PERCENTAGE = 5;
const REFERRAL_PERCENTAGE = 5;
const DONATION_WALLET = new PublicKey('9uPrBhLnv2mt4LV28G33tG1AinY16PpX4cy3dr7Q7aBZ');

interface TokenAccount {
  pubkey: string;
  mint: string;
  rentLamports: number;
  uiAmount: number;
  decimals: number;
  selected?: boolean;
}

function BurnPage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  // Token Accounts
  const [tokenAccounts, setTokenAccounts] = useState<TokenAccount[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isBurning, setIsBurning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection
  const [allSelected, setAllSelected] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);

  // Chunking progress
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);

  // Stats & History
  const [stats, setStats] = useState({
    totalSolRecovered: 0,
    accountsNuked: 0,
    currentTPS: 0,
  });
  const [history, setHistory] = useState<TransactionHistory[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Success Popup
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupData, setPopupData] = useState({ accountsClosed: 0, solRecovered: 0 });

  // Confirm modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // ------------------------------------------------------------------------------
  // 2a) Stats & Logs
  // ------------------------------------------------------------------------------
  const fetchAndSetStats = async () => {
    try {
      const statsFromDB = await fetchDynamicStats();
      if (statsFromDB) {
        setStats((prev) => ({
          ...prev,
          totalSolRecovered: statsFromDB.total_sol_recovered || 0,
          accountsNuked: statsFromDB.total_accounts_nuked || 0,
        }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAndSetLogs = async () => {
    try {
      setIsHistoryLoading(true);
      const logsFromDB = await fetchLogs();
      if (logsFromDB) {
        const mapped = logsFromDB.map((log: any) => ({
          date: log.date || new Date().toISOString(),
          accountsClosed: log.accountsClosed || 0,
          solRecovered: log.solRecovered || 0,
          walletAddress: log.walletAddress || 'Unknown',
        }));
        setHistory(mapped);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const fetchTPS = async () => {
    try {
      const recentPerf = await connection.getRecentPerformanceSamples(1);
      if (recentPerf && recentPerf.length > 0) {
        const { samplePeriodSecs, numTransactions } = recentPerf[0];
        const tps = Math.round(numTransactions / samplePeriodSecs);
        setStats((prev) => ({ ...prev, currentTPS: tps }));
      } else {
        setStats((prev) => ({ ...prev, currentTPS: 0 }));
      }
    } catch (err) {
      console.error('Error fetching TPS:', err);
      setStats((prev) => ({ ...prev, currentTPS: 0 }));
    }
  };

  useEffect(() => {
    fetchAndSetStats();
    fetchAndSetLogs();
    fetchTPS();

    const statsInterval = setInterval(() => {
      fetchAndSetStats();
      fetchTPS();
    }, 5000);

    const logsInterval = setInterval(() => {
      fetchAndSetLogs();
    }, 10000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(logsInterval);
    };
  }, []);

  // ------------------------------------------------------------------------------
  // 3) SCAN non-zero token accounts (for burning)
  // ------------------------------------------------------------------------------
  const scanAccounts = async () => {
    if (!publicKey) {
      setError('Wallet not connected');
      return;
    }
    setError(null);
    setIsScanning(true);

    try {
      const resp = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
      });

      const nonZeroAccounts: TokenAccount[] = [];
      for (const { pubkey, account } of resp.value) {
        const parsedInfo = account.data.parsed.info;
        const uiAmount = parsedInfo.tokenAmount.uiAmount;
        const decimals = parsedInfo.tokenAmount.decimals;
        const mint = parsedInfo.mint;
        const rentLamports = account.lamports;

        if (uiAmount && uiAmount > 0) {
          const mintInfo = await getMint(connection, new PublicKey(mint));
          nonZeroAccounts.push({
            pubkey: pubkey.toString(),
            mint,
            rentLamports,
            uiAmount,
            decimals: mintInfo.decimals,
            selected: false,
          });
        }
      }

      setTokenAccounts(nonZeroAccounts);
      if (nonZeroAccounts.length === 0) {
        setError('No non-zero token accounts found.');
      }
    } catch (err: any) {
      console.error('Error scanning accounts:', err);
      setError(err.message || 'Failed to scan accounts');
    } finally {
      setIsScanning(false);
    }
  };

  // ------------------------------------------------------------------------------
  // 4) SELECT / DESELECT
  // ------------------------------------------------------------------------------
  const toggleSingleSelection = (pubkey: string) => {
    if (isBurning) return;
    setTokenAccounts((prev) => {
      const newList = [...prev];
      const idx = newList.findIndex((acc) => acc.pubkey === pubkey);
      if (idx !== -1) {
        newList[idx].selected = !newList[idx].selected;
      }
      return newList;
    });
  };

  const toggleSelectAll = () => {
    if (isBurning) return;
    const newVal = !allSelected;
    setAllSelected(newVal);
    setTokenAccounts((prev) => prev.map((acc) => ({ ...acc, selected: newVal })));
  };

  useEffect(() => {
    const count = tokenAccounts.filter((acc) => acc.selected).length;
    setSelectedCount(count);

    if (tokenAccounts.length > 0 && count === tokenAccounts.length) {
      setAllSelected(true);
    } else {
      setAllSelected(false);
    }
  }, [tokenAccounts]);

  // ------------------------------------------------------------------------------
  // 5) BURN SELECTED
  // ------------------------------------------------------------------------------
  const burnSelected = async () => {
    if (!publicKey) {
      setError('Wallet not connected');
      return;
    }
    if (selectedCount === 0) {
      setError('No accounts selected');
      return;
    }
    setError(null);

    // Show confirm modal
    setShowConfirmModal(true);
  };

  const onConfirmBurn = async () => {
    setShowConfirmModal(false);

    const selected = tokenAccounts.filter((acc) => acc.selected);
    setIsBurning(true);
    setError(null);

    // Chunk the selection if > 256
    const chunked: TokenAccount[][] = [];
    for (let i = 0; i < selected.length; i += MAX_PER_TX) {
      chunked.push(selected.slice(i, i + MAX_PER_TX));
    }

    setTotalChunks(chunked.length);
    setCurrentChunkIndex(0);

    let totalLamportsRecovered = 0;
    let totalClosed = 0;

    try {
      for (let i = 0; i < chunked.length; i++) {
        const chunk = chunked[i];
        await burnOneChunk(chunk);

        // Stats for this chunk
        const lamports = chunk.reduce((sum, acc) => sum + acc.rentLamports, 0);
        totalLamportsRecovered += lamports;
        totalClosed += chunk.length;

        setCurrentChunkIndex(i + 1);
      }

      // Refresh
      await scanAccounts();

      // Show final success
      const solRecovered = totalLamportsRecovered / LAMPORTS_PER_SOL;
      setPopupData({ accountsClosed: totalClosed, solRecovered });
      setIsPopupVisible(true);
    } catch (err: any) {
      console.error('Burn error:', err);
      setError(err.message || 'Failed to burn tokens');
    } finally {
      setIsBurning(false);
    }
  };

  // (Helper) Build & Send one chunk
  const burnOneChunk = async (chunk: TokenAccount[]) => {
    if (!publicKey) throw new Error('No wallet');

    let totalRentLamports = 0;
    const instructions = [];

    // a) Build instructions
    for (const acc of chunk) {
      totalRentLamports += acc.rentLamports;

      // Burn everything
      instructions.push(
        createBurnInstruction(
          new PublicKey(acc.pubkey),
          new PublicKey(acc.mint),
          publicKey,
          Math.floor(acc.uiAmount * 10 ** acc.decimals)
        )
      );

      // Close account
      instructions.push(
        createCloseAccountInstruction(new PublicKey(acc.pubkey), publicKey, publicKey)
      );
    }

    // b) Donation / Referral
    const donationAmount = Math.floor((totalRentLamports * DONATION_PERCENTAGE) / 100);
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');

    let referralAmount = 0;
    let donationAfterReferral = donationAmount;
    if (ref) {
      referralAmount = Math.floor((donationAmount * REFERRAL_PERCENTAGE) / 100);
      donationAfterReferral = donationAmount - referralAmount;
    }

    if (donationAfterReferral > 0) {
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: DONATION_WALLET,
          lamports: donationAfterReferral,
        })
      );
    }
    if (ref && referralAmount > 0) {
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(ref),
          lamports: referralAmount,
        })
      );
    }

    // c) Build versioned tx
    const latestBlockhash = await connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message();
    const transactionV0 = new VersionedTransaction(messageV0);

    // d) Send
    const signature = await sendTransaction(transactionV0, connection);
    await connection.confirmTransaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature,
    });

    // e) Log chunk
    const solRecovered = totalRentLamports / LAMPORTS_PER_SOL;
    await saveLog(
      `Chunk: Burned & closed ${chunk.length} accounts. Recovered ${solRecovered.toFixed(4)} SOL.`,
      signature,
      publicKey.toBase58(),
      solRecovered,
      chunk.length
    );
  };

  // Close popup
  const closeSuccessPopup = () => setIsPopupVisible(false);

  // ------------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
        Burn & Close Token Accounts
      </h1>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total SOL Recovered"
          value={`${stats.totalSolRecovered.toFixed(2)} SOL`}
        />
        <StatsCard
          title="Tokens Closed"
          value={`${stats.accountsNuked}`}
        />
        <StatsCard
          title="Current TPS"
          value={`${stats.currentTPS}`}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={scanAccounts}
          disabled={isScanning}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {isScanning ? 'Scanning...' : 'Scan Token Accounts'}
        </button>
        <button
          onClick={burnSelected}
          disabled={!selectedCount || isBurning}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {isBurning ? 'Burning...' : 'Burn Selected'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Progress Bar (if chunking) */}
      {isBurning && totalChunks > 1 && (
        <div className="mb-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
            Processing chunk {currentChunkIndex} / {totalChunks}...
          </p>
          <div className="w-full bg-gray-300 h-2 rounded mt-1">
            <div
              className="bg-green-500 h-2 rounded"
              style={{ width: `${(currentChunkIndex / totalChunks) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Token Accounts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8 transition-colors duration-200">
        <div className="flex items-center mb-3">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            disabled={isBurning}
            className="h-4 w-4"
          />
          <label className="ml-2 font-medium text-gray-700 dark:text-gray-200">
            Select All
          </label>
          <span className="ml-4 text-sm text-gray-600 dark:text-gray-400">
            Selected: {selectedCount} / {tokenAccounts.length}
          </span>
        </div>

        {tokenAccounts.length > 0 ? (
          <div className="space-y-2">
            {tokenAccounts.map((acc) => (
              <div
                key={acc.pubkey}
                className={`border p-3 rounded flex items-center justify-between ${
                  acc.selected
                    ? 'bg-indigo-50 dark:bg-gray-700'
                    : 'bg-white dark:bg-gray-800'
                }`}
                onClick={() => toggleSingleSelection(acc.pubkey)}
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={acc.selected || false}
                    onChange={(e) => e.stopPropagation()}
                    disabled={isBurning}
                    className="h-4 w-4"
                  />
                  <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                    {acc.pubkey.slice(0, 4)}...{acc.pubkey.slice(-4)}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-purple-600">
                    {acc.uiAmount.toFixed(3)} tokens
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Rent: {(acc.rentLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">No token accounts found.</p>
        )}
      </div>

      {/* Transaction History */}
      <TransactionHistorySection history={history} isLoading={isHistoryLoading} />

      {/* Referral Link */}
      {publicKey && <ReferralSection walletAddress={publicKey.toBase58()} />}

      {/* Success Popup */}
      <SuccessPopup
        isVisible={isPopupVisible}
        onClose={(): void => setIsPopupVisible(false)}
        accountsClosed={popupData.accountsClosed}
        solRecovered={popupData.solRecovered}
        actionType="burned"
      />

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-gray-800 rounded p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold mb-3 text-gray-800 dark:text-gray-50">
              Confirm Burn
            </h2>
            {selectedCount > MAX_PER_TX ? (
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                You selected <strong>{selectedCount}</strong> token accounts, exceeding {MAX_PER_TX}.
                We'll split them into multiple chunks, so you'll sign multiple times. Continue?
              </p>
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                You're about to burn tokens in <strong>{selectedCount}</strong> account(s).
                This will also close the accounts and recover rent. Continue?
              </p>
            )}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmBurn}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BurnPage;
