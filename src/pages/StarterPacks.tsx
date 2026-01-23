import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StarterPackCard from "@/components/StarterPackCard";
import { getStarterPacks, StarterPack } from "@/services/starterPackService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Package, Plus, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SEOHead } from "@/components/common/SEOHead";

const categories = [
  { value: "all", label: "All Packs" },
  { value: "industry", label: "Industry" },
  { value: "community", label: "Community" },
  { value: "topic", label: "Topic" },
  { value: "region", label: "Region" },
];

export default function StarterPacks() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: packs, isLoading } = useQuery<StarterPack[]>({
    queryKey: ['starterPacks', activeCategory],
    queryFn: () => getStarterPacks({ category: activeCategory === "all" ? undefined : activeCategory }),
  });

  const filteredPacks = packs?.filter(pack => 
    pack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pack.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const featuredPacks = filteredPacks.filter(p => p.is_featured);
  const regularPacks = filteredPacks.filter(p => !p.is_featured);

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead title="Starter Packs" description="Discover curated lists of people to help you find great accounts on Nolto." />
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Starter Packs</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Curated lists of professionals to follow. Pick a pack that matches your interests 
            and instantly populate your feed with great content.
          </p>
        </div>

        {/* Search and Create */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search packs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {user && (
            <Button asChild>
              <Link to="/packs/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Pack
              </Link>
            </Button>
          )}
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
          <TabsList className="mx-auto flex w-fit">
            {categories.map(cat => (
              <TabsTrigger key={cat.value} value={cat.value}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Featured Section */}
            {featuredPacks.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <h2 className="text-xl font-semibold">Featured Packs</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {featuredPacks.map(pack => (
                    <StarterPackCard key={pack.id} pack={pack} />
                  ))}
                </div>
              </section>
            )}

            {/* All Packs */}
            {regularPacks.length > 0 ? (
              <section>
                <h2 className="text-xl font-semibold mb-4">
                  {featuredPacks.length > 0 ? "More Packs" : "All Packs"}
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {regularPacks.map(pack => (
                    <StarterPackCard key={pack.id} pack={pack} />
                  ))}
                </div>
              </section>
            ) : featuredPacks.length === 0 ? (
              <div className="text-center py-16 border rounded-lg bg-card">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No packs found</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  {searchQuery 
                    ? "Try a different search term" 
                    : "Be the first to create a starter pack for this category!"}
                </p>
                {user && (
                  <Button asChild>
                    <Link to="/packs/create">Create a Pack</Link>
                  </Button>
                )}
              </div>
            ) : null}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
