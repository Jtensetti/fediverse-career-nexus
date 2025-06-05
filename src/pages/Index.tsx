
import UnauthenticatedHomepage from "../components/UnauthenticatedHomepage";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <UnauthenticatedHomepage />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
