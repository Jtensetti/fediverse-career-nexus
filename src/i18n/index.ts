import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import translations
import enTranslation from "./locales/en.json";
import svTranslation from "./locales/sv.json";

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: enTranslation,
    },
    sv: {
      translation: svTranslation,
    },
  },
  lng: "sv", // Swedish as default
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
