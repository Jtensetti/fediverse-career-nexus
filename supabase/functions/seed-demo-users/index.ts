// One-shot demo data seeder. Call once with header `x-seed-secret`.
// Creates ~50 realistic-looking Swedish-flavoured users plus companies,
// posts, articles, jobs, follows, connections and reactions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SEED_SECRET = "nolto-demo-seed-2026";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-seed-secret",
};

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Data pools ───────────────────────────────────────────────────────────────
const firstNames = [
  "Anna", "Erik", "Maja", "Oscar", "Linnea", "Johan", "Sara", "Karl",
  "Emma", "Lars", "Sofia", "Anders", "Elin", "Mikael", "Hanna", "Daniel",
  "Klara", "Henrik", "Wilma", "Fredrik", "Alice", "Gustav", "Ebba", "Niklas",
  "Astrid", "Mattias", "Frida", "Joakim", "Tova", "Per", "Lovisa", "Robin",
  "Stina", "Viktor", "Cornelia", "Magnus", "Saga", "Jonas", "Iris", "Tobias",
  "Selma", "Marcus", "Nora", "Andreas", "Vera", "Patrik", "Ida", "David",
  "Matilda", "Filip",
];
const lastNames = [
  "Andersson", "Johansson", "Karlsson", "Nilsson", "Eriksson", "Larsson",
  "Olsson", "Persson", "Svensson", "Gustafsson", "Pettersson", "Jonsson",
  "Jansson", "Hansson", "Bengtsson", "Lindberg", "Lindqvist", "Berg",
  "Holmberg", "Sandberg", "Lundgren", "Wallin", "Söderberg", "Ek",
  "Bergström", "Forsberg", "Åkesson", "Holm", "Engström", "Magnusson",
];
const cities = [
  "Stockholm", "Göteborg", "Malmö", "Uppsala", "Lund", "Umeå", "Linköping",
  "Västerås", "Örebro", "Helsingborg", "Norrköping", "Jönköping", "Gävle",
];
const industries = [
  "SaaS", "Konsult", "E-handel", "Fintech", "Healthtech", "Edtech",
  "Greentech", "Media", "Spelutveckling", "Industri", "Logistik", "Design",
];
const skills = [
  "TypeScript", "React", "Node.js", "Python", "Go", "Rust", "PostgreSQL",
  "Kubernetes", "AWS", "GCP", "Figma", "Produktledning", "UX-design",
  "Agil utveckling", "DevOps", "Maskininlärning", "Datavisualisering",
  "Kommunikation", "Försäljning", "Marknadsföring", "SEO", "Innehållsstrategi",
  "Projektledning", "Ekonomi", "HR", "Rekrytering", "Säkerhet", "GDPR",
];
const titles = [
  "Senior Frontend-utvecklare", "Backend Engineer", "Produktchef",
  "UX Designer", "Fullstack-utvecklare", "DevOps Engineer", "Data Engineer",
  "Tech Lead", "Engineering Manager", "Säkerhetsspecialist", "QA Engineer",
  "Designer", "Content Lead", "Marknadsansvarig", "Säljchef", "VD",
  "CTO", "Konsult", "Affärsutvecklare", "Rekryterare", "HR Business Partner",
  "Solution Architect", "Cloud Engineer", "Researcher", "Skribent",
];
const headlinesExtra = [
  "Bygger framtidens digitala tjänster",
  "Tror på öppen källkod och en federerad webb",
  "Passionerad för bra användarupplevelser",
  "Hjälper team att leverera snabbare",
  "Driver hållbar tillväxt i tech",
  "Föreläsare och mentor",
  "Söker nya utmaningar",
  "Älskar att lösa svåra problem",
  "Bryr mig om människorna bakom koden",
];
const bios = [
  "Har jobbat i tech i över ett decennium. Pendlar mellan Stockholm och stugan i Bohuslän. Skriver om systemdesign på fritiden.",
  "Tidigare på Spotify och Klarna. Nu på jakt efter ett mindre bolag där jag kan göra mer skillnad.",
  "Designer med ingenjörsbakgrund. Tror att de bästa produkterna föds där form möter funktion.",
  "Produktledare som hellre släpper små förbättringar varje vecka än stora releaser en gång om året.",
  "Skribent, kodare och kaffenörd. Bygger på en egen RSS-läsare på fritiden.",
  "Trött på proprietära plattformar. Här för att se vad ett federerat alternativ kan vara.",
  "HR med teknisk bakgrund. Brinner för att hitta människor som annars hade halkat förbi.",
  "Konsult med fokus på molnmigration. Just nu på uppdrag i offentlig sektor.",
  "Frilansutvecklare. Tar gärna emot förfrågningar om mindre Next.js- och Supabase-projekt.",
  "Bygger spel på fritiden, betalar räkningarna med backend-konsulting.",
];
const universities = [
  "KTH Royal Institute of Technology", "Chalmers tekniska högskola",
  "Lunds universitet", "Uppsala universitet", "Stockholms universitet",
  "Linköpings universitet", "Umeå universitet", "Handelshögskolan i Stockholm",
  "Göteborgs universitet", "Malmö universitet",
];
const degrees = [
  ["Civilingenjör", "Datateknik"], ["Civilingenjör", "Industriell ekonomi"],
  ["Kandidat", "Systemvetenskap"], ["Master", "Människa-datorinteraktion"],
  ["Kandidat", "Företagsekonomi"], ["Master", "Maskininlärning"],
  ["Yrkeshögskola", "Frontend-utveckling"], ["Master", "Statsvetenskap"],
];

const companyData = [
  { name: "Nordlys Labs", slug: "nordlys-labs", industry: "SaaS", size: "11-50", tagline: "Ett verktyg för asynkrona team", desc: "Vi bygger samarbetsverktyg för distribuerade kunskapsorganisationer. Helt självhostat, helt öppet." },
  { name: "Fjord & Kod", slug: "fjord-och-kod", industry: "Konsult", size: "11-50", tagline: "Konsultkollektiv från västkusten", desc: "Vi är 30 utvecklare och designers som driver kollektivet tillsammans. Inga chefer, bara uppdrag." },
  { name: "Granit Mobility", slug: "granit-mobility", industry: "Greentech", size: "51-200", tagline: "Elektrifierar tunga transporter", desc: "Vi bygger laddinfrastruktur för lastbilar och bussar i Norden. Säte i Göteborg, fabrik i Skellefteå." },
  { name: "Lagom Health", slug: "lagom-health", industry: "Healthtech", size: "11-50", tagline: "Digital primärvård utan brus", desc: "Vi tror att vården ska vara enkel, mänsklig och tillgänglig. Helt utan reklam." },
  { name: "Tinda Pay", slug: "tinda-pay", industry: "Fintech", size: "51-200", tagline: "Betalningar för småföretagare", desc: "Open banking på riktigt. Vi bygger för enskilda firmor och småbolag som glömts bort av de stora aktörerna." },
  { name: "Skogen Studios", slug: "skogen-studios", industry: "Spelutveckling", size: "2-10", tagline: "Mysiga spel med svensk själ", desc: "En liten indie-studio i Umeå. Vårt nästa spel släpps i höst." },
  { name: "Brevik & Co", slug: "brevik-och-co", industry: "Design", size: "2-10", tagline: "Brand och digital design", desc: "Vi hjälper små och medelstora företag att hitta sin röst – visuellt och verbalt." },
  { name: "Öresund Analytics", slug: "oresund-analytics", industry: "SaaS", size: "11-50", tagline: "BI för moderna team", desc: "Självbetjäningsanalys ovanpå din data warehouse. Bygger på öppna standarder." },
];

const postTemplates = [
  "Äntligen tisdag. Släppte precis en ny version av {project}. Skön känsla.",
  "Tänker högt: varför är det fortfarande så svårt att exportera sina egna data från {bigplatform}?",
  "Spenderade förmiddagen med att läsa specifikationen för ActivityPub. Det är mer elegant än jag trodde.",
  "Vi rekryterar! Söker en {role} till {city}. Skriv om du är nyfiken.",
  "Bästa boken jag läst i år: 'A Philosophy of Software Design'. Rekommenderar varmt.",
  "Lite stolt över teamet idag. Vi gick från idé till deploy på under en vecka.",
  "Påminnelse till mig själv: small commits, frequent pushes, kind reviews.",
  "Lyssnade på en föreläsning om federerade sociala nätverk. Framtiden ligger inte hos plattformarna.",
  "Tre saker som faktiskt funkar: skriva korta dokument, ha färre möten, säga nej oftare.",
  "Migrerade just över till Nolto. Skönt att äga sin egen identitet online.",
  "Frukostmöte ute på balkongen. Det är såna här dagar man minns.",
  "Skrev en lång tråd om varför vi valde Postgres över MongoDB. Ångrar inget.",
  "Snart fredag. Vad jobbar ni med just nu? Nyfiken.",
  "Avslutade en sprint idag. Demoade fyra nya features. Teamet rockar.",
  "Hade kaffe med en gammal kollega och blev påmind om varför nätverkande utan algoritm är så mycket bättre.",
];

const projects = ["analytics-dashboarden", "onboarding-flowet", "design-systemet", "API:et", "mobilappen"];
const bigplatforms = ["LinkedIn", "Twitter", "Facebook", "Instagram"];

const articleTemplates = [
  {
    title: "Därför valde vi en federerad arkitektur",
    excerpt: "En berättelse om varför vi gick all-in på ActivityPub – och vad vi lärt oss längs vägen.",
    body: "När vi började bygga vår plattform stod vi inför ett val: bygga en sluten silo eller satsa på federation. Vi valde det senare. Här är våra lärdomar.\n\nFörst och främst: federation handlar inte om teknik, utan om makt. Vem äger din identitet? Vem bestämmer reglerna? Vem kan kasta ut dig?\n\nGenom att bygga på ActivityPub får varje användare verklig portabilitet. Du kan flytta din profil mellan instanser utan att förlora dina följare. Det är något helt annat än vad de stora plattformarna erbjuder.\n\nMen det kommer med kostnader. Federation är komplext. Signaturer, nycklar, inbox-hantering – allt måste fungera, hela tiden. Vi har spenderat månader på att få till det.\n\nÄr det värt det? Absolut. Varje gång jag ser en användare följa någon på en helt annan instans påminns jag om varför vi gör det här.",
  },
  {
    title: "Sex tankar om asynkront arbete",
    excerpt: "Vi har jobbat helt distribuerat i tre år. Här är vad som faktiskt funkar.",
    body: "Asynkront arbete låter enkelt på pappret. I praktiken kräver det disciplin.\n\n1. Skriv mer än du tror behövs. Sammanhang är allt.\n2. Bestäm vilka kanaler som är synkrona och vilka som är asynkrona. Blanda inte.\n3. Möten ska ha agenda, eller inte hållas alls.\n4. Dokumentera beslut, inte diskussioner.\n5. Lita på dina kollegor. Annars funkar inget.\n6. Var snäll. Text är hårdare än du tror.\n\nDet sista är viktigast. När du inte kan läsa av kroppsspråk måste du överkommunicera värme.",
  },
  {
    title: "Att hyra in sig själv – ett år som frilans",
    excerpt: "Vad jag lärt mig om priser, kontrakt och att säga nej.",
    body: "För ett år sedan lämnade jag min fasta tjänst för att gå solo. Här är de tre viktigaste sakerna jag lärt mig.\n\n**Pris för värdet, inte för tiden.** Mina första uppdrag fakturerade jag per timme. Det var ett misstag. Numera prissätter jag per leverans.\n\n**Säg nej oftare.** Det första uppdraget jag tackade nej till var det jobbigaste. Nu är det rutin.\n\n**Bygg i offentligheten.** Mina senaste tre uppdrag kom genom inlägg och artiklar. Inte genom kallakontakter.",
  },
  {
    title: "Vi migrerade från Mongo till Postgres",
    excerpt: "Hur och varför vi gjorde en av de större tekniska besluten under bolagets liv.",
    body: "Det här är inte ett inlägg om varför MongoDB är dåligt. Det är ett inlägg om varför Postgres var rätt för oss.\n\nNär vi startade behövde vi bygga snabbt. Mongo gav oss det. Vi tänkte inte på schemat, vi bara skrev data.\n\nMen efter tre år hade vi tre miljoner dokument utan tydlig struktur. Varje ny utvecklare behövde två veckor för att förstå datamodellen.\n\nVi migrerade på sex månader. Bygger nu nya features dubbelt så snabbt. Lärdomen: välj inte databas baserat på dagens problem.",
  },
  {
    title: "Open source som strategi – inte filosofi",
    excerpt: "Varför vi släppte kärnan av vår produkt fritt.",
    body: "Många tror att open source är ett ideologiskt val. För oss var det strategiskt.\n\nVi konkurrerar mot bolag med tio gånger vår budget. Vi kan inte vinna på distribution. Men vi kan vinna på förtroende.\n\nGenom att släppa kärnan fritt får utvecklare granska den, modifiera den, och i bästa fall bidra till den. Det är vår väg in i organisationer.\n\nFörra månaden fick vi vår första PR från en användare i Tyskland. Det var ett magiskt ögonblick.",
  },
  {
    title: "Hur vi rekryterar utan algoritm",
    excerpt: "Vi har slutat använda LinkedIn. Här är hur vi fyller positioner ändå.",
    body: "Vår senaste anställning hittade jag genom en kommentar i ett blogginlägg.\n\nFör två år sedan bestämde vi oss för att inte annonsera på LinkedIn. Vi ville inte att vår rekrytering skulle styras av en algoritm.\n\nIstället: vi skriver om vad vi gör, varför, och vilka vi söker. Vi pratar på meetups. Vi öppnar dörrarna för praktikanter. Vi svarar på alla mejl, även de spontana.\n\nDet tar längre tid. Men personerna vi får in stannar längre.",
  },
];

const jobTemplates = [
  { title: "Senior Backend Engineer", desc: "Vi söker en erfaren backend-utvecklare som vill bygga distribuerade system med Postgres, Go och Kafka. Du gillar att skriva kod som håller och att lära ut till andra.", emp: "full-time", exp: "senior", skills: ["Go", "PostgreSQL", "Kafka", "Kubernetes"] },
  { title: "Frontend-utvecklare (React/TypeScript)", desc: "Är du en pragmatisk frontendare som bryr dig om tillgänglighet och prestanda? Vi har ett designsystem och en stack du kommer trivas i.", emp: "full-time", exp: "mid", skills: ["React", "TypeScript", "CSS", "Tillgänglighet"] },
  { title: "Produktdesigner", desc: "Vi söker en designer som kan ta ansvar för hela flöden – från research till slutgiltig pixel. Du jobbar nära produkt och utveckling.", emp: "full-time", exp: "mid", skills: ["Figma", "UX-research", "Prototyping"] },
  { title: "DevOps Engineer", desc: "Bygg och underhåll vår plattform i AWS och Kubernetes. Du älskar IaC och tycker observability är roligare än det låter.", emp: "full-time", exp: "senior", skills: ["AWS", "Terraform", "Kubernetes", "Observability"] },
  { title: "Produktchef – tillväxt", desc: "Driv vår tillväxtinitiativ från idé till mätning. Du är analytisk men kan också skriva en bra rubrik.", emp: "full-time", exp: "senior", skills: ["Produktledning", "SQL", "Experimentdesign"] },
  { title: "Frilansande fullstack (3-6 mån)", desc: "Vi behöver förstärkning under ett intensivt halvår. Stack: Next.js + Supabase. Distansjobb, helst en dag i veckan på plats.", emp: "contract", exp: "mid", skills: ["Next.js", "Supabase", "TypeScript"] },
];

const reactionTypes = ["love", "celebrate", "support", "empathy", "insightful"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (n: number) => Math.floor(Math.random() * n);
const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}
function headerUrl(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/1200/300`;
}

async function seed() {
  const log: string[] = [];

  // 1. Companies
  const companyIds: Record<string, string> = {};
  for (const c of companyData) {
    const { data, error } = await supabase.from("companies").upsert({
      slug: c.slug,
      name: c.name,
      tagline: c.tagline,
      description: c.desc,
      industry: c.industry,
      size: c.size,
      location: pick(cities),
      founded_year: 2010 + rand(14),
      logo_url: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(c.slug)}&backgroundColor=1e293b,0f172a,334155`,
      banner_url: headerUrl(c.slug),
      claim_status: "unclaimed",
      is_active: true,
    }, { onConflict: "slug" }).select("id").single();
    if (error) { log.push(`company ${c.slug}: ${error.message}`); continue; }
    companyIds[c.slug] = data.id;
  }
  log.push(`companies: ${Object.keys(companyIds).length}`);

  // 2. Users
  const created: Array<{ id: string; username: string; fullname: string; companySlug?: string; title: string; city: string; isFreelancer: boolean; }> = [];
  const usedUsernames = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const first = pick(firstNames);
    const last = pick(lastNames);
    let username = slugify(`${first}.${last}`);
    let n = 0;
    while (usedUsernames.has(username)) { n++; username = `${slugify(`${first}.${last}`)}${n}`; }
    usedUsernames.add(username);
    const email = `${username}@demo.nolto.local`;

    const { data: userData, error: userErr } = await supabase.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { fullname: `${first} ${last}`, seeded: true },
    });
    if (userErr || !userData.user) { log.push(`auth ${email}: ${userErr?.message}`); continue; }
    const uid = userData.user.id;

    const fullname = `${first} ${last}`;
    const title = pick(titles);
    const city = pick(cities);
    const isFreelancer = Math.random() < 0.18;
    const companySlug = isFreelancer ? undefined : pick(Object.keys(companyIds));

    // profile
    const { error: profErr } = await supabase.from("profiles").upsert({
      id: uid,
      username,
      fullname,
      headline: `${title} ${companySlug ? `på ${companyData.find(c=>c.slug===companySlug)!.name}` : "· frilans"} · ${pick(headlinesExtra)}`,
      bio: pick(bios),
      avatar_url: avatarUrl(username),
      header_url: headerUrl(username),
      location: city,
      auth_type: "local",
      is_verified: Math.random() < 0.2,
      is_freelancer: isFreelancer,
      freelancer_skills: isFreelancer ? Array.from({length: 3 + rand(3)}, () => pick(skills)) : null,
      freelancer_rate: isFreelancer ? `${800 + rand(15) * 100} SEK/h` : null,
      freelancer_availability: isFreelancer ? pick(["Tillgänglig direkt", "Tillgänglig om 4 veckor", "Bokad till sommaren"]) : null,
      website: Math.random() < 0.3 ? `https://${username}.se` : null,
    }, { onConflict: "id" });
    if (profErr) { log.push(`profile ${username}: ${profErr.message}`); continue; }

    await supabase.from("user_roles").upsert({ user_id: uid, role: "user" }, { onConflict: "user_id,role" });
    await supabase.from("user_settings").upsert({ user_id: uid, theme: "system", show_network_connections: true }, { onConflict: "user_id" });

    // actor (no real keys – federation outbound will skip these demo users)
    const { error: actorErr } = await supabase.from("actors").upsert({
      user_id: uid,
      preferred_username: username,
      type: "Person",
      status: "active",
      is_remote: false,
      private_key: "demo-seed",
      public_key: "demo-seed",
    }, { onConflict: "user_id,preferred_username" as any });
    if (actorErr) log.push(`actor ${username}: ${actorErr.message}`);

    created.push({ id: uid, username, fullname, companySlug, title, city, isFreelancer });
  }
  log.push(`users: ${created.length}`);

  // 3. Experiences, education, skills
  for (const u of created) {
    const nExp = 1 + rand(3);
    for (let i = 0; i < nExp; i++) {
      const isCurrent = i === 0 && !!u.companySlug;
      const startYear = 2014 + rand(10);
      await supabase.from("experiences").insert({
        user_id: u.id,
        title: i === 0 ? u.title : pick(titles),
        company: isCurrent ? companyData.find(c => c.slug === u.companySlug)!.name : pick(companyData).name,
        is_current_role: isCurrent,
        start_date: `${startYear}-${String(1 + rand(12)).padStart(2,"0")}-01`,
        end_date: isCurrent ? null : `${startYear + 1 + rand(3)}-${String(1 + rand(12)).padStart(2,"0")}-01`,
        location: pick(cities),
        description: pick([
          "Ledde teamet genom en kritisk omstrukturering. Levererade i tid.",
          "Byggde produktens första betalflöde från grunden.",
          "Ansvarig för rekrytering, onboarding och teamkultur.",
          "Drev migrationen från monolit till microservices.",
          "Designade och utvecklade designsystemet som används än idag.",
        ]),
      });
    }
    const ed = pick(degrees);
    await supabase.from("education").insert({
      user_id: u.id,
      institution: pick(universities),
      degree: ed[0],
      field: ed[1],
      start_year: 2008 + rand(10),
      end_year: 2012 + rand(10),
    });
    const userSkills = Array.from({ length: 4 + rand(5) }, () => pick(skills))
      .filter((v, i, a) => a.indexOf(v) === i);
    for (const s of userSkills) {
      await supabase.from("skills").insert({ user_id: u.id, name: s, endorsements: rand(15) });
    }

    // employed at company
    if (u.companySlug) {
      await supabase.from("company_employees").insert({
        company_id: companyIds[u.companySlug],
        user_id: u.id,
        title: u.title,
        employment_type: "full_time",
        start_date: `${2018 + rand(6)}-01-01`,
        is_verified: true,
        verified_at: new Date().toISOString(),
      });
    }
  }
  log.push("experiences/education/skills done");

  // 4. Get actor IDs
  const { data: actorRows } = await supabase.from("actors")
    .select("id, user_id, preferred_username")
    .in("user_id", created.map(u => u.id));
  const actorByUser: Record<string, { id: string; username: string }> = {};
  for (const a of actorRows ?? []) actorByUser[a.user_id] = { id: a.id, username: a.preferred_username };

  // 5. Posts (Notes)
  let postCount = 0;
  for (const u of created) {
    const actor = actorByUser[u.id];
    if (!actor) continue;
    const nPosts = rand(5); // 0-4 posts each
    for (let i = 0; i < nPosts; i++) {
      let body = pick(postTemplates)
        .replace("{project}", pick(projects))
        .replace("{bigplatform}", pick(bigplatforms))
        .replace("{role}", pick(titles))
        .replace("{city}", u.city);
      const daysAgo = rand(45);
      const published = new Date(Date.now() - daysAgo * 86400000 - rand(86400000)).toISOString();
      await supabase.from("ap_objects").insert({
        type: "Note",
        attributed_to: actor.id,
        published_at: published,
        content: {
          type: "Note",
          actor: { id: actor.id, name: u.fullname, preferredUsername: actor.username },
          content: body,
          published,
        },
      });
      postCount++;
    }
  }
  log.push(`posts: ${postCount}`);

  // 6. Articles
  const articleAuthors = created.slice(0, articleTemplates.length * 2);
  let articleCount = 0;
  for (let i = 0; i < articleTemplates.length; i++) {
    const u = articleAuthors[i];
    if (!u) break;
    const t = articleTemplates[i];
    const daysAgo = 3 + rand(60);
    const publishedAt = new Date(Date.now() - daysAgo * 86400000).toISOString();
    const slug = `${slugify(t.title)}-${u.username}`.slice(0, 80);
    const { error } = await supabase.from("articles").insert({
      user_id: u.id,
      title: t.title,
      content: t.body,
      excerpt: t.excerpt,
      slug,
      published: true,
      published_at: publishedAt,
      company_id: u.companySlug ? companyIds[u.companySlug] : null,
      tags: [pick(["federation", "tech", "design", "produkt", "open-source", "kultur"])],
      cover_image_url: `https://picsum.photos/seed/${slug}/1200/600`,
    });
    if (error) log.push(`article: ${error.message}`); else articleCount++;
  }
  log.push(`articles: ${articleCount}`);

  // 7. Company posts (one or two per company, attributed to first owner-ish employee)
  let companyPostCount = 0;
  for (const slug of Object.keys(companyIds)) {
    const employees = created.filter(u => u.companySlug === slug);
    if (employees.length === 0) continue;
    const actor = actorByUser[employees[0].id];
    if (!actor) continue;
    const cdata = companyData.find(c => c.slug === slug)!;
    const messages = [
      `Vi rekryterar! ${cdata.name} söker nya kollegor på flera roller. Hör av dig.`,
      `Roligt att vara igång på Nolto. ${cdata.tagline} – det är det vi gör.`,
      `Tack till alla som kom på vårt frukostseminarium förra veckan!`,
    ];
    for (let i = 0; i < 1 + rand(2); i++) {
      const published = new Date(Date.now() - rand(30) * 86400000).toISOString();
      await supabase.from("ap_objects").insert({
        type: "Note",
        attributed_to: actor.id,
        company_id: companyIds[slug],
        published_at: published,
        content: {
          type: "Note",
          actor: { id: actor.id, name: cdata.name, preferredUsername: slug },
          content: pick(messages),
          published,
        },
      });
      companyPostCount++;
    }
  }
  log.push(`company posts: ${companyPostCount}`);

  // 8. Job posts
  let jobCount = 0;
  for (let i = 0; i < 12; i++) {
    const slug = pick(Object.keys(companyIds));
    const employees = created.filter(u => u.companySlug === slug);
    if (employees.length === 0) continue;
    const poster = pick(employees);
    const t = pick(jobTemplates);
    const cdata = companyData.find(c => c.slug === slug)!;
    await supabase.from("job_posts").insert({
      user_id: poster.id,
      title: t.title,
      company: cdata.name,
      company_id: companyIds[slug],
      description: t.desc,
      location: pick(cities),
      remote_policy: pick(["remote", "hybrid", "on-site"]),
      salary_min: 45000 + rand(20) * 1000,
      salary_max: 70000 + rand(40) * 1000,
      salary_currency: "SEK",
      employment_type: t.emp,
      experience_level: t.exp,
      skills: t.skills,
      is_active: true,
      expires_at: new Date(Date.now() + (30 + rand(60)) * 86400000).toISOString(),
    } as any);
    jobCount++;
  }
  log.push(`jobs: ${jobCount}`);

  // 9. Connections (random graph)
  let connCount = 0;
  for (const u of created) {
    const others = created.filter(o => o.id !== u.id);
    const nConn = 3 + rand(8);
    const seen = new Set<string>();
    for (let i = 0; i < nConn; i++) {
      const other = pick(others);
      const key = [u.id, other.id].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);
      const { error } = await supabase.from("user_connections").insert({
        user_id: u.id,
        connected_user_id: other.id,
        status: "accepted",
      });
      if (!error) connCount++;
    }
  }
  log.push(`connections: ${connCount}`);

  // 10. Company followers
  let followCount = 0;
  for (const u of created) {
    const nFollow = 1 + rand(4);
    const seen = new Set<string>();
    for (let i = 0; i < nFollow; i++) {
      const slug = pick(Object.keys(companyIds));
      if (seen.has(slug)) continue;
      seen.add(slug);
      const { error } = await supabase.from("company_followers").insert({
        company_id: companyIds[slug], user_id: u.id,
      });
      if (!error) followCount++;
    }
  }
  log.push(`company_followers: ${followCount}`);

  // 11. Reactions on posts
  const { data: postRows } = await supabase.from("ap_objects")
    .select("id").eq("type", "Note").limit(200);
  let reactionCount = 0;
  for (const post of postRows ?? []) {
    const nReact = rand(8);
    const seen = new Set<string>();
    for (let i = 0; i < nReact; i++) {
      const u = pick(created);
      if (seen.has(u.id)) continue;
      seen.add(u.id);
      const { error } = await supabase.from("reactions").insert({
        target_type: "post",
        target_id: post.id,
        user_id: u.id,
        reaction: pick(reactionTypes),
      });
      if (!error) reactionCount++;
    }
  }
  log.push(`reactions: ${reactionCount}`);

  return log;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const secret = req.headers.get("x-seed-secret");
  if (secret !== SEED_SECRET) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...cors, "content-type": "application/json" } });
  }
  try {
    const log = await seed();
    return new Response(JSON.stringify({ ok: true, log }, null, 2), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e), stack: (e as Error).stack }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});
