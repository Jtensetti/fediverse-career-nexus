import { useTranslation } from "react-i18next";
import InformationPage from "@/components/common/InformationPage";

export default function FederatedNetwork() {
  const { t } = useTranslation();
  return <InformationPage title={t("ui.seoPages.federatedNetwork.title")}
    intro={t("ui.seoPages.federatedNetwork.intro")}
    sections={(t("ui.seoPages.federatedNetwork.sections", { returnObjects: true }) as any)} />;
}
