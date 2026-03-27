import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StarterPackCard from "@/components/social/StarterPackCard";
import { getStarterPacks, StarterPack } from "@/services/social/starterPackService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Package, Plus, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SEOHead } from "@/components/common/SEOHead";

export default function StarterPacks() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = [
    { value: "all", label: t("starterPacks.allPacks") },
    { value: "industry", label: t("starterPacks.industry") },
    { value: "community", label: t("starterPacks.community") },
    { value: "topic", label: t("starterPacks.topic") },
    { value: "region", label: t("starterPacks.region") },
  ];

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
      <SEOHead title={t("starterPacks.title")} description={t("starterPacks.seoDescription")} />
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4"><Package className="h-8 w-8 text-primary" /></div>
          <h1 className="text-3xl font-bold mb-2">{t("starterPacks.title")}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("starterPacks.description")}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mb-8 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("starterPacks.searchPlaceholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          {user && (<Button asChild><Link to="/packs/create"><Plus className="h-4 w-4 mr-2" />{t("starterPacks.createPack")}</Link></Button>)}
        </div>
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
          <TabsList className="mx-auto flex w-fit">
            {categories.map(cat => (<TabsTrigger key={cat.value} value={cat.value}>{cat.label}</TabsTrigger>))}
          </TabsList>
        </Tabs>
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (<div key={i} className="border rounded-lg p-4 space-y-3"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /><div className="flex gap-2 pt-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-8 w-8 rounded-full" /></div></div>))}
          </div>
        ) : (
          <>
            {featuredPacks.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-4"><Sparkles className="h-5 w-5 text-amber-500" /><h2 className="text-xl font-semibold">{t("starterPacks.featuredPacks")}</h2></div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{featuredPacks.map(pack => (<StarterPackCard key={pack.id} pack={pack} />))}</div>
              </section>
            )}
            {regularPacks.length > 0 ? (
              <section>
                <h2 className="text-xl font-semibold mb-4">{featuredPacks.length > 0 ? t("starterPacks.morePacks") : t("starterPacks.allPacks")}</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{regularPacks.map(pack => (<StarterPackCard key={pack.id} pack={pack} />))}</div>
              </section>
            ) : featuredPacks.length === 0 ? (
              <div className="text-center py-16 border rounded-lg bg-card">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">{t("starterPacks.noPacks")}</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{searchQuery ? t("starterPacks.tryDifferent") : t("starterPacks.beFirst")}</p>
                {user && (<Button asChild><Link to="/packs/create">{t("starterPacks.createAPack")}</Link></Button>)}
              </div>
            ) : null}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
