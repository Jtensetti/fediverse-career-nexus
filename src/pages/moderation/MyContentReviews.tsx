import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ContentReviewQueue from '@/components/moderation/ContentReviewQueue';

export default function MyContentReviews() {
  return <div className="min-h-screen flex flex-col bg-background">
    <Navbar />
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10"><ContentReviewQueue own /></main>
    <Footer />
  </div>;
}
