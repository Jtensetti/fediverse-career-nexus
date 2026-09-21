import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
export default function TrustBadges() {
  const { i18n } = useTranslation();
  const labels = i18n.language.startsWith("sv") ? ["Öppen källkod", "ActivityPub", "Din Nolto-adress"] : ["Open source", "ActivityPub", "Your Nolto address"];
  return <div className="flex flex-wrap justify-center gap-3">{labels.map(label => <Badge key={label} variant="secondary" className="px-3 py-1.5">{label}</Badge>)}</div>;
}
