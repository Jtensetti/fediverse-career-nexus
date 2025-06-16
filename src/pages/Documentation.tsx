
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";

const Documentation = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-bondy-primary text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">
              Documentation
            </h1>
            <p className="text-xl text-bondy-highlight">
              Everything you need to get started with Nolto
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto prose prose-lg">
          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            Welcome to Nolto's documentation. Here you'll find everything you need to get started, from creating your first profile to running your own federated Nolto instance.
          </p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-bondy-primary mb-6">1. Getting Started</h2>
            
            <h3 className="text-xl font-semibold text-bondy-primary mb-4">Creating an Account</h3>
            <ul className="space-y-2 mb-6">
              <li>Visit your preferred Nolto instance (e.g. nolto.social or another community-run server).</li>
              <li>Click "Sign Up" and fill in the registration form.</li>
              <li>Confirm your email and log in.</li>
              <li>Set up your profile with your skills, experience, and what you're looking for.</li>
            </ul>

            <h3 className="text-xl font-semibold text-bondy-primary mb-4">Completing Your Profile</h3>
            <ul className="space-y-2 mb-6">
              <li>Add your job history, skills, education, and a short introduction.</li>
              <li>Set privacy settings for each section: you decide what's public, private, or shared with connections only.</li>
              <li>Link to other profiles (e.g. Mastodon, GitHub, etc.).</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-bondy-primary mb-6">2. Finding Jobs & Opportunities</h2>
            <ul className="space-y-2 mb-6">
              <li>Use the search and filter tools to browse job postings across the Fediverse.</li>
              <li>Save interesting jobs, apply directly, or contact poster via Nolto.</li>
              <li>Subscribe to job feeds (per tag, location, or company) to stay updated.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-bondy-primary mb-6">3. Federation: How It Works</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Nolto is federated via ActivityPub. This means:
            </p>
            <ul className="space-y-2 mb-6">
              <li>You can interact with users and jobs from any compatible Nolto instance.</li>
              <li>Profiles, job posts, and messages can move freely between servers.</li>
              <li>If you move to a new instance, you can export your data and connections.</li>
            </ul>

            <h3 className="text-xl font-semibold text-bondy-primary mb-4">Choosing an Instance</h3>
            <ul className="space-y-2 mb-6">
              <li>You can sign up on any public Nolto instance, or create your own.</li>
              <li>Some instances are general, others focus on specific industries, regions, or communities.</li>
              <li>Each instance has its own moderation rules and policies. Choose the one that fits you best.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-bondy-primary mb-6">4. Running Your Own Instance</h2>
            <ul className="space-y-2 mb-6">
              <li>
                Nolto is open source. Clone the repository from{" "}
                <a 
                  href="https://codeberg.org/Tensetti/Bondy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-bondy-accent hover:text-bondy-primary transition-colors inline-flex items-center"
                >
                  Codeberg <ExternalLink className="ml-1 h-4 w-4" />
                </a>{" "}
                and follow the installation instructions.
              </li>
              <li>You'll need: Node.js, a PostgreSQL database (via Supabase), and basic server setup skills.</li>
              <li>Full setup guide and advanced configuration are available in the Admin Documentation.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-bondy-primary mb-6">5. More Resources</h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <ul className="space-y-3">
                <li>
                  <strong className="text-bondy-primary">Help Center</strong> – FAQ and troubleshooting
                </li>
                <li>
                  <strong className="text-bondy-primary">How Federation Works</strong> – Deep dive into federation and ActivityPub
                </li>
                <li>
                  <strong className="text-bondy-primary">Instance Guidelines</strong> – Rules for hosting your own Nolto server
                </li>
                <li>
                  <Link to="#" className="text-bondy-accent hover:text-bondy-primary transition-colors">
                    <strong>Privacy Policy</strong>
                  </Link> – Your data rights explained
                </li>
                <li>
                  <Link to="#" className="text-bondy-accent hover:text-bondy-primary transition-colors">
                    <strong>Code of Conduct</strong>
                  </Link> – Community standards
                </li>
              </ul>
            </div>
          </section>

          <section className="bg-bondy-primary text-white p-8 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Need Help?</h2>
            <p className="text-lg mb-6 text-white/90">
              If you have questions, suggestions, or find an issue, please open a ticket on{" "}
              <a 
                href="https://codeberg.org/Tensetti/Bondy/issues" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-bondy-highlight hover:underline inline-flex items-center"
              >
                Codeberg Issues <ExternalLink className="ml-1 h-4 w-4" />
              </a>{" "}
              or join the conversation on Nolto.
            </p>
          </section>
        </div>
      </div>

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
  );
};

export default Documentation;
