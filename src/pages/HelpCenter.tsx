
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const HelpCenter = () => {
  const faqSections = [
    {
      title: "Getting Started",
      items: [
        {
          question: "How do I join Bondy?",
          answer: "Choose a Bondy instance (such as bondy.social) and create your account. Complete your profile to start connecting and browsing opportunities."
        },
        {
          question: "Do I need to pay to use Bondy?",
          answer: "No. Bondy is free to use. Some community-run instances may offer premium features or accept donations, but the core platform is always open."
        },
        {
          question: "Can I use Bondy on mobile?",
          answer: "Yes! Bondy works in all modern browsers on both desktop and mobile. Mobile apps are planned for the future."
        }
      ]
    },
    {
      title: "Federation",
      items: [
        {
          question: "What is federation?",
          answer: "Federation means Bondy isn't just one website. It's a network of independent servers (\"instances\") that talk to each other, letting you interact across the whole network."
        },
        {
          question: "Can I connect with users from other Bondy instances?",
          answer: "Yes. You can follow, message, and apply for jobs across all federated Bondy instances, no matter where your account was created."
        },
        {
          question: "What happens if I want to move my account?",
          answer: "You can export your profile data and move to a different Bondy instance whenever you want. Your connections and history go with you."
        }
      ]
    },
    {
      title: "Privacy & Safety",
      items: [
        {
          question: "Who can see my profile?",
          answer: "You control your privacy. Set each part of your profile to public, private, or visible only to your connections."
        },
        {
          question: "How is my data protected?",
          answer: "Bondy is built with privacy in mind and follows strict GDPR principles. Your data stays on the instance you choose, and you're always in control."
        },
        {
          question: "How do I report abuse or inappropriate content?",
          answer: "Every Bondy instance has its own moderation team. Use the \"Report\" function on profiles, posts, or messages to flag issues."
        }
      ]
    },
    {
      title: "Troubleshooting",
      items: [
        {
          question: "I forgot my password. What do I do?",
          answer: "Click \"Forgot Password?\" on the login page and follow the instructions to reset your password by email."
        },
        {
          question: "I can't find an answer to my problem—what now?",
          answer: "Reach out to your instance admin, visit our community forum, or open a ticket on GitHub Issues."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-bondy-primary text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">
              Help Center
            </h1>
            <p className="text-xl text-bondy-highlight">
              Welcome to the Bondy Help Center! Here you'll find answers to common questions, helpful tips, and guidance to get the most out of Bondy—whether you're just starting or want to dive deeper.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* FAQ Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-bondy-primary mb-8">Frequently Asked Questions</h2>
            
            {faqSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-8">
                <h3 className="text-xl font-semibold text-bondy-primary mb-4">{section.title}</h3>
                <Accordion type="single" collapsible className="w-full">
                  {section.items.map((item, itemIndex) => (
                    <AccordionItem key={itemIndex} value={`${sectionIndex}-${itemIndex}`}>
                      <AccordionTrigger className="text-left">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-700">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </section>

          {/* Quick Start Guide */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-bondy-primary mb-6">Quick Start Guide</h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <ol className="space-y-4">
                <li className="flex items-start">
                  <div className="w-8 h-8 bg-bondy-primary text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 flex-shrink-0 mt-1">1</div>
                  <div>
                    <strong className="text-bondy-primary">Pick an Instance:</strong> Browse the list of public Bondy servers and choose one that suits you.
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-8 h-8 bg-bondy-primary text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 flex-shrink-0 mt-1">2</div>
                  <div>
                    <strong className="text-bondy-primary">Sign Up:</strong> Create your account and verify your email.
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-8 h-8 bg-bondy-primary text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 flex-shrink-0 mt-1">3</div>
                  <div>
                    <strong className="text-bondy-primary">Complete Your Profile:</strong> Add your skills, experience, and set your privacy preferences.
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-8 h-8 bg-bondy-primary text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 flex-shrink-0 mt-1">4</div>
                  <div>
                    <strong className="text-bondy-primary">Start Connecting:</strong> Search for jobs, follow organizations, and connect with other professionals.
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-8 h-8 bg-bondy-primary text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 flex-shrink-0 mt-1">5</div>
                  <div>
                    <strong className="text-bondy-primary">Explore the Network:</strong> Discover opportunities from across the entire Fediverse!
                  </div>
                </li>
              </ol>
            </div>
          </section>

          {/* Need More Help Section */}
          <section className="bg-bondy-primary text-white p-8 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Need More Help?</h2>
            <p className="text-lg mb-6 text-white/90">
              If you need more help, check the{" "}
              <Link to="/documentation" className="text-bondy-highlight hover:underline">
                Documentation
              </Link>{" "}
              or contact your instance admin.
            </p>
            <p className="text-lg mb-6 text-white/90">
              For technical issues or feature requests, you can also open a ticket on{" "}
              <a 
                href="https://codeberg.org/Tensetti/Bondy/issues" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-bondy-highlight hover:underline inline-flex items-center"
              >
                Codeberg Issues <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </p>
            <p className="text-xl font-semibold text-bondy-highlight">
              We're here to help—welcome to Bondy!
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

export default HelpCenter;
