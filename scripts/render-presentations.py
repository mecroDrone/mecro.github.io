"""Create protected slide images for browsers without an embedded PDF viewer."""
import argparse
import concurrent.futures
import json
import pathlib
import shutil
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent

def render(manifest, executable):
    data = json.loads(manifest.read_text(encoding='utf-8'))
    base = manifest.parent.parent
    prefix = base / 'assets' / f"slide-{data['week']:02}"
    subprocess.run([executable, '-jpeg', '-jpegopt', 'quality=88', '-scale-to', '1440',
                    str(base / data['pdf']), str(prefix)], check=True, capture_output=True)
    pages = sorted(prefix.parent.glob(prefix.name + '-*.jpg'), key=lambda p: int(p.stem.rsplit('-', 1)[1]))
    if len(pages) != len(data['slides']):
        raise ValueError(f'Slide count mismatch: {manifest}')
    for slide, page in zip(data['slides'], pages):
        slide['image'] = page.relative_to(base).as_posix()
    manifest.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"{base.name}: week {data['week']}, {len(pages)} slides", flush=True)
    return len(pages)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--pdftoppm', default=shutil.which('pdftoppm'))
    args = parser.parse_args()
    if not args.pdftoppm:
        parser.error('Install Poppler or pass --pdftoppm with its executable path.')
    manifests = sorted((ROOT / 'materiales').glob('*/presentaciones/semana-*.json'))
    if not manifests:
        parser.error('Import the course packages and convert the presentations to PDF first.')
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        total = sum(pool.map(lambda file: render(file, args.pdftoppm), manifests))
    print(f'OK: {total} protected slide images in {len(manifests)} presentations.')
