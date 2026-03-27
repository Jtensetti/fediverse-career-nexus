import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mail, Users, UserPlus, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type DMPrivacy = 'everyone' | 'connections' | 'connections_plus' | 'nobody';

interface DMPrivacySettingsProps { className?: string; }

export default function DMPrivacySettings({ className }: DMPrivacySettingsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [privacy, setPrivacy] = useState<DMPrivacy>('connections');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPrivacy = async () => {
      if (!user) return;
      const { data, error } = await supabase.from('profiles').select('dm_privacy').eq('id', user.id).single();
      if (!error && data?.dm_privacy) setPrivacy(data.dm_privacy as DMPrivacy);
      setIsLoading(false);
    };
    fetchPrivacy();
  }, [user]);

  const handleChange = async (value: DMPrivacy) => {
    if (!user) return;
    setPrivacy(value);
    const { error } = await supabase.from('profiles').update({ dm_privacy: value }).eq('id', user.id);
    if (error) toast.error(t('dmPrivacy.updateFailed'));
    else toast.success(t('dmPrivacy.updated'));
  };

  const options = [
    { value: 'everyone', label: t('dmPrivacy.everyone'), description: t('dmPrivacy.everyoneDesc'), icon: Mail },
    { value: 'connections', label: t('dmPrivacy.connections'), description: t('dmPrivacy.connectionsDesc'), icon: Users },
    { value: 'connections_plus', label: t('dmPrivacy.connectionsPlus'), description: t('dmPrivacy.connectionsPlusDesc'), icon: UserPlus },
    { value: 'nobody', label: t('dmPrivacy.nobody'), description: t('dmPrivacy.nobodyDesc'), icon: Lock },
  ];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader><CardTitle className="text-lg">{t('dmPrivacy.title')}</CardTitle></CardHeader>
        <CardContent><div className="animate-pulse space-y-3">{[...Array(4)].map((_, i) => (<div key={i} className="h-12 bg-muted rounded" />))}</div></CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader><CardTitle className="text-lg">{t('dmPrivacy.title')}</CardTitle><CardDescription>{t('dmPrivacy.description')}</CardDescription></CardHeader>
      <CardContent>
        <RadioGroup value={privacy} onValueChange={(v) => handleChange(v as DMPrivacy)}>
          <div className="space-y-3">
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <div key={option.value} className="flex items-start space-x-3">
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{option.label}</span></div>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </Label>
                </div>
              );
            })}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
