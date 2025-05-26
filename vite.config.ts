import path from "path";
import { fileURLToPath } from "url"; // Added import for ES module equivalent of __dirname
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Now __dirname should be correctly defined
    },
  },
})
