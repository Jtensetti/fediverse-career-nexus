import { useTranslation } from "react-i18next";

export function SkipToContent() {
  const { t } = useTranslation();

  return (
    <a
      href="#main-content"
      onClick={event => {
        const target = document.querySelector<HTMLElement>('main') ?? document.querySelector<HTMLElement>('h1');
        if (!target) return;
        event.preventDefault();
        if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: 'start', behavior: 'instant' });
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {t("accessibility.skipToContent", "Skip to main content")}
    </a>
  );
}

export default SkipToContent;
