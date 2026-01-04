import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const HomepageFAQ = () => {
  const faqs = [
    {
      question: "What is Nolto?",
      answer: "Nolto is a federated professional network built on the ActivityPub protocol. Think of it as LinkedIn, but decentralized — your data stays yours, your feed isn't controlled by algorithms, and you can connect with professionals across thousands of compatible servers."
    },
    {
      question: "What does 'federated' mean?",
      answer: "Federation means Nolto isn't controlled by a single company. Like email, where Gmail users can message Outlook users, Nolto users can follow and interact with anyone on any ActivityPub-compatible server — including Mastodon, Pleroma, and more. You're not locked into one platform."
    },
    {
      question: "Can I use Nolto if I'm not technical?",
      answer: "Absolutely! Nolto works just like any other professional network. Create a profile, connect with colleagues, share updates, and find jobs. The federation happens behind the scenes — you don't need to understand the technology to benefit from it."
    },
    {
      question: "Can I follow Nolto users from Mastodon?",
      answer: "Yes! Nolto is fully compatible with Mastodon and other ActivityPub servers. You can follow Nolto profiles from your Mastodon account, and Nolto users can follow you back. Professional networking meets the Fediverse."
    },
    {
      question: "How is my data protected?",
      answer: "Your data stays on the instance you choose — it's never sold to advertisers or used for targeting. You control your privacy settings, who sees your connections, and you can export or delete your data anytime. We don't track you across the web."
    },
    {
      question: "Can I migrate my profile to another instance?",
      answer: "Yes, Nolto supports account portability. You can export your profile, connections, and content, then import them to another Nolto instance. Your followers will be notified and redirected automatically."
    },
  ];

  return (
    <section className="py-16 bg-card">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground">
              Everything you need to know about Nolto
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-b">
                <AccordionTrigger className="text-left font-medium text-foreground hover:text-primary transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default HomepageFAQ;
