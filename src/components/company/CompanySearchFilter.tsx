import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, X } from "lucide-react";
import type { CompanyFilters } from "@/services/company/companyService";
import { ORGANISATION_TYPES } from "./CompanyForm";
import type { Database } from "@/integrations/supabase/types";

import { tx } from "@/i18n/tx";
type CompanySize = Database['public']['Enums']['company_size'];

const companySizeOptions: { value: CompanySize; label: string }[] = [
  { value: '1-10', label: '1–10' },
  { value: '11-50', label: '11–50' },
  { value: '51-200', label: '51–200' },
  { value: '201-500', label: '201–500' },
  { value: '501-1000', label: '501–1 000' },
  { value: '1001-5000', label: '1 001–5 000' },
  { value: '5001-10000', label: '5 001–10 000' },
  { value: '10000+', label: '10 001+' },
];

interface CompanySearchFilterProps {
  onFilterChange: (filters: CompanyFilters) => void;
  filters?: CompanyFilters;
}

export default function CompanySearchFilter({ onFilterChange, filters = {} }: CompanySearchFilterProps) {
  const [search, setSearch] = useState(filters.search || "");
  const [industry, setIndustry] = useState<string>(filters.industry || "");
  const [size, setSize] = useState<string>(filters.size || "");
  const [location, setLocation] = useState(filters.location || "");

  useEffect(() => {
    setSearch(filters.search || "");
    setIndustry(filters.industry || "");
    setSize(filters.size || "");
    setLocation(filters.location || "");
  }, [filters.search, filters.industry, filters.size, filters.location]);

  const applyFilters = () => {
    onFilterChange({
      search: search.trim() || undefined,
      industry: industry && industry !== 'all' ? industry : undefined,
      size: size && size !== 'all' ? size as CompanySize : undefined,
      location: location.trim() || undefined,
    });
  };

  const clearFilters = () => {
    setSearch("");
    setIndustry("");
    setSize("");
    setLocation("");
    onFilterChange({});
  };

  const hasFilters = search || industry || size || location;

  return (
    <form role="search" onSubmit={event => { event.preventDefault(); applyFilters(); }} className="space-y-4 mb-6 rounded-lg border bg-card p-4">
      <div>
      <Label htmlFor="organisation-search">{tx("common.search")}</Label>
      <div className="relative mt-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="organisation-search"
          aria-label={tx("ui.companySearchFilter.sokForetag")}
          placeholder={tx("ui.companySearchFilter.sokForetag")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-2"><Label htmlFor="organisation-type">{tx("ui.companySearchFilter.typAvOrganisation")}</Label>
        <Select value={industry} onValueChange={setIndustry}>
          <SelectTrigger id="organisation-type" className="w-full" aria-label={tx("ui.companySearchFilter.typAvOrganisation")}>
            <SelectValue placeholder={tx("ui.companySearchFilter.typAvOrganisation")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tx("ui.companySearchFilter.allaTyper")}</SelectItem>
            {ORGANISATION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        </div>
        <div className="space-y-2"><Label htmlFor="organisation-size">{tx("ui.companySearchFilter.storlek")}</Label>
        <Select value={size} onValueChange={setSize}>
          <SelectTrigger id="organisation-size" className="w-full" aria-label={tx("ui.companySearchFilter.storlek")}>
            <SelectValue placeholder={tx("ui.companySearchFilter.storlek")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tx("ui.companySearchFilter.allaStorlekar")}</SelectItem>
            {companySizeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}{' '}{tx("ui.companySearchFilter.anstallda")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        </div>
        <div className="space-y-2"><Label htmlFor="organisation-location">{tx("ui.companySearchFilter.plats")}</Label>
        <Input
          id="organisation-location"
          aria-label={tx("ui.companySearchFilter.plats")}
          placeholder={tx("ui.companySearchFilter.plats")}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full"
        />

        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit">{tx("jobs.filter")}</Button>
        {hasFilters && (
          <Button type="button" variant="outline" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            {tx("ui.companySearchFilter.clear")}
          </Button>
        )}
      </div>
    </form>
  );
}
