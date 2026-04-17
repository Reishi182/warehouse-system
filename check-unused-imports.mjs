import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd() + '/src';
const results = [];

function getAllFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...getAllFiles(full));
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

const files = getAllFiles(ROOT);

for (const file of files) {
  const content = readFileSync(file, 'utf-8');
  const relPath = relative(process.cwd(), file).replace(/\\/g, '/');

  // Match: import { A, B as C, D } from '...'
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importBlock = match[1];
    const names = importBlock.split(',').map(n => {
      const trimmed = n.trim();
      // handle "X as Y" -> use alias Y
      const asMatch = trimmed.match(/^\w+\s+as\s+(\w+)$/);
      return asMatch ? asMatch[1] : trimmed.replace(/\s+as\s+\w+$/, '').trim();
    }).filter(n => n && /^\w+$/.test(n));

    for (const name of names) {
      // Count occurrences outside the import line itself
      // Remove the import line and count usage
      const withoutImportLine = content.replace(match[0], '');
      const usageRegex = new RegExp(`\\b${name}\\b`, 'g');
      const usageCount = (withoutImportLine.match(usageRegex) || []).length;

      if (usageCount === 0) {
        results.push({ file: relPath, name });
      }
    }
  }

  // Match: import DefaultExport from '...' (default imports)
  const defaultImportRegex = /import\s+(\w+)\s+from\s*['"][^'"]+['"]/g;
  while ((match = defaultImportRegex.exec(content)) !== null) {
    const name = match[1];
    if (name === 'type') continue;
    const withoutImportLine = content.replace(match[0], '');
    const usageRegex = new RegExp(`\\b${name}\\b`, 'g');
    const usageCount = (withoutImportLine.match(usageRegex) || []).length;
    if (usageCount === 0) {
      results.push({ file: relPath, name });
    }
  }
}

// Group by file
const byFile = {};
for (const { file, name } of results) {
  if (!byFile[file]) byFile[file] = [];
  byFile[file].push(name);
}

let total = 0;
for (const [file, names] of Object.entries(byFile).sort()) {
  console.log(`\n📄 ${file}`);
  for (const n of names) {
    console.log(`   ❌ ${n}`);
    total++;
  }
}
console.log(`\n${'='.repeat(60)}`);
console.log(`Total unused imports found: ${total} across ${Object.keys(byFile).length} files`);
