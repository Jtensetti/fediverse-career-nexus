
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface HeroProps {
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
}

const Hero = ({ title, description, ctaText, ctaLink }: HeroProps) => {
  return (
    <div className="relative bg-background py-24 sm:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">{title}</h1>
          <p className="mt-6 text-xl text-muted-foreground">{description}</p>
          <div className="mt-10">
            <Button asChild size="lg">
              <Link to={ctaLink}>{ctaText}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Hero;
