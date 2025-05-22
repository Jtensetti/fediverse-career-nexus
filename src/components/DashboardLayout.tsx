
import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  showHeader?: boolean;
}

const DashboardLayout = ({ 
  children, 
  title, 
  description,
  showHeader = true 
}: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-bondy-background">
      <Navbar />
      
      <main className="flex-grow">
        {showHeader && (title || description) && (
          <div className="bg-white border-b">
            <div className="container mx-auto px-4 py-8">
              {title && <h1 className="text-3xl font-bold text-bondy-primary font-display">{title}</h1>}
              {description && <p className="mt-2 text-lg text-gray-600">{description}</p>}
            </div>
          </div>
        )}
        
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default DashboardLayout;
