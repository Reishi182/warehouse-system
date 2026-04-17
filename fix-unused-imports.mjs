import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd() + '/src';
let totalFixed = 0;
let filesFixed = 0;

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

function findUnusedInFile(content) {
  const unused = new Set();

  // Named imports: import { A, B as C } from '...'
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importBlock = match[1];
    const names = importBlock.split(',').map(n => {
      const trimmed = n.trim();
      const asMatch = trimmed.match(/^(\w+)\s+as\s+(\w+)$/);
      if (asMatch) return { original: asMatch[1], alias: asMatch[2], raw: trimmed };
      return { original: trimmed, alias: trimmed, raw: trimmed };
    }).filter(n => n.alias && /^\w+$/.test(n.alias));

    for (const { alias } of names) {
      const withoutImport = content.replace(match[0], '');
      const useCount = (withoutImport.match(new RegExp(`\\b${alias}\\b`, 'g')) || []).length;
      if (useCount === 0) unused.add(alias);
    }
  }

  // Default imports
  const defaultRegex = /import\s+(\w+)\s+from\s*['"][^'"]+['"]/g;
  while ((match = defaultRegex.exec(content)) !== null) {
    const name = match[1];
    if (name === 'type') continue;
    const withoutImport = content.replace(match[0], '');
    const useCount = (withoutImport.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
    if (useCount === 0) unused.add(name);
  }

  return unused;
}

function removeUnusedFromImportLine(importLine, unusedSet) {
  // Handle named imports block: import { A, B, C } from '...'
  return importLine.replace(/import\s*\{([^}]+)\}\s*(from\s*['"][^'"]+['"])/g, (full, block, fromPart) => {
    const names = block.split(',').map(n => n.trim()).filter(Boolean);
    const filtered = names.filter(n => {
      // Handle "X as Y" -> check alias Y
      const asMatch = n.match(/^\w+\s+as\s+(\w+)$/);
      const alias = asMatch ? asMatch[1] : n;
      return !unusedSet.has(alias);
    });

    if (filtered.length === 0) return ''; // Remove entire import statement
    if (filtered.length === names.length) return full; // Nothing changed

    // Rebuild
    return `import { ${filtered.join(', ')} } ${fromPart}`;
  });
}

const files = getAllFiles(ROOT);

for (const file of files) {
  let content = readFileSync(file, 'utf-8');
  const relPath = relative(process.cwd(), file).replace(/\\/g, '/');

  const unused = findUnusedInFile(content);
  if (unused.size === 0) continue;

  let newContent = content;
  const lines = content.split('\n');
  const newLines = [];
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for default imports that are entirely unused
    const defaultMatch = line.match(/^import\s+(\w+)\s+from\s*['"][^'"]+['"]/);
    if (defaultMatch && unused.has(defaultMatch[1])) {
      // Remove this line
      changed = true;
      totalFixed++;
      continue;
    }

    // Handle named imports block (could span multiple lines - handle single line for now)
    if (/import\s*\{/.test(line) && /\}\s*from/.test(line)) {
      const newLine = removeUnusedFromImportLine(line, unused);
      if (newLine !== line) {
        changed = true;
        totalFixed += (line.match(/,/g) || []).length + 1 - (newLine.match(/,/g) || []).length - (newLine ? 1 : 0);
        if (newLine.trim()) {
          newLines.push(newLine);
        }
        // else: entire import removed, don't push
        continue;
      }
    }

    newLines.push(line);
  }

  if (changed) {
    // Clean up double blank lines
    let result = newLines.join('\n').replace(/\n{3,}/g, '\n\n');
    writeFileSync(file, result, 'utf-8');
    console.log(`✅ Fixed: ${relPath}`);
    filesFixed++;
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`✅ Done! Fixed ${filesFixed} files.`);
