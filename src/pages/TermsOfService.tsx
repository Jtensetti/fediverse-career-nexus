
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Scale, Shield, Users, FileText } from "lucide-react";

const TermsOfService = () => {
  const keyPoints = [
    {
      icon: Scale,
      title: "Legal Agreement",
      description: "These terms constitute a binding agreement between you and your instance operator."
    },
    {
      icon: Users,
      title: "Federation Rules",
      description: "Content may be shared across federated instances with their own policies."
    },
    {
      icon: Shield,
      title: "User Safety",
      description: "We maintain community standards and reserve the right to moderate content."
    },
    {
      icon: FileText,
      title: "Your Rights",
      description: "You retain ownership of your content while granting necessary licenses for operation."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">
              Terms of Service
            </h1>
            <p className="text-xl text-accent">
              Legal Terms and Conditions for Using Nolto
            </p>
            <p className="text-lg text-primary-foreground/90 mt-4">
              <strong>Effective Date:</strong> June 16, 2025
            </p>
            <p className="text-lg text-primary-foreground/90 mt-2">
              These Terms of Service constitute a legally binding agreement between you and the operator 
              of this Nolto instance, governing your use of the Nolto platform and associated services.
            </p>
          </div>
        </div>
      </div>

      {/* Key Points */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {keyPoints.map((point, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 bg-muted rounded-lg">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <point.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-2">{point.title}</h3>
                  <p className="text-muted-foreground">{point.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Content Sections */}
          <div className="prose prose-lg max-w-none">
            
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">1. Definitions</h2>
              <div className="space-y-4 text-muted-foreground">
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong className="text-foreground">Nolto:</strong> The open-source, federated platform for professional networking and job postings, including all code, features, and services provided.</li>
                  <li><strong className="text-foreground">Instance:</strong> A server running the Nolto software, managed either by us or by a third-party administrator, participating in the federated Nolto network.</li>
                  <li><strong className="text-foreground">User:</strong> Any person or entity who accesses, registers for, or uses the Service.</li>
                  <li><strong className="text-foreground">Content:</strong> All information, data, text, images, files, links, or other material posted, transmitted, or otherwise made available via the Service.</li>
                  <li><strong className="text-foreground">Federation:</strong> The process by which information is exchanged between Nolto instances using the ActivityPub protocol or other compatible means.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">2. Eligibility</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  You must be at least 16 years of age, or the minimum age of digital consent in your country, 
                  to use this Service. By using the Service, you warrant that you meet this age requirement and 
                  that all information you provide is truthful and accurate.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">3. Account Registration and Security</h2>
              <div className="space-y-4 text-gray-700">
                <ul className="list-disc pl-6 space-y-2">
                  <li>You may be required to create an account to access certain features. You are responsible for maintaining the confidentiality of your account credentials.</li>
                  <li>You agree to provide accurate, current, and complete information and to update it as necessary.</li>
                  <li>You are solely responsible for any activity that occurs under your account.</li>
                  <li>If you suspect unauthorized access or breach of security, you must notify your instance administrator immediately.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">4. User Conduct</h2>
              <div className="space-y-4 text-gray-700">
                <p>By using the Service, you agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use the Service only for lawful purposes and in accordance with these Terms and applicable laws.</li>
                  <li>Not impersonate any person or entity, or misrepresent your affiliation.</li>
                  <li>Not upload, post, transmit, or otherwise make available any Content that:
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Is illegal, threatening, abusive, harassing, defamatory, obscene, hateful, or otherwise objectionable.</li>
                      <li>Infringes any intellectual property, privacy, or other rights of any party.</li>
                      <li>Contains viruses, malware, or other harmful components.</li>
                    </ul>
                  </li>
                  <li>Not attempt to gain unauthorized access to any part of the Service or disrupt the normal operation of the network.</li>
                  <li>Not use the Service for unsolicited advertising, spam, or commercial purposes except as explicitly permitted (e.g., job postings).</li>
                </ul>
                <p>
                  Each instance may set additional community rules or moderation guidelines. You are responsible 
                  for following both these Terms and any local rules of the instance you use.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">5. Content Ownership and License</h2>
              <div className="space-y-4 text-gray-700">
                <ul className="list-disc pl-6 space-y-2">
                  <li>You retain ownership of any Content you submit, post, or display on the Service.</li>
                  <li>By submitting Content, you grant us and other federated instances a worldwide, non-exclusive, royalty-free license to use, display, reproduce, adapt, and distribute your Content as required for the operation of the Service, including federation.</li>
                  <li>You are responsible for ensuring you have the necessary rights to grant this license for any Content you share.</li>
                  <li>Content you delete may remain cached or stored by federated instances outside our direct control.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">6. Moderation and Enforcement</h2>
              <div className="space-y-4 text-gray-700">
                <ul className="list-disc pl-6 space-y-2">
                  <li>We and other instance administrators reserve the right to remove Content, suspend, or terminate accounts at our discretion for violations of these Terms or applicable laws.</li>
                  <li>Content or accounts may be removed, blocked, or limited as required by law, or to protect the Service, users, or third parties.</li>
                  <li>Actions taken by federated instances (e.g., blocking, removal) are outside our control and may affect your Content or interactions across the network.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">7. Federation and Data Sharing</h2>
              <div className="space-y-4 text-gray-700">
                <ul className="list-disc pl-6 space-y-2">
                  <li>By using a federated Service, you understand that certain Content (including your profile, posts, and messages) may be shared with and stored by other instances as part of the federation process.</li>
                  <li>Once Content is federated to other instances, it is governed by their policies and may not be fully subject to removal or modification by us.</li>
                  <li>We are not responsible for the actions, security practices, or data handling of third-party instances.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">8. Privacy</h2>
              <div className="space-y-4 text-gray-700">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your privacy is important to us. Please refer to our <Link to="/privacy" className="text-bondy-accent hover:text-bondy-primary transition-colors underline">Privacy Policy</Link> for information on how your personal data is collected, processed, and shared.</li>
                  <li>By using the Service, you consent to the collection, use, and sharing of your information as described in the Privacy Policy.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">9. Termination</h2>
              <div className="space-y-4 text-gray-700">
                <ul className="list-disc pl-6 space-y-2">
                  <li>You may terminate your account at any time by following the instructions provided by your instance.</li>
                  <li>We reserve the right to suspend or terminate your access to the Service, with or without notice, for any violation of these Terms or applicable laws, or for security reasons.</li>
                  <li>Upon termination, your data will be handled in accordance with our Privacy Policy. Content previously federated may remain available on remote instances.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">10. Disclaimers</h2>
              <div className="space-y-4 text-gray-700">
                <ul className="list-disc pl-6 space-y-2">
                  <li>The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, non-infringement, or availability.</li>
                  <li>We do not warrant that the Service will be uninterrupted, error-free, or secure.</li>
                  <li>We are not responsible for the actions, content, or availability of federated or third-party instances or services.</li>
                  <li>We do not guarantee the accuracy, completeness, or reliability of any Content or information on the Service.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">11. Limitation of Liability</h2>
              <div className="space-y-4 text-gray-700">
                <p>To the maximum extent permitted by law:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We, our affiliates, and our administrators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use or inability to use the Service.</li>
                  <li>Our total liability for any claim arising out of or relating to these Terms or the Service shall not exceed the greater of (a) the amount you paid (if any) to use the Service during the 12 months preceding the claim, or (b) 100 EUR.</li>
                  <li>You agree to indemnify and hold us harmless from any claims, damages, losses, liabilities, costs, and expenses (including attorneys' fees) arising out of your use of the Service or violation of these Terms.</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">12. Changes to the Terms</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  We may update these Terms from time to time. Changes will be posted on this page with a new 
                  effective date. Your continued use of the Service after changes are posted constitutes your 
                  acceptance of the revised Terms.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">13. Governing Law and Jurisdiction</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of Sweden, 
                  without regard to conflict of law principles. Any disputes arising out of these Terms or the Service 
                  shall be subject to the exclusive jurisdiction of the courts located in Sweden.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-bondy-primary mb-6">14. Severability</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  If any provision of these Terms is found to be unlawful, void, or unenforceable, that provision 
                  shall be deemed severable from these Terms and shall not affect the validity and enforceability 
                  of any remaining provisions.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-primary mb-6">15. Contact</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  For questions or notices regarding these Terms, please contact:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p><strong>Email:</strong> jtensetti@protonmail.com</p>
                  <p><strong>Nolto Account:</strong> JTensetti (@user_f33be7a8)</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg mt-4">
                  <p>
                    <strong>By using this Service, you agree to these Terms of Service.</strong><br />
                    Thank you for being part of the Nolto network.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-t py-6">
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

export default TermsOfService;
