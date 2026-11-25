#!/usr/bin/env python3
"""Refresh public, openly licensed observations and photo candidates."""
import argparse
import hashlib
import json
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/destinations/lanzarote'
API = 'https://api.inaturalist.org/v1/'
BOUNDS = dict(swlat=28.82, swlng=-13.94, nelat=29.34, nelng=-13.37)
LICENSES = {'cc0', 'cc-by', 'cc-by-sa'}


def request(endpoint, cache, **parameters):
    url = API + endpoint + '?' + urlencode(parameters)
    target = cache / (hashlib.sha256(url.encode()).hexdigest() + '.json')
    if target.exists() and time.time() - target.stat().st_mtime < 86400:
        return json.loads(target.read_text())
    for attempt in range(4):
        time.sleep(1.05 if not attempt else 2 ** attempt)
        try:
            with urlopen(Request(url, headers={'User-Agent': 'LanzaroteNaturalist/1.0'}), timeout=20) as response:
                data = json.load(response)
            target.write_text(json.dumps(data))
            return data
        except OSError:
            if attempt == 3:
                raise


def save(path, value):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, default=Path('/tmp/lanzarote-naturalist-api'))
    parser.add_argument('--start', type=int, default=0, help='Refresh taxa from this zero-based index and retain earlier taxa')
    parser.add_argument('--max-per-taxon', type=int, default=1000)
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    taxa = json.loads((DATA / 'species.json').read_text())
    previous = json.loads((DATA / 'observations.geojson').read_text()) if args.start else {}
    retained = {t['id'] for t in taxa[:args.start]}
    features = {}
    for feature in previous.get('features', []):
        props = feature['properties']
        props['taxon_ids'] = [id for id in props['taxon_ids'] if id in retained]
        if props['taxon_ids']:
            features[props['observation_id']] = feature
    candidate_file = args.cache / 'photo-candidates.json'
    photos = json.loads(candidate_file.read_text()) if args.start and candidate_file.exists() else {}
    for taxon in taxa[args.start:]:
        name = taxon['scientific_name'].removesuffix(' spp.')
        matches = request('taxa', args.cache, q=name, is_active='true', per_page=30)['results']
        match = next((item for item in matches if item['name'].casefold() == name.casefold()), None)
        if not match:
            print(name, 'unresolved', flush=True)
            continue
        taxon['inaturalist_taxon_id'] = match['id']
        if not taxon.get('common_name_en'):
            taxon['common_name_en'] = match.get('preferred_common_name')
        taxon['taxonomic_rank'] = {'species':'druh','subspecies':'poddruh','genus':'rod','family':'čeleď'}.get(match['rank'], taxon['taxonomic_rank'])
        sources = taxon['sources']
        url = 'https://www.inaturalist.org/taxa/' + str(match['id'])
        if not any(s['url'] == url for s in sources):
            sources.append(dict(label='Taxon na iNaturalistu', url=url))
        candidates = {}
        counts = Counter()
        total = None
        verified = None
        last_id = 0
        while total is None or total > 0:
            result = request('observations', args.cache, **BOUNDS, taxon_id=match['id'],
                             quality_grade='research,needs_id', geo='true', obscured='false',
                             order_by='id', order='asc', id_above=last_id, per_page=200)
            rows = result['results']
            if not rows:
                break
            total = result['total_results']
            for row in rows:
                if row.get('obscured') or row.get('geoprivacy') in ('private','obscured') or row.get('taxon_geoprivacy') in ('private','obscured'):
                    continue
                point = row.get('geojson') or {}
                if point.get('type') != 'Point':
                    continue
                lon, lat = point['coordinates']
                if not (BOUNDS['swlat'] <= lat <= BOUNDS['nelat'] and BOUNDS['swlng'] <= lon <= BOUNDS['nelng']):
                    continue
                # Exclude La Graciosa and the northern islets from the rectangular API query.
                if lat > 29.253 or (lat >= 29.218 and lon <= -13.485):
                    continue
                grade = row['quality_grade']
                observed = row.get('taxon') or {}
                url = 'https://www.inaturalist.org/observations/' + str(row['id'])
                if grade == 'research':
                    verified = verified or url
                    for photo in row.get('photos', []):
                        if photo.get('license_code') in LICENSES and photo.get('url') and not photo.get('hidden') and (observed.get('id') == match['id'] or match['rank'] in {'genus', 'family'}):
                            candidates[photo['id']] = dict(photo, observation_url=url, depicted_name=observed.get('name'))
                if row.get('license_code') not in LICENSES or counts.total() >= args.max_per_taxon:
                    continue
                key = row['id']
                entry = features.setdefault(key, dict(type='Feature', geometry=point, properties=dict(
                    observation_id=key, taxon_ids=[], inaturalist_taxon_id=observed.get('id'),
                    taxon_name=observed.get('name'), ancestor_ids=observed.get('ancestor_ids') or [],
                    observed_on=row.get('observed_on'), accuracy=row.get('positional_accuracy'),
                    quality_grade=grade, url=url, license=row['license_code'],
                    observer=row.get('user', {}).get('login'))))
                if taxon['id'] not in entry['properties']['taxon_ids']:
                    entry['properties']['taxon_ids'].append(taxon['id'])
                    counts[grade] += 1
            last_id = rows[-1]['id']
            if len(rows) < 200 or counts.total() >= args.max_per_taxon:
                break
        if verified:
            taxon['verification_status'] = 'Výskyt doložený záznamem Research Grade v oblasti Lanzarote'
            taxon['sources'] = [s for s in sources if s['label'] != 'Doklad výskytu'] + [dict(label='Doklad výskytu', url=verified)]
        taxon['observation_count'] = counts['research']
        taxon['observation_months'] = sorted({int(p['observed_on'][5:7]) for feature in features.values()
            if taxon['id'] in (p := feature['properties'])['taxon_ids']
            and p['quality_grade'] == 'research' and p['observed_on']})
        photos[taxon['id']] = sorted(candidates.values(), key=lambda p: min((p.get('original_dimensions') or {'width':0,'height':0}).values()), reverse=True)[:12]
        print(name, match['id'], dict(counts), len(candidates), flush=True)
    save(DATA / 'observations.geojson', dict(type='FeatureCollection', features=list(features.values()), updated_at=datetime.now(timezone.utc).isoformat(), bounds=BOUNDS))
    save(DATA / 'species.json', taxa)
    save(candidate_file, photos)


if __name__ == '__main__':
    main()
