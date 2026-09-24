import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SEOHead } from "@/components/common/SEOHead";

import { tx } from "@/i18n/tx";
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
      <SEOHead title={tx("ui.notFound.sidanHittadesInte")} description={tx("ui.notFound.sidanDuLetarEfter")} />
      <div className="text-center max-w-md">
        <h1 className="text-7xl font-display font-bold text-primary mb-6">404</h1>
        <p className="text-2xl mb-4 font-medium">{tx("ui.notFound.sidanHittadesInte")}</p>
        <p className="text-muted-foreground mb-8">
          {tx("ui.notFound.sidanDuLetarEfter")}
        </p>
        <Button asChild>
          <Link to="/">
            <ArrowLeft size={16} className="mr-2" />
            {tx("ui.notFound.tillbakaTillStartsidan")}
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
