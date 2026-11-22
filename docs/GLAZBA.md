# Glazba u čestitkama

Pošiljatelj odabere jednu od devet melodija (`src/lib/melodije.ts`, ključ se sprema u `cestitke.melodija`, migracija `004_melodija.sql`). Melodija krene kad primatelj dodirne kuvertu (`src/components/Glazba.astro`); gumb u gornjem desnom kutu je gasi i pali.

## Licence (provjereno 22. 11. 2026. na Wikimedia Commonsu)

Osam snimki izvode glazbeni sastavi američkog ratnog zrakoplovstva, a aranžmane su napisali pripadnici tih sastava. Djela savezne vlade SAD-a nemaju autorska prava (predložak PD-USGov-Military-Air Force), a same skladbe su starije od 100 godina. Smijemo ih koristiti komercijalno i mijenjati, navođenje nije obavezno.

Orašar je snimka iz 1945. (Decca, London). U EU su prava na snimku istekla, u SAD-u nisu. Ako stranica jednom bude ciljala SAD, tu melodiju treba maknuti.

Nisu uzete: Winter Wonderland i Frosty the Snowman (skladbe su još zaštićene), Deck the Halls u aranžmanu Petera Knighta (civilni aranžer), snimke Kevina MacLeoda (CC BY traži navođenje na svakoj čestitki).

| Ključ | Izvorna datoteka na Commonsu | Isječak |
|---|---|---|
| `jingle-bells` | Jingle Bells (2020) - Starlifter and Roots in Blue - United States Air Force Band of Mid-America.mp3 | 0:00 do 0:55 |
| `tiha-noc` | Silent Night (2020) - Starlifter and Roots in Blue - United States Air Force Band of Mid-America.mp3 | 0:00 do 0:55 |
| `we-wish` | We Wish You a Merry Christmas (2020) - Starlifter and Roots in Blue - United States Air Force Band of Mid-America.mp3 | 0:00 do 0:55 |
| `away-manger` | Away in a Manger (2020) - Starlifter and Roots in Blue - United States Air Force Band of Mid-America.mp3 | 0:00 do 0:55 |
| `o-tannenbaum` | O Christmas Tree - Airmen of Note - United States Air Force Band.mp3 | 0:00 do 0:55 |
| `up-housetop` | USAFB Up On The Housetop.ogg | 0:00 do 0:55 |
| `joy-jazz` | December Makes Me Feel This Way - Airmen of Note - United States Air Force Band.mp3 | 0:02 do 0:57 |
| `hark-jazz` | Hark, the Herald Angels Sing - Airmen of Note - United States Air Force Band.mp3 | 0:00 do 0:55 |
| `orasar` | PDP-CH - National Symphony Orchestra of London - Stanford Robinson, conductor - The Nutcracker Suite, Op. 71 - ... - Decca-k1142-ar9057.flac | 1:58 do 3:01 (cijeli Ruski ples) |

## Kako je isječak napravljen

Pojačavanje 0,3 s na početku, utišavanje 4 s na kraju (Orašar 1,5 s jer ples završava sam), ujednačena glasnoća oko -16 LUFS, MP3 96 kbit/s stereo, bez oznaka i omota (oko 650 KB po datoteci):

```
ffmpeg -ss <početak> -t 55 -i <izvor> -map 0:a:0 -vn \
  -af "afade=t=in:d=0.3,afade=t=out:st=51:d=4,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100" \
  -ac 2 -c:a libmp3lame -b:a 96k -map_metadata -1 public/glazba/<ključ>.mp3
```

Nova melodija: datoteka u `public/glazba/`, zapis u `src/lib/melodije.ts` i novi ključ u checku u bazi (nova migracija).
