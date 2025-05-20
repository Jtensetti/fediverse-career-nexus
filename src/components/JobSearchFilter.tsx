
import { useState } from "react";
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
import { JobPostFilter } from "@/services/jobPostsService";

interface JobSearchFilterProps {
  onFilterChange: (filters: JobPostFilter) => void;
}

const JobSearchFilter = ({ onFilterChange }: JobSearchFilterProps) => {
  const [search, setSearch] = useState("");
  const [jobType, setJobType] = useState<"full_time" | "part_time" | "contract" | "internship" | "temporary" | undefined>(undefined);
  const [location, setLocation] = useState("");
  const [remoteAllowed, setRemoteAllowed] = useState<boolean | undefined>(undefined);
  
  const handleSearch = () => {
    onFilterChange({
      search: search || undefined,
      job_type: jobType,
      location: location || undefined,
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
    <div className="bg-card rounded-lg border p-4 mb-6 space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        {/* Search input */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search job title, company, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        {/* Job type filter */}
        <div className="w-full md:w-[180px]">
          <Select 
            value={jobType} 
            onValueChange={(value: "full_time" | "part_time" | "contract" | "internship" | "temporary" | undefined) => setJobType(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Job type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Job Type</SelectLabel>
                <SelectItem value="full_time">Full-time</SelectItem>
                <SelectItem value="part_time">Part-time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
                <SelectItem value="temporary">Temporary</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        {/* Location filter */}
        <div className="w-full md:w-[200px]">
          <Input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        
        {/* Filter buttons */}
        <div className="flex gap-2">
          <Button onClick={handleSearch} className="w-full md:w-auto">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button onClick={handleClear} variant="outline" className="w-full md:w-auto">
            Clear
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
        <Label htmlFor="remote-allowed">Remote allowed</Label>
      </div>
    </div>
  );
};

export default JobSearchFilter;
