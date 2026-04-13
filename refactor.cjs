const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walk(dirPath, callback);
        } else {
            callback(path.join(dir, f));
        }
    });
}

const replaceMap = {
    products: 'const products = useDataStore(s => s.products);',
    sales: 'const sales = useDataStore(s => s.sales);',
    requests: 'const requests = useDataStore(s => s.requests);',
    suratJalans: 'const suratJalans = useDataStore(s => s.suratJalans);',
    stockLogs: 'const stockLogs = useDataStore(s => s.stockLogs);',
    notifications: 'const notifications = useDataStore(s => s.notifications);',
    cashTransfers: 'const cashTransfers = useDataStore(s => s.cashTransfers);',
    activityLogs: 'const activityLogs = useDataStore(s => s.activityLogs);',
    loading: 'const loading = useDataStore(s => s.loading);',
    unreadCount: 'const unreadCount = useDataStore(s => s.unreadCount);',
    
    // Actions
    addProduct: 'const addProduct = useDataStore(s => s.addProduct);',
    updateProduct: 'const updateProduct = useDataStore(s => s.updateProduct);',
    deleteProduct: 'const deleteProduct = useDataStore(s => s.deleteProduct);',
    getProductByBarcode: 'const getProductByBarcode = useDataStore(s => s.getProductByBarcode);',
    createSale: 'const createSale = useDataStore(s => s.createSale);',
    addStock: 'const addStock = useDataStore(s => s.addStock);',
    createStockOutRequest: 'const createStockOutRequest = useDataStore(s => s.createStockOutRequest);',
    updateRequestStatus: 'const updateRequestStatus = useDataStore(s => s.updateRequestStatus);',
    createSuratJalan: 'const createSuratJalan = useDataStore(s => s.createSuratJalan);',
    updateSuratJalanStatus: 'const updateSuratJalanStatus = useDataStore(s => s.updateSuratJalanStatus);',
    markNotificationRead: 'const markNotificationRead = useDataStore(s => s.markNotificationRead);',
    markAllNotificationsRead: 'const markAllNotificationsRead = useDataStore(s => s.markAllNotificationsRead);',
    refreshData: 'const refreshData = useDataStore(s => s.refreshData);'
};

walk(targetDir, (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

    let content = fs.readFileSync(filePath, 'utf-8');

    // 1. Find import { useData } from '@/contexts/DataContext'
    if (content.includes("useData") && content.includes("@/contexts/DataContext")) {
        // Change import
        content = content.replace(/import\s+\{\s*useData\s*\}\s+from\s+['"]@\/contexts\/DataContext['"];?/, "import { useDataStore } from '@/store/useDataStore';");

        // 2. Find const { ... } = useData(); and transform into multiple useDataStore calls
        const regex = /const\s+\{\s*([^}]+)\s*\}\s*=\s*useData\(\)\s*;/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const variables = match[1].split(',').map(v => v.trim()).filter(v => v !== '');
            let newLines = [];
            for (let v of variables) {
                // handle renaming, e.g., "products: items" is not typical here, but if there's no colon:
                let key = v;
                if (key.includes(':')) {
                    // e.g. "setProducts: dummy" -> not expected, but assuming normal destructuring
                    const parts = key.split(':').map(p => p.trim());
                    newLines.push(`const ${parts[1]} = useDataStore(s => s.${parts[0]});`);
                } else if (replaceMap[key]) {
                    newLines.push(replaceMap[key]);
                } else {
                    newLines.push(`const ${key} = useDataStore(s => s.${key});`);
                }
            }
            content = content.replace(match[0], newLines.join('\n    '));
        }

        fs.writeFileSync(filePath, content, 'utf-8');
        console.log("Refactored: " + filePath);
    }
});
