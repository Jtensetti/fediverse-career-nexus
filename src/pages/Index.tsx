import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Github, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/common/SEOHead";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If logged in, redirect to export
  if (user) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title="Nolto — Export Your Data" description="Download your data before Nolto shuts down." />
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="flex justify-center mb-8">
            <img src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" alt="Nolto" className="w-14 h-14" />
          </div>

          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 mb-8 text-center">
            <h2 className="text-xl font-bold text-destructive mb-2">Your data will be permanently deleted in 30 days</h2>
            <p className="text-muted-foreground text-sm">
              All user data, the database, and stored files will be removed entirely. Please download your data now.
            </p>
          </div>

          <div className="space-y-4">
            <DataExportInline />
          </div>

          <div className="mt-12 pt-8 border-t border-border text-center">
            <Button variant="ghost" size="sm" onClick={async () => {
              const { supabase } = await import("@/integrations/supabase/client");
              await supabase.auth.signOut();
              window.location.href = "/";
            }}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Nolto — Shutting Down"
        description="Nolto is shutting down. Log in to export your data."
      />
      <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <img src="/lovable-uploads/8dbd04e2-165c-4205-ba34-e66173afac69.png" alt="Nolto" className="w-16 h-16" />
        </div>

        {/* Letter */}
        <article className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-foreground/90 leading-relaxed">
          <p className="text-lg font-medium text-foreground">Nolto was never meant to grow.</p>

          <p>It started as a small experiment. I was curious about ActivityPub and wanted to see what I could build. There was no funding, no team, no roadmap. Just an idea and some time.</p>

          <p>Within a few weeks, almost a thousand people signed up. Companies created pages. Articles were posted. Events were shared. I never marketed it. It spread through blogs and word of mouth.</p>

          <p>I built Nolto with the help of AI. I am not a professional developer and I have never run a large open source project before. That does not automatically make a project unsafe. It simply means it was built differently.</p>

          <p>As the platform grew, the criticism grew too. Some of it was fair and helpful. Some of it was not. Some of it became personal. Projects like <a href="https://github.com/Flockingbird" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Flockingbird</a> have gone through similar experiences. Small, independent efforts can quickly be treated as if they were fully staffed institutions.</p>

          <p>Nolto was never that. It was one person building something interesting to see what would happen.</p>

          <p className="font-medium text-foreground">At this point I have decided to shut it down.</p>

          <p>You can log in and download your data. Nothing else on the platform will remain active. The site now exists only for data export.</p>

          <p>All user data will be permanently deleted 30 days from now, including the database and stored files. After that, the backend will be removed entirely.</p>

          <p>The source code will remain available for anyone who wants to explore it, improve it, fork it or continue the idea.</p>
        </article>

        {/* Login CTA */}
        <div className="my-12 text-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/auth">
              <Download className="h-4 w-4" />
              Log in to export your data
            </Link>
          </Button>
        </div>

        {/* Repo Links */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center my-10">
          <a
            href="https://github.com/Jtensetti/fediverse-career-nexus"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-3 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium text-foreground"
          >
            <Github className="h-5 w-5" />
            GitHub
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
          <a
            href="https://codeberg.org/Tensetti/Nolto"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-3 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium text-foreground"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="fill-current" aria-hidden="true">
              <path fill="currentColor" d="M12 1A11 11 0 0 0 1 12a11 11 0 0 0 1.7 6.4L12 6l9.3 12.4A11 11 0 0 0 23 12 11 11 0 0 0 12 1Z"/>
              <path fill="currentColor" opacity="0.6" d="M21.3 18.4 12 6l4.4 16.8a11 11 0 0 0 4.9-4.4Z"/>
            </svg>
            Codeberg
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
        </div>

        {/* Closing words */}
        <article className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-foreground/90 leading-relaxed mt-12">
          <p>Nolto proved something simple:</p>

          <p>You don't need permission to experiment.</p>
          <p>You do not need funding to create value.</p>
          <p>And you don't need to be "approved" to build.</p>

          <p>To everyone who builds, even when it's uncomfortable — keep going.</p>

          <p>The open web is not defined by gatekeepers.</p>

          <p className="font-medium text-foreground">It is defined by those who dare to build.</p>

          <p>To everyone who joined, tested, or supported the project in good faith, thank you. It meant more than you know.</p>

          <p className="text-muted-foreground mt-8">— JTensetti</p>
        </article>
      </div>
    </div>
  );
}

// Inline data export component for the authenticated view
function DataExportInline() {
  const [isExportingGdpr, setIsExportingGdpr] = useState(false);
  const [isExportingActivityPub, setIsExportingActivityPub] = useState(false);

  const handleExport = async (format: "gdpr" | "activitypub") => {
    const setLoading = format === "gdpr" ? setIsExportingGdpr : setIsExportingActivityPub;
    setLoading(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/export-user-data?format=${format}`, {
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });
      if (!res.ok) throw new Error("Export failed");

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "gdpr"
        ? `nolto-data-export-${new Date().toISOString().split("T")[0]}.json`
        : `nolto-activitypub-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      const { toast } = await import("sonner");
      toast.error("Failed to export data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => handleExport("gdpr")}
        disabled={isExportingGdpr}
        className="w-full flex items-center justify-between p-5 rounded-lg border border-border hover:bg-muted/50 transition-colors disabled:opacity-50"
      >
        <div className="text-left">
          <h3 className="font-medium text-foreground">Complete Data Export (GDPR)</h3>
          <p className="text-sm text-muted-foreground mt-1">All your data in JSON format — profile, posts, messages, connections, settings</p>
        </div>
        <Download className="h-5 w-5 text-muted-foreground shrink-0 ml-4" />
      </button>

      <button
        onClick={() => handleExport("activitypub")}
        disabled={isExportingActivityPub}
        className="w-full flex items-center justify-between p-5 rounded-lg border border-border hover:bg-muted/50 transition-colors disabled:opacity-50"
      >
        <div className="text-left">
          <h3 className="font-medium text-foreground">Fediverse Data Export</h3>
          <p className="text-sm text-muted-foreground mt-1">ActivityPub format. You can import your following list to Mastodon or another compatible instance.</p>
        </div>
        <Download className="h-5 w-5 text-muted-foreground shrink-0 ml-4" />
      </button>
    </div>
  );
}
