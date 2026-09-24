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
  { value: '201-500', label: '201–1 000' },
  { value: '1001-5000', label: '1 001–5 000' },
  { value: '5001-10000', label: '5 001–20 000' },
  { value: '10000+', label: '20 000+' },
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
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const filters: CompanyFilters = {};
      if (search) filters.search = search;
      if (industry && industry !== "all") filters.industry = industry;
      if (size && size !== "all") filters.size = size as CompanySize;
      if (location) filters.location = location;
      onFilterChange(filters);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, industry, size, location, onFilterChange]);

  const clearFilters = () => {
    setSearch("");
    setIndustry("");
    setSize("");
    setLocation("");
    onFilterChange({});
  };

  const hasFilters = search || industry || size || location;

  return (
    <div className="space-y-4 mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label={tx("ui.companySearchFilter.sokForetag")}
          placeholder={tx("ui.companySearchFilter.sokForetag")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={industry} onValueChange={setIndustry}>
          <SelectTrigger className="w-full sm:w-[220px]" aria-label={tx("ui.companySearchFilter.typAvOrganisation")}>
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

        <Select value={size} onValueChange={setSize}>
          <SelectTrigger className="w-full sm:w-[180px]" aria-label={tx("ui.companySearchFilter.storlek")}>
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

        <Input
          aria-label={tx("ui.companySearchFilter.plats")}
          placeholder={tx("ui.companySearchFilter.plats")}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full sm:w-[180px]"
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            {tx("ui.companySearchFilter.clear")}
          </Button>
        )}
      </div>
    </div>
  );
}
