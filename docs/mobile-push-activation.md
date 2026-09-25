# Aktivera mobilappen och pushnotiser

Koden innehåller mobil inloggning med e-post/lösenord och TOTP, notislista, frivilligt pushmedgivande, krypterade enhetsregistreringar och en leveranskö. Den skickar **inga pushnotiser innan driften har konfigurerats**. Appbutikssignering och verklig leverans till iOS/Android är separata verifieringssteg.

## 1. Rätt backend och drift

Använd utvecklings-/stagingmiljö först. Produktionsreferensen i repot är `anknmcmqljejabxbeohv`; kontrollera att det är rätt driftmiljö innan något körs. Den anslutna Supabase-projektlistan gav inte åtkomst till detta projekt vid implementationen. Ingen produktionsmigration eller funktionsdriftsättning gjordes i detta arbete.

1. Applicera `20260925180809_mobile_push_notifications.sql` efter befintliga migrationer.
2. Driftsätt `mobile-push` och `send-mobile-push` inklusive deras delade moduler. Båda använder `verify_jwt=false` i gatewayen och gör autentiseringen själva: verifierad, aktiv session/MFA respektive serverns workercredential.
3. Behåll befintlig `TOKEN_ENCRYPTION_KEY`. Den används med en separat `push-token`-nyckelkontext. Byt inte ut den utan planerad migrering av tidigare krypterad data.
4. Sätt serverhemligheten `EXPO_ACCESS_TOKEN` och slå på **enhanced push security** för EAS-projektet så att token krävs vid skickning. Lägg aldrig detta värde i `EXPO_PUBLIC_*`.
5. Schemalägg ett serveranrop till `/functions/v1/send-mobile-push` varje minut med POST och befintlig workerautentisering: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`. Använd den befintliga driftens hemlighetshantering/scheduler. Lägg inte nyckeln i frontend, git eller klartext i cronloggar. Workeranropet kör både leveranser och senare kvittokontroller.
6. Aktivera med servervärdet `MOBILE_PUSH_ENABLED=true` först när staging och signering är redo. `false` stoppar nya provideranrop; redan accepterade pushar kan inte återkallas.

Kön fylls atomiskt när nya rader skapas i `notifications`. Ingen historisk notissamling skickas när en användare aktiverar push. Registreringen gäller i 30 dagar och förnyas när appen används med bevarat medgivande. Högst tio registreringar per konto. Tokens och väntande jobb tas bort vid avregistrering, Auth-sessionens borttagning och påbörjad kontoradering.

## 2. Expo, Apple och Google

Behåll React Native/Expo. Native notiser kräver ingen omskrivning till Swift/Kotlin; Expo-klienten använder plattformarnas notissystem. Den här implementationen väljer Expo Push Service framför två egna APNs-/FCM-avsändare. Providerdata begränsas till enhetstoken, generisk svensk text och en opaque notisidentifierare.

1. Skapa/länka ett Expo/EAS-projekt under organisationens konto. Ange projektets UUID i `EXPO_PUBLIC_EAS_PROJECT_ID`. Det dynamiska appconfiget kopplar även UUID:t till `extra.eas.projectId`.
2. Bekräfta att `social.nolto.app` är rätt/ledig identifierare i båda butikskontona. Ändra innan distribution om den inte är det.
3. Konfigurera Apples push/signering i EAS med ett Apple Developer-konto. Lägg upp interna iOS-testenheter eller använd TestFlight enligt vald distribution.
4. Skapa Firebase Android-appen för samma paketnamn. Lägg `google-services.json` som en EAS-filvariabel med namnet `GOOGLE_SERVICES_JSON`; appconfiget använder dess sökväg. Registrera FCM v1 service account-uppgifterna i EAS credentials. Service account-filen är en hemlighet och ska aldrig ligga i appbunten/git.
5. Fyll de publika miljövärdena i `apps/mobile/.env.example` via den valda byggmiljön. De tre befintliga backend-/webbvärdena måste avse samma Nolto-miljö. Endast en publicerbar/anon backendnyckel får användas.
6. Bygg `preview` enligt `apps/mobile/eas.json` för intern testning eller `production` för butiksspåret. Lokala nativebyggen med `npm run ios`/`npm run android` fungerar också med rätt SDK och credentials. Testa med en riktig appbyggnad, inte Expo Go.

## 3. Acceptanstest på två telefoner och två testkonton

- Logga in, inklusive TOTP på ett MFA-konto. Återstarta appen och verifiera sessionen.
- Aktivera push uttryckligen. Kontrollera Android-kanalen och att nej till systemdialogen ger en begriplig väg till telefonens inställningar.
- Skapa ett riktigt svar, omnämnande och privat meddelande från konto B till A. Kontrollera att en notisrad ger ett köjobb per registrerad telefon.
- Testa appen i förgrunden, bakgrunden och helt avslutad. Tryck på en push; efter eventuell inloggning ska en ny behörighetskontroll göras innan innehållet öppnas. Privata mål öppnas i webbläsaren, som kan behöva en separat webbinloggning.
- Kontrollera att låsskärmen inte visar avsändare eller meddelandetext. Notiser inne i appen är också korta och generiska.
- Markera en notis som läst på webben före leverans. Blockera avsändaren, avregistrera telefonen, logga ut och begär kontoradering i separata testfall. Köjobb får därefter inte starta en ny leverans.
- Byt konto på telefonen. Ett notis-ID från det förra kontot får inte kunna öppnas. Samma telefon får inte överta ett annat aktivt kontos registrering.
- Testa nekad behörighet, nätverksavbrott vid aktivering/utloggning och tokenrotation. Appen får inte säga att push är avstängt innan servern bekräftat det.
- Kontrollera providerkvittot efter cirka 15 minuter. `DeviceNotRegistered` ska ta bort registreringen. Felaktiga credentials ska bli synliga som misslyckade jobb, inte upprepas obegränsat.
- Kontrollera större textstorlek, VoiceOver/TalkBack, tangentbord, skärmens safe areas och ljus/mörker på både iOS och Android.

## Driftens begränsningar

- En Expo-ticket bekräftar mottagning hos Expo. Ett lyckat receipt bekräftar överlämning till APNs/FCM, inte att personen sett notisen.
- Avsändaren återförsöker tillfälliga fel med ökande intervall och högst fem skickförsök. Kvittokontrollen är separat och har högst åtta försök. Jobb behålls högst sju dagar; utgångna registreringar städas av arbetaren.
- Leverans över nätverk är inte exakt-en-gång: ett kraschat jobb efter provideracceptans kan skickas igen när låset löper ut. Unika jobb, leases och kontroller begränsar dubbletter, men kan inte undanröja det fönstret. En notis som redan nått APNs/FCM kan inte återkallas.
- Workern bearbetar små batcher inom en tidsbudget. Mät köålder, `failed`, antal accepterade skick och receipts innan större utrullning. Providerfel loggas bara som fasta felkoder, aldrig tokens eller innehåll.
- Konto som endast använder social/federerad inloggning behöver en separat native OAuth/PKCE-lösning. Den ingår inte här. Fulla nativevyer för inlägg, profilsidor och krypterade meddelanden återstår också.

Referenser: [Expo setup](https://docs.expo.dev/push-notifications/push-notifications-setup/), [leverans och receipts](https://docs.expo.dev/push-notifications/sending-notifications/), [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/), [Supabase React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native).
