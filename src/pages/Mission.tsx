import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

const Mission = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">
              Our Mission
            </h1>
            <h2 className="text-xl md:text-2xl font-medium text-accent">
              Taking Back Professional Networking
            </h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto prose prose-lg">
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            Nolto is on a mission to reshape how people find jobs, build professional connections, and share opportunities—outside the walled gardens of big tech platforms. We believe your career journey deserves to be open, transparent, and fully in your control.
          </p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">Why Nolto?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Most professional networks today are closed silos. Your profile, your data, and even your connections are owned by a single company. If you want to leave, you start over from scratch.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Nolto is different. We're building a community-driven alternative for the open web, based on the Fediverse. With Nolto, you decide:
            </p>
            
            <div className="bg-muted p-6 rounded-lg mb-8">
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <div>
                    <strong className="text-primary">Where your data lives:</strong> Host your own profile, or join a trusted community-run instance.
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <div>
                    <strong className="text-primary">Who you connect with:</strong> Discover opportunities from the whole network, not just one website.
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <div>
                    <strong className="text-primary">What you share:</strong> Your information, your rules. Export and move your profile any time.
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">How Does It Work?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Nolto uses ActivityPub—the same protocol that powers Mastodon, Lemmy, and many other federated platforms. This means:
            </p>
            
            <div className="bg-primary/5 p-6 rounded-lg mb-8">
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <span className="text-muted-foreground">You can follow job listings, companies, and people across thousands of instances.</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <span className="text-muted-foreground">If you don't like the rules or culture of one Nolto server, you can join another—or start your own.</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                  <span className="text-muted-foreground">You always own your identity, history, and connections.</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">Our Principles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 border rounded-lg">
                <h3 className="font-semibold text-primary mb-3">Openness</h3>
                <p className="text-muted-foreground text-sm">Everything we build is open source, and everyone can contribute.</p>
              </div>
              <div className="text-center p-6 border rounded-lg">
                <h3 className="font-semibold text-primary mb-3">Community first</h3>
                <p className="text-muted-foreground text-sm">Decisions are made with users, not just for them.</p>
              </div>
              <div className="text-center p-6 border rounded-lg">
                <h3 className="font-semibold text-primary mb-3">Data freedom</h3>
                <p className="text-muted-foreground text-sm">You control your profile, your connections, your content.</p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">What We Want to Change</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Nolto isn't just a job board—it's a declaration of independence from centralized networks. We want to:
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                <span className="text-muted-foreground">Make job opportunities more accessible, especially for communities and organizations who don't fit the "mainstream."</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                <span className="text-muted-foreground">Give professionals and companies tools to connect on their own terms.</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-secondary rounded-full mt-2 mr-4 flex-shrink-0"></div>
                <span className="text-muted-foreground">Show that a global, trustworthy professional network can exist without surveillance, lock-in, or corporate gatekeeping.</span>
              </div>
            </div>
          </section>

          <section className="bg-primary text-primary-foreground p-8 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Join Us</h2>
            <p className="text-lg mb-6 text-primary-foreground/90">
              Whether you're looking for your next job, trying to hire, or just want to connect with others who believe in the open web, Nolto is for you.
            </p>
            <p className="text-lg font-medium text-accent mb-6">
              Together, we can take back professional networking—one connection at a time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild 
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Link to="/auth/signup">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link to="/feed">Explore the feed</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-t py-6">
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
  );
};

export default Mission;
