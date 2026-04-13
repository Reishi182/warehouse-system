const fs = require('fs');

let content = fs.readFileSync('src/contexts/DataContext.tsx', 'utf-8');

const injection = `
  // Bind actions to Zustand store so they can be accessed anywhere efficiently
  useEffect(() => {
    useDataStore.setState({
      addProduct,
      updateProduct,
      deleteProduct,
      getProductByBarcode,
      createSale,
      addStock,
      createStockOutRequest,
      updateRequestStatus,
      createSuratJalan,
      updateSuratJalanStatus,
      markNotificationRead,
      markAllNotificationsRead,
      refreshData
    });
  }, [
    addProduct, updateProduct, deleteProduct, getProductByBarcode, createSale, addStock, createStockOutRequest, updateRequestStatus, createSuratJalan, updateSuratJalanStatus, markNotificationRead, markAllNotificationsRead, refreshData
  ]);

  const contextValue = useMemo(() => ({
    // Data provided merely for backward compatibility if any missed
`;

if (!content.includes('useDataStore.setState({')) {
  content = content.replace("const contextValue = useMemo(() => ({\n    // Data provided merely for backward compatibility if any missed", injection);
  fs.writeFileSync('src/contexts/DataContext.tsx', content);
  console.log("Injected store actions into DataContext.");
} else {
  console.log("Already injected.");
}
