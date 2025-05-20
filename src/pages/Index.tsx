import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Technology from "../components/Technology";
import FAQ from "../components/FAQ";
import CallToAction from "../components/CallToAction";
import Footer from "../components/Footer";
import Card from "../components/Card";
import CardHeader from "../components/CardHeader";
import CardTitle from "../components/CardTitle";
import CardContent from "../components/CardContent";
import CardFooter from "../components/CardFooter";
import Button from "../components/Button";
import Link from "../components/Link";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <Hero 
          title="Connect with Professionals"
          description="Build your network, share knowledge, and advance your career."
          ctaText="Sign Up Now"
          ctaLink="/profile/create"
        />
        
        <div className="py-20 bg-muted">
          <div className="container max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Explore Our Platform</h2>
            <div className="grid gap-8 md:grid-cols-3">
              <Card className="flex flex-col h-full">
                <CardHeader>
                  <CardTitle>Articles</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p>Read and share insightful articles from industry experts.</p>
                </CardContent>
                <CardFooter>
                  <Link to="/articles">
                    <Button>Browse Articles</Button>
                  </Link>
                </CardFooter>
              </Card>
              
              <Card className="flex flex-col h-full">
                <CardHeader>
                  <CardTitle>Job Listings</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p>Find career opportunities or post job openings.</p>
                </CardContent>
                <CardFooter>
                  <Link to="/jobs">
                    <Button>Explore Jobs</Button>
                  </Link>
                </CardFooter>
              </Card>
              
              <Card className="flex flex-col h-full">
                <CardHeader>
                  <CardTitle>Events</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p>Attend professional events, webinars, and livestreams.</p>
                </CardContent>
                <CardFooter>
                  <Link to="/events">
                    <Button>Browse Events</Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>

        <Features />
        <Technology />
        <FAQ />
        <CallToAction />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
