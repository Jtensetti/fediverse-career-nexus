import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, Briefcase, FileText, Calendar, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { searchService, SearchResult, SearchResults } from "@/services/searchService";
import { cn } from "@/lib/utils";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(async () => {
      const searchResults = await searchService.search(query);
      setResults(searchResults);
      setIsLoading(false);
      setSelectedIndex(-1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const allResults = results
    ? [...results.profiles, ...results.jobs, ...results.articles, ...results.events]
    : [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || allResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < allResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allResults.length - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const selected = allResults[selectedIndex];
      navigate(selected.url);
      setIsOpen(false);
      setQuery("");
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    setIsOpen(false);
    setQuery("");
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'profile': return <User className="h-4 w-4" />;
      case 'job': return <Briefcase className="h-4 w-4" />;
      case 'article': return <FileText className="h-4 w-4" />;
      case 'event': return <Calendar className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'profile': return 'People';
      case 'job': return 'Jobs';
      case 'article': return 'Articles';
      case 'event': return 'Events';
    }
  };

  const renderSection = (items: SearchResult[], type: SearchResult['type']) => {
    if (items.length === 0) return null;
    
    const startIndex = type === 'profile' ? 0 
      : type === 'job' ? results!.profiles.length 
      : type === 'article' ? results!.profiles.length + results!.jobs.length
      : results!.profiles.length + results!.jobs.length + results!.articles.length;

    return (
      <div key={type}>
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {getTypeLabel(type)}
        </div>
        {items.map((result, index) => {
          const globalIndex = startIndex + index;
          return (
            <button
              key={result.id}
              onClick={() => handleResultClick(result)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 hover:bg-accent transition-colors text-left",
                selectedIndex === globalIndex && "bg-accent"
              )}
            >
              {type === 'profile' && result.imageUrl ? (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={result.imageUrl} />
                  <AvatarFallback>{result.title[0]}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  {getIcon(type)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{result.title}</div>
                {result.subtitle && (
                  <div className="text-sm text-muted-foreground truncate">{result.subtitle}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search people, jobs, articles..."
          className="pl-9 pr-9"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => {
              setQuery("");
              setResults(null);
              inputRef.current?.focus();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-lg shadow-lg z-50 max-h-[400px] overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : results && results.total > 0 ? (
            <div className="py-2">
              {renderSection(results.profiles, 'profile')}
              {renderSection(results.jobs, 'job')}
              {renderSection(results.articles, 'article')}
              {renderSection(results.events, 'event')}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
