
import { useTranslation } from 'react-i18next';

const SkipToContent = () => {
  const { t } = useTranslation();
  
  return (
    <a 
      href="#main-content" 
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:outline-ring rounded-md"
    >
      {t('accessibility.skipToContent')}
    </a>
  );
};

export default SkipToContent;
