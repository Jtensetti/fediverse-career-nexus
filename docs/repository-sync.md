# Synka GitHub och Codeberg

GitHub: `https://github.com/Jtensetti/fediverse-career-nexus.git`

Codeberg: `https://codeberg.org/Tensetti/Nolto.git`

Den 22 september 2026 fanns fyra commits enbart på Codeberg, inklusive äldre README-ändringar. Den gamla README-filen beskrev den tidigare nedstängda instansen. Den aktuella README-filen beskriver det återupptagna projektet.

En synkning ska bevara dessa commits och den aktuella koden. Gör en vanlig merge och push; använd inte `push --mirror` eller `--force` för att komma förbi skillnader. De kan skriva över fjärrreferenser. En automatisk spegling är ännu inte konfigurerad.

```sh
git fetch origin main
git remote add codeberg git@codeberg.org:Tensetti/Nolto.git  # endast om remoten saknas
git fetch codeberg main
git switch -c sync-codeberg origin/main
git merge --no-ff codeberg/main
# Vid README-konflikt: behåll den aktuella beskrivningen och granska diffen.
git push codeberg HEAD:main
```

Kör med en ren arbetskopia och en SSH-nyckel som redan har skrivåtkomst till Codeberg. Ingen nyckel eller token ska sparas i repot.

## Storlek

Git-objekten tog cirka 17 MiB före vanlig komprimering och 9,71 MiB efter `git gc`, inklusive Codebergs historik. Inga publicerade commit-id:n ändrades. Den största historiska filen var en äldre favicon på cirka 1,6 MB; inga enorma videor eller byggkataloger hittades bland de största objekten. Det motiverar inte en omskrivning av publicerad historik.

`git gc` komprimerar den lokala objektdatabasen utan att ändra commit-id:n eller publicerad historik. Gamla namn och texter finns fortfarande i historiken. Att radera publicerade hemligheter kräver separat incidenthantering och nyckelrotation; komprimering är inte en sådan åtgärd.
