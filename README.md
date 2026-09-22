# Nolto

Nolto är ett öppet nätverk för arbetslivet, skapat av Jonatan Tensetti. Här finns yrkesprofiler, kontakter, inlägg, artiklar, organisationer, jobb och evenemang.

Flödena sorteras med nyast först. Du kan skapa privata flöden med utvalda personer och taggar, tysta ord och välja när fler inlägg ska läsas in. Det offentliga flödet går att läsa utan konto.

Konton har adressen `användarnamn@nolto.social`. Den används av WebFinger och ActivityPub; den är ingen e-postadress. Mastodon-koppling och federerade följningar finns i koden. Fullständig kontosynkronisering och stöd för alla Mastodon-klienter finns inte.

## Kör lokalt

Använd Node 24.15+ inom version 24, eller Node 22.22.2+ inom version 22.

```sh
npm ci
cp .env.example .env
# Ange din utvecklingsbackends publika URL och nyckel i .env.
npm run dev
```

Öppna `http://localhost:8080`. Använd en separat backend för utveckling och test.

Webbappen använder React och TypeScript. Backend bygger på PostgreSQL, Supabase Auth, Storage och Deno Edge Functions. `config/public-backend.json` innehåller den publika konfigurationen för Noltos hanterade bygge. Byt den eller ange båda miljövariablerna om du driver en egen installation. Hemliga servernycklar ska aldrig ligga i klientkoden.

## Verifiera ändringar

```sh
npm run check:source
npm run check:types
npm test
npm run check:edge
npm run build
```

CI kontrollerar även beroenden, databasbehörigheter, migreringar, Docker-bygget och mobilappen. Testdata skapas endast i isolerade testdatabaser. Se [CONTRIBUTING.md](CONTRIBUTING.md).

## Drift och utveckling

- [Installera med Docker](docs/self-hosting.md). Containern innehåller webbappen; backend behövs separat.
- [Kvar inför lansering](docs/production-readiness.md) och [kontrollera federation](docs/federation-launch-checklist.md).
- [Integritet, meddelanden och radering](docs/privacy-and-deletion.md).
- [Mobilappen](docs/mobile.md). En grund för en separat native-app, ännu ingen färdig appbutiksversion.
- [Funktionsgenomgång och källor](docs/feature-review.md).
- [Rapportera säkerhetsproblem](SECURITY.md).
- Källkod: [GitHub](https://github.com/Jtensetti/fediverse-career-nexus) och [Codeberg](https://codeberg.org/Tensetti/Nolto). [Synka utan att skriva över historik](docs/repository-sync.md).

## Licens

Koden har [MIT-licens](LICENSE). Medföljande typsnitt har [egna licenser](public/licenses/README.md). Beroenden behåller respektive upphovspersons licens.
