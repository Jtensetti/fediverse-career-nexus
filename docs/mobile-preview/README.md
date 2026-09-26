# Mobilgränssnitt – visuell granskning

Skärmbilderna visar den faktiska React Native-koden renderad i den lokala webbpreviewn, 393 × 852 px. Flöde, konto och notiser använder syntetiska testdata; inga verkliga konton eller meddelanden visas.

- [Flöde, ljust](feed-light.png)
- [Flöde, mörkt](feed-dark.png)
- [Inloggning](sign-in.png)
- [Notiser](notifications-light.png)
- [Konto](account-light.png)

Kontrollerat i preview: navigation, inloggning med simulerad backend, notislista, markera alla som lästa, oläst tomläge, konto och mörkt tema. Inga JavaScript-sidfel under dessa kontroller. Pushbehörighet, Keychain/Keystore och verklig pushleverans måste testas på telefon; webbpreviewn bevisar inte dessa funktioner.
