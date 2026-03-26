import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Package, Loader2 } from "lucide-react";
import { createStarterPack, getPackCategories } from "@/services/starterPackService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { SEOHead } from "@/components/common/SEOHead";

const StarterPackCreate = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', description: '', category: '' });
  const categories = getPackCategories();

  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 50);
    setFormData(prev => ({ ...prev, name, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error(t('starterPacks.signInToCreate')); return; }
    if (!formData.name.trim() || !formData.slug.trim()) { toast.error(t('starterPacks.fillRequired')); return; }
    setIsSubmitting(true);
    const pack = await createStarterPack({ name: formData.name.trim(), slug: formData.slug.trim(), description: formData.description.trim() || undefined, category: formData.category || undefined });
    setIsSubmitting(false);
    if (pack) navigate(`/packs/${pack.slug}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">{t("starterPacks.signInRequired")}</h2>
            <p className="text-muted-foreground mb-4">{t("starterPacks.signInRequiredDesc")}</p>
            <Button asChild><Link to="/auth">{t("starterPacks.signIn")}</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead title={t("starterPacks.createTitle")} description={t("starterPacks.createSeoDesc")} />
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" asChild className="mb-6"><Link to="/packs"><ArrowLeft className="h-4 w-4 mr-2" />{t("starterPacks.backToPacks")}</Link></Button>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Package className="h-6 w-6 text-primary" /></div>
              <div><CardTitle>{t("starterPacks.createTitle")}</CardTitle><CardDescription>{t("starterPacks.createDescription")}</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">{t("starterPacks.packName")}</Label>
                <Input id="name" placeholder={t("starterPacks.packNamePlaceholder")} value={formData.name} onChange={(e) => handleNameChange(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">{t("starterPacks.urlSlug")}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">/packs/</span>
                  <Input id="slug" placeholder={t("starterPacks.urlSlugPlaceholder")} value={formData.slug} onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))} maxLength={50} />
                </div>
                <p className="text-xs text-muted-foreground">{t("starterPacks.urlSlugHelp")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t("starterPacks.descriptionLabel")}</Label>
                <Textarea id="description" placeholder={t("starterPacks.descriptionPlaceholder")} value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} maxLength={500} rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">{t("starterPacks.category")}</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger><SelectValue placeholder={t("starterPacks.selectCategory")} /></SelectTrigger>
                  <SelectContent>{categories.map(cat => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/packs')} className="flex-1">{t("starterPacks.cancel")}</Button>
                <Button type="submit" disabled={isSubmitting || !formData.name.trim() || !formData.slug.trim()} className="flex-1">
                  {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("starterPacks.creating")}</>) : t("starterPacks.createPackButton")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground mt-6">{t("starterPacks.afterCreate")}</p>
      </main>
      <Footer />
    </div>
  );
};

export default StarterPackCreate;
