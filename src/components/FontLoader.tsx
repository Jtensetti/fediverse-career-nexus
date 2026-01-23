import { useEffect } from 'react';

const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@400;500;600;700;800&display=swap';
const FONT_LINK_ID = 'google-fonts-stylesheet';

export function FontLoader() {
  useEffect(() => {
    const preference = localStorage.getItem('font_preference');
    
    // Default is to load Google Fonts (opt-out model, not opt-in)
    if (preference !== 'system') {
      // Check if already loaded
      if (!document.getElementById(FONT_LINK_ID)) {
        const link = document.createElement('link');
        link.id = FONT_LINK_ID;
        link.href = GOOGLE_FONTS_URL;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
    }
    
    return () => {
      // Cleanup on unmount (though this component should persist)
      const existing = document.getElementById(FONT_LINK_ID);
      if (existing && localStorage.getItem('font_preference') === 'system') {
        existing.remove();
      }
    };
  }, []);
  
  return null;
}

export function getFontPreference(): 'google' | 'system' {
  const pref = localStorage.getItem('font_preference');
  return pref === 'system' ? 'system' : 'google';
}

export function setFontPreference(preference: 'google' | 'system') {
  localStorage.setItem('font_preference', preference);
}
