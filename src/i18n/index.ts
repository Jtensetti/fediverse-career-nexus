import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import translations
import enTranslation from "./locales/en.json";

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: enTranslation,
    },
  },
  lng: "en", // Tvinga engelska
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
