
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InstanceGuidelines from "@/components/InstanceGuidelines";

const InstanceGuidelinesPage = () => {
  return (
    <>
      <Helmet>
        <title>Instance Guidelines - Bondy</title>
        <meta name="description" content="Guidelines for operating a Bondy instance responsibly and maintaining network health." />
      </Helmet>
      
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12">
          <InstanceGuidelines />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default InstanceGuidelinesPage;
