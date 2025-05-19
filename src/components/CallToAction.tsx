
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CallToAction = () => {
  return (
    <section className="py-16 md:py-24 clip-path-reverse-slash bg-gradient-to-br from-federation-blue to-federation-darkBlue">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
            Join the Future of Professional Networking
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Be among the first to experience a professional network built for privacy, interoperability, and meaningful connections.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="bg-white text-federation-blue hover:bg-gray-100 font-medium">
              Join the Waitlist
            </Button>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10 font-medium">
              Explore the Technology <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
