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

    const modifiedContent = content.replace(/<Input([^>]*?)>/g, (match, attrs) => {
        if (!attrs.includes('type="number"') && !attrs.includes("type='number'")) return match;
        if (attrs.includes('isCurrency')) return match;

        // Check attributes for keywords (name="price", placeholder="Harga", className="...", etc.)
        if (keywords.test(attrs)) {
            hasChanges = true;
            return '<Input isCurrency' + attrs + '>';
        }
        
        return match;
    });

    if (hasChanges) {
        fs.writeFileSync(file, modifiedContent, 'utf8');
        filesModified++;
        console.log("Modified:", file);
    }
});

console.log("Total files modified by attribute parsing:", filesModified);
