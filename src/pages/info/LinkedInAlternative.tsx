import { useTranslation } from "react-i18next";
import InformationPage from "@/components/common/InformationPage";

export default function LinkedInAlternative() {
  const { t } = useTranslation();
  return <InformationPage title={t("ui.seoPages.linkedinAlternative.title")}
    intro={t("ui.seoPages.linkedinAlternative.intro")}
    sections={(t("ui.seoPages.linkedinAlternative.sections", { returnObjects: true }) as any)} />;
}
