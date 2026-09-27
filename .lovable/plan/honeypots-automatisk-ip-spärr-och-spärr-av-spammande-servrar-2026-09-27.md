# Honeypots, automatisk IP-spärr och spärr av spammande servrar

## Mål
- Fällor på adresser som bara skannrar och attackverktyg besöker; träff spärrar IP-adressen automatiskt.
- Spärrlängd: 24 timmar första gången, 7 dagar vid upprepning inom 30 dagar.
- Spärren gäller hela webbplatsen och inloggningen, men **inte federation**, så leverans från andra servrar aldrig bryts av misstag.
- Federerade servrar som spammar spärras automatiskt tillfälligt och flaggas för moderatorer, som kan göra spärren permanent (befintlig serverblockering).

## Honeypots (fångar endast tydliga snokförsök)
Exempel: `/wp-login.php`, `/wp-admin/*`, `/xmlrpc.php`, `/.env`, `/.git/*`, `/phpmyadmin/*`, `/admin.php`, `/config.php`, `/server-status`, `/actuator/*`, `/cgi-bin/*`, `/vendor/phpunit/*`.
Plus en dold länk i sidfoten som anges som förbjuden i robots.txt: sökmotorer som följer reglerna går aldrig dit.
Aldrig fällor på riktiga Nolto-sidor, `/.well-known/*`, actor-/inbox-adresser eller mobilappens anrop.

## Spam från federerade servrar
- Räkna avvisade eller spamflaggade leveranser per server (ogiltig signatur, blockerade konton, massnämningar, flöde över gränsen).
- Över tröskeln: tillfällig automatisk spärr (24 h, sedan 7 dagar) som returnerar 429/403 innan inkommande innehåll behandlas.
- Moderationspanelen visar automatiskt spärrade servrar med orsak; moderator kan häva eller göra permanent. Befintliga manuella blockeringar ändras inte.
- Stora välkända servrar spärras aldrig automatiskt, bara flaggas (skydd mot att tappa halva Fediverse).

## Moderatorvy
Lista över spärrade IP-adresser (visas hashade/förkortade), orsak, utgångstid och knapp att häva med bekräftelse.

## Tekniska detaljer
- Kontroll och fällor i Cloudflare-gatewayn (`deploy/nolto-gateway.mjs`), som redan ser alla anrop. Federationsvägar går förbi IP-spärren.
- Ny tabell `ip_blocks` (IP som SHA-256 med hemligt salt, orsak, antal, utgångstid), endast åtkomlig för service_role och moderatorer via `has_role`. Samma för `instance_auto_blocks`.
- Gatewayn anropar en ny edge-funktion med delad hemlighet för att registrera träff och kolla spärr; kort cache i Workern för att inte belasta databasen.
- Inbox-funktionen utökas med spamräkning via befintliga atomiska räknaren och kontroll mot autospärr.
- Tester: fällor spärrar, federationsvägar påverkas aldrig, spärr löper ut, upprepning ger 7 dagar, allowlist för stora servrar.
- Workern måste därefter deployas av dig till Cloudflare; jag publicerar inget.
