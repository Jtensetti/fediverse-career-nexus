import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, ArrowRight } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { SEOHead } from '@/components/common/SEOHead';
import { Button } from '@/components/ui/button';

import { tx } from "@/i18n/tx";
const snippetFor = (origin: string) => `<form>
  <label>Namn <input name="name" data-nolto-field="name"></label>
  <label>E-post <input type="email" name="email" data-nolto-field="email"></label>
  <label>Yrkesrubrik <input name="headline" data-nolto-field="headline"></label>
  <label>Profil <input type="url" name="profile" data-nolto-field="profileUrl"></label>
  <button type="button" data-nolto-import
    data-nolto-fields="name,email,headline,profileUrl">
    Hämta från Nolto
  </button>
</form>
<script src="${origin}/embed/nolto-profile.js" defer></script>`;
const advanced = `const profile = await Nolto.requestProfile({
  fields: ['name', 'email', 'profileUrl', 'experience', 'education', 'skills']
});
// Här finns bara de fält personen har godkänt.
// Använd profile för att fylla ert formulär.`;

export default function Integrations() {
  const snippet = snippetFor(window.location.origin);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(snippet); setCopied(true); setCopyError(false); } catch { setCopyError(true); } };
  return <div className="min-h-screen"><SEOHead title={tx("ui.integrations.hamtaFranNoltoFor")} description={tx("ui.integrations.laggTillEnNolto")} /><Navbar />
    <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24 space-y-12">
      <header className="max-w-3xl space-y-6"><p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">{tx("ui.integrations.forRekryterareOchUtvecklare")}</p><h1 className="font-display text-4xl tracking-tight sm:text-6xl">{tx("ui.integrations.latKandidatenBorjaMed")}</h1><p className="text-lg leading-relaxed text-muted-foreground">{tx("ui.integrations.enKnappFyllerI")}</p><span className="inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">{tx("ui.integrations.hamtaFranNolto")}</span></header>
      <section className="grid gap-6 sm:grid-cols-3">{[['1. Lägg in knappen', 'Kopiera exemplet nedan. Har ni redan ett formulär lägger ni bara till data-nolto-field på dess fält, knappen och script-raden.'], ['2. Kandidaten väljer', 'Ett Nolto-fönster visar er webbadress och uppgifterna ni ber om. Kandidaten loggar in och väljer vad som får delas.'], ['3. Formuläret fylls i', 'Godkända uppgifter fylls i på er sida. Kandidaten kontrollerar och skickar sedan ansökan som vanligt.']].map(([title, text]) => <div className="rounded-xl border p-6" key={title}><h2 className="text-lg font-semibold">{title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></div>)}</section>
      <section className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-2xl font-semibold">{tx("ui.integrations.kopieraOchKlistraIn")}</h2><Button variant="outline" onClick={() => void copy()}>{copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}{copied ? tx("ui.integrations.kodenArKopierad") : tx("ui.integrations.kopieraKoden")}</Button></div><p className="text-muted-foreground">{tx("ui.integrations.ingenApiNyckelEller")}</p><pre className="overflow-x-auto rounded-xl border bg-muted/40 p-5 text-sm"><code>{snippet}</code></pre>{copyError && <p role="status">{tx("ui.integrations.markeraOchKopieraKoden")}</p>}</section>
      <section className="space-y-5"><h2 className="text-2xl font-semibold">{tx("ui.integrations.valjVilkaUppgifterNi")}</h2><p className="text-muted-foreground">{tx("ui.integrations.listaFaltenIData")}</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-3 pr-4">{tx("ui.integrations.falt")}</th><th>{tx("ui.integrations.innehall")}</th></tr></thead><tbody>{[['name, headline', 'Namn och yrkesrubrik'], ['profileUrl, handle', 'Profiladress och Nolto-adress'], ['email, phone, website', 'Kontaktuppgifter och webbplats'], ['location, bio', 'Ort och presentation'], ['experience, education, skills', 'Listor med erfarenheter, utbildningar och kompetenser']].map(([field, detail]) => <tr key={field} className="border-b"><td className="py-3 pr-4 font-mono">{field}</td><td>{detail}</td></tr>)}</tbody></table></div></section>
      <section className="space-y-5"><h2 className="text-2xl font-semibold">{tx("ui.integrations.forEttEgetFlode")}</h2><p className="text-muted-foreground">{tx("ui.integrations.laddaSammaScriptOch")}</p><pre className="overflow-x-auto rounded-xl border bg-muted/40 p-5 text-sm"><code>{advanced}</code></pre><p className="text-sm text-muted-foreground">{tx("ui.integrations.importenDelarEnKopia")}</p><a className="inline-flex items-center underline" href="https://github.com/Jtensetti/fediverse-career-nexus/blob/main/docs/profile-import.md">{tx("ui.integrations.tekniskReferensOchExempel")}<ArrowRight className="ml-2 h-4 w-4" /></a></section>
      <Link to="/hosting" className="inline-flex items-center text-sm underline">{tx("ui.integrations.kallkodOchEgenDrift")}<ArrowRight className="ml-2 h-4 w-4" /></Link>
    </main><Footer /></div>;
}
