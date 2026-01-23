import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Globe, 
  Users, 
  Shield, 
  CheckCircle, 
  Search,
  ExternalLink,
  Server
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SEOHead } from "@/components/common/SEOHead";

interface RemoteInstance {
  id: string;
  host: string;
  status: string;
  first_seen_at: string;
  last_seen_at: string | null;
}

const Instances = () => {
  const [instances, setInstances] = useState<RemoteInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchInstances = async () => {
      try {
        const { data, error } = await supabase
          .from("remote_instances")
          .select("*")
          .eq("status", "active")
          .order("last_seen_at", { ascending: false });

        if (error) throw error;
        setInstances(data || []);
      } catch (error) {
        console.error("Error fetching instances:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInstances();
  }, []);

  const filteredInstances = instances.filter(instance =>
    instance.host.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInstanceCategory = (host: string): string => {
    if (host.includes("mastodon")) return "General";
    if (host.includes("fosstodon") || host.includes("tech")) return "Technology";
    if (host.includes("art") || host.includes("creative")) return "Creative";
    if (host.includes("hachyderm")) return "Technology";
    return "General";
  };

  return (
    <>
      <SEOHead 
        title="Federated Instances" 
        description="Explore the network of federated instances connected to Nolto. Join the decentralized professional network." 
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-grow">
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground py-16">
            <div className="container mx-auto px-4 text-center">
              <Globe className="h-16 w-16 mx-auto mb-6 opacity-80" />
              <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">
                The Federated Network
              </h1>
              <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto mb-8">
                Nolto connects with instances across the Fediverse. 
                Your professional network extends beyond any single platform.
              </p>
              
              <div className="flex flex-wrap justify-center gap-6 text-sm">
                <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-full">
                  <Server className="h-4 w-4" />
                  <span>{instances.length} Connected Instances</span>
                </div>
                <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-full">
                  <Shield className="h-4 w-4" />
                  <span>ActivityPub Protocol</span>
                </div>
                <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-full">
                  <CheckCircle className="h-4 w-4" />
                  <span>Decentralized & Open</span>
                </div>
              </div>
            </div>
          </section>

          {/* Search & Filter */}
          <section className="py-8 bg-muted/30 border-b">
            <div className="container mx-auto px-4">
              <div className="max-w-xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search instances..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Instances Grid */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="border-0 shadow-md">
                      <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-24" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredInstances.length === 0 ? (
                <div className="text-center py-16">
                  <Globe className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {searchQuery ? "No instances found" : "No instances connected yet"}
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {searchQuery 
                      ? "Try a different search term"
                      : "Be the first to connect from your instance! Sign up and start building your federated network."
                    }
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
                  {filteredInstances.map((instance) => (
                    <Card 
                      key={instance.id} 
                      className="border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Globe className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{instance.host}</CardTitle>
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {getInstanceCategory(instance.host)}
                              </Badge>
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className="bg-green-500/10 text-green-600 border-green-500/30"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>Connected to Nolto network</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Shield className="h-4 w-4" />
                            <span>ActivityPub compatible</span>
                          </div>
                          {instance.last_seen_at && (
                            <p className="text-xs text-muted-foreground">
                              Last activity: {new Date(instance.last_seen_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-4 gap-2"
                          asChild
                        >
                          <a 
                            href={`https://${instance.host}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            Visit Instance
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* How to Connect */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-4">
                  Connect Your Instance
                </h2>
                <p className="text-muted-foreground mb-8">
                  Any ActivityPub-compatible instance can connect with Nolto. 
                  Simply follow users from your instance, and the connection is established automatically.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild>
                    <Link to="/auth/signup">Join Nolto</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/federation">Learn About Federation</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Instances;
