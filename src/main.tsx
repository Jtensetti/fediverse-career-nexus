import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n, { initI18n } from "./i18n";
import App from "./App.tsx";
import "./index.css";
import "./lib/zodLocale";

// Remount on language change so copy resolved outside hooks (tx) updates everywhere.
function LocalizedApp() {
  const { i18n: instance } = useTranslation();
  return <App key={instance.resolvedLanguage ?? instance.language} />;
}

const render = () => createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <LocalizedApp />
    </I18nextProvider>
  </StrictMode>
);

initI18n().catch(() => undefined).finally(render);
