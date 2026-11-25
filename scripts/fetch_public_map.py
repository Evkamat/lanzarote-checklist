#!/usr/bin/env python3
"""Build the checklist-independent iNaturalist map snapshot for Lanzarote."""
from pathlib import Path
from datetime import datetime, timezone

from fetch_observations import BOUNDS, DATA, LICENSES, request, save


def main():
    cache = Path('/tmp/lanzarote-naturalist-api')
    cache.mkdir(parents=True, exist_ok=True)
    filters = [({}, 6)]
    taxa = []
    # Include the commonly requested bee and hoverfly records even when older
    # than the general snapshot. These queries do not depend on the checklist.
    for name, group in [('Apis mellifera', 'Včely'), ('Amegilla quadrifasciata', 'Včely'), ('Syrphidae', 'Pestřenky')]:
        matches = request('taxa', cache, q=name, is_active='true', per_page=30)['results']
        taxon = next(t for t in matches if t['name'] == name)
        filters.append(({'taxon_id': taxon['id']}, 2))
        taxa.append(dict(id=taxon['id'], name=name, group=group))
    features = {}
    for query, pages in filters:
        for page in range(1, pages + 1):
            rows = request('observations', cache, **BOUNDS, **query, quality_grade='research,needs_id',
                           geo='true', obscured='false', order_by='id', order='desc', per_page=200, page=page)['results']
            for row in rows:
                if row.get('license_code') not in LICENSES or row.get('quality_grade') not in {'research', 'needs_id'}:
                    continue
                if row.get('obscured') or row.get('geoprivacy') not in (None, 'open') or row.get('taxon_geoprivacy') not in (None, 'open'):
                    continue
                point = row.get('geojson') or {}
                if point.get('type') != 'Point':
                    continue
                lon, lat = point['coordinates']
                if not (BOUNDS['swlat'] <= lat <= BOUNDS['nelat'] and BOUNDS['swlng'] <= lon <= BOUNDS['nelng']):
                    continue
                if lat > 29.253 or (lat >= 29.218 and lon <= -13.485):
                    continue
                observed = row.get('taxon') or {}
                key = row['id']
                features[key] = dict(type='Feature', geometry=point, properties=dict(
                    observation_id=key, taxon_ids=[], inaturalist_taxon_id=observed.get('id'),
                    taxon_name=observed.get('name'), ancestor_ids=observed.get('ancestor_ids') or [],
                    observed_on=row.get('observed_on'), accuracy=row.get('positional_accuracy'),
                    quality_grade=row['quality_grade'], url=f'https://www.inaturalist.org/observations/{key}',
                    license=row['license_code'], observer=row.get('user', {}).get('login')))
            if len(rows) < 200:
                break
    save(DATA / 'public-observations.geojson', dict(type='FeatureCollection',
         features=list(features.values()), taxa=taxa, updated_at=datetime.now(timezone.utc).isoformat(), bounds=BOUNDS))
    print(f'{len(features)} veřejných pozorování bez omezení na checklist')


if __name__ == '__main__':
    main()
