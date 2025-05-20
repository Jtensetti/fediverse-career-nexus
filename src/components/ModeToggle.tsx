
import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function ModeToggle() {
  const { t } = useTranslation();
  const { setTheme, theme } = useTheme();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Check auth status and get user theme preference
  useEffect(() => {
    const checkAuthAndGetTheme = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const isAuth = !!session?.user;
      setIsAuthenticated(isAuth);
      
      if (isAuth) {
        try {
          const { data, error } = await supabase
            .from('user_settings')
            .select('theme')
            .eq('user_id', session.user.id)
            .single();
            
          if (error) {
            console.error('Error fetching theme preference:', error);
          } else if (data?.theme) {
            setTheme(data.theme);
          }
        } catch (error) {
          console.error('Error fetching user theme:', error);
        }
      }
      setLoading(false);
    };

    checkAuthAndGetTheme();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setIsAuthenticated(!!session);
        if (session?.user) {
          try {
            const { data, error } = await supabase
              .from('user_settings')
              .select('theme')
              .eq('user_id', session.user.id)
              .single();
              
            if (error) {
              console.error('Error fetching theme preference:', error);
            } else if (data?.theme) {
              setTheme(data.theme);
            }
          } catch (error) {
            console.error('Error fetching user theme:', error);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setTheme]);

  const saveThemePreference = async (newTheme: string) => {
    setTheme(newTheme);
    
    if (isAuthenticated) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { error } = await supabase
          .from('user_settings')
          .update({ theme: newTheme })
          .eq('user_id', session.user.id);
          
        if (error) {
          console.error('Error saving theme preference:', error);
          toast({
            title: t('common.error'),
            description: 'Failed to save theme preference',
            variant: 'destructive',
          });
        }
      }
    }
  };

  if (loading) {
    return null; // Or a loading indicator
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("accessibility.darkMode", "Toggle dark mode")}>
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t("accessibility.darkMode", "Toggle dark mode")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => saveThemePreference("light")}>
          {t("theme.light", "Light")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => saveThemePreference("dark")}>
          {t("theme.dark", "Dark")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => saveThemePreference("system")}>
          {t("theme.system", "System")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
