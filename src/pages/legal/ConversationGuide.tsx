import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '@/components/common/SEOHead';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function ConversationGuide() {
  const { t } = useTranslation();
  return <div className="min-h-screen flex flex-col bg-background">
    <SEOHead title={t('contentCare.guideTitle')} description={t('contentCare.guideIntro')} />
    <Navbar />
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 space-y-8">
      <Link to="/feed" className="text-sm text-primary underline">{t('contentCare.backToFeed')}</Link>
      <h1 className="text-3xl font-bold">{t('contentCare.guideTitle')}</h1>
      <p className="text-lg">{t('contentCare.guideIntro')}</p>
      <ol className="list-decimal space-y-5 pl-6">
        {['observe', 'feel', 'need', 'request'].map(step => <li key={step} className="pl-2">
          <h2 className="font-semibold">{t(`contentCare.${step}Title`)}</h2>
          <p className="mt-1 text-muted-foreground">{t(`contentCare.${step}Text`)}</p>
        </li>)}
      </ol>
      <blockquote className="border-l-4 border-primary bg-muted/40 p-5">{t('contentCare.example')}</blockquote>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('contentCare.howItWorks')}</h2>
        <p>{t('contentCare.process')}</p>
        <p>{t('contentCare.privacy')}</p>
        <Link className="inline-block text-primary underline" to="/my-reviews">{t('contentCare.myReviews')}</Link>
      </section>
      <p className="text-sm text-muted-foreground">{t('contentCare.sourceNote')} <a className="underline" href="https://www.cnvc.org/learn" target="_blank" rel="noopener noreferrer">Center for Nonviolent Communication</a>.</p>
    </main>
    <Footer />
  </div>;
}
