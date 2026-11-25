# Lanzarote Naturalist – interaktivní přírodovědný atlas

Vytvoř funkční webovou aplikaci sloužící jako osobní přírodovědný atlas, terénní průvodce a deník pozorování organismů. První destinací bude ostrov Lanzarote na Kanárských ostrovech.

Aplikace je určena biologicky vzdělanému uživateli, který se zajímá o biodiverzitu, ekologii, evoluci a determinaci organismů. Nemá jít pouze o turistický přehled několika nápadných druhů, ale o praktickou pomůcku pro terénní pozorování.

## 1. Technické požadavky

- Aplikace musí být plně kompatibilní s GitHub Pages.
- Použij HTML5, CSS a modulární vanilla JavaScript.
- Nepoužívej backend, databázový server ani zbytečně komplexní frameworky.
- Používej relativní cesty k souborům, aby aplikace fungovala i v podadresáři GitHub Pages.
- Odděl biologická data, konfiguraci destinace, aplikační logiku a vizuální rozhraní.
- Aplikace nesmí být natvrdo svázána s Lanzarote. V budoucnu musí být možné snadno přidat další destinaci výměnou nebo doplněním datasetu.
- Veškeré uživatelské rozhraní vytvoř v češtině. Vědecké názvy organismů zobrazuj v latině.
- Vytvoř README.md s návodem ke spuštění, konfiguraci, aktualizaci dat a nasazení na GitHub Pages.

## 2. Design a uživatelské rozhraní

Vytvoř moderní, vizuálně propracovanou aplikaci inspirovanou přírodovědnými atlasy a aplikacemi pro terénní biologii.

Vizuální styl:
- minimalistický, přírodovědný, profesionální;
- dominantní fotografie organismů;
- barevná paleta inspirovaná vulkanickou krajinou, vegetací a oceánem;
- v tmavém režimu antracitové pozadí, mírně světlejší karty, tlumené zelené a tyrkysové akcenty;
- přehledná typografie, dostatečný kontrast;
- vědecké názvy kurzívou;
- střídmé použití ikon, animací a dekorativních prvků.

Implementuj světlý a tmavý režim s možností ručního přepnutí i automatické volby podle systémového nastavení. Uživatelskou volbu ukládej.

Použij mobile-first přístup:
- plná použitelnost na displejích od šířky 320 px;
- žádné horizontální scrollování;
- dostatečně velké dotykové prvky;
- ovládání jednou rukou;
- spodní navigační lišta na mobilu;
- responzivní rozložení na desktopu;
- optimalizace pro Firefox na Androidu i desktopu.

Hlavní navigace bude obsahovat čtyři sekce:

1. Atlas
2. Mapa
3. Moje nálezy
4. Statistiky

## 3. Atlas organismů

Výchozí stránkou aplikace bude vizuální katalog organismů.

Na mobilu zobrazuj jednu nebo dvě karty vedle sebe podle dostupné šířky, na desktopu více sloupců. Nabídni také možnost přepnout na kompaktní seznam.

Každá karta organismu musí obsahovat:
- skutečnou fotografii organismu;
- vědecký název;
- český název, pokud existuje;
- taxonomickou skupinu;
- informaci o endemicity;
- typický biotop;
- orientační obtížnost nalezení;
- tlačítko pro rychlé označení organismu jako pozorovaného;
- možnost otevřít detail organismu.

Pozorované organismy vizuálně odliš, ale neskrývej jejich fotografie.

Implementuj vyhledávání podle vědeckého a českého názvu, synonym, taxonomické skupiny a popisu.

Umožni kombinovat filtry:
- taxonomická skupina;
- biotop;
- endemicita;
- původnost nebo nepůvodnost;
- obtížnost pozorování;
- sezóna;
- pozorované / nepozorované;
- oblíbené organismy.

Přidej řazení podle názvu, taxonomie, orientační šance na nalezení a počtu doložených pozorování na iNaturalistu. Poslední metriku neinterpretuj automaticky jako abundanci.

## 4. Detail organismu

Po kliknutí na kartu otevři detail organismu obsahující:
- hlavní fotografii a galerii dalších fotografií;
- vědecký název a případná synonyma;
- český a případně anglický název;
- taxonomické zařazení;
- rozšíření a endemicitu;
- typické biotopy;
- determinační znaky;
- podobné a zaměnitelné druhy;
- ekologii a biologické zajímavosti;
- fenologii a sezónnost;
- praktické tipy, kde a jak organismus hledat;
- mapu doložených výskytů;
- seznam vlastních pozorování daného taxonu;
- odkazy na iNaturalist, Wikimedia Commons a další relevantní zdroje.

U fotografií podle dostupnosti rozlišuj pohlaví, vývojová stadia nebo barevné formy.

Nezobrazuj nepodložené údaje jako ověřená fakta.

## 5. Biologický dataset

Pokud je v pracovním adresáři původní HTML checklist, extrahuj z něj všechny taxony a dostupné informace. Použij jej jako výchozí dataset, nikoli jako nezpochybnitelný zdroj.

Ověř biologické údaje a výskyt organismů přímo na Lanzarote. Výskyt na Kanárských ostrovech obecně nestačí.

Zaměř se především na:
- plazy;
- savce;
- ptáky;
- brouky;
- dvoukřídlé, zejména pestřenky;
- blanokřídlé;
- motýly;
- rovnokřídlé;
- další hmyz;
- pavoukovce;
- suchozemské měkkýše;
- korýše;
- mořské měkkýše;
- ostnokožce;
- ryby;
- žahavce;
- další zajímavé mořské bezobratlé.

Doplň také vybrané endemické a ekologicky zajímavé rostliny, případně další organismy.

Preferuj endemity, evolučně zajímavé druhy, charakteristické organismy místních biotopů a druhy reálně pozorovatelné během dovolené. Zahrň i méně běžné taxony, ale jasně označ obtížnost jejich nalezení.

U taxonů obtížně determinovatelných v terénu připusť identifikaci na úrovni rodu nebo čeledi.

Biologické informace ukládej do strukturovaného JSON souboru. Každý taxon bude mít stabilní unikátní ID nezávislé na případných změnách vědeckého názvu.

Doporučená datová pole:
- id
- scientific_name
- common_name_cs
- common_name_en
- synonyms
- taxonomic_rank
- taxonomy
- inaturalist_taxon_id
- habitats
- endemicity
- origin_status
- identification
- similar_taxa
- ecology
- interesting_facts
- observation_tips
- seasonality
- detectability
- images
- sources
- verification_status

U endemicity rozlišuj Lanzarote, východní Kanárské ostrovy, Kanárské ostrovy, Makaronésii a širší rozšíření.

U chybějících údajů použij null nebo odpovídající označení nejistoty. Nevymýšlej české názvy, výskyty, taxonomická ID ani zdroje.

Preferované zdroje:
- BIOTA / Banco de Datos de Biodiversidad de Canarias;
- iNaturalist;
- GBIF;
- odborné publikace;
- regionální faunistické a floristické atlasy;
- WoRMS pro mořské organismy.

## 6. Fotografie organismů

Fotografie jsou zásadní součástí aplikace. Nestačí zobrazit odkazy na externí webové stránky.

Pro každý taxon se pokus získat minimálně jednu kvalitní reprezentativní fotografii, ideálně několik fotografií pro detail organismu.

Použij především:
- Wikimedia Commons;
- iNaturalist;
- další důvěryhodné zdroje s vhodnou otevřenou licencí.

Fotografie stahuj lokálně do projektu, pokud to jejich licence dovoluje. Preferuj CC0, CC BY a CC BY-SA.

U každé fotografie uchovej:
- autora;
- licenci;
- odkaz na licenci;
- původní URL;
- zdroj;
- informaci o případných úpravách.

Nezaměňuj licenci pozorování na iNaturalistu s licencí jeho fotografie.

Zobrazuj atribuci u fotografie nebo v galerii detailu a vytvoř také souhrnný přehled licencí.

Ověř, že fotografie skutečně odpovídá danému taxonu. Nepoužívej fotografie příbuzných druhů bez jasného upozornění. Nepoužívej AI generované fotografie jako determinační pomůcku.

Optimalizuj obrázky:
- WebP, pokud je to vhodné a licenčně možné;
- menší náhledy pro katalog;
- větší fotografie pro detail;
- lazy loading;
- rozumná velikost souborů;
- zachování důležitých determinačních znaků.

Pokud fotografii nelze získat, zobraz neutrální zástupný symbol a informaci, že fotografie není dostupná.

Vytvoř reprodukovatelný Python nebo Node.js skript pro získávání, kontrolu a optimalizaci fotografií.

## 7. Interaktivní mapa – Mapy.com

Pro vykreslení map použij Leaflet a oficiální REST API Mapy.com jako zdroj mapových dlaždic. Můžeš se řídit zásadami v https://developer.mapy.com/cs/rest-api/vibe-coding/

Nepoužívej Google Maps.

Implementaci založ na aktuální dokumentaci:
https://developer.mapy.com/cs/rest-api/
https://api.mapy.com/v1/docs/maptiles/

Podporuj minimálně základní mapu a turistickou nebo outdoorovou mapu, pokud jsou pro danou oblast dostupné. Volitelně přidej letecké snímky.

Mapa musí umožnit:
- pohyb a přibližování;
- zobrazení aktuální GPS polohy uživatele po udělení oprávnění;
- výběr konkrétního taxonu;
- zobrazení více taxonů současně;
- filtrování podle taxonomické skupiny;
- zobrazení vlastních pozorování;
- zobrazení doporučených přírodovědných lokalit;
- otevření místa přímo na Mapy.com.

Dodrž požadovanou atribuci mapových podkladů.

API klíč řeš prostřednictvím konfiguračního souboru nebo nastavení aplikace. Počítej s tím, že API klíč použitý ve statické frontendové aplikaci je veřejně dostupný.

V README popiš nastavení omezení klíče na příslušné služby a domény, kontrolu čerpání kreditů a bezpečnou konfiguraci podle aktuální dokumentace Mapy.com.

Pokud klíč není nakonfigurován nebo mapa není dostupná, zbytek aplikace musí fungovat. Zobraz srozumitelné upozornění a případně nabídni volitelnou alternativní mapovou vrstvu s vhodnými licenčními podmínkami.

## 8. Výskytová data z iNaturalistu

Použij oficiální iNaturalist API:
https://api.inaturalist.org/v1/docs/

Pro každý taxon získej jeho správné iNaturalist taxon ID a veřejná georeferencovaná pozorování z Lanzarote a relevantních přilehlých mořských oblastí.

Nevymýšlej souřadnice ani pozorování.

Preferuj předem připravený lokální dataset ve formátu GeoJSON, aby aplikace nemusela při každém otevření stahovat velké množství dat z API.

Vytvoř samostatný aktualizační skript, který:
- získá pozorování pro jednotlivé taxony;
- respektuje limity API;
- správně řeší stránkování;
- podporuje cache a opakování neúspěšných požadavků;
- odstraňuje duplicity;
- zachovává původní identifikátory a odkazy;
- respektuje licence dat;
- zaznamenává datum poslední aktualizace.

U každého pozorování uchovej podle dostupnosti:
- taxon ID;
- observation ID;
- datum pozorování;
- zeměpisné souřadnice;
- prostorovou přesnost;
- quality grade;
- odkaz na originální pozorování.

Výchozí mapová vrstva bude zobrazovat pozorování Research Grade. Umožni volitelně zobrazit také Needs ID, protože některé málo studované taxony mají nedostatek ověřených záznamů.

Respektuj geoprivacy. Záznamy se skrytými nebo záměrně zkreslenými souřadnicemi nezobrazuj jako přesné body. Buď je vynechej, nebo je zobraz pouze na odpovídající agregované prostorové úrovni. Nesnaž se rekonstruovat skutečné skryté lokality.

Na mapě implementuj:
- jednotlivé body;
- shlukování bodů při oddálení;
- volitelnou vrstvu hustoty zaznamenaných pozorování;
- filtrování podle data a měsíců v roce;
- kliknutí na bod s detailem a odkazem na iNaturalist;
- legendu;
- počet zobrazených záznamů;
- informaci o aktuálnosti datasetu.

Jasně označ, že jde o mapu doložených pozorování, nikoli úplnou mapu areálu, abundance nebo pravděpodobnosti výskytu. Hustota záznamů je ovlivněna aktivitou pozorovatelů.

Pokud je počet záznamů příliš velký, použij prostorovou agregaci nebo efektivní načítání dat podle taxonu.

## 9. Doporučené lokality

Vytvoř samostatný dataset zajímavých přírodovědných lokalit na Lanzarote.

Zahrň různé biotopy:
- lávová pole;
- polopouště;
- písčiny;
- pobřežní útesy;
- přílivové tůně;
- saliny;
- údolí s vegetací;
- jeskyně a lávové tunely;
- oblasti vhodné ke šnorchlování.

Každá lokalita bude mít:
- název;
- ověřené souřadnice;
- stručný popis;
- charakteristické biotopy;
- zajímavé taxony;
- doporučenou dobu návštěvy, pokud je známá;
- informace o ochraně přírody a případných omezeních vstupu;
- zdroje informací.

Doporučené lokality zobrazuj v samostatné mapové vrstvě, vizuálně odlišené od skutečných pozorování.

## 10. Terénní deník

Uživatel musí mít možnost organismus jednoduše odškrtnout jako pozorovaný nebo vytvořit detailní záznam pozorování.

Detailní záznam může obsahovat:
- taxon;
- datum a čas;
- GPS souřadnice nebo ručně zvolenou lokalitu;
- poznámku;
- počet jedinců;
- stadium nebo pohlaví;
- jistotu determinace;
- vlastní fotografie.

Podporuj více pozorování stejného organismu.

Umožni také označit taxon jako oblíbený nebo jako druh, který chce uživatel cíleně hledat.

Data ukládej lokálně prostřednictvím IndexedDB. Jednoduchá nastavení lze ukládat do localStorage.

Nevyžaduj přihlášení. Vlastní fotografie, GPS souřadnice a poznámky nesmějí být automaticky odesílány na externí server ani do veřejného GitHub repozitáře.

Implementuj:
- editaci a mazání pozorování;
- export CSV;
- export GeoJSON;
- kompletní zálohu a obnovu ve formátu JSON, včetně možnosti zálohovat vlastní fotografie.

## 11. Statistiky

Vytvoř jednoduchý přehled:
- počet pozorovaných taxonů;
- počet všech taxonů v atlasu;
- procento splněného checklistu;
- počet pozorovaných endemitů;
- počet taxonů podle taxonomických skupin;
- počet navštívených lokalit;
- počet pozorování v jednotlivých dnech;
- seznam dosud nenalezených oblíbených druhů.

Rozlišuj počet unikátních pozorovaných taxonů od celkového počtu jednotlivých záznamů.

Statistiky zobrazuj pomocí přehledných grafů, počítadel a ukazatelů průběhu.

## 12. Offline režim a PWA

Připrav aplikaci jako Progressive Web App:
- manifest;
- ikony aplikace;
- service worker;
- možnost přidání na plochu telefonu;
- správné fungování pod cestou GitHub Pages;
- verzování cache a její aktualizace.

Po prvním načtení musí offline fungovat minimálně:
- katalog organismů;
- vyhledávání a filtry;
- detail organismu;
- lokálně uložené fotografie;
- checklist;
- terénní deník;
- statistiky;
- export dat.

Nabídni možnost připravit atlas pro offline použití a zobraz velikost potřebného úložiště.

Mapové dlaždice automaticky nestahuj ani dlouhodobě neukládej, pokud to licenční podmínky Mapy.com výslovně nepovolují. Offline dostupnost mapových podkladů neslibuj, pokud ji nelze legálně implementovat.

Při absenci internetu musí aplikace degradovat elegantně a nesmí přestat fungovat jako celek.

## 13. Struktura projektu

Navrhni přehlednou strukturu přibližně tohoto typu:

- index.html
- manifest.webmanifest
- sw.js
- README.md
- .nojekyll
- css/
- js/
- config/
- data/
  - destinations/
    - lanzarote/
      - species.json
      - locations.json
      - observations/
- assets/
  - images/
  - icons/
- scripts/
  - fetch_observations.py
  - fetch_images.py
  - validate_data.py
- tests/

Strukturu můžeš upravit, pokud existuje vhodnější řešení. Zachovej však důsledné oddělení aplikace od biologických dat.

## 14. Testování

Nevytvářej pouze vizuální prototyp. Implementuj skutečně funkční aplikaci se skutečnými daty.

Před dokončením:
- zkontroluj syntaxi JavaScriptu;
- ověř validitu JSON souborů;
- ověř dostupnost a správnost cest k obrázkům;
- otestuj vyhledávání a kombinace filtrů;
- otestuj ukládání nálezů po obnovení stránky;
- otestuj export a import;
- otestuj přepínání světlého a tmavého režimu;
- otestuj stav bez internetu;
- otestuj chybějící API klíč;
- zkontroluj mobilní rozložení;
- otestuj aplikaci v Chromium a Firefoxu, ideálně pomocí Playwright;
- simuluj provoz v podadresáři, například /lanzarote/, jako na GitHub Pages;
- zkontroluj chyby v konzoli prohlížeče.

Pokud některý test nelze provést, explicitně to uveď.

## 15. Postup implementace

Nejprve prozkoumej existující soubory a navrhni stručnou architekturu. Potom pokračuj přímo implementací.

Pracuj v následujícím pořadí:

1. Základní architektura a vizuální rozhraní.
2. Extrakce a validace původního biologického datasetu.
3. Získávání a zobrazování skutečných fotografií.
4. Vyhledávání, filtry a detail organismů.
5. Terénní deník a lokální ukládání.
6. Mapa Mapy.com a integrace dat iNaturalistu.
7. Statistiky.
8. Offline režim.
9. Rozšíření biologického datasetu.
10. Testování a dokumentace.

Prioritou je co nejdříve vytvořit funkční verzi atlasu s fotografiemi a checklistem. Nepodmiňuj její fungování dokončením mapové integrace nebo získáním všech biologických dat.

Nevytvářej falešné biologické údaje ani nefunkční ovládací prvky jen proto, aby rozhraní vypadalo kompletní.

Na závěr vypiš:
- co bylo implementováno;
- počet zahrnutých taxonů;
- počet taxonů s ověřenou fotografií;
- počet doložených výskytových záznamů;
- výsledky testů;
- známá omezení;
- případné nezbytné manuální kroky;
- postup nasazení na GitHub Pages.
