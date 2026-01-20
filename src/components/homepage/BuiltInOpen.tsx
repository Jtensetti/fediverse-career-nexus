import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Star, Users, Shield, ExternalLink } from "lucide-react";

const BuiltInOpen = () => {
  const { t } = useTranslation();

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-4 px-3 py-1">
              <GitBranch className="h-3 w-3 mr-1" />
              {t("openSource.badge")}
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-3">
              {t("openSource.title")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("openSource.description")}
            </p>
          </div>

          <Card className="border-0 shadow-xl overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-primary to-secondary p-8 text-primary-foreground">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
                      <GitBranch className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">nolto/nolto</h3>
                      <p className="text-primary-foreground/80">
                        {t("openSource.repoDescription")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 justify-center">
                    <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-lg">
                      <Star className="h-5 w-5" />
                      <span className="font-semibold">{t("openSource.mitLicense")}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-lg">
                      <Users className="h-5 w-5" />
                      <span className="font-semibold">{t("openSource.contributorsWelcome")}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-card">
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <Shield className="h-8 w-8 mx-auto text-primary mb-3" />
                    <h4 className="font-semibold text-foreground mb-1">{t("openSource.securityAudited")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("openSource.securityDescription")}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <GitBranch className="h-8 w-8 mx-auto text-primary mb-3" />
                    <h4 className="font-semibold text-foreground mb-1">{t("openSource.activeDevelopment")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("openSource.devDescription")}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <Users className="h-8 w-8 mx-auto text-primary mb-3" />
                    <h4 className="font-semibold text-foreground mb-1">{t("openSource.communityDriven")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("openSource.communityDescription")}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="outline" className="gap-2" asChild>
                    <a 
                      href="https://github.com/nolto/nolto" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <GitBranch className="h-4 w-4" />
                      {t("openSource.viewSourceCode")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                  <Button variant="outline" className="gap-2" asChild>
                    <a 
                      href="https://github.com/nolto/nolto/blob/main/CONTRIBUTING.md" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Users className="h-4 w-4" />
                      {t("openSource.contribute")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default BuiltInOpen;
