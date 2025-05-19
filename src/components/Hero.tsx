
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Hero = () => {
  return (
    <section className="pt-28 pb-16 md:pt-32 md:pb-24 clip-path-slash bg-gradient-to-br from-federation-blue to-federation-darkBlue">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="text-white animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6">
              The Professional Network That Respects Your Privacy
            </h1>
            <p className="text-lg md:text-xl mb-8 text-white/90 max-w-lg">
              Federation is an open, decentralized professional network built on ActivityPub. Connect, share, and grow your career without compromising your data.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-white text-federation-blue hover:bg-gray-100 font-medium text-base">
                Join the Waitlist
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10 font-medium text-base">
                Learn More <ArrowRight size={18} className="ml-2" />
              </Button>
            </div>
          </div>
          <div className="relative animate-slide-in">
            <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-gray-100">
              <div className="bg-federation-lightBlue px-4 py-3 border-b border-gray-200 flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <div className="text-sm text-gray-600 ml-2">federation.network</div>
              </div>
              <div className="p-5">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-federation-gray flex items-center justify-center text-federation-blue font-bold text-lg mr-4">
                    JD
                  </div>
                  <div>
                    <h3 className="font-medium">Jane Doe</h3>
                    <p className="text-sm text-gray-600">Software Engineer at Federation</p>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-md p-4 mb-4">
                  <p className="text-gray-800">
                    Just published our latest article on how Federation is reimagining professional networking with decentralized technology. #OpenWeb #ActivityPub
                  </p>
                </div>
                <div className="flex">
                  <div className="flex items-center mr-4 text-sm text-gray-600">
                    <span className="mr-1">👍</span> 24
                  </div>
                  <div className="flex items-center mr-4 text-sm text-gray-600">
                    <span className="mr-1">💬</span> 8
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-1">🔄</span> 12
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-federation-lightBlue rounded-lg border border-federation-blue/20 z-[-1]"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
