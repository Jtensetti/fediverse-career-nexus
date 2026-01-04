import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "What is the Fediverse?",
    answer: "The Fediverse is a network of interconnected, decentralized social platforms that communicate using open protocols like ActivityPub. Think of it like email – you can send messages to anyone regardless of which email provider they use. Similarly, on the Fediverse, you can follow and interact with users on any compatible platform."
  },
  {
    question: "How is Nolto different from LinkedIn?",
    answer: "Unlike LinkedIn, Nolto is decentralized, open-source, and puts you in control. There are no algorithms manipulating your feed, no ads, no data selling, and you can export your data anytime. Your professional identity is portable – if you ever want to move to a different instance, your connections come with you."
  },
  {
    question: "Is Nolto really free?",
    answer: "Yes! Nolto is completely free to use. We're funded by the community and committed to never showing ads or selling your data. Some instances may accept donations to cover hosting costs, but the core platform will always remain free."
  },
  {
    question: "What's an instance?",
    answer: "An instance is a server that runs Nolto or another Fediverse-compatible software. Each instance is independently operated and may have its own community guidelines and focus. You can join any instance and still connect with users across all other instances in the Fediverse."
  },
  {
    question: "Can I migrate my data to another instance?",
    answer: "Absolutely! Full data portability is a core feature of Nolto. You can export your profile, posts, and connections at any time and import them to another instance. Your followers will automatically be redirected to your new account."
  },
  {
    question: "Is my data secure?",
    answer: "Security and privacy are our top priorities. All data is encrypted in transit, we never sell your information, and you control exactly what's public and what's private. Since Nolto is open-source, our code is publicly auditable by anyone."
  },
];

const HomepageFAQ = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary/10 mb-4">
            <HelpCircle className="h-6 w-6 text-secondary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about Nolto and the Fediverse
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card rounded-xl border shadow-sm px-6 data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default HomepageFAQ;
