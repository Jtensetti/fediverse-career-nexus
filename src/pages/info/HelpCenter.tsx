import { useTranslation } from "react-i18next";
import InformationPage from "@/components/common/InformationPage";

export default function HelpCenter() {
  const { t } = useTranslation();
  return <InformationPage title={t("ui.helpCenter.help")}
    intro={t("ui.helpCenter.commonQuestionsAboutAccounts")}
    sections={(t("ui.helpCenter.iForgotMyPassword", { returnObjects: true }) as any)} />;
}
