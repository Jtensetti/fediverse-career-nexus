import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search as SearchIcon, MapPin, Building2, GraduationCap, Globe, User, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEOHead } from "@/components/common/SEOHead";
import Navbar from "@/components/Navbar";
import { advancedSearchService, AdvancedProfileResult, AdvancedSearchFilters } from "@/services/advancedSearchService";
import { searchService } from "@/services/searchService";
import { cn } from "@/lib/utils";

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState('');
  const [company, setCompany] = useState('');
  const [institution, setInstitution] = useState('');
  const [homeInstance, setHomeInstance] = useState('');
  
  const [results, setResults] = useState<AdvancedProfileResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('people');
  const [filterOptions, setFilterOptions] = useState<{ locations: string[]; instances: string[] }>({ locations: [], instances: [] });

  // Load filter options on mount
  useEffect(() => {
    advancedSearchService.getFilterOptions().then(setFilterOptions);
  }, []);

  // Search when query changes or on initial load
  useEffect(() => {
    if (initialQuery) {
      handleSearch();
    }
  }, []);

  const handleSearch = async () => {
    setIsLoading(true);
    
    try {
      let searchResults: AdvancedProfileResult[] = [];
      
      if (company) {
        searchResults = await advancedSearchService.searchByCompany(company);
      } else if (institution) {
        searchResults = await advancedSearchService.searchByInstitution(institution);
      } else {
        const filters: AdvancedSearchFilters = {
          query,
          location,
          homeInstance,
        };
        searchResults = await advancedSearchService.searchPeople(filters);
      }
      
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setLocation('');
    setCompany('');
    setInstitution('');
    setHomeInstance('');
    setResults([]);
    setSearchParams({});
  };

  const hasActiveFilters = query || location || company || institution || homeInstance;

  const getInstanceDisplay = (instance: string | null) => {
    if (!instance) return '@local';
    return `@${instance}`;
  };

  return (
    <>
      <SEOHead
        title="Search | Nolto"
        description="Find professionals, jobs, articles, and events on Nolto"
      />
      <Navbar />
      
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Search</h1>
          <p className="text-muted-foreground">Find people, jobs, articles, and events</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Filters</CardTitle>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name/Username Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Name or username
                  </label>
                  <Input
                    placeholder="e.g. lin, sarah"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>

                {/* Location Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Location
                  </label>
                  <Input
                    placeholder="e.g. Stockholm, London"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>

                {/* Company Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Works at
                  </label>
                  <Input
                    placeholder="e.g. Google, Spotify"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>

                {/* Institution Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    Studied at
                  </label>
                  <Input
                    placeholder="e.g. KTH, MIT"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>

                {/* Instance Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Instance
                  </label>
                  <Select value={homeInstance} onValueChange={setHomeInstance}>
                    <SelectTrigger>
                      <SelectValue placeholder="All instances" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All instances</SelectItem>
                      <SelectItem value="local">@local (Nolto users)</SelectItem>
                      {filterOptions.instances
                        .filter(i => i !== 'local')
                        .map(instance => (
                          <SelectItem key={instance} value={instance}>
                            @{instance}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSearch} className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <SearchIcon className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="people">
                  People
                  {results.length > 0 && activeTab === 'people' && (
                    <Badge variant="secondary" className="ml-2">{results.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="jobs" disabled>Jobs</TabsTrigger>
                <TabsTrigger value="articles" disabled>Articles</TabsTrigger>
                <TabsTrigger value="events" disabled>Events</TabsTrigger>
              </TabsList>

              <TabsContent value="people" className="mt-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : results.length > 0 ? (
                  <div className="grid gap-4">
                    {results.map((profile) => (
                      <Link
                        key={profile.id}
                        to={`/profile/${profile.username || profile.id}`}
                        className="block"
                      >
                        <Card className="hover:bg-accent/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <Avatar className="h-12 w-12 aspect-square flex-shrink-0">
                                <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
                                <AvatarFallback>
                                  {(profile.fullname || profile.username || 'U')[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold">
                                    {profile.fullname || profile.username || 'Unknown'}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    @{profile.username || 'unknown'}{getInstanceDisplay(profile.home_instance)}
                                  </span>
                                </div>
                                
                                {profile.headline && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {profile.headline}
                                  </p>
                                )}
                                
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  {profile.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {profile.location}
                                    </span>
                                  )}
                                  {profile.home_instance && (
                                    <Badge variant="outline" className="text-xs">
                                      <Globe className="h-3 w-3 mr-1" />
                                      {profile.home_instance}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : hasActiveFilters ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">No results found</h3>
                      <p className="text-sm text-muted-foreground">
                        Try adjusting your search filters or search for something else
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">Start searching</h3>
                      <p className="text-sm text-muted-foreground">
                        Use the filters on the left to find people by name, location, company, or instance
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}
