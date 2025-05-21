
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx'
import './index.css'
import './i18n' // Import i18n configuration

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
