#!/usr/bin/env python3
"""Validate destination metadata, local photographs and public GeoJSON."""
import json
import re
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LICENSES = {'cc0', 'cc-by', 'cc-by-sa'}
PHOTO_FIELDS = ('author', 'license', 'license_url', 'original_url', 'source_url', 'source', 'modifications')


def load(path):
    return json.loads(path.read_text())


def coordinate(lat, lon):
    assert isinstance(lat, (int, float)) and -90 <= lat <= 90
    assert isinstance(lon, (int, float)) and -180 <= lon <= 180


def local_file(relative):
    assert relative.startswith('./') and '..' not in Path(relative).parts, relative
    path = ROOT / relative
    assert path.is_file(), path
    return path


def validate_photo(photo, owner):
    assert all(photo.get(field) for field in PHOTO_FIELDS), owner
    assert all(photo[field].startswith('https://') for field in ['license_url','original_url','source_url']), owner


def validate_public_map(path):
    dataset = load(path / 'public-observations.geojson')
    assert dataset['type'] == 'FeatureCollection'
    ids = set()
    for feature in dataset['features']:
        assert feature['type'] == 'Feature' and feature['geometry']['type'] == 'Point'
        lon, lat = feature['geometry']['coordinates']
        coordinate(lat, lon)
        point = feature['properties']
        id = point['observation_id']
        assert id not in ids and point['url'] == f'https://www.inaturalist.org/observations/{id}'
        ids.add(id)
        assert point['license'] in LICENSES and point['quality_grade'] in ('research','needs_id')
        assert isinstance(point['ancestor_ids'], list) and all(isinstance(n,int) for n in point['ancestor_ids'])
    for taxon in dataset['taxa']:
        assert isinstance(taxon['id'],int) and taxon['name'] and taxon['group']
    print(f'{path.name}: {len(ids)} bodů ve výřezu mimo omezení checklistu')


def validate(path, cover):
    taxa = load(path / 'species.json')
    places = load(path / 'locations.json')
    dataset = load(path / 'observations.geojson')
    species = {taxon['id']:taxon for taxon in taxa}
    assert len(species) == len(taxa), 'Duplicate taxon ID'
    observed = Counter()
    ids = set()
    for feature in dataset['features']:
        assert feature['type'] == 'Feature'
        geometry = feature['geometry']
        assert geometry['type'] == 'Point'
        lon, lat = geometry['coordinates']
        coordinate(lat, lon)
        p = feature['properties']
        assert p['observation_id'] not in ids
        ids.add(p['observation_id'])
        assert p['taxon_ids'] and set(p['taxon_ids']) <= species.keys()
        assert p['license'] in LICENSES and p['quality_grade'] in ('research','needs_id')
        assert p['url'] == f"https://www.inaturalist.org/observations/{p['observation_id']}"
        assert p['observed_on'] is None or re.fullmatch(r'\d{4}-\d{2}-\d{2}',p['observed_on'])
        if p['quality_grade'] == 'research':
            observed.update(p['taxon_ids'])
    assert dataset['type'] == 'FeatureCollection'
    assert len({site['id'] for site in places}) == len(places)
    paths = {cover} if cover else set()
    for site in places:
        coordinate(*site['coordinates'])
        assert set(site['taxa']) <= species.keys(), site['id']
        assert site['sources'] and all(s['url'].startswith('https://') for s in site['sources'])
        if photo := site.get('photo'):
            validate_photo(photo, site['id'])
            paths.add(photo['src'])
    for taxon in taxa:
        assert taxon['scientific_name'] and taxon['taxonomy']['group'] and taxon['verification_status']
        assert taxon['detectability'] in (None,1,2,3)
        assert taxon.get('observation_count',0) == observed[taxon['id']], taxon['id']
        if parent := taxon.get('checklist_parent'):
            target = species[parent]
            assert parent != taxon['id'] and not target.get('checklist_parent') and not target.get('checklist_hidden')
            assert taxon['scientific_name'] in target.get('genus_examples',[]), taxon['id']
        for photo in taxon['images']:
            validate_photo(photo, taxon['id'])
            paths.update((photo['src'], photo['thumb']))
    for relative in paths:
        with Image.open(local_file(relative)) as im:
            assert im.format == 'WEBP'
            im.load()
    print(f'{path.name}: {len(taxa)} taxonů, {sum(bool(t["images"]) for t in taxa)} s fotografiemi, '
          f'{sum(len(t["images"]) for t in taxa)} fotografií, {len(ids)} bodů, {len(places)} lokalit')


def main():
    manifest = load(ROOT / 'manifest.webmanifest')
    for icon in manifest['icons']:
        with Image.open(local_file(icon['src'])) as im:
            assert f'{im.width}x{im.height}' == icon['sizes']
    for item in load(ROOT / 'config/offline-destinations.json'):
        validate(ROOT / item['path'], item.get('cover'))
        if item.get('publicObservations'):
            validate_public_map(ROOT / item['path'])


if __name__ == '__main__':
    main()
