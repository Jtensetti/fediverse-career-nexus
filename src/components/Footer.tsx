
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <div className="flex items-center mb-4">
              <img 
                src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" 
                alt="Bondy Mascot" 
                className="w-12 h-12 mr-3"
              />
              <h3 className="text-lg font-bold text-bondy-primary">Bondy</h3>
            </div>
            <p className="text-gray-600 mb-4">
              A professional social network built on the ActivityPub federation protocol.
            </p>
          </div>

          <div className="md:col-span-3 grid sm:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-bondy-primary mb-4">About</h3>
              <ul className="space-y-3">
                <li><Link to="/mission" className="text-gray-600 hover:text-bondy-accent transition-colors">Our Mission</Link></li>
                <li><a href="#" className="text-gray-600 hover:text-bondy-accent transition-colors">Team</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-bondy-primary mb-4">Resources</h3>
              <ul className="space-y-3">
                <li><Link to="/documentation" className="text-gray-600 hover:text-bondy-accent transition-colors">Documentation</Link></li>
                <li><Link to="/help" className="text-gray-600 hover:text-bondy-accent transition-colors">Help Center</Link></li>
                <li><Link to="/federation" className="text-gray-600 hover:text-bondy-accent transition-colors">How Federation Works</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-bondy-primary mb-4">Legal</h3>
              <ul className="space-y-3">
                <li><Link to="/privacy" className="text-gray-600 hover:text-bondy-accent transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-gray-600 hover:text-bondy-accent transition-colors">Terms of Service</Link></li>
                <li><Link to="/code-of-conduct" className="text-gray-600 hover:text-bondy-accent transition-colors">Code of Conduct</Link></li>
                <li><a href="#" className="text-gray-600 hover:text-bondy-accent transition-colors">Instance Guidelines</a></li>
              </ul>
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-gray-200" />

        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-500 mb-4 md:mb-0">
            © {new Date().getFullYear()} Bondy. Open source under the{" "}
            <a 
              href="https://opensource.org/licenses/MIT" 
              target="_blank" 
              rel="noopener"
              className="text-bondy-accent hover:text-bondy-primary transition-colors underline"
            >
              MIT license
            </a>.
          </div>
          <div className="flex space-x-6 items-center">
            <Link to="/terms" className="text-sm text-gray-500 hover:text-bondy-accent transition-colors">Terms</Link>
            <Link to="/privacy" className="text-sm text-gray-500 hover:text-bondy-accent transition-colors">Privacy</Link>
            <a href="#" className="text-sm text-gray-500 hover:text-bondy-accent transition-colors">Cookies</a>
            <a 
              href="https://codeberg.org/Tensetti/Bondy" 
              target="_blank" 
              rel="noopener"
              className="text-gray-500 hover:text-bondy-accent transition-colors"
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
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
