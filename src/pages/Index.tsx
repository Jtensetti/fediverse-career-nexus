
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Technology from "../components/Technology";
import FAQ from "../components/FAQ";
import CallToAction from "../components/CallToAction";
import Footer from "../components/Footer";
import { Link } from "react-router-dom";
import FederatedFeed from "../components/FederatedFeed";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-bondy-background">
      <Navbar />
      
      <main className="flex-grow">
        <Hero 
          title="The Professional Network Built for You"
          description="Bondy combines the power of federation with modern professional networking. Build meaningful connections, share knowledge, and advance your career—all while keeping your data private."
          ctaText="Get Started"
          ctaLink="/feed"
        />
        
        <div className="py-16 md:py-24 bg-gradient-to-b from-white to-gray-50">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-bondy-primary font-display mb-4">
                Discover Content
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Explore curated professional content or see what's happening across the federation
              </p>
            </div>

            <Tabs defaultValue="explore" className="w-full">
              <div className="flex justify-center mb-6">
                <TabsList className="bg-white border">
                  <TabsTrigger value="explore" className="text-base px-6">Explore</TabsTrigger>
                  <TabsTrigger value="feed" className="text-base px-6">Federated Feed</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="explore" className="animate-fade-in">
                <div className="grid gap-8 md:grid-cols-3">
                  <Card className="bg-white hover:shadow-lg transition-shadow duration-300 border-gray-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-2xl text-bondy-primary font-display">Articles</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-gray-600">Read and share insightful articles from industry experts across the federation.</p>
                    </CardContent>
                    <CardFooter>
                      <Button asChild className="w-full bg-bondy-accent text-white hover:bg-bondy-accent/90">
                        <Link to="/articles">Browse Articles</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                  
                  <Card className="bg-white hover:shadow-lg transition-shadow duration-300 border-gray-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-2xl text-bondy-primary font-display">Job Listings</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-gray-600">Find career opportunities with transparent pay and details, or post your own openings.</p>
                    </CardContent>
                    <CardFooter>
                      <Button asChild className="w-full bg-bondy-accent text-white hover:bg-bondy-accent/90">
                        <Link to="/jobs">Explore Jobs</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                  
                  <Card className="bg-white hover:shadow-lg transition-shadow duration-300 border-gray-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-2xl text-bondy-primary font-display">Events</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-gray-600">Attend professional events, webinars, and livestreams organized by the community.</p>
                    </CardContent>
                    <CardFooter>
                      <Button asChild className="w-full bg-bondy-accent text-white hover:bg-bondy-accent/90">
                        <Link to="/events">Browse Events</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="feed" className="animate-fade-in">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-3xl mx-auto">
                  <FederatedFeed limit={5} className="divide-y divide-gray-200" />
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
