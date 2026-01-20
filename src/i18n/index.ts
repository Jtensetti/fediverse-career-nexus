
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enTranslation from './locales/en.json';
import svTranslation from './locales/sv.json';

// Configure i18next
// Note: Language detection disabled - using English for all users
// Translation files are preserved for future use
i18n
  .use(initReactI18next) // Passes i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslation
      },
      sv: {
        translation: svTranslation
      }
    },
    lng: 'en', // Force English for all users
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n;
