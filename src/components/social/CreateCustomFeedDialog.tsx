import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Plus, Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  createCustomFeed,
  updateCustomFeed,
  type CustomFeed,
  type FeedRules,
} from "@/services/misc/feedPreferencesService";
import { INTEREST_CATEGORIES } from "@/services/misc/onboardingRecommendationService";

interface CreateCustomFeedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editFeed?: CustomFeed | null;
  onSaved?: () => void;
}

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
}

export default function CreateCustomFeedDialog({
  open,
  onOpenChange,
  editFeed,
  onSaved,
}: CreateCustomFeedDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<SearchResult[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<SearchResult[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<SearchResult[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [companyResults, setCompanyResults] = useState<SearchResult[]>([]);
  const [companySearching, setCompanySearching] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditing = !!editFeed;

  // Populate form when editing
  useEffect(() => {
    if (editFeed) {
      setName(editFeed.name);
      setDescription(editFeed.description || "");
      setSelectedTags(editFeed.rules.include_tags || []);
      setKeywords(editFeed.rules.include_keywords || []);
      // Restore users/companies from IDs (we store labels in rules for display)
      setSelectedUsers(
        (editFeed.rules.include_users || []).map((id) => ({ id, label: id }))
      );
      setSelectedCompanies(
        (editFeed.rules.include_companies || []).map((id) => ({
          id,
          label: id,
        }))
      );
    } else {
      resetForm();
    }
  }, [editFeed, open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedTags([]);
    setTagInput("");
    setSelectedUsers([]);
    setUserSearch("");
    setSelectedCompanies([]);
    setCompanySearch("");
    setKeywords([]);
    setKeywordInput("");
  };

  // Search users
  useEffect(() => {
    if (!userSearch.trim()) {
      setUserResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setUserSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .or(
          `display_name.ilike.%${userSearch}%,username.ilike.%${userSearch}%`
        )
        .limit(5);
      setUserResults(
        (data || []).map((p) => ({
          id: p.id,
          label: p.display_name || p.username || p.id,
          sublabel: p.username ? `@${p.username}` : undefined,
        }))
      );
      setUserSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [userSearch]);

  // Search companies
  useEffect(() => {
    if (!companySearch.trim()) {
      setCompanyResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setCompanySearching(true);
      const { data } = await supabase
        .from("companies")
        .select("id, name, industry")
        .ilike("name", `%${companySearch}%`)
        .limit(5);
      setCompanyResults(
        (data || []).map((c) => ({
          id: c.id,
          label: c.name,
          sublabel: c.industry || undefined,
        }))
      );
      setCompanySearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [companySearch]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
    }
    setTagInput("");
  };

  const addKeyword = (kw: string) => {
    const trimmed = kw.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed]);
    }
    setKeywordInput("");
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const rules: FeedRules = {};
    if (selectedTags.length > 0) rules.include_tags = selectedTags;
    if (keywords.length > 0) rules.include_keywords = keywords;
    if (selectedUsers.length > 0)
      rules.include_users = selectedUsers.map((u) => u.id);
    if (selectedCompanies.length > 0)
      rules.include_companies = selectedCompanies.map((c) => c.id);

    let success = false;
    if (isEditing && editFeed) {
      success = await updateCustomFeed(editFeed.id, {
        name: name.trim(),
        description: description.trim() || null,
        rules,
      });
    } else {
      const result = await createCustomFeed({
        name: name.trim(),
        description: description.trim() || undefined,
        rules,
      });
      success = !!result;
    }

    setSaving(false);
    if (success) {
      onOpenChange(false);
      onSaved?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t("feed.editCustomFeed", "Redigera anpassat flöde")
              : t("feed.createCustomFeed", "Skapa anpassat flöde")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "feed.createCustomFeedDesc",
              "Välj intressen, organisationer och personer att följa i ditt flöde."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="feed-name">{t("feed.name", "Namn")} *</Label>
            <Input
              id="feed-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("feed.namePlaceholder", "T.ex. Design-nyheter")}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="feed-desc">
              {t("feed.description", "Beskrivning")}
            </Label>
            <Textarea
              id="feed-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t(
                "feed.descPlaceholder",
                "Valfri beskrivning av flödet"
              )}
            />
          </div>

          {/* Tags / Interests */}
          <div className="space-y-1.5">
            <Label>{t("feed.tagsInterests", "Intressen & taggar")}</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {INTEREST_CATEGORIES.map((cat) => {
                const active = selectedTags.includes(cat.id);
                return (
                  <Badge
                    key={cat.id}
                    variant={active ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() =>
                      active
                        ? setSelectedTags((t) => t.filter((x) => x !== cat.id))
                        : setSelectedTags((t) => [...t, cat.id])
                    }
                  >
                    {cat.label}
                  </Badge>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder={t("feed.addCustomTag", "Lägg till egen tagg...")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                className="text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => addTag(tagInput)}
                disabled={!tagInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {selectedTags.filter((t) => !INTEREST_CATEGORIES.find((c) => c.id === t)).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedTags
                  .filter((t) => !INTEREST_CATEGORIES.find((c) => c.id === t))
                  .map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSelectedTags((ts) => ts.filter((x) => x !== tag))}
                      />
                    </Badge>
                  ))}
              </div>
            )}
          </div>

          {/* Companies */}
          <div className="space-y-1.5">
            <Label>{t("feed.organizations", "Organisationer")}</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                placeholder={t("feed.searchOrgs", "Sök organisationer...")}
                className="pl-8 text-sm"
              />
            </div>
            {companySearching && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("common.searching", "Söker...")}
              </div>
            )}
            {companyResults.length > 0 && (
              <div className="border rounded-md divide-y max-h-32 overflow-y-auto">
                {companyResults
                  .filter((r) => !selectedCompanies.find((c) => c.id === r.id))
                  .map((r) => (
                    <button
                      key={r.id}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between items-center"
                      onClick={() => {
                        setSelectedCompanies((prev) => [...prev, r]);
                        setCompanySearch("");
                        setCompanyResults([]);
                      }}
                    >
                      <span>{r.label}</span>
                      {r.sublabel && (
                        <span className="text-xs text-muted-foreground">
                          {r.sublabel}
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            )}
            {selectedCompanies.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedCompanies.map((c) => (
                  <Badge key={c.id} variant="secondary" className="gap-1 text-xs">
                    {c.label}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() =>
                        setSelectedCompanies((prev) =>
                          prev.filter((x) => x.id !== c.id)
                        )
                      }
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Users */}
          <div className="space-y-1.5">
            <Label>{t("feed.specificPeople", "Specifika personer")}</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder={t("feed.searchPeople", "Sök personer...")}
                className="pl-8 text-sm"
              />
            </div>
            {userSearching && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("common.searching", "Söker...")}
              </div>
            )}
            {userResults.length > 0 && (
              <div className="border rounded-md divide-y max-h-32 overflow-y-auto">
                {userResults
                  .filter((r) => !selectedUsers.find((u) => u.id === r.id))
                  .map((r) => (
                    <button
                      key={r.id}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between items-center"
                      onClick={() => {
                        setSelectedUsers((prev) => [...prev, r]);
                        setUserSearch("");
                        setUserResults([]);
                      }}
                    >
                      <span>{r.label}</span>
                      {r.sublabel && (
                        <span className="text-xs text-muted-foreground">
                          {r.sublabel}
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            )}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedUsers.map((u) => (
                  <Badge key={u.id} variant="secondary" className="gap-1 text-xs">
                    {u.label}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() =>
                        setSelectedUsers((prev) =>
                          prev.filter((x) => x.id !== u.id)
                        )
                      }
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Keywords */}
          <div className="space-y-1.5">
            <Label>{t("feed.keywords", "Nyckelord")}</Label>
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder={t("feed.addKeyword", "Lägg till nyckelord...")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addKeyword(keywordInput);
                  }
                }}
                className="text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => addKeyword(keywordInput)}
                disabled={!keywordInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {keywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="gap-1 text-xs">
                    {kw}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() =>
                        setKeywords((prev) => prev.filter((x) => x !== kw))
                      }
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Avbryt")}
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditing
              ? t("common.save", "Spara")
              : t("feed.create", "Skapa")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
