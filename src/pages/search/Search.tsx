import { useState, useEffect, useRef } from "react";
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
import Navbar from "@/components/layout/Navbar";
import { advancedSearchService, AdvancedProfileResult, AdvancedSearchFilters } from "@/services/search/advancedSearchService";
import { searchService, SearchResults } from "@/services/search/searchService";

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
  const [searchError, setSearchError] = useState(false);
  const [contentResults, setContentResults] = useState<SearchResults | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [contentRequest, setContentRequest] = useState(0);
  const searchRequest = useRef(0);
  const submittedUrlQuery = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState('people');
  const [filterOptions, setFilterOptions] = useState<{ locations: string[]; instances: string[] }>({ locations: [], instances: [] });

  useEffect(() => {
    advancedSearchService.getFilterOptions().then(setFilterOptions).catch(() => {});
  }, []);

  useEffect(() => {
    if (submittedUrlQuery.current === initialQuery) {
      submittedUrlQuery.current = null;
      return;
    }
    const request = ++searchRequest.current;
    setQuery(initialQuery);
    setSubmittedQuery(initialQuery);
    setSearchError(false);
    setLocation(''); setCompany(''); setInstitution(''); setHomeInstance('');
    if (!initialQuery) { setResults([]); setIsLoading(false); return; }
    setIsLoading(true);
    advancedSearchService.searchPeople({ query: initialQuery }).then(data => {
      if (request === searchRequest.current) setResults(data);
    }).catch(() => {
      if (request === searchRequest.current) { setResults([]); setSearchError(true); }
    }).finally(() => {
      if (request === searchRequest.current) setIsLoading(false);
    });
    return () => { if (request === searchRequest.current) searchRequest.current++; };
  }, [initialQuery]);

  useEffect(() => {
    let cancelled = false;
    setContentResults(null);
    setContentError(false);
    if (submittedQuery.trim().length < 2) { setContentLoading(false); return; }
    setContentLoading(true);
    searchService.search(submittedQuery, 30).then(data => {
      if (!cancelled) setContentResults(data);
    }).catch(() => {
      if (!cancelled) setContentError(true);
    }).finally(() => {
      if (!cancelled) setContentLoading(false);
    });
    return () => { cancelled = true; };
  }, [submittedQuery, contentRequest]);

  const handleSearch = async () => {
    if (query.trim() !== initialQuery) {
      submittedUrlQuery.current = query.trim();
      setSearchParams(query.trim() ? { q: query.trim() } : {});
    }
    const request = ++searchRequest.current;
    setSubmittedQuery(query.trim());
    setContentRequest(value => value + 1);
    setSearchError(false);
    setIsLoading(true);
    try {
      const filters: AdvancedSearchFilters = { query, location, homeInstance, company, institution };
      const searchResults = await advancedSearchService.searchPeople(filters);
      if (request === searchRequest.current) setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      if (request === searchRequest.current) { setResults([]); setSearchError(true); }
    } finally {
      if (request === searchRequest.current) setIsLoading(false);
    }
  };

  const clearFilters = () => {
    searchRequest.current++;
    setIsLoading(false);
    setSearchError(false); setSubmittedQuery(''); setContentResults(null);
    setQuery(''); setLocation(''); setCompany(''); setInstitution(''); setHomeInstance('');
    setResults([]); setSearchParams({});
  };

  const hasActiveFilters = query || location || company || institution || homeInstance;

  const getInstanceDisplay = (instance: string | null) => {
    if (!instance || instance === 'local') return '@nolto.social';
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
                    {t(activeTab === 'people' ? "search.nameOrUsername" : "search.searchButton")}
                  </label>
                  <Input aria-label={activeTab === 'people' ? t("search.nameOrUsername") : t("search.searchLabel")} placeholder={activeTab === 'people' ? t("search.nameOrUsernamePlaceholder") : t("globalSearch.placeholder")} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSearch()} />
                </div>
                {activeTab === 'people' && <>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {t("search.locationLabel")}
                  </label>
                  <Input aria-label={t("search.locationLabel")} placeholder={t("search.locationPlaceholder")} value={location} onChange={(e) => setLocation(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSearch()} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {t("search.worksAt")}
                  </label>
                  <Input aria-label={t("search.worksAt")} placeholder={t("search.worksAtPlaceholder")} value={company} onChange={(e) => setCompany(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSearch()} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    {t("search.studiedAt")}
                  </label>
                  <Input aria-label={t("search.studiedAt")} placeholder={t("search.studiedAtPlaceholder")} value={institution} onChange={(e) => setInstitution(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSearch()} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    {t("search.instance")}
                  </label>
                  <Select value={homeInstance} onValueChange={setHomeInstance}>
                    <SelectTrigger aria-label={t("search.instance")}>
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
                </>}
                <Button onClick={handleSearch} className="w-full" disabled={isLoading}>
                  {isLoading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("search.searching")}</>) : (<><SearchIcon className="h-4 w-4 mr-2" />{t("search.searchButton")}</>)}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 flex h-auto flex-wrap justify-start">
                <TabsTrigger value="people">
                  {t("search.people")}
                  {results.length > 0 && activeTab === 'people' && (
                    <Badge variant="secondary" className="ml-2">{results.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="jobs">{t("search.jobs")}</TabsTrigger>
                <TabsTrigger value="articles">{t("search.articles")}</TabsTrigger>
                <TabsTrigger value="events">{t("search.events")}</TabsTrigger>
              </TabsList>

              <TabsContent value="people" className="mt-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : searchError ? (
                  <p role="alert" className="rounded-lg border p-6 text-sm">{t("search.failed")}</p>
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
              {(['jobs', 'articles', 'events'] as const).map(category => (
                <TabsContent key={category} value={category} className="mt-0">
                  {contentLoading ? <div role="status" className="p-12 text-center">{t("search.searching")}</div>
                    : contentError || contentResults?.failedSources?.includes(category) ? <p role="alert" className="rounded-lg border p-6 text-sm">{t("search.failed")}</p>
                    : contentResults?.[category].length ? <div className="grid gap-4">
                      {contentResults[category].map(result => <Link key={result.id} to={result.url} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <Card className="hover:bg-accent/50 transition-colors"><CardContent className="p-4">
                          <h2 className="font-semibold">{result.title}</h2>
                          {result.subtitle && <p className="mt-1 text-sm text-muted-foreground">{result.subtitle}</p>}
                        </CardContent></Card>
                      </Link>)}
                    </div> : <Card><CardContent className="py-12 text-center">
                      <SearchIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                      <h2 className="font-semibold">{t(submittedQuery.length >= 2 ? "search.noResults" : "search.startSearching")}</h2>
                      <p className="mt-2 text-sm text-muted-foreground">{t(submittedQuery.length >= 2 ? "search.noContentResults" : "search.minimumQuery")}</p>
                    </CardContent></Card>}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}
