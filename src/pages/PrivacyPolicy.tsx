import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Database, Users, Lock } from "lucide-react";

const PrivacyPolicy = () => {
  const keyPoints = [
    {
      icon: Database,
      title: "Data Control",
      description: "Your data is controlled by your chosen instance administrator, not Bondy centrally."
    },
    {
      icon: Users,
      title: "Federation",
      description: "Some data is shared across the Fediverse when you interact with other instances."
    },
    {
      icon: Shield,
      title: "Your Rights",
      description: "Full GDPR rights including access, correction, deletion, and data portability."
    },
    {
      icon: Lock,
      title: "Security",
      description: "Strong technical and organizational measures protect your personal data."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-bondy-primary text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">
              Privacy Policy
            </h1>
            <p className="text-xl text-bondy-highlight">
              How Bondy Handles Your Personal Data
            </p>
            <p className="text-lg text-white/90 mt-4">
              <strong>Effective Date:</strong> June 16, 2025
            </p>
            <p className="text-lg text-white/90 mt-2">
              This Privacy Policy explains how Bondy handles your personal data, both on the Bondy platform 
              and across federated instances. We are committed to protecting your privacy and ensuring 
              transparency about what happens with your data.
            </p>
          </div>
        </div>
      </div>

      {/* Key Points */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {keyPoints.map((point, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="bg-bondy-primary/10 p-3 rounded-lg">
                  <point.icon className="h-6 w-6 text-bondy-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-bondy-primary mb-2">{point.title}</h3>
                  <p className="text-gray-700">{point.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Content Sections */}
          <div className="prose prose-lg max-w-none">
            
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">1. Who Controls Your Data</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Bondy is a federated platform developed by <strong>Lovable, a company registered in Sweden (EU)</strong>. 
                  When you sign up, your data is stored and managed by the instance (server) where you created your account.
                </p>
                <p>
                  Each instance is operated by its own administrator, who acts as the data controller under 
                  the GDPR and is responsible for handling your data in accordance with applicable law.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>If you use bondy.social or another public instance:</strong><br />
                  You can find contact information for the data controller on that instance's "About" or "Contact" page.</p>
                  
                  <p className="mt-3"><strong>If you run your own instance:</strong><br />
                  You, or your organization, are the data controller for your users.</p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">2. What Data is Collected</h2>
              <div className="space-y-4 text-gray-700">
                <p>Depending on how you use Bondy, the following data may be collected and processed by your instance:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Account information:</strong> Name, email address, chosen username, profile details, password (stored as a secure hash).</li>
                  <li><strong>Professional data:</strong> Job history, skills, education, uploaded CV or portfolio.</li>
                  <li><strong>Content:</strong> Posts, messages, comments, job applications, and other user-generated content.</li>
                  <li><strong>Technical data:</strong> IP address, device information, access logs (for security, abuse prevention, and debugging).</li>
                  <li><strong>Federation data:</strong> Information shared with other Bondy or Fediverse instances as part of normal federation (see section 4).</li>
                </ul>
                <p>
                  Bondy does not require sensitive personal data (e.g., government ID numbers, health data) 
                  unless you voluntarily provide it in your profile or posts.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">3. Legal Basis for Processing</h2>
              <div className="space-y-4 text-gray-700">
                <p>Your data is processed for the following purposes and legal bases:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>To provide the service:</strong> Necessary for the performance of our contract with you (GDPR Art. 6(1)(b)).</li>
                  <li><strong>To comply with legal obligations:</strong> For example, security and moderation duties (GDPR Art. 6(1)(c)).</li>
                  <li><strong>With your consent:</strong> Where required (e.g., for optional communications, or if you explicitly choose to make your profile public) (GDPR Art. 6(1)(a)).</li>
                  <li><strong>Legitimate interests:</strong> Such as security, abuse prevention, or improving the service, provided these do not override your rights (GDPR Art. 6(1)(f)).</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">4. How Data is Shared</h2>
              <div className="space-y-4 text-gray-700">
                <h3 className="text-xl font-semibold text-bondy-primary">Within the Instance</h3>
                <p>Your data is available to administrators of your chosen instance, as needed for support and moderation.</p>
                
                <h3 className="text-xl font-semibold text-bondy-primary">Across the Fediverse</h3>
                <p>
                  When you interact with users or job posts on other Bondy or compatible Fediverse instances, 
                  relevant information (such as your profile, public posts, and job applications) may be federated 
                  and shared with those remote servers, according to the ActivityPub protocol.
                </p>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <p>
                    <strong>Note:</strong> Federated data is outside the sole control of your instance once delivered 
                    to another server. Each remote instance is responsible for its own data protection practices.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">5. Your Rights</h2>
              <div className="space-y-4 text-gray-700">
                <p>Under the GDPR (if applicable), you have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access your personal data.</li>
                  <li>Correct inaccurate or incomplete data.</li>
                  <li>Delete your account and associated data ("right to be forgotten").</li>
                  <li>Restrict or object to certain data processing.</li>
                  <li>Export your data in a machine-readable format (data portability).</li>
                </ul>
                <p>
                  To exercise these rights, contact your instance administrator. For federated data, your instance 
                  will do its best to communicate your request to other servers, but complete erasure on remote 
                  instances cannot be fully guaranteed.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">6. Data Security</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Bondy instances use appropriate technical and organizational measures to protect your data 
                  from unauthorized access, alteration, or loss.
                </p>
                <p>
                  However, no system is 100% secure. We encourage you to use strong passwords and be careful 
                  about what you choose to share publicly.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">7. Data Retention</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Your data is kept as long as your account is active, and for a reasonable period afterwards 
                  to comply with legal obligations or resolve disputes.
                </p>
                <p>
                  You can delete your account at any time; your data will be deleted or anonymized, except 
                  where retention is required by law.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">8. Cookies & External Resources</h2>
              <div className="space-y-6 text-gray-700">
                
                <div>
                  <h3 className="text-xl font-semibold text-bondy-primary mb-3">8.1 Essential Cookies (Always Active)</h3>
                  <p className="mb-3">
                    These cookies are strictly necessary for the platform to function and cannot be disabled:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Authentication cookies:</strong> Maintain your login session and keep your account secure.</li>
                    <li><strong>Security cookies (Cloudflare __cf_bm):</strong> Protect against bots and malicious traffic. These are set by our infrastructure provider and expire after 30 minutes of inactivity.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-primary mb-3">8.2 Typography Fonts</h3>
                  <p className="mb-3">
                    Nolto uses the Inter and Montserrat fonts, which are self-hosted on our own servers. 
                    No requests are made to external font providers (such as Google Fonts), ensuring that 
                    your IP address is not shared with third parties for typography purposes.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This approach ensures full GDPR compliance for font loading.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-bondy-primary mb-3">8.3 What We Don't Use</h3>
                  <p>Bondy does not use:</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>Advertising or marketing cookies</li>
                    <li>Analytics tracking (Google Analytics, etc.)</li>
                    <li>Social media tracking pixels</li>
                    <li>Cross-site tracking or fingerprinting</li>
                    <li>Third-party data brokers or ad networks</li>
                  </ul>
                </div>

              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">9. Infrastructure & Data Storage</h2>
              <div className="space-y-6 text-gray-700">
                
                <div>
                  <h3 className="text-xl font-semibold text-bondy-primary mb-3">9.1 Platform Provider</h3>
                  <p>
                    Bondy is developed by <strong>Lovable</strong>, a company registered in <strong>Sweden (EU)</strong>.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-bondy-primary mb-3">9.2 Data Center Location</h3>
                  <p className="mb-3">Your data is stored and processed in the European Union:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Database & Authentication:</strong> Frankfurt, Germany (AWS eu-central-1)</li>
                    <li><strong>Edge Functions:</strong> EU-preferred routing via Deno Deploy</li>
                    <li><strong>Content Delivery:</strong> Cloudflare global network with EU nodes</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-bondy-primary mb-3">9.3 Sub-processors</h3>
                  <p className="mb-3">The following service providers process data on behalf of Bondy:</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Service</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Provider</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Location</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Safeguards</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="px-4 py-3 text-sm">Database & Auth</td>
                          <td className="px-4 py-3 text-sm">Supabase (via AWS)</td>
                          <td className="px-4 py-3 text-sm">Frankfurt, Germany</td>
                          <td className="px-4 py-3 text-sm">EU-US DPF + SCCs</td>
                        </tr>
                        <tr className="border-b">
                          <td className="px-4 py-3 text-sm">Edge Functions</td>
                          <td className="px-4 py-3 text-sm">Deno Deploy</td>
                          <td className="px-4 py-3 text-sm">Global / EU</td>
                          <td className="px-4 py-3 text-sm">EU-US DPF</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-sm">CDN & Security</td>
                          <td className="px-4 py-3 text-sm">Cloudflare</td>
                          <td className="px-4 py-3 text-sm">Global</td>
                          <td className="px-4 py-3 text-sm">EU-US DPF + SCCs</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-sm">
                    All sub-processors are certified under the <strong>EU-US Data Privacy Framework</strong> and/or 
                    have signed <strong>Standard Contractual Clauses (SCCs)</strong> for GDPR compliance.
                  </p>
                </div>

              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">10. International Data Transfers</h2>
              <div className="space-y-4 text-gray-700">
                <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                  <p className="font-semibold text-green-800">Primary data storage: European Union (Frankfurt, Germany)</p>
                </div>
                <p>
                  When data is processed by US-based infrastructure providers (Supabase, Cloudflare), 
                  transfers are protected by:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>EU-US Data Privacy Framework</strong> certification</li>
                  <li><strong>Standard Contractual Clauses (SCCs)</strong></li>
                  <li>Supplementary technical measures (encryption in transit and at rest)</li>
                </ul>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
                  <p>
                    <strong>Note:</strong> Federation transfers to other Fediverse instances may involve servers 
                    in various countries. Each remote instance is responsible for its own data protection practices.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">11. Changes to This Policy</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  We may update this Privacy Policy from time to time. Changes will be posted on this page 
                  with an updated revision date.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">12. Contact</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  For questions or to exercise your rights, contact the instance administrator or Data Protection 
                  Officer (DPO):
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Email:</strong> jtensetti@protonmail.com</p>
                  <p><strong>Bondy Account:</strong> JTensetti (@user_f33be7a8)</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                  <p>
                    This policy applies to all Bondy instances and is intended to comply with the GDPR and other 
                    relevant privacy laws. For local variations or additional requirements, see your instance's 
                    own policy page.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-t border-gray-200 py-6">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
