const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
const keywords = /harga|price|cost|biaya|ongkir|diskon|discount|deposit|total|pembayaran|bayar|modal|jual|nominal|amount/i;
let filesModified = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let hasChanges = false;

    // We look for <Input ... type="number" ... /> or <Input ... type='number' ... />
    // But what if type="number" is on the next line? 
    // This regex looks for <Input and matches up to />.
    const regex = /<Input([^>]*?type=["']number["'][^>]*?)>/g;
    
    // We also need to check surrounding text. But let's just do it simpler:
    // we split by <Input and check if type="number" inside.
    const modifiedContent = content.replace(/<Input([^>]*?)>/g, (match, attrs) => {
        if (!attrs.includes('type="number"') && !attrs.includes("type='number'")) return match;
        
        // If it already has isCurrency, leave it
        if (attrs.includes('isCurrency')) return match;

        // Ensure we check if it is related to price
        // Check attributes for keywords (name="price", placeholder="Harga", etc.)
        if (keywords.test(attrs)) {
            hasChanges = true;
            return <Input isCurrency>;
        }
        
        return match;
    });

    if (hasChanges) {
        fs.writeFileSync(file, modifiedContent, 'utf8');
        filesModified++;
        console.log("Modified:", file);
    }
});

console.log("Total files modified:", filesModified);
