import { useTranslation } from "react-i18next";
import InformationPage from "@/components/common/InformationPage";

export default function Documentation() {
  const { t } = useTranslation();
  return <InformationPage title={t("ui.documentation.gettingStartedWithNolto")}
    intro={t("ui.documentation.fromYourFirstAccount")}
    sections={(t("ui.documentation.createAndConfirmYour", { returnObjects: true }) as any)} />;
}
