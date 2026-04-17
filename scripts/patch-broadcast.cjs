/**
 * This script patches all hooks to replace:
 *   queryClient.invalidateQueries({ queryKey: ['key'] })
 * with:
 *   invalidateAndBroadcast(queryClient, ['key'])
 *
 * Run: npx ts-node scripts/patch-broadcast.ts (or node equivalent)
 *
 * NOTE: This is a one-time migration script.
 */

const fs = require('fs');
const path = require('path');

const HOOKS_DIR = path.join(__dirname, '..', 'src', 'hooks');
const CONTEXTS_DIR = path.join(__dirname, '..', 'src', 'contexts');

// Files that already have manual broadcast (skip them)
const SKIP_FILES = [
  'useBroadcastSync.ts',
  'useGlobalRealtimeUpdates.ts',
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  // Skip if already has invalidateAndBroadcast
  if (content.includes('invalidateAndBroadcast')) return false;
  
  // Skip if no invalidateQueries
  if (!content.includes('invalidateQueries')) return false;

  const fileName = path.basename(filePath);
  if (SKIP_FILES.includes(fileName)) return false;

  // Find ALL invalidateQueries calls and collect the query keys
  // Pattern: queryClient.invalidateQueries({ queryKey: ['some-key'] })
  const pattern = /queryClient\.invalidateQueries\(\{ queryKey: \['([^']+)'\] \}\);?/g;
  
  // Check if file has the pattern
  if (!pattern.test(content)) return false;
  pattern.lastIndex = 0; // Reset

  // Find groups of consecutive invalidateQueries calls
  const lines = content.split('\n');
  let modified = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(/^(\s*)queryClient\.invalidateQueries\(\{ queryKey: \['([^']+)'\] \}\);?\s*$/);
    
    if (match) {
      const indent = match[1];
      const keys = [match[2]];
      let endIdx = i;

      // Look ahead for consecutive invalidateQueries
      for (let j = i + 1; j < lines.length; j++) {
        const nextMatch = lines[j].match(/^(\s*)queryClient\.invalidateQueries\(\{ queryKey: \['([^']+)'\] \}\);?\s*$/);
        if (nextMatch) {
          keys.push(nextMatch[2]);
          endIdx = j;
        } else {
          break;
        }
      }

      // Replace the group with invalidateAndBroadcast
      const replacement = `${indent}invalidateAndBroadcast(queryClient, [${keys.map(k => `'${k}'`).join(', ')}]);`;
      lines.splice(i, endIdx - i + 1, replacement);
      modified = true;
    }
    i++;
  }

  if (modified) {
    // Add import if not present
    content = lines.join('\n');
    if (!content.includes("from '@/lib/queryBroadcast'")) {
      // Find last import line
      const importLines = content.split('\n');
      let lastImportIdx = -1;
      for (let j = 0; j < importLines.length; j++) {
        if (importLines[j].trim().startsWith('import ')) {
          lastImportIdx = j;
        }
      }
      if (lastImportIdx >= 0) {
        importLines.splice(lastImportIdx + 1, 0, "import { invalidateAndBroadcast } from '@/lib/queryBroadcast';");
        content = importLines.join('\n');
      }
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Patched: ${fileName}`);
    return true;
  }
  return false;
}

function walkDir(dir) {
  let count = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      count += walkDir(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (processFile(fullPath)) count++;
    }
  }
  return count;
}

console.log('🔄 Patching hooks to use broadcast...');
let total = 0;
total += walkDir(HOOKS_DIR);
console.log(`\n✅ Done! Patched ${total} files.`);
