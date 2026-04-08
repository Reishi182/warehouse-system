const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const lines = envFile.split('\n');
let url = '', key = '';
for (const line of lines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/"/g, '');
  if (line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) key = line.split('=')[1].trim().replace(/"/g, '');
}

const supabase = createClient(url, key);
async function test() {
  const { data, error } = await supabase.from('stock_logs').insert([{
    product_id: '00000000-0000-0000-0000-000000000000',
    type: 'in',
    quantity: 1,
    location: 'gudang',
    user_id: '00000000-0000-0000-0000-000000000000',
    reference_type: 'purchase_order',
    reference_id: '00000000-0000-0000-0000-000000000000'
  }]);
  console.log('Error:', error);
}
test();
