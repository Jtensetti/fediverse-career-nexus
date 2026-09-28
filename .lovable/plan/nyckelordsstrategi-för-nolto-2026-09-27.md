# Nyckelordsstrategi för Nolto

## Läget idag

- nolto.social är indexerad i Google (startsida, canonical OK), men Search Console har ännu ingen rapporterad sökdata och Semrush visar inga registrerade rankings.
- **Kannibalisering:** inte mätbar ännu — det finns inga rankande sidor som kan konkurrera med varandra. Risken uppstår först när flera sidor riktar sig mot samma sökord; planen nedan förebygger det genom ett sökord per sida och språk.

## Vad datan visar (Semrush)

**Engelska (US):**
- "LinkedIn alternative" — ~260 sök/mån, låg svårighet (16/100)
- "linkedin alternatives" — ~720/mån, låg konkurrens
- "professional networking platform" — ~3 600/mån
- "websites like linkedin" / "sites like linkedin" — ~320–390/mån
- SERP-en domineras av Reddit, listicle-bloggar och Product Hunt — inga etablerade alternativ dominerar, vilket lämnar plats för en dedikerad landningssida.

**Tyska (DE):**
- "LinkedIn Alternative" — ~260/mån, svårighet 13/100
- "alternative zu linkedin" — ~90/mån; även Xing-klustret ("xing alternative" ~170/mån) är relevant i Tyskland.

**Franska (FR):**
- "alternative à LinkedIn" — ~20/mån, svårighet 0/100 (liten men helt öppen).

**Svenska/Fediverse:**
- "LinkedIn alternativ" och "Mastodon for professionals" — ingen rapporterad data (okänd efterfrågan, inte nödvändigtvis noll).
- "federated social network" — ~20/mån, svårighet 0/100.

## Plan

1. **En sökordssida per språk och kluster** (förebygger kannibalisering):
   - EN: landningssida "LinkedIn alternative" (primärt), som även täcker "sites like linkedin".
   - DE: "LinkedIn Alternative" + Xing-vinkel.
   - FR: "alternative à LinkedIn".
   - SV: "LinkedIn alternativ" (okänd volym, men Noltos hemmamarknad och standardspråk).
   - Separat Fediverse-sida (EN): "federated social network" / Mastodon-vinkel — låg volym men noll konkurrens och rätt publik.
2. **Återanvänd befintlig lokalisering** — sidorna bygger på de 8 språk som redan finns; bara nya SEO-texter per språk.
3. **En canonical per språkversion** med hreflang mellan dem, så att språkversionerna inte konkurrerar med varandra.
4. **Uppföljning:** när sidorna publicerats och Search Console börjat rapportera data kan kannibalisering och faktiska sökord mätas på riktigt.

## Tekniska detaljer

- Nya statiska marknadsföringssidor under befintlig routing, med SEOHead (title, description, canonical) per språk.
- hreflang-taggar mellan språkversionerna; sitemap.xml uppdateras.
- Ingen ändring av befintliga sidor, design eller funktioner. Ingen publicering utan godkännande.
