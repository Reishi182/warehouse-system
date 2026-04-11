const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const lines = envFile.split('\n');
let url = '', key = '';
for (const line of lines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/"/g, '');
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/"/g, '');
}

const supabase = createClient(url, key);

async function run() {
  // Use RPC if possible, but actually we can't run DDL easily from anon key unless it's service role or there's an RPC.
  // We'll check if they exist by selecting them.
  const { data, error } = await supabase.from('sales').select('amount_cash').limit(1);
  if (error && error.code === 'PGRST200') {
    console.log("Column doesn't exist, we need to create it.");
  } else {
    console.log("Column exists or other error:", error || "Success");
  }
}
run();
