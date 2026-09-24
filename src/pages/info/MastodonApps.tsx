import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { tx } from "@/i18n/tx";
export default function MastodonApps() {
  return <div className="mx-auto max-w-2xl space-y-6 px-5 py-12">
    <h1 className="text-3xl font-semibold">{tx("ui.mastodonApps.noltoIEnMastodon")}</h1>
    <p>{tx("ui.mastodonApps.duKanAnvandaDitt")}</p>
    <p>{tx("ui.mastodonApps.valjNoltoSocialSom")}</p>
    <div className="rounded-xl border p-5 space-y-3"><h2 className="text-xl font-medium">{tx("ui.mastodonApps.vadIngarIForsta")}</h2><p>{tx("ui.mastodonApps.offentligaProfilerHemflodeOffentligt")}</p><p className="text-sm text-muted-foreground">{tx("ui.mastodonApps.bildOchVideouppladdningFran")}</p></div>
    <p>{tx("ui.mastodonApps.duKanNarSom")}</p>
    <p>{tx("ui.mastodonApps.egnaNoltoKontonI")}</p>
    <Button asChild><Link to="/settings/apps">{tx("ui.mastodonApps.hanteraAnslutnaAppar")}</Link></Button>
  </div>;
}
