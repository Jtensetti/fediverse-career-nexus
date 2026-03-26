import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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

  useEffect(() => {
    advancedSearchService.getFilterOptions().then(setFilterOptions);
  }, []);

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
        const filters: AdvancedSearchFilters = { query, location, homeInstance };
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
    setQuery(''); setLocation(''); setCompany(''); setInstitution(''); setHomeInstance('');
    setResults([]); setSearchParams({});
  };

  const hasActiveFilters = query || location || company || institution || homeInstance;

  const getInstanceDisplay = (instance: string | null) => {
    if (!instance) return '@local';
    return `@${instance}`;
  };

  return (
    <>
      <SEOHead title={t("search.seoTitle")} description={t("search.seoDescription")} />
      <Navbar />
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t("search.title")}</h1>
          <p className="text-muted-foreground">{t("search.description")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{t("search.filters")}</CardTitle>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      {t("search.clear")}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {t("search.nameOrUsername")}
                  </label>
                  <Input placeholder={t("search.nameOrUsernamePlaceholder")} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {t("search.locationLabel")}
                  </label>
                  <Input placeholder={t("search.locationPlaceholder")} value={location} onChange={(e) => setLocation(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {t("search.worksAt")}
                  </label>
                  <Input placeholder={t("search.worksAtPlaceholder")} value={company} onChange={(e) => setCompany(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    {t("search.studiedAt")}
                  </label>
                  <Input placeholder={t("search.studiedAtPlaceholder")} value={institution} onChange={(e) => setInstitution(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    {t("search.instance")}
                  </label>
                  <Select value={homeInstance} onValueChange={setHomeInstance}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("search.allInstances")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("search.allInstances")}</SelectItem>
                      <SelectItem value="local">{t("search.localUsers")}</SelectItem>
                      {filterOptions.instances.filter(i => i !== 'local').map(instance => (
                        <SelectItem key={instance} value={instance}>@{instance}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSearch} className="w-full" disabled={isLoading}>
                  {isLoading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("search.searching")}</>) : (<><SearchIcon className="h-4 w-4 mr-2" />{t("search.searchButton")}</>)}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="people">
                  {t("search.people")}
                  {results.length > 0 && activeTab === 'people' && (
                    <Badge variant="secondary" className="ml-2">{results.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="jobs" disabled>{t("search.jobs")}</TabsTrigger>
                <TabsTrigger value="articles" disabled>{t("search.articles")}</TabsTrigger>
                <TabsTrigger value="events" disabled>{t("search.events")}</TabsTrigger>
              </TabsList>

              <TabsContent value="people" className="mt-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : results.length > 0 ? (
                  <div className="grid gap-4">
                    {results.map((profile) => (
                      <Link key={profile.id} to={`/profile/${profile.username || profile.id}`} className="block">
                        <Card className="hover:bg-accent/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <Avatar className="h-12 w-12 aspect-square flex-shrink-0">
                                <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
                                <AvatarFallback>{(profile.fullname || profile.username || 'U')[0].toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold">{profile.fullname || profile.username || 'Unknown'}</span>
                                  <span className="text-sm text-muted-foreground">@{profile.username || 'unknown'}{getInstanceDisplay(profile.home_instance)}</span>
                                </div>
                                {profile.headline && (<p className="text-sm text-muted-foreground mt-1 line-clamp-2">{profile.headline}</p>)}
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  {profile.location && (<span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.location}</span>)}
                                  {profile.home_instance && (<Badge variant="outline" className="text-xs"><Globe className="h-3 w-3 mr-1" />{profile.home_instance}</Badge>)}
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
                      <h3 className="font-semibold mb-2">{t("search.noResults")}</h3>
                      <p className="text-sm text-muted-foreground">{t("search.noResultsDesc")}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">{t("search.startSearching")}</h3>
                      <p className="text-sm text-muted-foreground">{t("search.startSearchingDesc")}</p>
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
