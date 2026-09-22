import { useTranslation } from "react-i18next";
import InformationPage from "@/components/common/InformationPage";

export default function HelpCenter() {
  const { i18n } = useTranslation();
  const sv = i18n.language.startsWith("sv");
  return <InformationPage title={sv ? "Hjälp" : "Help"}
    intro={sv ? "Svar på vanliga frågor om kontot, federation och integritet." : "Common questions about accounts, federation and privacy."}
    sections={sv ? [
      ["Jag har glömt lösenordet", "Välj Glömt lösenord på inloggningssidan. Du får en länk via e-post om ett konto finns för adressen. Använd den senaste länken. Loggar du in enbart med Mastodon återställer du lösenordet på din Mastodon-server."],
      ["Jag har förlorat min autentiseringsapp", "Använd återställningsvägen i MFA-dialogen eller kontakta operatören. Återställning kräver att kontots ägare verifieras. Dela aldrig lösenord, engångskoder eller återställningslänkar i ett offentligt ärende."],
      ["Varför hittar Mastodon inte min Nolto-adress?", "Kontrollera att federation är aktiverad i profilinställningarna och sök på hela adressen, användarnamn@nolto.social. WebFinger behöver nås på Nolto-domänen. Om profilen fortfarande inte hittas, kontakta operatören med adressen och vilken server du söker från."],
      ["Synkas mina två konton automatiskt?", "Nej. Mastodon-inloggning och kontokoppling identifierar dig. En koppling slår inte samman följare, inlägg, lösenord, bokmärken eller privata meddelanden. Läs federationsguiden innan du importerar följningar eller flyttar följare."],
      ["Vad innebär profilens integritetsval?", "Erfarenhet, utbildning och kompetenser begränsas efter den synlighet du väljer. Att dölja aktivitet eller artiklar på profilen avpublicerar inte innehåll som redan är offentligt i flödet eller på en egen länk. Nya privata Nolto-meddelanden helsträckskrypteras efter att båda har aktiverat sin inkorg. Äldre meddelanden markeras och kan vara läsbara för servern."],
      ["Jag har glömt nyckelfrasen till inkorgen", "Kontolösenord och nyckelfras är olika saker. Du kan låsa upp på en annan enhet med samma nyckelfras eller använda din nedladdade krypterade nyckelbackup tillsammans med frasen. Nolto kan inte återskapa en förlorad nyckelfras. Skicka aldrig frasen eller nyckelbackupen till support."],
      ["Vad händer när jag raderar?", "Kontot eller innehållet döljs direkt och permanent radering planeras till 30 dagar efter begäran. Kontakta operatören om radering behövs tidigare. Redan mottagna kopior på andra servrar kan finnas kvar."],
      ["Hur anmäler jag ett problem?", "Använd Rapportera där funktionen finns, eller kontakta operatören nedan med en länk och en kort beskrivning. Radering på Nolto kan inte garantera att andra servrar eller personer tar bort sina kopior."],
    ] : [
      ["I forgot my password", "Choose Forgot password on the sign-in page. If the address has an account, you will receive an email link. Use the most recent link. If you only use Mastodon sign-in, reset your password on your Mastodon server."],
      ["I lost my authenticator app", "Use the recovery option in the MFA dialog or contact the operator. Recovery requires verification of account ownership. Never share passwords, one-time codes or recovery links in a public issue."],
      ["Why can't Mastodon find my Nolto address?", "Check that federation is enabled in your profile settings and search for the full username@nolto.social address. WebFinger must be reachable on the Nolto domain. If discovery still fails, contact the operator with your address and the server you searched from."],
      ["Do my two accounts sync automatically?", "No. Mastodon sign-in and account linking identify you. Linking does not merge followers, posts, passwords, bookmarks or private messages. Read the federation guide before importing follows or moving followers."],
      ["What do profile privacy choices mean?", "Experience, education and skills follow their visibility settings. Hiding activity or articles on your profile does not unpublish content already public in feeds or at its own link. New private Nolto messages are end-to-end encrypted once both participants activate their inboxes. Older messages are labelled and may be readable by the server."],
      ["I forgot my inbox key phrase", "Your account password and key phrase are separate. Unlock another device with the same phrase, or use your downloaded encrypted key backup together with the phrase. Nolto cannot recreate a lost key phrase. Never send the phrase or key backup to support."],
      ["What happens when I delete?", "The account or content is hidden immediately and permanent deletion is scheduled for 30 days after the request. Contact the operator if earlier erasure is needed. Copies already received by other servers may remain."],
      ["How do I report a problem?", "Use Report where available or contact the operator below with a link and a short description. Deleting content on Nolto cannot guarantee that other servers or people delete their copies."],
    ]} />;
}
