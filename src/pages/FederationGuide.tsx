
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Network, Users, Shield, Zap } from "lucide-react";

const FederationGuide = () => {
  const examples = [
    {
      text: "You join designjobs.nolto.social, which focuses on creative roles. You can still follow companies and people from techcareers.nolto.social or any other Nolto instance."
    },
    {
      text: "If your community wants to host its own Nolto instance with special rules, you can start one—and still connect with everyone else."
    },
    {
      text: "Someone posts a job on their local Nolto instance in Berlin. It appears in search results for users all over the Fediverse."
    }
  ];

  const benefits = [
    {
      icon: Users,
      title: "Choice",
      description: "Pick an instance that matches your values, region, or industry—or start your own."
    },
    {
      icon: Shield,
      title: "Control",
      description: "Keep your data where you want it, under rules you agree with."
    },
    {
      icon: Zap,
      title: "Resilience",
      description: "The network can't be bought, sold, or shut down by any single company."
    },
    {
      icon: Network,
      title: "Interoperability",
      description: "Communicate with other Fediverse platforms, not just Nolto."
    }
  ];

  const faqs = [
    {
      question: "Do I need multiple accounts for different instances?",
      answer: "No, you only need one Nolto account. But you can create separate accounts on different instances if you want."
    },
    {
      question: "Can I move my profile to another instance?",
      answer: "Yes. Nolto lets you export your profile and connections, and move to a new instance whenever you wish."
    },
    {
      question: "Will I lose my contacts or history if I switch?",
      answer: "No. Your professional network moves with you, thanks to federation and open standards."
    },
    {
      question: "What if an instance shuts down?",
      answer: "You can export your data and join another instance at any time."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-bondy-primary text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">
              How Federation Works
            </h1>
            <p className="text-xl text-bondy-highlight">
              The Power of Federation
            </p>
            <p className="text-lg text-white/90 mt-4">
              Nolto isn't a single website or company—it's part of something bigger: the Fediverse. 
              Federation means freedom of choice, real interoperability, and true ownership over your professional identity.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* What is Federation */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-bondy-primary mb-6">What is Federation?</h2>
            <div className="prose prose-lg text-gray-700 space-y-4">
              <p>
                Most social networks and job boards are centralized—everything happens on one company's servers, 
                under one set of rules. If you don't like how things work, your only option is to leave.
              </p>
              <p>
                Federation is different. It's a way for independent servers (called "instances") to talk to each 
                other and share information. It's like email: you can have an account anywhere and still reach anyone, everywhere.
              </p>
              <p>
                Nolto uses the open <strong>ActivityPub protocol</strong>, the same standard that powers Mastodon, 
                Lemmy, PeerTube, and many other Fediverse platforms. This makes Nolto part of a growing network 
                of independent but interconnected communities.
              </p>
            </div>
          </section>

          {/* How It Works on Nolto */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-bondy-primary mb-6">How It Works on Nolto</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-bondy-primary mb-3">Multiple Instances</h3>
                <p className="text-gray-700">
                  Anyone can run a Nolto server ("instance"). Each instance can have its own focus—such as 
                  tech jobs, creative industries, or local communities—or be open to all.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-bondy-primary mb-3">One Network</h3>
                <p className="text-gray-700">
                  No matter where you sign up, you can connect with users, jobs, and organizations across 
                  the entire Nolto network—and even interact with compatible platforms in the wider Fediverse.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-bondy-primary mb-3">Portability</h3>
                <p className="text-gray-700">
                  You're never locked in. You can move your profile, connections, and reputation to another 
                  instance at any time.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-bondy-primary mb-3">Local & Global</h3>
                <p className="text-gray-700">
                  Some things (like moderation or featured jobs) are managed by your chosen instance. 
                  But your reach extends far beyond, to the whole federated network.
                </p>
              </div>
            </div>
          </section>

          {/* Examples */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-bondy-primary mb-6">Examples</h2>
            <div className="space-y-4">
              {examples.map((example, index) => (
                <div key={index} className="border-l-4 border-bondy-accent pl-6 py-2">
                  <p className="text-gray-700 leading-relaxed">{example.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Why Federation Matters */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-bondy-primary mb-6">Why Federation Matters</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="bg-bondy-primary/10 p-3 rounded-lg">
                    <benefit.icon className="h-6 w-6 text-bondy-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-bondy-primary mb-2">{benefit.title}</h3>
                    <p className="text-gray-700">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-bondy-primary mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-bondy-primary mb-3">{faq.question}</h3>
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              ))}
            </div>
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

export default FederationGuide;
