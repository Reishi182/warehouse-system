const fs = require('fs');

let content = fs.readFileSync('src/contexts/DataContext.tsx', 'utf-8');

// 1. Add import
if (!content.includes('useDataStore')) {
  content = content.replace(
    "import { createContext, useContext, useEffect, useState, useMemo } from 'react';", 
    "import { createContext, useContext, useEffect, useState, useMemo } from 'react';\nimport { useDataStore } from '@/store/useDataStore';"
  );
}

// 2. Replace useStates
const replacements = [
  { p: /const\s+\[products,\s*setProducts\]\s*=\s*useState<Product\[\]>\(.*?\);/, r: "const products = useDataStore(s => s.products);\n  const setProducts = useDataStore(s => s.setProducts);" },
  { p: /const\s+\[requests,\s*setRequests\]\s*=\s*useState<StockOutRequest\[\]>\(.*?\);/, r: "const requests = useDataStore(s => s.requests);\n  const setRequests = useDataStore(s => s.setRequests);" },
  { p: /const\s+\[suratJalans,\s*setSuratJalans\]\s*=\s*useState<SuratJalan\[\]>\(.*?\);/, r: "const suratJalans = useDataStore(s => s.suratJalans);\n  const setSuratJalans = useDataStore(s => s.setSuratJalans);" },
  { p: /const\s+\[stockLogs,\s*setStockLogs\]\s*=\s*useState<StockLog\[\]>\(.*?\);/, r: "const stockLogs = useDataStore(s => s.stockLogs);\n  const setStockLogs = useDataStore(s => s.setStockLogs);" },
  { p: /const\s+\[notifications,\s*setNotifications\]\s*=\s*useState<Notification\[\]>\(.*?\);/, r: "const notifications = useDataStore(s => s.notifications);\n  const setNotifications = useDataStore(s => s.setNotifications);" },
  { p: /const\s+\[sales,\s*setSales\]\s*=\s*useState<Sale\[\]>\(.*?\);/, r: "const sales = useDataStore(s => s.sales);\n  const setSales = useDataStore(s => s.setSales);" },
  { p: /const\s+\[cashTransfers,\s*setCashTransfers\]\s*=\s*useState<CashTransfer\[\]>\(.*?\);/, r: "const cashTransfers = useDataStore(s => s.cashTransfers);\n  const setCashTransfers = useDataStore(s => s.setCashTransfers);" },
  { p: /const\s+\[activityLogs,\s*setActivityLogs\]\s*=\s*useState<ActivityLog\[\]>\(.*?\);/, r: "const activityLogs = useDataStore(s => s.activityLogs);\n  const setActivityLogs = useDataStore(s => s.setActivityLogs);" },
  { p: /const\s+\[loading,\s*setLoading\]\s*=\s*useState\(true\);/, r: "const loading = useDataStore(s => s.loading);\n  const setLoading = useDataStore(s => s.setLoading);" }
];

for (const {p, r} of replacements) {
    content = content.replace(p, r);
}

// 3. Remove manually calculated unreadCount
content = content.replace(/const unreadCount = useMemo\(\(\) => notifications\.filter\(n => !n\.read\)\.length, \[notifications\]\);/, "const unreadCount = useDataStore(s => s.unreadCount);");

// 4. Change contextValue to actionsValue (optional, but good to clarify) and export useDataActions
content = content.replace(/const contextValue = useMemo\(\(\) => \(\{/, "const contextValue = useMemo(() => ({\n    // Data provided merely for backward compatibility if any missed\n");

// Add new export for data actions
if (!content.includes('useDataActions')) {
  // Let the old useData provide the objects so the app doesn't instantly crash, but we will codemod to useDataStore anyway!
  // It's perfectly safe. 
  content += "\nexport function useDataActions() {\n  return useContext(DataContext)!;\n}\n";
}

fs.writeFileSync('src/contexts/DataContext.tsx', content);
console.log("Replaced DataContext.tsx successfully.");
