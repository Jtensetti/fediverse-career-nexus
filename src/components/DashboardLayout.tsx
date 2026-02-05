import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { SEOHead } from "@/components/common/SEOHead";
 import { AlertBanner } from "@/components/AlertBanner";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  showHeader?: boolean;
  /** Set to true if the page handles its own SEOHead (e.g., dynamic titles) */
  disableSEO?: boolean;
}

const DashboardLayout = ({ 
  children, 
  title, 
  description,
  showHeader = true,
  disableSEO = false,
}: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Auto-set SEO if title is provided and not disabled */}
      {!disableSEO && title && <SEOHead title={title} description={description} />}
      
      <Navbar />
       <AlertBanner />
      
      <main className="flex-grow">
        {showHeader && (title || description) && (
          <div className="bg-card border-b">
            <div className="container mx-auto px-4 py-8">
              {title && <h1 className="text-3xl font-bold text-primary font-display">{title}</h1>}
              {description && <p className="mt-2 text-lg text-muted-foreground">{description}</p>}
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
