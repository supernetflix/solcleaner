import React from 'react';

export function SuccessPopup({
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

  const donationAmount = solRecovered * 0.05; // 5% donation
  const userReceives = solRecovered - donationAmount; // Amount user actually gets

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-50">
          Success!
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          You successfully {actionType} <strong>{accountsClosed}</strong>{' '}
          {accountsClosed === 1 ? 'account' : 'accounts'} and recovered:
        </p>
        <p className="text-lg text-gray-800 dark:text-gray-200">
          <strong>Total Recovered: {userReceives.toFixed(5)} SOL</strong>
        </p>
        <button
          onClick={onClose}
          className="block w-full mt-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}



/** Stats Card */
export function StatsCard({
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
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          {title}
        </h3>
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

export function TransactionHistorySection({
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Transaction History
        </h2>
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
export function ReferralSection({ walletAddress }: { walletAddress: string }) {
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Your Referral Link
        </h2>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Share your referral link and earn {REFERRAL_PERCENTAGE}% of donations
        from referred users!
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
