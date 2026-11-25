# Catch them all: Lanzarote

Český terénní checklist a osobní deník pro pozorování přírody na Lanzarote. Hodí se k plánování výletu, hledání organismů v terénu i ukládání vlastních nálezů. Seznam je výběr organismů, které stojí za pozornost. Zahrnuje ptáky, plazy, hmyz, mořské živočichy i rostliny.

## Co v aplikaci najdete

- **Seznam organismů** s fotografiemi, českými a vědeckými názvy, biotopy a dostupnými poznámkami k určení. Kategorie **Ptáci** zahrnuje všechny ptáky v seznamu. Pro užší výběr můžete přejít třeba na pěvce nebo dravce. Filtr **Mořské organismy** lze kombinovat s taxonomickými skupinami.
- **Možné druhy u společných položek.** Ropušnici můžete zaznamenat na úrovni rodu *Scorpaena* a v detailu porovnat možné druhy. Pokud druh spolehlivě určíte, můžete ho u podporovaných položek uložit přesněji a zároveň splnit společný cíl.
- **Mapu doporučených lokalit** s fotografiemi a popisy. Zvlášť lze zapnout veřejná pozorování z iNaturalistu, včetně organismů mimo checklist, a vlastní nálezy z checklistu, které mají souřadnice.
- **Terénní deník a statistiky.** Nález lze rychle odškrtnout nebo zapsat s datem, polohou, poznámkou a vlastními fotkami. Přidat lze i organismus mimo checklist. Oblíbené položky slouží jako seznam toho, co chcete cíleně hledat.

## Deník a offline režim

Deník, fotografie a značky se ukládají v prohlížeči bez přihlášení. V záložce **Moje nálezy** je export do CSV a GeoJSON i záloha a obnova JSON. Pro přenos na jiné zařízení nebo z místní adresy na GitHub Pages použijte zálohu JSON. Vlastní fotografie lze do zálohy zahrnout volitelně.

Před cestou otevřete web s připojením a použijte **Připravit atlas offline**. Po dokončení jsou offline dostupné seznam, uložené fotografie, deník, doporučené lokality i uložený výřez veřejných pozorování. Mapový podklad Mapy.com vyžaduje připojení.

## Spuštění a publikování

Projekt používá HTML, CSS a JavaScript. Ke spuštění stačí statický HTTP server. V kořeni projektu spusťte:

```sh
python3 -m http.server 8000
```

Pak otevřete [http://localhost:8000/](http://localhost:8000/). Přímé otevření `index.html` přes `file://` může v prohlížeči zablokovat načtení modulů a dat.

Na GitHubu v **Settings → Pages** zvolte **Deploy from a branch**, vyberte větev a složku **/ (root)**. Soubor `.nojekyll` ponechte vedle `index.html`, aby GitHub Pages publikoval soubory přímo. [Nastavení GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

Pro základní a turistický podklad Mapy.com vyplňte `mapyKey` v [`config/destinations.js`](config/destinations.js). Klíč je ve statickém webu čitelný z prohlížeče, proto ho v účtu Mapy.com omezte na doménu webu a potřebné služby. Lokality i body lze použít také bez podkladu. [Zabezpečení API klíče](https://developer.mapy.com/cs/portal-muj-ucet/zabezpeceni-api-klice/)

## Data, zdroje a úpravy

[Data pro Lanzarote](data/destinations/lanzarote/) obsahují checklist, doporučené lokality a uložené výřezy z iNaturalistu. Hustota bodů odráží i to, kde a jak často lidé pozorují. Záznamy mají vlastní odkazy a licence. Autor a licence každé fotografie jsou uvedeni v aplikaci pod snímkem nebo v přehledu **Licence fotografií**. Některé ilustrační snímky pocházejí z jiných oblastí.

- Položky upravujte v [`species.json`](data/destinations/lanzarote/species.json). Nové položce přidělte jedinečné `id`. Při přejmenování existující položky její ID zachovejte kvůli uloženým nálezům.
- Položku můžete skrýt v `retiredTaxa` v [`config/destinations.js`](config/destinations.js). Její veřejná pozorování zůstanou v mapovém výřezu. Druhy lze začlenit pod jednu kartu pomocí `checklist_parent` a na společné kartě uvést možné druhy v `genus_examples`.
- Veřejné výřezy obnovují [`fetch_observations.py`](scripts/fetch_observations.py) a [`fetch_public_map.py`](scripts/fetch_public_map.py). Data a místní snímky ověří `python3 scripts/validate_data.py` s nainstalovanou knihovnou Pillow.
