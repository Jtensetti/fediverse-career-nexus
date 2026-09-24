import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { JobPostFilter } from "@/services/misc/jobPostsService";

interface JobSearchFilterProps {
  onFilterChange: (filters: JobPostFilter) => void;
  filters: JobPostFilter;
}

const JobSearchFilter = ({ onFilterChange, filters }: JobSearchFilterProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [jobType, setJobType] = useState<"full_time" | "part_time" | "contract" | "internship" | "temporary" | undefined>(undefined);
  const [location, setLocation] = useState("");
  const [remoteAllowed, setRemoteAllowed] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    setSearch(filters.search || "");
    setJobType(filters.job_type);
    setLocation(filters.location || "");
    setRemoteAllowed(filters.remote_allowed);
  }, [filters]);
  
  const handleSearch = () => {
    onFilterChange({
      search: search.trim() || undefined,
      job_type: jobType,
      location: location.trim() || undefined,
      remote_allowed: remoteAllowed,
    });
  };
  
  const handleClear = () => {
    setSearch("");
    setJobType(undefined);
    setLocation("");
    setRemoteAllowed(undefined);
    
    onFilterChange({});
  };
  
  return (
    <form role="search" onSubmit={event => { event.preventDefault(); handleSearch(); }} className="bg-card rounded-lg border p-4 mb-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        {/* Search input */}
        <div className="min-w-0 sm:col-span-2 xl:col-span-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("jobs.searchPlaceholder")}
              aria-label={t("jobs.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        {/* Job type filter */}
        <div className="min-w-0">
          <Select 
            value={jobType || "all"}
            onValueChange={(value) => {
              if (value === "all") setJobType(undefined);
              if (value === "full_time" || value === "part_time" || value === "contract" || value === "internship" || value === "temporary") setJobType(value);
            }}
          >
            <SelectTrigger aria-label={t("jobs.jobType")}>
              <SelectValue placeholder={t("jobs.jobType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{t("jobs.jobType")}</SelectLabel>
                <SelectItem value="all">{t("jobs.allJobTypes")}</SelectItem>
                <SelectItem value="full_time">{t("jobs.fullTime")}</SelectItem>
                <SelectItem value="part_time">{t("jobs.partTime")}</SelectItem>
                <SelectItem value="contract">{t("jobs.contract")}</SelectItem>
                <SelectItem value="internship">{t("jobs.internship")}</SelectItem>
                <SelectItem value="temporary">{t("jobs.temporary")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        {/* Location filter */}
        <div className="min-w-0">
          <Input
            type="text"
            placeholder={t("jobs.location")}
            aria-label={t("jobs.location")}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        
        {/* Filter buttons */}
        <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
          <Button type="submit" className="flex-1 xl:flex-none">
            <Filter className="mr-2 h-4 w-4" />
            {t("jobs.filter")}
          </Button>
          <Button type="button" onClick={handleClear} variant="outline" className="flex-1 xl:flex-none">
            {t("jobs.clear")}
          </Button>
        </div>
      </div>
      
      {/* Remote option */}
      <div className="flex items-center space-x-2">
        <Switch 
          id="remote-allowed"
          checked={remoteAllowed === true}
          onCheckedChange={(checked) => {
            setRemoteAllowed(checked ? true : undefined);
          }}
        />
        <Label htmlFor="remote-allowed">{t("jobs.remoteAllowed")}</Label>
      </div>
    </form>
  );
};

export default JobSearchFilter;
