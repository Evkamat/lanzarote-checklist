#!/usr/bin/env python3
"""Rebuild the local WebP files for manually selected atlas photographs."""
import argparse
import io
import json
from pathlib import Path
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ALLOWED_HOSTS = {
    'upload.wikimedia.org', 'thumb.wikimedia.org', 'inaturalist-open-data.s3.amazonaws.com',
    'static.inaturalist.org', 'www.inaturalist.org', 'commons.wikimedia.org',
}
VARIANTS = {'src': 1050, 'thumb': 420}


def output_path(relative):
    path = (ROOT / relative).resolve()
    if not path.is_relative_to(ROOT / 'assets/images') or path.suffix != '.webp':
        raise ValueError(f'Invalid photo destination: {relative}')
    return path


def download(photo):
    urls = dict.fromkeys(filter(None, (photo.get('download_url'), photo['original_url'])))
    errors = []
    for url in urls:
        parsed = urlparse(url)
        if parsed.scheme != 'https' or parsed.hostname not in ALLOWED_HOSTS:
            raise ValueError(f'Unrecognized photo host: {url}')
        try:
            request = Request(url, headers={'User-Agent': 'LanzaroteNaturalist/1.0'})
            with urlopen(request, timeout=25) as response:
                contents = response.read(20_000_001)
            if len(contents) > 20_000_000:
                raise ValueError('Image exceeds 20 MB. Use a smaller source rendition.')
            with Image.open(io.BytesIO(contents)) as original:
                image = ImageOps.exif_transpose(original).convert('RGB')
            if min(image.size) < 240:
                raise ValueError('Image below minimum resolution')
            return image
        except (URLError, OSError, ValueError) as error:
            errors.append(str(error))
    raise OSError(' / '.join(errors))


def refresh(photo, force):
    targets = {key: output_path(photo[key]) for key in VARIANTS}
    if not force and all(path.is_file() for path in targets.values()):
        return False
    source = download(photo)
    for key, path in targets.items():
        image = source.copy()
        image.thumbnail((VARIANTS[key], VARIANTS[key]))
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix('.tmp')
        image.save(temporary, 'WEBP', quality=84)
        temporary.replace(path)
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--force', action='store_true', help='Rebuild existing local files')
    parser.add_argument('--taxon', help='Only rebuild photographs for this atlas taxon ID')
    args = parser.parse_args()
    destinations = json.loads((ROOT / 'config/offline-destinations.json').read_text())
    errors, selected, updated = [], 0, 0
    for destination in destinations:
        taxa = json.loads((ROOT / destination['path'] / 'species.json').read_text())
        for taxon in taxa:
            if args.taxon and args.taxon != taxon['id']:
                continue
            for photo in taxon['images']:
                selected += 1
                try:
                    updated += refresh(photo, args.force)
                except (OSError, ValueError) as error:
                    errors.append(f"{taxon['scientific_name']}: {photo['src']} · {error}")
    for error in errors:
        print(error)
    print(f'{selected} vybraných fotografií · {updated} aktualizací · {len(errors)} chyb')
    return 1 if errors or (args.taxon and not selected) else 0


if __name__ == '__main__':
    raise SystemExit(main())
