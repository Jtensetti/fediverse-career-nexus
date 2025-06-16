import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CodeOfConduct = () => {
  const { t } = useTranslation();

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="text-2xl text-bondy-primary">Code of Conduct</CardTitle>
        <CardDescription className="text-lg">
          Bondy is a professional, federated community. To keep Bondy open, respectful, and welcoming for everyone, 
          we expect all users to follow these guidelines at all times—both on this instance and when interacting 
          with users across the Fediverse.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        
        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-bondy-primary">1. Respect Others</h3>
          <div className="space-y-3 text-gray-700">
            <p>
              Treat everyone with respect, regardless of profession, background, nationality, gender, ethnicity, 
              religion, ability, age, or identity.
            </p>
            <p>
              Disagreement is natural. Personal attacks, harassment, hate speech, threats, or discrimination 
              will not be tolerated.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-bondy-primary">2. Professionalism</h3>
          <div className="space-y-3 text-gray-700">
            <p>Maintain a professional tone in your posts, messages, and job offers.</p>
            <p>Do not post misleading, fraudulent, or defamatory content.</p>
            <p>Respect confidentiality and do not share private information without consent.</p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-bondy-primary">3. No Harassment or Abuse</h3>
          <div className="space-y-3 text-gray-700">
            <p>Harassment, bullying, stalking, or repeated unwanted contact is strictly prohibited.</p>
            <p>Do not use Bondy to intimidate, blackmail, or harm others in any way.</p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-bondy-primary">4. Inclusive Communication</h3>
          <div className="space-y-3 text-gray-700">
            <p>Use inclusive and clear language.</p>
            <p>Avoid offensive, explicit, or sexually suggestive content.</p>
            <p>Respect that Bondy is a public, professional environment.</p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-bondy-primary">5. Integrity and Legality</h3>
          <div className="space-y-3 text-gray-700">
            <p>
              Do not use Bondy for illegal activities, including fraud, phishing, or distribution of 
              malicious content.
            </p>
            <p>Only share content you have the right to publish.</p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-bondy-primary">6. Moderation</h3>
          <div className="space-y-3 text-gray-700">
            <p>Follow the moderation guidelines set by your Bondy instance.</p>
            <p>
              Reports of rule violations are taken seriously. Repeated or severe violations may result in 
              warnings, suspension, or permanent removal from the network.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-bondy-primary">7. Federation Etiquette</h3>
          <div className="space-y-3 text-gray-700">
            <p>
              Remember that your behavior may reflect on your instance and affect its federation with others.
            </p>
            <p>
              Be considerate in cross-instance interactions and follow the rules of remote communities when 
              engaging there.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="bg-bondy-primary/10 p-4 rounded-lg">
            <p className="text-gray-700 font-medium">
              If you experience or witness behavior that violates this Code of Conduct, use the "Report" 
              function or contact your instance administrators.
            </p>
            <p className="text-gray-700 mt-2">
              Together, we can build a professional network that is open, diverse, and safe for all.
            </p>
          </div>
        </section>
      </CardContent>
    </Card>
  );
};

export default CodeOfConduct;
