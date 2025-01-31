// src/components/SuccessPopup.tsx
import React from 'react';

function SuccessPopup({
  isVisible,
  onClose,
  accountsClosed,
  solRecovered,
  actionType = 'closed',
}: {
  isVisible: boolean;
  onClose: () => void;
  accountsClosed: number;
  solRecovered: number;
  actionType?: 'closed' | 'burned' | 'locked' | string;
}) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm w-full">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Success!
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          You successfully {actionType} <strong>{accountsClosed}</strong>{' '}
          {accountsClosed === 1 ? 'account' : 'accounts'} 
          {actionType === 'closed' ? ' and recovered ' : ' with '}
          <strong>{solRecovered.toFixed(4)} SOL</strong>
          {actionType === 'closed' && ' of rent.'}
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

export default SuccessPopup;
