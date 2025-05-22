
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface HeroProps {
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
}

const Hero = ({ title, description, ctaText, ctaLink }: HeroProps) => {
  return (
    <div className="relative bg-gradient-to-br from-bondy-primary to-bondy-accent/90 text-white">
      <div className="absolute inset-0 bg-[url('/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png')] bg-no-repeat bg-right-bottom opacity-10 bg-contain"></div>
      <div className="container mx-auto px-4 py-24 sm:py-32 relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl font-display mb-6 animate-fade-in">
            {title}
          </h1>
          <p className="mt-6 text-xl text-white/90 max-w-2xl animate-slide-in">
            {description}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Button 
              asChild 
              size="lg"
              className="bg-bondy-highlight text-bondy-primary hover:bg-bondy-highlight/90 font-medium text-lg animate-fade-in"
            >
              <Link to={ctaLink}>{ctaText}</Link>
            </Button>
            <Button 
              asChild 
              size="lg" 
              variant="outline"
              className="border-white text-white hover:bg-white/10 font-medium text-lg animate-fade-in"
            >
              <Link to="/profile/create">
                Create Account <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Hero;
