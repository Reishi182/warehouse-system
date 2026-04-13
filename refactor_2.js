const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walk(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

const queryMap = {
    products: 'const { data: products = [] } = useProductsQuery();',
    sales: 'const { data: sales = [] } = useSalesQuery();',
    requests: 'const { data: requests = [] } = useRequestsQuery();',
    suratJalans: 'const { data: suratJalans = [] } = useSuratJalansQuery();',
    stockLogs: 'const { data: stockLogs = [] } = useStockLogsQuery();',
    notifications: 'const { data: notifications = [] } = useNotificationsQuery();',
    cashTransfers: 'const { data: cashTransfers = [] } = useCashTransfersQuery();',
    activityLogs: 'const { data: activityLogs = [] } = useActivityLogsQuery();',
    // ...
};

// ... we could do this, but I'll hold off string-replacing React Query because it lacks all the Loading states that useData provided. 
// "const loading = useDataStore(s => s.loading);" is simpler!
