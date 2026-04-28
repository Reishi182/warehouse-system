/**
 * apply-cancel-migration.cjs
 * Applies the sales cancellation migration to Supabase.
 * Run: node scripts/apply-cancel-migration.cjs
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://hssgofbwjzntytmfnqoz.supabase.co';

// Needs service_role key — get from: Supabase Dashboard → Project Settings → API
// Pass as env var: SUPABASE_SERVICE_KEY=xxx node scripts/apply-cancel-migration.cjs
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
    console.error('\n❌ Missing SUPABASE_SERVICE_KEY environment variable.');
    console.error('   Get it from: Supabase Dashboard → Project Settings → API → service_role');
    console.error('\n   Run as:');
    console.error('   $env:SUPABASE_SERVICE_KEY="your_key_here"; node scripts/apply-cancel-migration.cjs\n');
    process.exit(1);
}

// ── SQL to execute ────────────────────────────────────────────────────────────
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260428_add_sales_cancellation.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

// ── Execute via Supabase REST API ─────────────────────────────────────────────
function runSQL(query) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query });
        const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);

        // Use pg endpoint directly (Management API)
        const options = {
            hostname: 'hssgofbwjzntytmfnqoz.supabase.co',
            path: '/pg/query',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function main() {
    console.log('\n🚀 Applying sales cancellation migration...\n');
    console.log('SQL file:', migrationPath);
    console.log('Target:', SUPABASE_URL);
    console.log('\n─────────────────────────────────────────────────\n');

    const { status, body } = await runSQL(sql);

    if (status >= 200 && status < 300) {
        console.log('✅ Migration applied successfully!\n');
        console.log('Columns added to sales table:');
        console.log('  • is_cancelled (boolean)');
        console.log('  • cancelled_reason (text)');
        console.log('  • cancelled_at (timestamptz)');
        console.log('  • cancelled_by (uuid)');
        console.log('  • cancelled_by_name (text)');
        console.log('\nRPC function created: cancel_sale(p_sale_id, p_cancel_reason, p_user_id, p_user_name)');
        console.log('\n✨ Kasir sekarang bisa membatalkan transaksi dari POS → Riwayat → Cancel\n');
    } else {
        console.error('❌ Migration failed (HTTP', status, ')');
        console.error(JSON.stringify(body, null, 2));
        console.log('\n💡 Tip: Copy & paste the SQL manually into Supabase SQL Editor instead.');
        console.log('   File:', migrationPath);
        process.exit(1);
    }
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
