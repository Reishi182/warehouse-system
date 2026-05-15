# migrate-dialogs.ps1
# Script untuk migrasi massal Dialog → AppModal
# Jalankan dari root project: .\scripts\migrate-dialogs.ps1

$srcDir = "src"
$files = Get-ChildItem -Path $srcDir -Recurse -Include "*.tsx" |
    Where-Object { (Get-Content $_.FullName -Raw) -match "from '@/components/ui/dialog'" }

$totalFiles = $files.Count
$processed = 0
$errors = @()

Write-Host "=== Dialog → AppModal Migration ===" -ForegroundColor Cyan
Write-Host "Total files to process: $totalFiles" -ForegroundColor Yellow
Write-Host ""

foreach ($file in $files) {
    $processed++
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
    Write-Host "[$processed/$totalFiles] Processing: $relativePath" -ForegroundColor Gray

    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8

        # ── 1. Replace import line ──────────────────────────────────────────────
        # Remove Dialog-related imports from ui/dialog
        # Keep the file if it still needs something else from dialog (like AlertDialog)
        
        # Pattern: remove the entire Dialog import block
        $content = $content -replace `
            "import\s*\{[^}]*(?:Dialog|DialogContent|DialogHeader|DialogTitle|DialogFooter|DialogDescription|DialogClose|DialogTrigger|DialogOverlay|DialogPortal)[^}]*\}\s*from\s*'@/components/ui/dialog';\r?\n?", `
            ""

        # Add AppModal import after the last React/component import block
        # We'll add it right before the first non-import line
        if ($content -match "import \{ AppModal") {
            # Already has it, skip
        } else {
            # Add AppModal import
            $content = $content -replace `
                "(import[^;]+;\r?\n)((?!import))", `
                "`$1import { AppModal, ConfirmModal } from '@/components/ui/app-modal';`n`$2"
        }

        Set-Content $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "  ✓ Import updated" -ForegroundColor Green
    }
    catch {
        $errors += "$relativePath : $_"
        Write-Host "  ✗ Error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host "Processed: $processed files"
if ($errors.Count -gt 0) {
    Write-Host "Errors ($($errors.Count)):" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}
