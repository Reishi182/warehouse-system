import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..', 'src');

function walkDir(dir) {
    const results = [];
    for (const item of readdirSync(dir)) {
        const fullPath = join(dir, item);
        if (statSync(fullPath).isDirectory()) {
            results.push(...walkDir(fullPath));
        } else if (item.endsWith('.tsx')) {
            results.push(fullPath);
        }
    }
    return results;
}

const files = walkDir(srcDir).filter(f => {
    const c = readFileSync(f, 'utf8');
    return c.includes("from '@/components/ui/dialog'");
});

console.log(`\n=== Dialog Migration Analysis ===`);
console.log(`Found ${files.length} files\n`);

const simple = [], complex = [], withAlertDialog = [];

for (const f of files) {
    const content = readFileSync(f, 'utf8');
    const rel = relative(join(__dirname, '..'), f);
    const dialogCount = (content.match(/<Dialog\s+open=/g) || []).length;
    const hasAlertDialog = content.includes('AlertDialog');
    const hasGradient = content.includes('bg-gradient');
    const hasP0Flex = content.includes('p-0') && (content.includes('flex flex-col') || content.includes('overflow-hidden'));
    const isComplex = dialogCount > 2 || hasGradient || hasP0Flex;

    const info = { rel, dialogCount, isComplex };

    if (hasAlertDialog) withAlertDialog.push(info);
    else if (dialogCount === 1 && !isComplex) simple.push(info);
    else complex.push(info);
}

console.log(`📗 SIMPLE (1 dialog, standard layout): ${simple.length}`);
simple.forEach(f => console.log(`   ${f.rel}`));

console.log(`\n📙 COMPLEX (multiple/custom dialogs): ${complex.length}`);
complex.forEach(f => console.log(`   ${f.rel} [${f.dialogCount} dialogs, complex:${f.isComplex}]`));

console.log(`\n📕 HAS AlertDialog (skip/manual): ${withAlertDialog.length}`);
withAlertDialog.forEach(f => console.log(`   ${f.rel}`));

writeFileSync(
    join(__dirname, 'migration-report.json'),
    JSON.stringify({ simple: simple.map(f=>f.rel), complex: complex.map(f=>({...f})), withAlertDialog: withAlertDialog.map(f=>f.rel) }, null, 2)
);
console.log(`\nReport → scripts/migration-report.json`);
