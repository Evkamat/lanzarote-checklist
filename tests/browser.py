"""Run the atlas smoke tests against an HTTP server at /lanzarote/."""
import json
import os
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright

URL = os.environ.get('ATLAS_TEST_URL', 'http://127.0.0.1:8765/lanzarote/')
ENGINES = sys.argv[1:] or ['chromium', 'firefox']


def exercise(browser):
    context = browser.new_context(viewport={'width': 320, 'height': 780}, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(error.stack or str(error)))
    failed_responses = []
    page.on('response', lambda response: failed_responses.append(f'{response.status} {response.url}') if response.status >= 400 else None)
    page.add_init_script("if (!localStorage.getItem('legacy-migrated')) localStorage.setItem('lanz-fauna-v1', '{\"1\":true}')")
    page.goto(URL)
    page.locator('.card').first.wait_for()
    assert page.title() == 'Catch them all: Lanzarote'
    assert page.get_by_role('heading',name='Seznam organismů',exact=True).count() == 1
    assert page.locator('.card').count() >= 99
    assert page.locator('.card h3').get_by_text('Amegilla quadrifasciata',exact=True).count() == 0
    assert page.locator('.card h3').get_by_text('Apis mellifera',exact=True).count() == 0
    assert page.locator('.card h3').get_by_text('Amegilla spp.',exact=True).count() == 1
    assert page.locator('.card h3').get_by_text('Syrphidae',exact=True).count() == 0
    assert page.locator('#atlasCategories [data-level=root] button').last.get_attribute('data-group') == 'plants'
    assert page.locator('.atlas-group').last.inner_text().startswith('Rostliny')
    assert page.locator('.card h3').get_by_text('Scorpaena maderensis',exact=True).count() == 0
    genus_card = page.locator('.card').filter(has=page.get_by_role('heading',name='Patella spp.',exact=True))
    assert genus_card.get_by_text('Patella piperata',exact=True).count() == 1
    category = lambda name: page.locator(f'#atlasCategories button[data-group="{name}"]').first
    category('birds').focus()
    page.keyboard.press('Enter')
    assert category('birds').evaluate('(button) => button === document.activeElement')
    assert page.locator('.card').count() == 24
    for group, count in [('passerines',10),('raptors',5),('owls',1),('other-birds',8)]:
        category(group).click()
        assert category(group).get_attribute('aria-pressed') == 'true'
        assert page.locator('.card').count() == count
    page.locator('#query').fill('ptáci')
    page.get_by_role('button',name='Všichni ptáci',exact=False).click()
    assert page.locator('#query').input_value() == 'ptáci'
    assert page.locator('.card').count() == 24
    page.locator('#query').clear()
    category('arthropods').click()
    category('insects').click()
    category('flies').click()
    assert page.locator('.card').count() == 5
    category('hoverflies').click()
    assert category('hoverflies').get_attribute('aria-pressed') == 'true'
    assert page.locator('.card').count() == 5
    category('reptiles').click()
    marine = page.locator('#atlasCategories button[data-marine]')
    marine.click()
    assert marine.get_attribute('aria-pressed') == 'true'
    assert page.locator('.card h3').all_inner_texts() == ['Caretta caretta','Chelonia mydas']
    marine.click()
    category('').click()
    assert page.locator('.card').count() == 106
    for aggregate, candidate in [('Megachile spp.','Megachile pusilla'),
                                 ('Scorpaena spp.','Scorpaena porcus'),
                                 ('Sphingonotus spp.','Sphingonotus pachecoi'),
                                 ('Sphaerophoria spp.','Sphaerophoria rueppellii')]:
        card = page.locator('.card').filter(has=page.get_by_role('heading',name=aggregate,exact=True))
        assert card.get_by_text(candidate,exact=True).is_visible()
        assert page.get_by_role('heading',name=candidate,exact=True).count() == 0
    page.locator('#atlas summary').click()
    page.locator('#sort').select_option('group')
    assert page.locator('.atlas-group').get_by_text('Pestřenky',exact=False).count() == 1
    page.locator('#sort').select_option('')
    page.locator('#atlas summary').click()
    assert page.evaluate('document.documentElement.scrollWidth === innerWidth')
    assert '1 /' in page.locator('#progressText').inner_text()
    page.set_viewport_size({'width':1280,'height':900})
    assert page.evaluate('document.documentElement.scrollWidth === innerWidth')
    page.set_viewport_size({'width':320,'height':780})
    page.locator('#theme').select_option('dark')
    page.locator('#query').fill('jesterka gallotia')
    assert page.locator('.card').count() == 1
    category('birds').click()
    assert page.locator('.card').count() == 0
    category('').click()
    page.locator('[data-action=quick]').click()
    page.locator('.card.seen').filter(has_text='Gallotia atlantica').wait_for()
    page.locator('[data-action=favorite]').click()
    page.wait_for_selector('[data-action=favorite][aria-pressed=true]')
    page.reload()
    assert page.locator('html').get_attribute('data-theme') == 'dark'
    page.locator('#query').fill('gallotia atlantica')
    page.locator('.card.seen').filter(has_text='Gallotia atlantica').wait_for()
    page.locator('.open-photo').click()
    page.locator('#detailMap summary').click()
    page.locator('#detailMapCanvas.leaflet-container').wait_for()
    page.locator('#detail [data-action=new]').click()
    page.locator('[name=note]').fill('Záznam z testu')
    page.locator('[name=lat]').fill('29.1')
    page.locator('[name=lon]').fill('-13.6')
    page.locator('[name=photos]').set_input_files(Path(__file__).resolve().parents[1] / 'assets/icons/atlas-192.png')
    page.locator('#editor [type=submit]').click()
    page.locator('#editor').wait_for(state='hidden')
    page.locator('#detail [aria-label="Zavřít detail"]').click()
    page.locator('nav a[href="#journal"]').click()
    page.locator('#records').get_by_text('Záznam z testu', exact=True).wait_for()
    page.locator('#newRecord').click()
    page.locator('#taxonId').select_option('outside-checklist')
    page.locator('[name=customTaxon]').fill('Neurčený mořský plž')
    page.locator('[name=lat]').fill('29.1')
    page.locator('[name=lon]').fill('-13.6')
    page.locator('#editor [type=submit]').click()
    custom = page.locator('#records article').filter(has_text='Neurčený mořský plž')
    custom.get_by_text('Mimo checklist').wait_for()
    custom.locator('[data-action=edit]').click()
    assert page.locator('[name=customTaxon]').input_value() == 'Neurčený mořský plž'
    page.locator('#cancel').click()
    page.reload()
    custom.wait_for()
    for control, ext in [('backup','json'),('csv','csv'),('geojson','geojson')]:
        with page.expect_download() as event:
            page.locator('#'+control).click()
        download = event.value
        assert download.suggested_filename.endswith('.'+ext)
        if ext == 'json':
            backup = Path(download.path()).read_bytes()
            assert any(e.get('photos') for e in json.loads(backup)['entries'])
            assert any(e.get('customTaxon') == 'Neurčený mořský plž' for e in json.loads(backup)['entries'])
        if ext == 'geojson':
            features = json.loads(Path(download.path()).read_bytes())['features']
            assert len(features) == 2
            assert any(f['properties'].get('customTaxon') == 'Neurčený mořský plž' for f in features)
        if ext == 'csv':
            assert 'Neurčený mořský plž' in Path(download.path()).read_text()
    page.once('dialog',lambda dialog: dialog.accept())
    custom.locator('[data-action=delete]').click()
    custom.wait_for(state='hidden')
    page.once('dialog',lambda dialog: dialog.accept())
    page.locator('#records article').filter(has_text='Záznam z testu').locator('[data-action=delete]').click()
    page.locator('#records').get_by_text('Záznam z testu', exact=True).wait_for(state='hidden')
    with TemporaryDirectory() as directory:
        file = Path(directory) / 'backup.json'
        imported = json.loads(backup)
        archived = next(entry for entry in imported['entries'] if entry.get('customTaxon'))
        imported['entries'].append({**archived,'id':'legacy-bee-record','taxonId':'lanz-098','customTaxon':None,'lat':None,'lon':None})
        imported['entries'].append({**archived,'id':'legacy-scorpaena-record','taxonId':'lanz-104','customTaxon':None,'lat':None,'lon':None})
        file.write_text(json.dumps(imported))
        page.locator('#restore').set_input_files(file)
        custom.wait_for()
        page.locator('#records article').filter(has_text='Apis mellifera').get_by_text('Mimo checklist').wait_for()
        page.locator('#records').get_by_text('Záznam z testu', exact=True).wait_for()
        page.locator('#records').get_by_text('Scorpaena porcus',exact=True).wait_for()
    page.locator('nav a[href="#atlas"]').click()
    page.locator('#query').fill('Scorpaena porcus')
    assert page.locator('.card.seen').count() == 1
    page.locator('#query').clear()
    page.evaluate("localStorage.setItem('mapy-key','obsolete-test-key')")
    page.locator('nav a[href="#map"]').click()
    page.get_by_text('Podklad Mapy.com vyžaduje API klíč v config/destinations.js.', exact=False).wait_for()
    assert page.locator('#mapKey, #saveMapKey').count() == 0
    assert page.locator('#baseMap').is_disabled()
    assert page.locator('.location-card .location-photo img').count() == 7
    page.locator('.location-card .location-photo img').first.scroll_into_view_if_needed()
    page.wait_for_function("document.querySelector('.location-photo img').naturalWidth > 0")
    site_ids = page.locator('.location-card [data-site]').count()
    assert not page.locator('#mapPublic').is_checked()
    assert not page.locator('#mapPrivate').is_checked()
    assert page.locator('#mapCount').inner_text().startswith('0 veřejných a 0 vlastních')
    assert page.locator('.site-marker').count() == site_ids
    page.locator('#mapFilters summary').click()
    page.locator('#mapPrivate').check()
    assert page.locator('#mapCount').inner_text().startswith('0 veřejných a 1 vlastních')
    page.locator('#mapPublic').check()
    page.locator('#needsId').check()
    for name in ['Apis mellifera','Amegilla quadrifasciata','Syrphidae']:
        taxon = page.locator('.taxon-picker').get_by_label(name,exact=True)
        taxon.check()
        assert int(page.locator('#mapCount').inner_text().split()[0]) > 0
        taxon.uncheck()
    page.locator('#needsId').uncheck()
    page.locator('#mapGroup').select_option('reptiles')
    assert int(page.locator('#mapCount').inner_text().split()[0]) > 0
    assert 'a 1 vlastních' in page.locator('#mapCount').inner_text()
    page.locator('#mapMarine').check()
    assert page.locator('#mapCount').inner_text().startswith('0 veřejných a 0 vlastních')
    page.locator('#mapGroup').select_option('fish')
    assert int(page.locator('#mapCount').inner_text().split()[0]) > 0
    page.locator('input[name=mapTaxon][value=lanz-001]').check()
    assert page.locator('#mapCount').inner_text().startswith('0 veřejných a 0 vlastních')
    page.locator('input[name=mapTaxon][value=lanz-001]').uncheck()
    assert page.locator('.site-marker').count() == site_ids
    page.locator('#mapPlaces').uncheck()
    assert page.locator('.site-marker').count() == 0
    page.locator('#mapPlaces').check()
    page.locator('#mapMarine').uncheck()
    page.locator('#mapGroup').select_option('')
    page.locator('#mapHeat').check()
    page.locator('#mapMonth').select_option('11')
    assert 'veřejných' in page.locator('#mapCount').inner_text()
    assert page.locator('.leaflet-container').count() == 1
    assert page.evaluate('document.documentElement.scrollWidth === innerWidth')
    page.locator('nav a[href="#stats"]').click()
    page.get_by_text('Nalezené taxony', exact=False).wait_for()
    root_counts = page.locator('#groupStats > p > progress, #groupStats > details > progress')
    assert sum(int(el.get_attribute('max')) for el in root_counts.all()) == 106
    bird_stats = page.locator('#groupStats summary').get_by_text('Ptáci · 0 / 24', exact=True)
    bird_stats.click()
    assert page.get_by_text('Pěvci · 0 / 10', exact=True).is_visible()
    page.locator('#offline').click()
    page.get_by_text('Atlas je připraven offline', exact=False).wait_for(timeout=60000)
    context.set_offline(True)
    page.goto(URL+'#map')
    page.locator('#mapPublic').check()
    assert int(page.locator('#mapCount').inner_text().split()[0]) > 0
    location_photo = page.locator('.location-card .location-photo img').last
    location_photo.scroll_into_view_if_needed()
    location_photo.evaluate("(img) => img.decode()")
    page.goto(URL)
    page.locator('.card').first.wait_for()
    page.locator('#query').clear()
    category('birds').click()
    assert page.locator('.card').count() == 24
    category('').click()
    page.locator('#query').fill('gallotia atlantica')
    page.locator('.open-photo').click()
    page.locator('#detail h2').wait_for()
    assert page.locator('#detail img').count() >= 1
    page.wait_for_function("document.querySelector('#detail img').naturalWidth > 0")
    assert not (errors or failed_responses), (errors, failed_responses)
    context.close()


with sync_playwright() as playwright:
    for engine in ENGINES:
        kwargs = {**({'executable_path':os.environ['ATLAS_CHROMIUM_PATH']} if 'ATLAS_CHROMIUM_PATH' in os.environ else {}),'args':['--no-sandbox']} if engine == 'chromium' else {}
        with getattr(playwright,engine).launch(**kwargs) as browser:
            exercise(browser)
        print(engine + ': OK')
