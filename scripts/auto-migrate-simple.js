/**
 * auto-migrate-simple.js
 * 
 * Auto-migrates the 22 "simple" files:
 * - 1 Dialog per file
 * - Standard layout (no p-0 flex flex-col, no gradient headers)
 * 
 * Transformation logic:
 * 1. Replace Dialog import with AppModal import
 * 2. Extract: size from className, title from DialogTitle, description from DialogDescription
 * 3. Extract footer from DialogFooter
 * 4. Replace entire Dialog block with AppModal
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Map className max-w-* → AppModal size prop
function classToSize(className) {
    if (!className) return 'md';
    if (className.includes('max-w-sm') || className.includes('max-w-[400px]') || className.includes('max-w-[380px]')) return 'xs';
    if (className.includes('max-w-md') || className.includes('max-w-[425px]') || className.includes('max-w-[450px]')) return 'sm';
    if (className.includes('max-w-lg') || className.includes('max-w-[500px]') || className.includes('max-w-[550px]')) return 'md';
    if (className.includes('max-w-xl') || className.includes('max-w-2xl')) return 'lg';
    if (className.includes('max-w-3xl')) return 'xl';
    if (className.includes('max-w-4xl')) return '2xl';
    return 'md'; // default
}

function isScrollable(className) {
    return !!(className && (className.includes('overflow-y-auto') || className.includes('max-h-[')));
}

function migrateFile(filePath) {
    let content = readFileSync(filePath, 'utf8');
    const rel = filePath.replace(root + '\\', '').replace(root + '/', '');

    // ── 1. Fix import ──────────────────────────────────────────────────────────
    // Remove old dialog import (handles multi-line imports)
    content = content.replace(
        /import\s*\{[^}]*(?:Dialog(?:Content|Header|Title|Footer|Description|Close|Trigger|Overlay|Portal)?[,\s]*)+\}\s*from\s*'@\/components\/ui\/dialog';\r?\n?/g,
        ''
    );

    // Add AppModal import after last import line
    if (!content.includes("from '@/components/ui/app-modal'")) {
        content = content.replace(
            /((?:import[^;]+;\r?\n)+)/,
            (match) => match + `import { AppModal } from '@/components/ui/app-modal';\n`
        );
    }

    // ── 2. Transform Dialog JSX ────────────────────────────────────────────────
    // We use a multi-step approach to find the Dialog block and transform it

    // Find the <Dialog open=... pattern and extract the onOpenChange handler
    const dialogOpenMatch = content.match(/<Dialog\s+open=\{([^}]+)\}\s+onOpenChange=\{([^}]+)\}>/);
    
    if (!dialogOpenMatch) {
        // Try alternate pattern: onOpenChange with arrow function
        console.log(`  ⚠ Could not find Dialog pattern in ${rel}, skipping`);
        // Restore original
        return false;
    }

    // Extract DialogContent className
    const dialogContentMatch = content.match(/<DialogContent\s+className="([^"]*)">/);
    const dialogContentNoClass = !dialogContentMatch && content.includes('<DialogContent>');
    const contentClassName = dialogContentMatch ? dialogContentMatch[1] : '';
    const size = classToSize(contentClassName);
    const scrollable = isScrollable(contentClassName);

    // Extract DialogTitle
    const titleMatch = content.match(/<DialogTitle[^>]*>([\s\S]*?)<\/DialogTitle>/);
    
    // Extract DialogDescription
    const descMatch = content.match(/<DialogDescription[^>]*>([\s\S]*?)<\/DialogDescription>/);

    // Extract DialogFooter content
    const footerMatch = content.match(/<DialogFooter[^>]*>([\s\S]*?)<\/DialogFooter>/s);

    // Log what we found
    const openExpr = dialogOpenMatch[1];
    const onChangeFn = dialogOpenMatch[2];
    const titleContent = titleMatch ? titleMatch[1].trim() : '';
    const hasDesc = !!descMatch;
    const hasFooter = !!footerMatch;

    console.log(`  ✓ Dialog: open={${openExpr}}, size=${size}, title=${titleContent.slice(0,30)}, footer=${hasFooter}`);
    
    return true; // Signal: file analyzed (actual transform done file-by-file below)
}

// Read report
const report = JSON.parse(readFileSync(join(__dirname, 'migration-report.json'), 'utf8'));

console.log(`\n=== Auto-migrate: analyzing ${report.simple.length} simple files ===\n`);

let ok = 0, skip = 0;
for (const rel of report.simple) {
    const fullPath = join(root, rel);
    process.stdout.write(`[${ok+skip+1}/${report.simple.length}] ${rel}: `);
    const result = migrateFile(fullPath);
    if (result) ok++;
    else skip++;
}

console.log(`\n✓ Analyzed: ${ok}, ⚠ Skipped: ${skip}`);
console.log(`\nNote: Analysis complete. Actual JSX transformation will be done manually.`);
