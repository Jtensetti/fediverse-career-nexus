import { Link } from "react-router-dom";
import { Github, Twitter, Linkedin } from "lucide-react";
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
            <div className="flex space-x-4">
              <a href="#" className="text-bondy-accent hover:text-bondy-primary transition-colors" aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-bondy-accent hover:text-bondy-primary transition-colors" aria-label="GitHub">
                <Github size={20} />
              </a>
              <a href="#" className="text-bondy-accent hover:text-bondy-primary transition-colors" aria-label="LinkedIn">
                <Linkedin size={20} />
              </a>
            </div>
          </div>

          <div className="md:col-span-3 grid sm:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-bondy-primary mb-4">About</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-600 hover:text-bondy-accent transition-colors">Our Mission</a></li>
                <li><a href="#" className="text-gray-600 hover:text-bondy-accent transition-colors">Team</a></li>
                <li><a href="#" className="text-gray-600 hover:text-bondy-accent transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-600 hover:text-bondy-accent transition-colors">Careers</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-bondy-primary mb-4">Resources</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-600 hover:text-bondy-accent transition-colors">Documentation</a></li>
                <li><a href="#" className="text-gray-600 hover:text-bondy-accent transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-600 hover:text-bondy-accent transition-colors">API</a></li>
                <li><a href="#" className="text-gray-600 hover:text-bondy-accent transition-colors">How Federation Works</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-bondy-primary mb-4">Legal</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-600 hover:text-bondy-accent transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-600 hover:text-bondy-accent transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-gray-600 hover:text-bondy-accent transition-colors">Code of Conduct</a></li>
                <li><a href="#" className="text-gray-600 hover:text-bondy-accent transition-colors">Instance Guidelines</a></li>
              </ul>
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-gray-200" />

        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-500 mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} Bondy Network. Open source software under the AGPLv3 license.
          </p>
          <div className="flex space-x-6">
            <a href="#" className="text-sm text-gray-500 hover:text-bondy-accent transition-colors">Terms</a>
            <a href="#" className="text-sm text-gray-500 hover:text-bondy-accent transition-colors">Privacy</a>
            <a href="#" className="text-sm text-gray-500 hover:text-bondy-accent transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
