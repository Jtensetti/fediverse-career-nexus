# Funktionsgenomgång, 22 september 2026

Genomgången jämför Noltos kod med företagens produktbeskrivningar och ett litet urval användardiskussioner. Bloggarna visar vad företagen erbjuder; Reddittrådarna ger kvalitativa exempel på uppskattade funktioner och problem. De är inte en representativ popularitetsmätning.

## Källor och beslut

| Behov | Underlag | Nolto och åtgärd |
| --- | --- | --- |
| Välja personer och ämnen i separata flöden | [Blueskys genomgång av custom feeds, 2023-07-27](https://bsky.social/about/blog/7-27-2023-custom-feeds); [användare beskriver hur de skiljer lokala ämnen och produktiva konton åt](https://www.reddit.com/r/BlueskySocial/comments/1wa76ny/how_we_feeling_about_bluesky_these_days/) | Dialoger och lagring fanns, men reglerna användes inte vid hämtning. Nu filtrerar `get_member_feed` före sidindelning. Personer, kända fjärrkonton, organisationer, taggar och nyckelord stöds. |
| Redigera profilen på plats | [Mastodon 4.6, 2026-06-17](https://blog.joinmastodon.org/2026/06/mastodon-4.6/) | Nytt redigeringsläge på profilsidan med namn, rubrik, ort, bio, bildbeskärning och förhandsvisning. En explicit sparning uppdaterar text och bildreferenser tillsammans. |
| Styra ordning och slippa påtvingat innehåll | [Blueskys feed-beskrivning](https://bsky.social/about/blog/7-27-2023-custom-feeds); [användardiskussion om olika flöden](https://www.reddit.com/r/BlueskySocial/comments/1wa76ny/how_we_feeling_about_bluesky_these_days/) | Kronologisk ordning behålls. Inställningarna för tystade ord, återpubliceringar och ActivityPub-svar kopplas till hämtningen. Ett eget flöde kan väljas som startflöde. |
| Kunna stoppa automatisk inläsning | [Förslag från en Mastodon-användare](https://www.reddit.com/r/Mastodon/comments/1vvkr9e/limiting_the_infinite_scrolling_that_is/) | Manuell ”Visa fler” som standard; automatisk inläsning kan aktiveras i flödesinställningarna. Detta är ett användarönskemål, inte ett belägg för medicinska effekter. |
| Följa sakkunniga utan att vara kontakter | [LinkedIns förklaring av följningar, 2022-06-30](https://www.linkedin.com/blog/member/product/understanding-when-and-why-to-follow-people-on-linkedin) | Finns i `FollowAuthorButton` och `author_follows`. Kontaktförfrågningar är separata. Behålls. |
| Spara material och återvända senare | Befintliga funktioner granskade i `SavedItems.tsx` och `savedItemsService.ts` | Sparade inlägg, kommentarer, artiklar, jobb och evenemang finns. Ingen parallell bokmärkesfunktion läggs till. Ingen slutsats om popularitet dras enbart från att funktionen finns. |
| Förutsägbar jobbsökning | [LinkedIn-användare uppskattar återkomsten av klassisk sökning och kritiserar förlorade filter](https://www.reddit.com/r/linkedin/comments/1vn7d7j/just_cancelled_linkedin_premium_due_to_this_awful/) | `JobSearchFilter` har uttryckliga sökfält och filter. Behåll denna riktning. Lägg inte till en obligatorisk generativ sökassistent eller betald rangordning. |
| Synlighetskontroll vid offentliga profilsamlingar | [Mastodon 4.6 om Collections](https://blog.joinmastodon.org/2026/06/mastodon-4.6/) | De egna flödena är privata läsinställningar. Offentliga personlistor och massföljning införs inte här; de skulle behöva samtycke, aviseringar och möjlighet att lämna en lista. |

CV, utbildning, kompetenser, organisationssidor, jobb, evenemang, rapportering, blockering och e-postinställningar finns redan. Denna ändring är ingen fullständig ny acceptanstestning av alla dessa flöden. Videoströmning, prenumerationsförsäljning, nyhetsbrevsutskick och engagemangspoäng införs inte: de löser inte det aktuella urvals- och profilproblemet och kräver separata drift- och integritetsbeslut. Egna flöden kräver inte att Nolto byter federationsprotokoll.

## Flödenas beteende

- Inkluderade källor kombineras med **eller**: en vald person eller en vald tagg räcker. Uteslutningar och personliga innehållsfilter gäller därefter.
- Taggar jämförs utan skillnad på stora och små bokstäver. `#design` matchar inte `#designer`. Både ActivityPub-taggar och skrivna hashtaggar läses; HTML-attribut räknas inte som inläggstext.
- Ord och fraser matchas som vanlig text, inte SQL-mönster. Fjärrkonton måste redan vara kända av Nolto; detta är ingen sökning över hela fediversum.
- Flödesregler är endast tillgängliga för ägaren. Funktionen använder anroparens databasbehörigheter. Publik åtkomst, privata inlägg, blockeringar, raderingar och avstängda utgivare följer befintliga skydd.
- Tomma träfflistor och hämtningsfel visas separat. Ett okänt eller otillgängligt flöde faller aldrig tillbaka till ett allmänt flöde.
- Språkfilter kräver språkmetadata i inlägget. ActivityPub-svarsinställningen gäller federerade postobjekt; lokala kommentarer visas fortsatt i sina trådar.
- Förhandsvisningen av profilen visar ditt utkast. Den simulerar inte varje besökares behörigheter till CV och kontaktuppgifter. Bilder laddas upp först vid Spara. Avbryt slänger utkastet; CV och kontouppgifter hanteras fortsatt på inställningssidan.

## Kontroll

Databastester körs mot en isolerad PostgreSQL-motor med anonyma och inloggade roller. De täcker matchning, sidindelning, privata/raderade poster, Unicode-taggar, blockering i båda riktningarna, regelvalidering, ägarbyte och otillgängliga flöden. Komponenttester täcker utkast, förhandsvisning, sparfel och explicit sparning. Uppladdningstester skyddar mot att en bild raderas efter ett osäkert nätverksfel om profiluppdateringen faktiskt hann sparas.

Supabases separata rådgivningstjänst var inte åtkomlig för denna hanterade backend. Databasens grants, RLS och funktionsbehörigheter kontrolleras därför också direkt via projektets databasanslutning. Inget nytt produktionskonto eller demonstrationsinnehåll skapas för testerna.
