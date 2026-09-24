import { useTranslation } from "react-i18next";
import InformationPage from "@/components/common/InformationPage";

export default function Mission() {
  const { t } = useTranslation();
  return <InformationPage title={t("ui.mission.whyNolto")}
    intro={t("ui.mission.aPlaceForProfessional")}
    sections={(t("ui.mission.aProfessionalNetworkNolto", { returnObjects: true }) as any)} />;
}
