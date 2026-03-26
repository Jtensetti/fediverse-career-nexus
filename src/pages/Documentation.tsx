import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SEOHead } from "@/components/common/SEOHead";

const Documentation = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={t("documentation.title")} 
        description={t("documentation.subtitle")} 
      />
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">
              {t("documentation.title")}
            </h1>
            <p className="text-xl text-accent">
              {t("documentation.subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto prose prose-lg">
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            {t("documentation.welcome")}
          </p>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">{t("documentation.gettingStarted")}</h2>
            
            <h3 className="text-xl font-semibold text-primary mb-4">{t("documentation.creatingAccount")}</h3>
            <ul className="space-y-2 mb-6">
              <li>{t("documentation.creatingAccountSteps.0", "Visit Nolto and click 'Create Account'.")}</li>
              <li>{t("documentation.creatingAccountSteps.1", "Fill in the registration form.")}</li>
              <li>{t("documentation.creatingAccountSteps.2", "Confirm your email and log in.")}</li>
              <li>{t("documentation.creatingAccountSteps.3", "Set up your profile with skills, experience, and what you're looking for.")}</li>
            </ul>

            <h3 className="text-xl font-semibold text-primary mb-4">{t("documentation.completingProfile")}</h3>
            <ul className="space-y-2 mb-6">
              <li>{t("documentation.completingProfileSteps.0", "Add your work history, skills, education, and a short introduction.")}</li>
              <li>{t("documentation.completingProfileSteps.1", "Set privacy settings for each section.")}</li>
              <li>{t("documentation.completingProfileSteps.2", "Link to other profiles or your website.")}</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">{t("documentation.findingJobs")}</h2>
            <ul className="space-y-2 mb-6">
              <li>{t("documentation.findingJobsSteps.0", "Use search and filter tools to browse job postings.")}</li>
              <li>{t("documentation.findingJobsSteps.1", "Save interesting jobs, apply directly, or contact the poster.")}</li>
              <li>{t("documentation.findingJobsSteps.2", "Subscribe to job feeds by category, location, or organization.")}</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">{t("documentation.collaboration")}</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              {t("documentation.collaborationDesc")}
            </p>
            <ul className="space-y-2 mb-6">
              <li>{t("documentation.collaborationSteps.0", "You can interact with users and jobs from different organizations.")}</li>
              <li>{t("documentation.collaborationSteps.1", "Profiles, job posts, and messages can be shared between units.")}</li>
              <li>{t("documentation.collaborationSteps.2", "If you change organization, you can export your data and contacts.")}</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-primary mb-6">{t("documentation.moreResources")}</h2>
            <div className="bg-muted p-6 rounded-lg">
              <ul className="space-y-3">
                <li>
                  <strong className="text-primary">{t("documentation.helpCenter")}</strong> – {t("documentation.helpCenterDesc")}
                </li>
                <li>
                  <strong className="text-primary">{t("documentation.howCollaborationWorks")}</strong> – {t("documentation.howCollaborationWorksDesc")}
                </li>
                <li>
                  <Link to="/privacy" className="text-secondary hover:text-primary transition-colors">
                    <strong>{t("documentation.privacyPolicy")}</strong>
                  </Link> – {t("documentation.privacyPolicyDesc")}
                </li>
                <li>
                  <Link to="/code-of-conduct" className="text-secondary hover:text-primary transition-colors">
                    <strong>{t("documentation.codeOfConduct")}</strong>
                  </Link> – {t("documentation.codeOfConductDesc")}
                </li>
              </ul>
            </div>
          </section>

          <section className="bg-primary text-primary-foreground p-8 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">{t("documentation.needHelp")}</h2>
            <p className="text-lg mb-6 text-primary-foreground/90">
              {t("documentation.needHelpDesc")}
            </p>
          </section>
        </div>
      </div>

      <div className="border-t py-6">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("documentation.backToHome")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
