import { useTranslation } from "react-i18next";
import InformationPage from "@/components/common/InformationPage";

export default function Mission() {
  const { i18n } = useTranslation();
  const sv = i18n.language.startsWith("sv");
  return <InformationPage title={sv ? "Varför Nolto?" : "Why Nolto?"}
    intro={sv ? "En plats för yrkesliv, kunskapsutbyte och kontakt över servergränser." : "A place for professional profiles, knowledge and connections across servers."}
    sections={sv ? [
      ["Ett professionellt nätverk", "Nolto samlar profiler, kompetenser, jobb och offentliga inlägg. Målet är att göra det enklare att hitta människor att arbeta med och dela det man kan."],
      ["Öppna protokoll", "ActivityPub ger Nolto en väg till andra tjänster i fediversum, bland annat Mastodon. En beständig adress på nolto.social gör att andra servrar kan hitta profilen. Konton på olika tjänster förblir separata, med olika funktioner och regler."],
      ["Tydliga val", "Du väljer vilka CV-uppgifter du fyller i, vem som får se dem och om federation ska aktiveras. Offentligt material som skickas vidare kan lagras av andra. Integritetspolicyn beskriver behandlingen och hur du kontaktar operatören."],
    ] : [
      ["A professional network", "Nolto brings together profiles, skills, jobs and public posts. The aim is to help people find collaborators and share what they know."],
      ["Open protocols", "ActivityPub connects Nolto with other fediverse services, including Mastodon. A stable nolto.social address lets other servers discover the profile. Accounts on different services remain separate, with different features and rules."],
      ["Clear choices", "You choose which CV details to provide, who can see them and whether to enable federation. Others may retain public material you share. The privacy policy explains data processing and how to contact the operator."],
    ]} />;
}
