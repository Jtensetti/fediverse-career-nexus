
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CodeOfConduct = () => {
  return (
    <div className="max-w-4xl mx-auto prose prose-lg">
      <p className="text-lg text-gray-700 leading-relaxed mb-8">
        Nolto is a professional, federated community. To keep Nolto open, respectful, and welcoming for everyone, 
        we expect all users to follow these guidelines at all times—both on this instance and when interacting 
        with users across the Fediverse.
      </p>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-bondy-primary mb-6">1. Respect Others</h2>
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <ul className="space-y-4">
            <li className="flex items-start">
              <div className="w-2 h-2 bg-bondy-accent rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-gray-700">
                Treat everyone with respect, regardless of profession, background, nationality, gender, ethnicity, 
                religion, ability, age, or identity.
              </span>
            </li>
            <li className="flex items-start">
              <div className="w-2 h-2 bg-bondy-accent rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-gray-700">
                Disagreement is natural. Personal attacks, harassment, hate speech, threats, or discrimination 
                will not be tolerated.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-bondy-primary mb-6">2. Professionalism</h2>
        <div className="bg-bondy-primary/5 p-6 rounded-lg mb-8">
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className="w-2 h-2 bg-bondy-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-gray-700">Maintain a professional tone in your posts, messages, and job offers.</span>
            </li>
            <li className="flex items-start">
              <div className="w-2 h-2 bg-bondy-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-gray-700">Do not post misleading, fraudulent, or defamatory content.</span>
            </li>
            <li className="flex items-start">
              <div className="w-2 h-2 bg-bondy-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-gray-700">Respect confidentiality and do not share private information without consent.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-bondy-primary mb-6">3. No Harassment or Abuse</h2>
        <div className="space-y-4 mb-8">
          <div className="flex items-start">
            <div className="w-2 h-2 bg-bondy-accent rounded-full mt-2 mr-4 flex-shrink-0"></div>
            <span className="text-gray-700">Harassment, bullying, stalking, or repeated unwanted contact is strictly prohibited.</span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-bondy-accent rounded-full mt-2 mr-4 flex-shrink-0"></div>
            <span className="text-gray-700">Do not use Nolto to intimidate, blackmail, or harm others in any way.</span>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-bondy-primary mb-6">4. Inclusive Communication</h2>
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <ul className="space-y-4">
            <li className="flex items-start">
              <div className="w-2 h-2 bg-bondy-accent rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-gray-700">Use inclusive and clear language.</span>
            </li>
            <li className="flex items-start">
              <div className="w-2 h-2 bg-bondy-accent rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-gray-700">Avoid offensive, explicit, or sexually suggestive content.</span>
            </li>
            <li className="flex items-start">
              <div className="w-2 h-2 bg-bondy-accent rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-gray-700">Respect that Nolto is a public, professional environment.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-bondy-primary mb-6">5. Integrity and Legality</h2>
        <div className="space-y-4 mb-8">
          <div className="flex items-start">
            <div className="w-2 h-2 bg-bondy-accent rounded-full mt-2 mr-4 flex-shrink-0"></div>
            <span className="text-gray-700">
              Do not use Nolto for illegal activities, including fraud, phishing, or distribution of 
              malicious content.
            </span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-bondy-accent rounded-full mt-2 mr-4 flex-shrink-0"></div>
            <span className="text-gray-700">Only share content you have the right to publish.</span>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-bondy-primary mb-6">6. Moderation</h2>
        <div className="bg-bondy-primary/5 p-6 rounded-lg mb-8">
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className="w-2 h-2 bg-bondy-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-gray-700">Follow the moderation guidelines set by your Nolto instance.</span>
            </li>
            <li className="flex items-start">
              <div className="w-2 h-2 bg-bondy-primary rounded-full mt-2 mr-4 flex-shrink-0"></div>
              <span className="text-gray-700">
                Reports of rule violations are taken seriously. Repeated or severe violations may result in 
                warnings, suspension, or permanent removal from the network.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-bondy-primary mb-6">7. Federation Etiquette</h2>
        <div className="space-y-4 mb-8">
          <div className="flex items-start">
            <div className="w-2 h-2 bg-bondy-accent rounded-full mt-2 mr-4 flex-shrink-0"></div>
            <span className="text-gray-700">
              Remember that your behavior may reflect on your instance and affect its federation with others.
            </span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-bondy-accent rounded-full mt-2 mr-4 flex-shrink-0"></div>
            <span className="text-gray-700">
              Be considerate in cross-instance interactions and follow the rules of remote communities when 
              engaging there.
            </span>
          </div>
        </div>
      </section>

      <section className="bg-bondy-primary text-white p-8 rounded-lg text-center">
        <h2 className="text-2xl font-bold mb-4">Reporting Violations</h2>
        <p className="text-lg mb-6 text-white/90">
          If you experience or witness behavior that violates this Code of Conduct, use the "Report" 
          function or contact your instance administrators.
        </p>
        <p className="text-lg font-medium text-bondy-highlight">
          Together, we can build a professional network that is open, diverse, and safe for all.
        </p>
      </section>
    </div>
  );
};

export default CodeOfConduct;
