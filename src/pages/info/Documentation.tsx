import { useTranslation } from "react-i18next";
import InformationPage from "@/components/common/InformationPage";

export default function Documentation() {
  const { i18n } = useTranslation();
  const sv = i18n.language.startsWith("sv");
  return <InformationPage title={sv ? "Kom igång med Nolto" : "Getting started with Nolto"}
    intro={sv ? "Från ditt första konto till en adress i fediversum." : "From your first account to an address in the fediverse."}
    sections={sv ? [
      ["1. Skapa och bekräfta kontot", "Välj ett användarnamn och registrera dig med e-post. Följ bekräftelselänken innan du loggar in. Du kan också logga in med ett Mastodon-konto; Nolto och Mastodon har då fortfarande separata profiler."],
      ["2. Fyll i det du vill visa", "Lägg till en presentation, erfarenhet, utbildning och kompetenser under Redigera profil. Välj vem som får se dina CV-sektioner. Profilens grunduppgifter och det du publicerar offentligt kan läsas av andra."],
      ["3. Välj om du vill federera", "Onboardingen låter dig aktivera federation eller vänta. När federation är aktiverad använder andra servrar WebFinger för att hitta din adress, användarnamn@nolto.social, och ActivityPub för att följa och utbyta offentliga inlägg. Användarnamnet låses när identiteten publiceras."],
      ["4. Hitta människor och jobb", "Sök efter profiler och organisationer, skicka kontaktförfrågningar och bläddra bland jobb. En Nolto-kontakt och en följare i fediversum är olika relationer. Privata meddelanden skickas mellan Nolto-konton enligt mottagarens inställningar."],
      ["5. Hantera konto och data", "I profilinställningarna kan du hantera MFA, koppla ett befintligt Mastodon-konto, exportera kontodata eller begära radering. Exporten innehåller JSON och filmetadata; uppladdade filer behöver hämtas separat. Den kan inte importeras som ett komplett Mastodon-konto."],
    ] : [
      ["1. Create and confirm your account", "Choose a username and register with email. Follow the confirmation link before signing in. You can also sign in with Mastodon; Nolto and Mastodon still have separate profiles."],
      ["2. Choose what to share", "Add a summary, experience, education and skills under Edit profile. Choose who can see your CV sections. Basic profile details and publicly published content can be read by others."],
      ["3. Choose whether to federate", "Onboarding lets you enable federation or wait. Other servers use WebFinger to discover username@nolto.social, and ActivityPub to follow and exchange public posts. Your username is locked when the identity is published."],
      ["4. Find people and jobs", "Search profiles and organisations, send connection requests and browse jobs. Nolto connections and fediverse followers are different relationships. Private messages stay between Nolto accounts, subject to the recipient's settings."],
      ["5. Manage your account and data", "Profile settings include MFA, linking an existing Mastodon account, exporting account data and requesting deletion. The export includes JSON and file metadata; uploaded files must be downloaded separately. It is not a complete Mastodon account import."],
    ]} />;
}
