import supabase from './supabaseClient';

interface Stats {
  total_accounts_nuked: number;
  total_sol_recovered: number;
  current_tps?: number;
}

// Save Logs
export async function saveLog(
  action: string,
  details: string,
  walletAddress: string,
  solRecovered: number,
  accountsClosed: number
) {
  try {
    const { data, error } = await supabase.from('logs').insert([
      {
        action,
        details,
        wallet_address: walletAddress, // Include wallet address
        sol_recovered: solRecovered,
        accounts_closed: accountsClosed,
      },
    ]);

    if (error) {
      console.error('Error saving log:', error.message);
      throw new Error(`Failed to save log: ${error.message}`);
    }

    console.log('Log saved successfully:', data);
    return data;
  } catch (err) {
    console.error('Unexpected error in saveLog:', err);
    throw err;
  }
}

// Update Stats
export async function updateStats(accountsNuked: number, solRecovered: number) {
  try {
    const { data, error } = await supabase
      .from('stats')
      .update({
        total_accounts_nuked: supabase.raw('total_accounts_nuked + ?', [accountsNuked]),
        total_sol_recovered: supabase.raw('total_sol_recovered + ?', [solRecovered]),
      })
      .eq('id', 1); // Assuming stats row has id = 1

    if (error) {
      console.error('Error updating stats:', error.message);
      throw new Error('Failed to update stats in Supabase.');
    }

    console.log('Stats updated successfully:', data);
    return data;
  } catch (err) {
    console.error('Unexpected error in updateStats:', err);
    throw err;
  }
}


export async function fetchLogs() {
  const { data, error } = await supabase
    .from('logs')
    .select('date, sol_recovered, accounts_closed, wallet_address') // Fetch the necessary columns
    .order('date', { ascending: false }) // Order by date descending
    .range(0, 9); // Fetch only the first 10 rows (0-based index)

  if (error) {
    console.error('Error fetching logs from Supabase:', error);
    throw error;
  }

  return data.map((log) => ({
    date: log.date || new Date().toISOString(),
    accountsClosed: log.accounts_closed || 0,
    solRecovered: log.sol_recovered || 0.0,
    walletAddress: log.wallet_address || 'Anonymous',
  }));
}


export async function fetchDynamicStats() {
  try {
    const { data, error } = await supabase
      .from('logs')
      .select('*'); // Fetch all logs

    if (error) {
      console.error('Error fetching logs for stats:', error.message);
      throw new Error('Failed to fetch stats from logs.');
    }

    console.log('Fetched logs:', data); // Debug: Log fetched data

    // Handle empty or undefined data
    if (!data || data.length === 0) {
      console.warn('No logs found in the database.');
      return {
        total_sol_recovered: 0,
        total_accounts_nuked: 0,
      };
    }

    // Calculate totals
    const totalSolRecovered = data.reduce((sum, log) => {
      if (log.sol_recovered) {
        return sum + log.sol_recovered;
      }
      return sum; // Skip logs without sol_recovered
    }, 0);

    const totalAccountsNuked = data.reduce((sum, log) => {
      if (log.accounts_closed) {
        return sum + log.accounts_closed;
      }
      return sum; // Skip logs without accounts_closed
    }, 0);

    console.log('Calculated totals:', {
      total_sol_recovered: totalSolRecovered,
      total_accounts_nuked: totalAccountsNuked,
    });

    return {
      total_sol_recovered: totalSolRecovered,
      total_accounts_nuked: totalAccountsNuked,
    };
  } catch (err) {
    console.error('Unexpected error in fetchDynamicStats:', err);
    throw err;
  }
}
