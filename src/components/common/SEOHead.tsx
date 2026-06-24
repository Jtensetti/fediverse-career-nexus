import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  tags?: string[];
  noindex?: boolean;
}

export function SEOHead({
  title,
  description = "Nolto - The federated professional network. Connect with professionals across the Fediverse.",
  image = "/og-image.png",
  url,
  type = "website",
  publishedTime,
  modifiedTime,
  author,
  tags,
  noindex = false,
}: SEOHeadProps) {
  const siteUrl = window.location.origin;
  const fullUrl = url || window.location.href;
  const fullTitle = title.includes("Nolto") ? title : `${title} | Nolto`;

  // Proxy external images to avoid hotlink protection issues when shared on other platforms
  const getProxiedImageUrl = (imageUrl: string) => {
    if (!imageUrl) return `${siteUrl}/og-image.png`;
    
    // Relative URLs - use directly with siteUrl
    if (!imageUrl.startsWith("http")) {
      return `${siteUrl}${imageUrl}`;
    }
    
    // Already our domain - use directly
    if (imageUrl.startsWith(siteUrl)) {
      return imageUrl;
    }
    
    // External image - proxy through our edge function to avoid hotlink blocks
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/functions/v1/proxy-media?url=${encodeURIComponent(imageUrl)}`;
  };

  const fullImage = getProxiedImageUrl(image);

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Nolto" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />

      {/* Article specific */}
      {type === "article" && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === "article" && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === "article" && author && (
        <meta property="article:author" content={author} />
      )}
      {type === "article" && tags && tags.length > 0 && (
        <>
          {tags.map((tag, index) => (
            <meta key={index} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />
    </Helmet>
  );
}

export default SEOHead;
