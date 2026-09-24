import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      <div>
        <Label htmlFor="company-search">{t("ui.companySearchFilter.sokForetag")}</Label>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
          id="company-search"
          placeholder={t("ui.companySearchFilter.sokForetag")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
        <Label htmlFor="company-type">{t("ui.companySearchFilter.typAvOrganisation")}</Label>
        <Select value={industry} onValueChange={setIndustry}>
          <SelectTrigger id="company-type" className="mt-2 w-full">
            <SelectValue placeholder={t("ui.companySearchFilter.typAvOrganisation")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("ui.companySearchFilter.allaTyper")}</SelectItem>
            {ORGANISATION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>

        <div>
        <Label htmlFor="company-size">{t("ui.companySearchFilter.storlek")}</Label>
        <Select value={size} onValueChange={setSize}>
          <SelectTrigger id="company-size" className="mt-2 w-full">
            <SelectValue placeholder={t("ui.companySearchFilter.storlek")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("ui.companySearchFilter.allaStorlekar")}</SelectItem>
            {companySizeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}{' '}{t("ui.companySearchFilter.anstallda")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>

        <div>
        <Label htmlFor="company-location">{t("ui.companySearchFilter.plats")}</Label>
        <Input
          id="company-location"
          placeholder={t("ui.companySearchFilter.plats")}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="mt-2 w-full"
        />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
             {t("ui.companySearchFilter.clear")}
          </Button>
        )}
      </div>
    </div>
  );
}
