import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ArrowUpRight, LockKeyhole, Database, FileCheck2 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { SEOHead } from '@/components/common/SEOHead';

const reviewed = '2026-09-27';
const findings = [
  { id: 'TC-01', key: 'views', status: 'fixed', severity: 'high' },
  { id: 'TC-02', key: 'media', status: 'mitigated', severity: 'low' },
  { id: 'TC-03', key: 'websocket', status: 'open', severity: 'low' },
  { id: 'TC-04', key: 'headers', status: 'open', severity: 'medium' },
] as const;

export default function TrustCenter() {
  const { t } = useTranslation();
  const report = 'https://github.com/Jtensetti/fediverse-career-nexus/blob/main/docs/trust-center-audit-2026-09-27.md';
  return <div className="min-h-screen bg-background">
    <SEOHead title={t('trust.title')} description={t('trust.intro')} url="https://nolto.social/trust-center" modifiedTime={reviewed} />
    <Navbar />
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:py-16">
      <header className="max-w-3xl space-y-5">
        <div className="flex items-center gap-3 text-primary"><ShieldCheck aria-hidden="true" className="h-7 w-7" /><span className="text-sm font-semibold">{t('trust.eyebrow')}</span></div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('trust.title')}</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">{t('trust.intro')}</p>
        <p className="text-sm text-muted-foreground">{t('trust.reviewed')} <time dateTime={reviewed}>{reviewed}</time> · {t('trust.operator')}</p>
      </header>
      <div className="my-9 grid gap-3 sm:grid-cols-3">
        {[
          { value: '99/99', key: 'rls', Icon: LockKeyhole },
          { value: '8/8', key: 'storage', Icon: Database },
          { value: '0', key: 'dependencies', Icon: FileCheck2 },
        ].map(({ value, key, Icon }) => <div key={key} className="rounded-xl border bg-card p-5">
          <Icon aria-hidden="true" className="mb-4 h-5 w-5 text-primary" />
          <p className="text-3xl font-semibold tabular-nums">{value}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`trust.checks.${key}`)}</p>
        </div>)}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{t('trust.scope')}</p>
      <nav aria-label={t('trust.navigation')} className="my-9 flex flex-wrap gap-x-6 gap-y-3 border-y py-4 text-sm font-medium">
        <a className="hover:underline" href="#findings">{t('trust.findings')}</a>
        <a className="hover:underline" href="#limits">{t('trust.limits')}</a>
        <a className="hover:underline" href="#report">{t('trust.report')}</a>
        <a className="inline-flex items-center gap-1 underline" href={report}>{t('trust.evidence')}<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></a>
      </nav>
      <section id="findings" className="scroll-mt-24" aria-labelledby="findings-title">
        <h2 id="findings-title" className="text-2xl font-semibold">{t('trust.findings')}</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">{t('trust.findingsIntro')}</p>
        <div className="mt-6 divide-y rounded-xl border">
          {findings.map(f => <article key={f.id} id={f.id.toLowerCase()} className="scroll-mt-24 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono text-muted-foreground">{f.id}</span>
              <span className={`rounded-full border px-2.5 py-1 font-medium ${f.status === 'fixed' ? 'border-primary/20 bg-primary/10 text-primary' : f.status === 'open' ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200' : 'bg-muted text-foreground'}`}>{t(`trust.status.${f.status}`)}</span>
              <span className="text-muted-foreground">{t(`trust.severity.${f.severity}`)}</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold">{t(`trust.items.${f.key}.title`)}</h3>
            <p className="mt-2 leading-relaxed text-muted-foreground">{t(`trust.items.${f.key}.text`)}</p>
            <p className="mt-3 text-sm leading-relaxed"><span className="font-semibold">{t('trust.validation')} </span>{t(`trust.items.${f.key}.validation`)}</p>
          </article>)}
        </div>
      </section>
      <section id="limits" className="mt-12 scroll-mt-24" aria-labelledby="limits-title">
        <h2 id="limits-title" className="text-2xl font-semibold">{t('trust.limits')}</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {['messages', 'deletion', 'operations'].map(key => <div key={key} className="border-t-2 border-primary/30 pt-4">
            <h3 className="font-semibold">{t(`trust.boundaries.${key}.title`)}</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">{t(`trust.boundaries.${key}.text`)}</p>
          </div>)}
        </div>
      </section>
      <section id="report" className="mt-12 scroll-mt-24 rounded-xl border bg-muted/30 p-6 sm:p-8" aria-labelledby="report-title">
        <h2 id="report-title" className="text-2xl font-semibold">{t('trust.report')}</h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">{t('trust.reportText')}</p>
        <a className="mt-4 inline-block break-all font-medium text-primary underline" href="mailto:jtensetti@protonmail.com">jtensetti@protonmail.com</a>
        <p className="mt-3 text-sm text-muted-foreground">{t('trust.response')}</p>
      </section>
      <nav aria-label={t('trust.policies')} className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm underline">
        <Link to="/privacy">{t('footer.privacyPolicy')}</Link><Link to="/cookies">{t('footer.cookies')}</Link><Link to="/terms">{t('footer.termsOfService')}</Link>
        <a href="/.well-known/security.txt">{t('trust.securityFile')}</a>
      </nav>
    </main>
    <Footer />
  </div>;
}
