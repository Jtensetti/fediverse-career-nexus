import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, 
  Users, 
  MessageSquare, 
  Calendar, 
  Briefcase, 
  Shield 
} from "lucide-react";
import { useTranslation } from "react-i18next";

const Features = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <User size={28} className="text-secondary" />,
      title: t('features.profiles.title', 'Professionella profiler'),
      description: t('features.profiles.desc', 'Skapa en strukturerad profil med erfarenhet, utbildning, projekt och kompetenser. Dela via QR-kod eller presentationsläge.')
    },
    {
      icon: <Users size={28} className="text-secondary" />,
      title: t('features.connections.title', 'Meningsfulla kontakter'),
      description: t('features.connections.desc', 'Bygg ett nätverk av genuina kontakter inom och mellan organisationer i offentlig sektor.')
    },
    {
      icon: <MessageSquare size={28} className="text-secondary" />,
      title: t('features.messaging.title', 'Säkra meddelanden'),
      description: t('features.messaging.desc', 'Kommunicera med krypterade direktmeddelanden. Kontaktbaserade behörigheter säkerställer en professionell miljö.')
    },
    {
      icon: <Calendar size={28} className="text-secondary" />,
      title: t('features.events.title', 'Evenemang & möten'),
      description: t('features.events.desc', 'Skapa och delta i professionella evenemang med anmälningsfunktion, kalenderintegration och inbyggd videokonferens.')
    },
    {
      icon: <Briefcase size={28} className="text-secondary" />,
      title: t('features.jobs.title', 'Rekryteringsverktyg'),
      description: t('features.jobs.desc', 'Publicera och hitta tjänster med transparenta uppgifter om titel, placering, kravprofil och lönespann.')
    },
    {
      icon: <Shield size={28} className="text-secondary" />,
      title: t('features.moderation.title', 'Trygg miljö'),
      description: t('features.moderation.desc', 'En sund arbetsmiljö med inbyggda modereringsverktyg, tydliga riktlinjer och transparenta policyer.')
    }
  ];

  return (
    <section id="features" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 text-primary">
            {t('features.heading', 'Funktioner byggda för offentlig sektor')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('features.subheading', 'Samverkan kombinerar det bästa från professionella nätverk med säker, svensk-hostad teknik.')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border shadow-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-5px]">
              <CardHeader className="pb-2">
                <div className="mb-4 p-3 inline-flex rounded-full bg-primary/10">{feature.icon}</div>
                <CardTitle className="text-xl font-display text-primary">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
