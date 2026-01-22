// vite.config.ts
import { defineConfig } from "file:///C:/Users/SERVER/Desktop/warehouse-main/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/SERVER/Desktop/warehouse-main/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/SERVER/Desktop/warehouse-main/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\SERVER\\Desktop\\warehouse-main";
var vite_config_default = defineConfig(({ mode }) => ({
  base: "./",
  // Required for Electron file:// protocol
  server: {
    host: "::",
    port: 8080
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    // Enable minification
    minify: "esbuild",
    // Target modern browsers for smaller bundle
    target: "es2020",
    // Split chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Data fetching & state
          "vendor-query": ["@tanstack/react-query", "@tanstack/react-table"],
          // UI library (most used Radix components)
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-select",
            "@radix-ui/react-popover",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip"
          ],
          // Charts
          "vendor-charts": ["chart.js", "react-chartjs-2"],
          // PDF & Excel export
          "vendor-export": ["jspdf", "jspdf-autotable", "xlsx"],
          // Date utilities
          "vendor-date": ["date-fns", "react-day-picker"]
        }
      }
    },
    // Warn if chunk exceeds 500kb
    chunkSizeWarningLimit: 500,
    // Enable source maps for debugging in production
    sourcemap: mode === "development"
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "lucide-react"
    ]
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxTRVJWRVJcXFxcRGVza3RvcFxcXFx3YXJlaG91c2UtbWFpblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcU0VSVkVSXFxcXERlc2t0b3BcXFxcd2FyZWhvdXNlLW1haW5cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL1NFUlZFUi9EZXNrdG9wL3dhcmVob3VzZS1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xuICBiYXNlOiAnLi8nLCAvLyBSZXF1aXJlZCBmb3IgRWxlY3Ryb24gZmlsZTovLyBwcm90b2NvbFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiBcIjo6XCIsXG4gICAgcG9ydDogODA4MCxcbiAgfSxcbiAgcGx1Z2luczogW3JlYWN0KCksIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKV0uZmlsdGVyKEJvb2xlYW4pLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgLy8gRW5hYmxlIG1pbmlmaWNhdGlvblxuICAgIG1pbmlmeTogJ2VzYnVpbGQnLFxuICAgIC8vIFRhcmdldCBtb2Rlcm4gYnJvd3NlcnMgZm9yIHNtYWxsZXIgYnVuZGxlXG4gICAgdGFyZ2V0OiAnZXMyMDIwJyxcbiAgICAvLyBTcGxpdCBjaHVua3MgZm9yIGJldHRlciBjYWNoaW5nXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgIC8vIENvcmUgUmVhY3RcbiAgICAgICAgICAndmVuZG9yLXJlYWN0JzogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddLFxuICAgICAgICAgIC8vIERhdGEgZmV0Y2hpbmcgJiBzdGF0ZVxuICAgICAgICAgICd2ZW5kb3ItcXVlcnknOiBbJ0B0YW5zdGFjay9yZWFjdC1xdWVyeScsICdAdGFuc3RhY2svcmVhY3QtdGFibGUnXSxcbiAgICAgICAgICAvLyBVSSBsaWJyYXJ5IChtb3N0IHVzZWQgUmFkaXggY29tcG9uZW50cylcbiAgICAgICAgICAndmVuZG9yLXVpJzogW1xuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1kaWFsb2cnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1zZWxlY3QnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1wb3BvdmVyJyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtZHJvcGRvd24tbWVudScsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXRhYnMnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC10b29sdGlwJyxcbiAgICAgICAgICBdLFxuICAgICAgICAgIC8vIENoYXJ0c1xuICAgICAgICAgICd2ZW5kb3ItY2hhcnRzJzogWydjaGFydC5qcycsICdyZWFjdC1jaGFydGpzLTInXSxcbiAgICAgICAgICAvLyBQREYgJiBFeGNlbCBleHBvcnRcbiAgICAgICAgICAndmVuZG9yLWV4cG9ydCc6IFsnanNwZGYnLCAnanNwZGYtYXV0b3RhYmxlJywgJ3hsc3gnXSxcbiAgICAgICAgICAvLyBEYXRlIHV0aWxpdGllc1xuICAgICAgICAgICd2ZW5kb3ItZGF0ZSc6IFsnZGF0ZS1mbnMnLCAncmVhY3QtZGF5LXBpY2tlciddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIC8vIFdhcm4gaWYgY2h1bmsgZXhjZWVkcyA1MDBrYlxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogNTAwLFxuICAgIC8vIEVuYWJsZSBzb3VyY2UgbWFwcyBmb3IgZGVidWdnaW5nIGluIHByb2R1Y3Rpb25cbiAgICBzb3VyY2VtYXA6IG1vZGUgPT09ICdkZXZlbG9wbWVudCcsXG4gIH0sXG4gIC8vIE9wdGltaXplIGRlcGVuZGVuY2llc1xuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbXG4gICAgICAncmVhY3QnLFxuICAgICAgJ3JlYWN0LWRvbScsXG4gICAgICAncmVhY3Qtcm91dGVyLWRvbScsXG4gICAgICAnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5JyxcbiAgICAgICdsdWNpZGUtcmVhY3QnLFxuICAgIF0sXG4gIH0sXG59KSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQThTLFNBQVMsb0JBQW9CO0FBQzNVLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFIaEMsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxNQUFNO0FBQUE7QUFBQSxFQUNOLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxTQUFTLENBQUMsTUFBTSxHQUFHLFNBQVMsaUJBQWlCLGdCQUFnQixDQUFDLEVBQUUsT0FBTyxPQUFPO0FBQUEsRUFDOUUsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBO0FBQUEsSUFFTCxRQUFRO0FBQUE7QUFBQSxJQUVSLFFBQVE7QUFBQTtBQUFBLElBRVIsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBO0FBQUEsVUFFWixnQkFBZ0IsQ0FBQyxTQUFTLGFBQWEsa0JBQWtCO0FBQUE7QUFBQSxVQUV6RCxnQkFBZ0IsQ0FBQyx5QkFBeUIsdUJBQXVCO0FBQUE7QUFBQSxVQUVqRSxhQUFhO0FBQUEsWUFDWDtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsVUFDRjtBQUFBO0FBQUEsVUFFQSxpQkFBaUIsQ0FBQyxZQUFZLGlCQUFpQjtBQUFBO0FBQUEsVUFFL0MsaUJBQWlCLENBQUMsU0FBUyxtQkFBbUIsTUFBTTtBQUFBO0FBQUEsVUFFcEQsZUFBZSxDQUFDLFlBQVksa0JBQWtCO0FBQUEsUUFDaEQ7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBO0FBQUEsSUFFQSx1QkFBdUI7QUFBQTtBQUFBLElBRXZCLFdBQVcsU0FBUztBQUFBLEVBQ3RCO0FBQUE7QUFBQSxFQUVBLGNBQWM7QUFBQSxJQUNaLFNBQVM7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
