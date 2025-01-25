import React from 'react';

export default function AboutUs() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-6 text-center">About Us</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Executive Summary</h2>
        <p className="text-gray-700 leading-relaxed">
          The Solana blockchain is a thriving ecosystem with millions of SPL token accounts. 
          However, many users face difficulties managing and closing unnecessary token accounts, 
          leading to inefficiencies in wallet management and wasted SOL. 
          <strong>SolCleaner</strong> addresses this issue with an intuitive, automated tool that allows 
          users to close unused SPL token accounts, earn SOL rewards, and contribute to the ecosystem’s sustainability.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Problem Statement</h2>
        <p className="text-gray-700 leading-relaxed">
          As the Solana ecosystem grows, the number of SPL token accounts per user has skyrocketed. 
          Many accounts hold little to no value, taking up space in users' wallets and consuming network resources. 
          Closing these accounts manually can be time-consuming and costly, discouraging users from maintaining a clean wallet structure.
        </p>
        <ul className="list-disc pl-6 text-gray-700 mt-4">
          <li><strong>Cluttered Wallets:</strong> Users often struggle with excessive, unused token accounts.</li>
          <li><strong>Manual Process:</strong> Closing accounts manually involves a cumbersome and inefficient process.</li>
          <li><strong>Lack of Incentives:</strong> Users see no immediate benefit in cleaning up their wallets.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">The SolCleaner Solution</h2>
        <p className="text-gray-700 leading-relaxed">
          SolCleaner is a streamlined platform that automates the closure of SPL token accounts, 
          providing users with financial incentives while optimizing wallet management.
        </p>
        <ol className="list-decimal pl-6 text-gray-700 mt-4">
          <li><strong>Connect Your Wallet:</strong> Users securely connect their Phantom Wallet or any Solana-compatible wallet to SolCleaner.</li>
          <li><strong>Automated Account Closure:</strong> The platform scans for unused SPL token accounts and automatically closes them.</li>
          <li><strong>Earn Rewards:</strong> Users receive 0.002 SOL for each closed account as a reward.</li>
          <li><strong>Support the Platform:</strong> A small 5% Processing fee (0.0001 SOL) per account supports the ongoing development and maintenance of SolCleaner.</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Key Benefits</h2>
        <ul className="list-disc pl-6 text-gray-700 mt-4">
          <li><strong>Streamlined Wallet Management:</strong> Quickly clean up wallets without the hassle of manual processes.</li>
          <li><strong>Financial Incentives:</strong> Earn SOL for every unused SPL token account closed.</li>
          <li><strong>Eco-Friendly:</strong> Reduces network congestion and enhances blockchain efficiency.</li>
          <li><strong>User-Friendly Interface:</strong> A seamless platform for both beginners and experienced users.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Future Plans</h2>
        <p className="text-gray-700 leading-relaxed">
          SolCleaner is just the beginning of a broader vision for optimizing wallet management on Solana. Planned upgrades include:
        </p>
        <ul className="list-disc pl-6 text-gray-700 mt-4">
          <li>Multi-Wallet Support: Expanding compatibility to additional Solana wallets.</li>
          <li>Batch Processing: Allowing users to close multiple accounts in a single transaction for efficiency.</li>
          <li>Analytics Dashboard: Providing insights into users’ wallets and token activity.</li>
          <li>Community Involvement: Implementing features based on user feedback to ensure ongoing relevance and utility.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Conclusion & Call to Action</h2>
        <p className="text-gray-700 leading-relaxed">
          SolCleaner is more than a tool—it’s a movement to improve wallet efficiency, reward users, and give back to the ecosystem. 
          By participating, users can take control of their wallets, earn SOL, and contribute to the Solana community's growth.
        </p>
        <p className="text-gray-700 leading-relaxed mt-4">
          Ready to clean up your wallet? Visit <a href="https://solcleaner.netlify.app/" className="text-purple-600 hover:underline" target="_blank" rel="noopener noreferrer">SolCleaner</a> today and start earning while decluttering!
        </p>
      </section>
    </div>
  );
}
