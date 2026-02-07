import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UserPlus, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { addCompanyRole } from "@/services/companyRolesService";
import { logAuditAction } from "@/services/companyAuditService";
import type { Database } from "@/integrations/supabase/types";

type CompanyRoleEnum = Database["public"]["Enums"]["company_role"];

interface AddRoleFormProps {
  companyId: string;
  onRoleAdded: () => void;
}

interface FoundUser {
  id: string;
  fullname: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function AddRoleForm({ companyId, onRoleAdded }: AddRoleFormProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FoundUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<FoundUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<CompanyRoleEnum>("editor");
  const [adding, setAdding] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, fullname, username, avatar_url")
        .or(`username.ilike.%${searchQuery}%,fullname.ilike.%${searchQuery}%`)
        .limit(5);

      if (error) throw error;
      setResults(data || []);
    } catch {
      toast.error(t("companyAdmin.searchFailed", "Failed to search users"));
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedUser) return;
    setAdding(true);
    try {
      await addCompanyRole(companyId, selectedUser.id, selectedRole);
      await logAuditAction(companyId, "added_role", {
        user_id: selectedUser.id,
        name: selectedUser.fullname || selectedUser.username,
        role: selectedRole,
      });
      toast.success(t("companyAdmin.roleAdded", "Role added successfully"));
      setSelectedUser(null);
      setSearchQuery("");
      setResults([]);
      onRoleAdded();
    } catch (err: any) {
      toast.error(err.message || t("companyAdmin.roleAddFailed", "Failed to add role"));
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          {t("companyAdmin.addRole", "Add Admin or Editor")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search input */}
        <div className="flex gap-2">
          <Input
            placeholder={t("companyAdmin.searchUserPlaceholder", "Search by name or username...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSearch}
            disabled={searching || searchQuery.trim().length < 2}
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Search results */}
        {results.length > 0 && !selectedUser && (
          <div className="border rounded-md divide-y">
            {results.map((user) => (
              <button
                key={user.id}
                className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-accent transition-colors"
                onClick={() => {
                  setSelectedUser(user);
                  setResults([]);
                }}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.avatar_url || ""} />
                  <AvatarFallback>
                    {(user.fullname || user.username || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.fullname || user.username || "Unknown"}
                  </p>
                  {user.username && (
                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected user + role picker */}
        {selectedUser && (
          <div className="flex items-center gap-3 p-2 border rounded-md bg-accent/30">
            <Avatar className="h-8 w-8">
              <AvatarImage src={selectedUser.avatar_url || ""} />
              <AvatarFallback>
                {(selectedUser.fullname || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {selectedUser.fullname || selectedUser.username}
              </p>
            </div>
            <Select
              value={selectedRole}
              onValueChange={(val) => setSelectedRole(val as CompanyRoleEnum)}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t("companyAdmin.roleAdmin", "Admin")}</SelectItem>
                <SelectItem value="editor">{t("companyAdmin.roleEditor", "Editor")}</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAdd} disabled={adding}>
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("common.save", "Save")
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedUser(null)}
            >
              {t("common.cancel", "Cancel")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
