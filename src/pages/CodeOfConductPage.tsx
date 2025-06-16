
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CodeOfConduct from "@/components/CodeOfConduct";

const CodeOfConductPage = () => {
  return (
    <>
      <Helmet>
        <title>Code of Conduct - Nolto</title>
        <meta name="description" content="Community guidelines and standards for respectful interaction on the Nolto professional network." />
      </Helmet>
      
      <div className="min-h-screen flex flex-col bg-white">
        {/* Header */}
        <div className="bg-bondy-primary text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">
                Code of Conduct
              </h1>
              <h2 className="text-xl md:text-2xl font-medium text-bondy-highlight">
                Building a Professional, Respectful Community
              </h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <CodeOfConduct />
          </div>
        </main>

        {/* Navigation */}
        <div className="border-t border-gray-200 py-6">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Button asChild variant="outline">
                <Link to="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CodeOfConductPage;
