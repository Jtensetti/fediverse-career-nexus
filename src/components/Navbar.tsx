
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <a href="/" className="text-2xl font-display font-bold text-bondy-primary flex items-center">
            <span className="mr-1">Bondy</span>
          </a>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <NavLinks />
          <div className="flex space-x-3">
            <Button variant="outline" className="font-medium border-bondy-primary text-bondy-primary">Sign In</Button>
            <Button className="font-medium bg-bondy-primary hover:bg-bondy-primary/90">Join Now</Button>
          </div>
        </div>
        
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-4 px-4">
          <div className="flex flex-col space-y-4">
            <NavLinks mobile />
            <div className="flex flex-col space-y-2 pt-4 border-t border-gray-100">
              <Button variant="outline" className="font-medium w-full border-bondy-primary text-bondy-primary">Sign In</Button>
              <Button className="font-medium w-full bg-bondy-primary hover:bg-bondy-primary/90">Join Now</Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

const NavLinks = ({ mobile = false }: { mobile?: boolean }) => {
  const linkClasses = mobile 
    ? "py-2 font-medium text-gray-600 hover:text-bondy-accent"
    : "font-medium text-gray-600 hover:text-bondy-accent";
  
  return (
    <div className={mobile ? "flex flex-col" : "flex items-center space-x-8"}>
      <a href="#about" className={linkClasses}>About</a>
      <a href="#features" className={linkClasses}>Features</a>
      <a href="#technology" className={linkClasses}>Technology</a>
      <a href="#faq" className={linkClasses}>FAQ</a>
    </div>
  );
};

export default Navbar;
