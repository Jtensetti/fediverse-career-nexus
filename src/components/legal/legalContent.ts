export type LegalKind = "privacy" | "terms" | "cookies" | "conduct" | "instances";
export const legalOperator = "Jonatan Tensetti";
export const legalPaths: Record<LegalKind, string> = {
  privacy: "/privacy",
  terms: "/terms",
  cookies: "/cookies",
  conduct: "/code-of-conduct",
  instances: "/instance-guidelines",
};
export type LegalDocumentContent = { title: string; intro: string; sections: [string, string][] };
