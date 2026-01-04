
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface HeroProps {
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  secondaryText?: string;
  secondaryLink?: string;
}

const Hero = ({
  title,
  description,
  ctaText,
  ctaLink,
  secondaryText = "Create Account",
  secondaryLink = "/profile/create",
}: HeroProps) => {
  return (
    <div className="relative bg-gradient-to-br from-primary to-secondary text-primary-foreground">
      <div className="absolute inset-0 bg-[url('/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png')] bg-no-repeat bg-right-bottom opacity-10 bg-contain"></div>
      <div className="container mx-auto px-4 py-24 sm:py-32 relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl font-display mb-6 animate-fade-in">
            {title}
          </h1>
          <p className="mt-6 text-xl text-primary-foreground/90 max-w-2xl animate-slide-in">
            {description}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Button 
              asChild 
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-medium text-lg animate-fade-in"
            >
              <Link to={ctaLink}>{ctaText}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 font-medium text-lg animate-fade-in"
            >
              <Link to={secondaryLink}>
                {secondaryText} <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Hero;
