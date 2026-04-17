

## Hur hittar vi den "registrerade e-posten" idag?

Tittar man i `admin-issue-mfa-recovery/index.ts` rad 91-104:

```ts
let userId = request.user_id as string | null;
if (!userId) {
  // Look up by email via admin API (paged) — TAR BARA FÖRSTA 1000 ANVÄNDARNA
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const match = list?.users?.find(u => u.email?.toLowerCase() === request.email.toLowerCase());
  userId = match?.id ?? null;
}
```

Med andra ord: vi har **tre möjliga matchningsvägar** redan i datan, men koden använder bara två av dem och en av dem skalar inte.

### Vilka identifierare har vi faktiskt?

För varje `mfa_recovery_requests`-rad finns:
1. **`user_id`** — sätts om användaren var inloggad när formuläret skickades (sällsynt vid MFA-utlåsning, eftersom de fastnar *före* sessionen är klar). Oftast `null`.
2. **`attempted_login_email`** — den **tysta** e-posten vi precis lade till, fångad direkt från `supabase.auth.getUser()` mitt i MFA-flödet. Detta är **kontots faktiska e-post** eftersom Supabase redan har validerat lösenordet innan MFA-steget.
3. **`email`** — fritext från formuläret. Kan vara fel/skrivfel/scam.
4. **`username`** — fritext från formuläret. Kan vara fel.

## Problemet med nuvarande lookup

- `listUsers({ perPage: 1000 })` → bryts vid 1001+ användare. Tyst bugg som växer med tiden.
- Matchar bara på formulär-e-posten — om scammer skriver "offer@attacker.com" hittas ingen användare och flödet kraschar med `no_user_match`. Bra säkerhetsmässigt men dålig UX för riktiga ärenden där användaren skrivit fel adress.
- Använder **inte** den säkra `attempted_login_email` som vi redan har.

## Förslag: säker prioritetsordning

Ändra `admin-issue-mfa-recovery` att slå upp `user_id` i denna ordning:

```text
1. request.user_id              ← om satt, använd direkt (mest pålitligt)
2. attempted_login_email        ← lösenord redan validerat → bevisat kontoägd
3. username (om angivet)        ← slå upp i profiles.username → user_id
4. email (formuläradressen)     ← sista utvägen, scam-kanal
```

Stegen 2 och 3 är **nya och säkrare** än dagens lookup. Steg 4 behålls som fallback men flaggas tydligt för admin.

### Varför är `attempted_login_email` säker?

Den fångas av `MFAVerifyDialog` *efter* att Supabase har accepterat lösenordet (sessionen finns men är inte fullständig p.g.a. MFA-kravet). Den kan alltså inte fejkas av angripare som bara fyller i formuläret utan att kunna lösenordet — i så fall skulle fältet vara `null`.

Vi visar redan match-statusen i admin-kön (✓ matchar / ⚠ matchar inte). Om `attempted_login_email` finns och visar grönt har vi i praktiken **bevis på lösenordskännedom innan vi ens skickar mailen**.

### Varför behöver vi fortfarande slå upp i `auth.users`?

För att hämta den *aktuella* registrerade e-posten (användaren kan ha bytt e-post efter att de skapade kontot). Vi använder `attempted_login_email` bara för att hitta `user_id`, sedan läser vi alltid mailadressen från `auth.admin.getUserById(userId)` — som idag.

## Implementation

### 1. `admin-issue-mfa-recovery/index.ts`
Ersätt `listUsers`-blocket med en ny privat hjälpare `resolveUserId(request)`:

```ts
async function resolveUserId(admin, request): Promise<string | null> {
  if (request.user_id) return request.user_id;

  // Try attempted_login_email first (silent capture, password-validated)
  const candidates = [request.attempted_login_email, request.email]
    .filter((e): e is string => !!e)
    .map(e => e.toLowerCase());

  for (const email of candidates) {
    const { data } = await admin.rpc('get_user_id_by_email', { _email: email });
    if (data) return data;
  }

  // Try username lookup
  if (request.username) {
    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq('username', request.username)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  return null;
}
```

### 2. Ny SQL-funktion `get_user_id_by_email`
Liten security-definer-funktion som slår upp `auth.users` på e-post utan att behöva paginera:

```sql
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_id_by_email(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO service_role;
```

Endast service_role kan kalla — kan alltså bara nås från edge functions, inte från klienten.

### 3. Audit-spår i `moderation_actions`
När länken utfärdas, logga vilken matchningsväg som användes (`user_id` / `attempted_login_email` / `username` / `form_email`) så admin senare kan granska om något ärende matchades på en svagare signal.

### 4. Ingen frontend-ändring
Match-badgen i `MfaRecoveryQueue.tsx` är redan tillräcklig för admin att bedöma risk innan de trycker "Skicka återställningslänk".

## Vad ändras inte
- Mailen går fortfarande **bara** till adressen från `auth.admin.getUserById` (kontots faktiska registrerade e-post).
- Säkerhetsmodellen (e-post + lösenord + signerad token) är oförändrad.
- Inga ändringar för användaren — bara säkrare och mer skalbar lookup på baksidan.

