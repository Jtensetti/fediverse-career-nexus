import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
export default function MastodonApps() {
  return <div className="mx-auto max-w-2xl space-y-6 px-5 py-12">
    <h1 className="text-3xl font-semibold">Nolto i en Mastodon-app</h1>
    <p>Vi bygger stöd för att använda ditt Nolto-konto i appar som talar Mastodons klientprotokoll. Stödet är under utprovning och är ännu inte aktiverat på nolto.social.</p>
    <p>När stödet har aktiverats väljer du nolto.social som server i appen. Du loggar in på Noltós webbplats med din vanliga inloggningsmetod och väljer om appen ska få åtkomst. Din Nolto-adress är densamma även när du använder Google, Apple eller Bluesky för inloggningen.</p>
    <div className="rounded-xl border p-5 space-y-3"><h2 className="text-xl font-medium">Vad ingår i första versionen?</h2><p>Offentliga profiler, hemflöde, offentligt flöde, textinlägg, svar, likes och följningar av kända konton. Befintliga bilder visas från sina källor.</p><p className="text-sm text-muted-foreground">Bild- och videouppladdning från externa appar, privata meddelanden, boostar, omröstningar och pushnotiser återstår. Kompatibilitet behöver testas med varje app.</p></div>
    <p>Inloggning med en Nolto-adress i Blueskys egen app kräver ytterligare stöd för AT Protocol. Bluesky-inloggning på Nolto och anslutning av en Mastodon-app är separata funktioner.</p>
    <Button asChild><Link to="/settings/apps">Hantera anslutna appar</Link></Button>
  </div>;
}
