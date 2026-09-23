import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
export default function MastodonApps() {
  return <div className="mx-auto max-w-2xl space-y-6 px-5 py-12">
    <h1 className="text-3xl font-semibold">Nolto i en Mastodon-app</h1>
    <p>Du kan använda ditt Nolto-konto i en Mastodon-app. Stödet är experimentellt och öppet för alla Nolto-konton. Inloggning, profil, hemflöde, textinlägg, svar och likes har testats i Phanpy.</p>
    <p>Välj nolto.social som server i appen. Du loggar in på Noltos webbplats med din vanliga inloggningsmetod och väljer om appen ska få åtkomst. Din Nolto-adress är densamma även när du använder Google, Apple eller Bluesky för inloggningen.</p>
    <div className="rounded-xl border p-5 space-y-3"><h2 className="text-xl font-medium">Vad ingår i första versionen?</h2><p>Offentliga profiler, hemflöde, offentligt flöde, textinlägg, svar och likes. Följningar av konton som Nolto redan känner till ingår också, men följningar mellan servrar är ännu inte verifierade. Befintliga bilder visas från sina källor.</p><p className="text-sm text-muted-foreground">Bild- och videouppladdning från externa appar, privata meddelanden, boostar, omröstningar och pushnotiser saknas. Redigera eller radera inlägg på Noltos webbplats. Andra appar kan ha begränsningar som ännu inte har testats.</p></div>
    <p>Du kan när som helst återkalla en apps åtkomst nedan. Därefter behöver appen anslutas och godkännas på nytt.</p>
    <p>Egna Nolto-konton i Blueskys app är ännu inte tillgängliga. Du kan fortfarande använda ett befintligt Bluesky-konto för att logga in på Nolto.</p>
    <Button asChild><Link to="/settings/apps">Hantera anslutna appar</Link></Button>
  </div>;
}
