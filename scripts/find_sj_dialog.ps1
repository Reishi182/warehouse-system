$file = "src\pages\surat-jalan\SuratJalanCashier.tsx"
$content = Get-Content $file -Raw -Encoding UTF8

$startMarker = '                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>'
$endMarker = '            </Dialog>' + "`r`n" + '        >' + "`r`n"

# Find the dialog trigger block
$startIdx = $content.IndexOf($startMarker)

# Find the closing </Dialog> that ends the create dialog
# We need the first </Dialog> after the startMarker
$afterStart = $content.Substring($startIdx)
# Find </Dialog> position relative to afterStart
$relEnd = $afterStart.IndexOf('            </Dialog>')
$endIdx = $startIdx + $relEnd + '            </Dialog>'.Length

$before = $content.Substring(0, $startIdx)
$after = $content.Substring($endIdx)

Write-Host "Before ends at: $startIdx"
Write-Host "After starts at: $endIdx"
Write-Host "After preview: $($after.Substring(0,100))"
