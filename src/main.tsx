import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n, { initI18n } from "./i18n";
import App from "./App.tsx";
import "./index.css";
import "./lib/zodLocale";

// Subscribes to language changes and re-renders the tree in place, so tx()/dateLocale()
// values resolved during render update while component, form, query and router state persist.
function LocalizedApp() {
  useTranslation();
  return <App />;
}

const render = () => createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <LocalizedApp />
    </I18nextProvider>
  </StrictMode>
);

initI18n().catch(() => undefined).finally(render);
