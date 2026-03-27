import { useState } from "react";
import { Globe, Users, Lock, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type SectionVisibility, type ProfileSection, updateSectionVisibility } from "@/services/profile/sectionVisibilityService";
import { cn } from "@/lib/utils";

interface SectionVisibilityToggleProps {
  section: ProfileSection;
  currentVisibility: SectionVisibility;
  onChanged: (visibility: SectionVisibility) => void;
}

const VISIBILITY_OPTIONS: { value: SectionVisibility; icon: typeof Globe; labelKey: string; fallback: string }[] = [
  { value: 'everyone', icon: Globe, labelKey: 'visibility.everyone', fallback: 'Everyone' },
  { value: 'logged_in', icon: Users, labelKey: 'visibility.loggedIn', fallback: 'Logged-in users' },
  { value: 'connections', icon: Lock, labelKey: 'visibility.connectionsOnly', fallback: 'Connections only' },
];

export default function SectionVisibilityToggle({ section, currentVisibility, onChanged }: SectionVisibilityToggleProps) {
  const { t } = useTranslation();
  const [updating, setUpdating] = useState(false);

  const current = VISIBILITY_OPTIONS.find(o => o.value === currentVisibility) || VISIBILITY_OPTIONS[0];
  const CurrentIcon = current.icon;

  const handleSelect = async (visibility: SectionVisibility) => {
    if (visibility === currentVisibility) return;
    setUpdating(true);
    const ok = await updateSectionVisibility(section, visibility);
    if (ok) onChanged(visibility);
    setUpdating(false);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                disabled={updating}
              >
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CurrentIcon className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{t('visibility.whoCanSee', 'Who can see this section')}</p>
          </TooltipContent>
          <DropdownMenuContent align="end" className="w-48">
            {VISIBILITY_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer",
                    currentVisibility === opt.value && "bg-accent"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t(opt.labelKey, opt.fallback)}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </Tooltip>
    </TooltipProvider>
  );
}
