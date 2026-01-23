import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "./GlobalSearch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export function MobileSearch() {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open search"
      >
        <Search className="h-5 w-5" />
      </Button>
      
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="top" className="h-auto max-h-[85vh] overflow-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Search</SheetTitle>
            <SheetDescription>Search for people, jobs, articles, and events</SheetDescription>
          </SheetHeader>
          <div className="pt-2 pb-4">
            <GlobalSearch 
              autoFocus 
              onResultClick={() => setOpen(false)} 
              fullWidth
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
