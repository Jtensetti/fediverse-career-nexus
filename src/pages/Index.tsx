
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
import { Link } from "react-router-dom";
import FederatedFeed from "../components/FederatedFeed";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
            <Tabs defaultValue="explore">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Discover Content</h2>
                <TabsList>
                  <TabsTrigger value="explore">Explore</TabsTrigger>
                  <TabsTrigger value="feed">Federated Feed</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="explore">
                <div className="grid gap-8 md:grid-cols-3">
                  <Card className="flex flex-col h-full">
                    <CardHeader>
                      <CardTitle>Articles</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p>Read and share insightful articles from industry experts.</p>
                    </CardContent>
                    <CardFooter>
                      <Button asChild>
                        <Link to="/articles">Browse Articles</Link>
                      </Button>
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
                      <Button asChild>
                        <Link to="/jobs">Explore Jobs</Link>
                      </Button>
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
                      <Button asChild>
                        <Link to="/events">Browse Events</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="feed">
                <div className="max-w-2xl mx-auto">
                  <FederatedFeed limit={5} />
                </div>
              </TabsContent>
            </Tabs>
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
