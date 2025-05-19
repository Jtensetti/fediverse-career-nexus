
import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const faqs = [
    {
      question: "What is Federation and how is it different from LinkedIn?",
      answer: "Federation is a professional social network built on the ActivityPub protocol, which means it's part of a decentralized network rather than a single centralized platform. Unlike LinkedIn, Federation prioritizes user privacy, data ownership, and interoperability with other ActivityPub networks while focusing on professional connections."
    },
    {
      question: "What is ActivityPub and federated networking?",
      answer: "ActivityPub is an open, decentralized social networking protocol that allows users on different servers (instances) to interact with each other seamlessly. Federation through ActivityPub means you can follow and interact with users on other instances, similar to how email works across different providers. This creates a network that isn't controlled by any single company."
    },
    {
      question: "How does Federation protect my privacy?",
      answer: "Federation implements several privacy measures: your data stays on your chosen instance rather than a central corporate database, you control who sees your connection graph, profile views only show named individuals who opt-in to be visible, and we use end-to-end encryption for direct messages where possible."
    },
    {
      question: "Can I migrate my profile to a different instance?",
      answer: "Yes, Federation is designed with account portability in mind. You'll be able to export your profile data, connections, and content, and import them to another Federation instance. Your connections and content relationships will be maintained across the move."
    },
    {
      question: "How is content moderation handled?",
      answer: "Federation uses a hybrid approach to moderation. Each instance has its own moderation team enforcing a shared baseline code of conduct (which can be stricter but never looser). Instances can choose to block other instances that don't maintain adequate content standards, protecting their users while preserving network autonomy."
    },
    {
      question: "When will Federation be available?",
      answer: "We're currently in development with plans for a beta launch in the coming months. Join our waitlist to be notified when we're ready for early access users."
    }
  ];

  return (
    <section id="faq" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600">
            Learn more about Federation and how it's changing professional networking.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-lg font-medium text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-700">
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

export default FAQ;
