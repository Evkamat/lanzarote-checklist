# Catch them all: Lanzarote

Český terénní atlas a osobní deník pro Lanzarote. Aplikace používá HTML, CSS a moduly JavaScriptu. Katalog, fotky a veřejná pozorování jsou součástí repozitáře. Pozorování, rychlé značky a oblíbené taxony se ukládají v IndexedDB daného prohlížeče. Při prvním otevření na stejné adrese se převedou značky původního checklistu.

## Lokální spuštění

V kořeni repozitáře spusťte `python3 -m http.server 8000` a otevřete `http://localhost:8000/`. HTTP server je nutný pro načtení modulů a datasetu. Instalace PWA, GPS a service worker využívají HTTPS nebo localhost.

Při přidávání pozorování zvolte **Organismus mimo checklist** a zadejte název nebo pracovní určení. Takové nálezy se ukládají do deníku a exportů, přičemž postup checklistu počítá pouze taxony v atlasu. Řazení **Po taxonomických skupinách** rozdělí zobrazené karty do samostatných sekcí.

Záložka **Moje nálezy** obsahuje export CSV, GeoJSON pro nálezy se souřadnicemi a úplnou zálohu JSON s volitelnými fotografiemi. Import slučuje položky podle ID. Soukromá data zůstávají v prohlížeči. Změna domény nebo portu znamená nové úložiště. Pro přenos si nejprve vytvořte JSON zálohu.

Po prvním načtení service worker připraví atlas včetně lokálních fotografií. Tlačítko **Připravit atlas offline** dokončení ověří a zobrazí objem uložených dat. Po vydání nové verze upravte `VERSION` v `sw.js`. Nová verze se převezme po zavření všech otevřených karet aplikace.

## Mapy.com

Klíč nastavte v proměnné `mapyKey` v [config/destinations.js](config/destinations.js). Poté obnovte stránku. Při nasazení je klíč v prohlížeči veřejně čitelný. V portálu Můj účet vytvořte klíč pro tento projekt, povolte mapové dlaždice, omezte povolené HTTP referery/domény na svůj web a pravidelně kontrolujte historii spotřeby a stav kreditů. Pro lokální vývoj lze použít samostatný klíč. [Zabezpečení API klíče](https://developer.mapy.com/cs/portal-muj-ucet/zabezpeceni-api-klice/) · [Dlaždice Mapy.com](https://developer.mapy.com/cs/rest-api/funkce/mapove-dlazdice/) · [Historie spotřeby](https://developer.mapy.com/cs/portal-muj-ucet/historie-spotreby/)

Základní a turistický podklad vyžadují připojení a platný klíč. Service worker dlaždice nestahuje do offline úložiště. Body a doporučené lokality lze prohlížet i bez podkladu.

## Data a jejich aktualizace

- `species.json` obsahuje stabilní identifikátory a biologická metadata. Původní index položky je zachován pro migraci. Údaje převzaté z původního checklistu mají omezenou jistotu. Stav výskytu a odkazy na zdroje jsou v detailu.
- `locations.json` obsahuje doporučená místa s odkazy na podklady a pravidla návštěvy. Mapový bod může označovat celé území.
- `observations.geojson` obsahuje veřejné body iNaturalistu s licencí CC0, CC BY nebo CC BY-SA. Obsahuje údaje o pozorovateli, přesnosti, datu a původním záznamu. Body se skrytými nebo zkreslenými souřadnicemi jsou vynechány.
- `public-observations.geojson` doplňuje oblastní výřez nezávislý na checklistu, včetně včely medonosné a pestřenek. Mapa oba soubory spojuje podle ID pozorování. Ve výchozím stavu jsou zapnuté doporučené lokality. Veřejná pozorování a vlastní nálezy se souřadnicemi mají vlastní přepínače.
- `assets/images/` obsahuje náhledy a větší snímky WebP. Autor, licence a původní snímek jsou uvedeny v detailu a v přehledu licencí. Hlavní fotografie i galerie se vybírají ručně podle čitelnosti organismu a určení ve zdroji. Fotografie mohou pocházet také z jiných oblastí. Aktualizace výskytů poskytuje kandidáty z iNaturalistu, které se zveřejňují až po ruční kontrole. Fotografie rodu nebo čeledi může zachycovat konkrétní podřízený taxon, jehož jméno je v atribuci.

Pro obnovu dat spusťte Python 3.11+ a následující příkazy. Skript pro pozorování používá denní HTTP cache v dočasném adresáři, stránkování podle ID, opakování požadavků a deduplikaci. Skript fotografií obnovuje soubory podle ručně vybraných položek v `species.json`. První fotografie v poli `images` je náhled v katalogu. Parametr `--force` znovu vytvoří i soubory, které již existují.

```sh
python3 -m pip install Pillow
python3 scripts/fetch_observations.py --max-per-taxon 350
python3 scripts/fetch_public_map.py
python3 scripts/fetch_images.py
python3 scripts/validate_data.py
```

Geografický výřez používá obdélník kolem Lanzarote a odříznutí severních ostrůvků. Počty zahrnují publikovaný licencovaný výřez a odrážejí aktivitu pozorovatelů. Měsíce doložených záznamů jsou uvedeny odděleně od fenologie. U některých historických taxonů, komplexů nebo nezastoupených poddruhů zůstává iNaturalist ID prázdné. [iNaturalist API](https://api.inaturalist.org/v1/docs/)

Pro další destinaci přidejte adresář se soubory `species.json`, `locations.json` a `observations.geojson`, položku v `config/destinations.js` a cestu v `config/offline-destinations.json`. Má-li destinace i soubor `public-observations.geojson`, nastavte v obou konfiguracích `publicObservations: true`. ID taxonů musí být unikátní napříč destinacemi. Nastavte střed, výchozí přiblížení mapy a zeměpisný filtr aktualizačních skriptů.

### Ruční úpravy checklistu

Pro skrytí položky vyhledejte její `id` v `data/destinations/lanzarote/species.json` a doplňte ID a název do objektu `retiredTaxa` v `config/destinations.js`. Po obnovení stránky se položka skryje. Případné vlastní nálezy se v deníku zobrazí pod uvedeným názvem jako nálezy mimo checklist. Smazáním řádku v konfiguraci lze znovu zobrazit položku, jejíž popis je stále v datasetu.

Při sloučení druhů zadejte u jejich původních položek `checklist_parent` s ID společné karty a do `genus_examples` společné karty vložte jména kandidátů. Starší záznamy dál používají původní ID. V deníku je možné uložit přesně určený druh i obecnější určení a oba splní společný cíl. Skrytí položky v checklistu ponechá její veřejné body na mapě.

Pro přidání zkopírujte existující blok v `species.json`, zadejte nové unikátní `id` a vyplňte jméno, skupinu a dostupné údaje. Odeberte z kopie `legacy_index`, vymažte převzaté zdroje a nastavte `observation_count` na 0, dokud nový taxon nemá mapové záznamy. Pokud pro taxon zatím nemáte fotografie, použijte `"images": []`. Už použité ID nepřiřazujte jinému taxonu. Platnost souborů ověří `python3 scripts/validate_data.py`. Při vydání aktualizace s novými fotografiemi zvyšte verzi offline cache v `sw.js`.

Skupiny seznamu, mapy a statistik vycházejí ze společného stromu v `js/groups.js`. Pro běžný taxon vyplňte `taxonomy.group` stejným názvem jako u podobné položky. Pro přesnější zařazení zadejte také `checklist_group` s ID koncové skupiny, například `lizards` nebo `sea-turtles`. Neznámý název skupiny se zobrazí jako samostatná kategorie. Filtr „Mořské organismy“ se řídí výchozím nastavením koncové skupiny nebo hodnotou `"marine": true` či `"marine": false` u položky. Při kopírování záznamu tato volitelná pole zkontrolujte.

## Nasazení na GitHub Pages

1. Nahrajte zdrojové soubory a veřejná data do repozitáře.
2. V GitHubu otevřete **Settings → Pages → Build and deployment**.
3. Zvolte **Deploy from a branch**, vyberte požadovanou větev a složku **/ (root)** a uložte.
4. Otevřete publikovanou HTTPS adresu, vyzkoušejte dataset, deník a stav offline. Pro podklad Mapy.com nastavte klíč v `config/destinations.js` před publikováním a omezte ho na doménu webu.

Build ani backend nejsou potřeba. Relativní cesty a rozsah PWA fungují i pod `/<repozitář>/`. [GitHub Pages – nastavení zdroje](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Testy

`python3 scripts/validate_data.py` ověří strukturu JSON, vazby mezi daty, souřadnice a dekódování všech lokálních snímků. Pro testy prohlížečů použijte Playwright a spusťte server tak, aby byl projekt dostupný jako `http://127.0.0.1:8765/lanzarote/`. Adresu lze změnit proměnnou `ATLAS_TEST_URL`. Poté spusťte `python3 tests/browser.py`. Závislosti pro testy nainstalujte příkazy `python3 -m pip install playwright` a `python3 -m playwright install chromium firefox`. Pro Chromium lze nastavit `ATLAS_CHROMIUM_PATH`. Firefox používá verzi dodanou Playwrightem.

Mapové knihovny jsou uloženy v `assets/vendor/` spolu s licencemi Leaflet, Leaflet.markercluster a Leaflet.heat.
