import { Link } from "react-router-dom";
import { Github } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const Footer = () => {
  return (
    <footer className="bg-muted/50 border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <div className="flex items-center mb-4">
              <img 
                src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" 
                alt="Nolto Mascot" 
                className="w-12 h-12 mr-3"
              />
              <h3 className="text-lg font-bold text-primary">Nolto</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              A professional social network built on the ActivityPub federation protocol.
            </p>
          </div>

          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-primary mb-4">About</h3>
              <ul className="space-y-3">
                <li><Link to="/mission" className="text-muted-foreground hover:text-secondary transition-colors">Our Mission</Link></li>
                <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors">Team</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-primary mb-4">Resources</h3>
              <ul className="space-y-3">
                <li><Link to="/documentation" className="text-muted-foreground hover:text-secondary transition-colors">Documentation</Link></li>
                <li><Link to="/help" className="text-muted-foreground hover:text-secondary transition-colors">Help Center</Link></li>
                <li><Link to="/federation" className="text-muted-foreground hover:text-secondary transition-colors">How Federation Works</Link></li>
                <li><Link to="/instances" className="text-muted-foreground hover:text-secondary transition-colors">Federated Instances</Link></li>
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <h3 className="text-sm font-semibold text-primary mb-4">Legal</h3>
              <ul className="space-y-3">
                <li><Link to="/privacy" className="text-muted-foreground hover:text-secondary transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-muted-foreground hover:text-secondary transition-colors">Terms of Service</Link></li>
                <li><Link to="/code-of-conduct" className="text-muted-foreground hover:text-secondary transition-colors">Code of Conduct</Link></li>
                <li><Link to="/instance-guidelines" className="text-muted-foreground hover:text-secondary transition-colors">Instance Guidelines</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-border" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground text-center md:text-left">
            © {new Date().getFullYear()} Nolto. Open source under the{" "}
            <a 
              href="https://opensource.org/licenses/MIT" 
              target="_blank" 
              rel="noopener"
              className="text-secondary hover:text-primary transition-colors underline"
            >
              MIT license
            </a>.
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 items-center">
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-secondary transition-colors">Terms</Link>
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-secondary transition-colors">Privacy</Link>
            <a href="#" className="text-sm text-muted-foreground hover:text-secondary transition-colors">Cookies</a>
            <a 
              href="https://codeberg.org/Tensetti/Nolto" 
              target="_blank" 
              rel="noopener"
              className="text-muted-foreground hover:text-secondary transition-colors"
              title="View source on Codeberg"
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
                className="fill-current"
              >
                <path fill="currentColor" d="M12 1A11 11 0 0 0 1 12a11 11 0 0 0 1.7 6.4L12 6l9.3 12.4A11 11 0 0 0 23 12 11 11 0 0 0 12 1Z"/>
                <path fill="currentColor" opacity="0.6" d="M21.3 18.4 12 6l4.4 16.8a11 11 0 0 0 4.9-4.4Z"/>
              </svg>
            </a>
            <a 
              href="https://github.com/Jtensetti/fediverse-career-nexus" 
              target="_blank" 
              rel="noopener"
              className="text-muted-foreground hover:text-secondary transition-colors"
              title="View source on GitHub"
            >
              <Github size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
