import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { getCompanyIndustries, type CompanyFilters } from "@/services/companyService";
import type { Database } from "@/integrations/supabase/types";

type CompanySize = Database['public']['Enums']['company_size'];

const companySizes: CompanySize[] = [
  '1-10', '11-50', '51-200', '201-500', '501-1000',
  '1001-5000', '5001-10000', '10000+'
];

interface CompanySearchFilterProps {
  onFilterChange: (filters: CompanyFilters) => void;
}

export default function CompanySearchFilter({ onFilterChange }: CompanySearchFilterProps) {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [location, setLocation] = useState("");

  const { data: industries = [] } = useQuery({
    queryKey: ['companyIndustries'],
    queryFn: getCompanyIndustries,
    staleTime: 5 * 60 * 1000,
  });

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
  };

  const hasFilters = search || industry || size || location;

  return (
    <div className="space-y-4 mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={industry} onValueChange={setIndustry}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {industries.map((ind) => (
              <SelectItem key={ind} value={ind}>
                {ind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={size} onValueChange={setSize}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Size</SelectItem>
            {companySizes.map((s) => (
              <SelectItem key={s} value={s}>
                {s} employees
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-[180px]"
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
