"""Download selected CC0 dental-practice GLBs for an offline architectural study."""
import json
import pathlib
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'ASSET_MANIFEST.json'
OUT = ROOT / 'assets' / 'models'

SELECT = {
    'chair': 34371, 'chair_blue': 34370, 'chair_reclined': 34372,
    'delivery': 34373, 'light': 34374, 'monitor': 34375,
    'xray_arm': 34376, 'spittoon': 34377, 'suction': 34378,
    'dentist_stool': 34379, 'nurse_stool': 34380,
    'cabinet': 34381, 'sink_cabinet': 34382, 'instrument_tray': 34383,
    'scaler': 34384, 'curing_light': 34385, 'dispenser': 34386,
    'sharps': 34387, 'pedal_bin': 34389, 'sensor': 34388,
    'autoclave': 34390, 'washer': 34392, 'ultrasonic': 34393,
    'pouch_rack': 34394, 'sterile_cabinet': 34395,
    'reception': 34402, 'waiting_chairs': 34403,
    'coral_chairs': 34404, 'low_table': 34405,
    'water_cooler': 34406, 'play_corner': 34407, 'coat_stand': 34408,
    'appointment_screen': 34409, 'notice_board': 34410,
    'gel': 34419,
    'jaw_model': 34398, 'impression_trays': 34400, 'model_boxes': 34401,
    'ceiling_panel': 34418,
}

EXTRA_PACKS = {
    'home-appliances-and-utility': {'ac_indoor': 14142, 'ac_outdoor': 14144,
                                 'staff_fridge': 14040, 'kettle': 14119},
    'downtown-office-interiors': {'task_chair': 16979, 'guest_chair': 16987,
                                'desktop': 17031, 'keyboard': 17034,
                                'mouse': 17035, 'records': 17001},
    'fitted-kitchen-and-bathroom-builder': {'wc': 17870, 'basin': 17876,
                                         'mirror': 17891, 'toilet_roll': 17909},
    'hospital-wards-and-clinic-operations': {'lockers': 23642,
                                          'stock_shelf': 23650},
    'clinic-and-veterinary-practice': {'xray_viewer': 16804},
}


def main():
    if not MANIFEST.exists():
        subprocess.run(['curl', '--retry', '2', '--max-time', '50', '-fLsS',
                        'https://3dassets.dev/api/v1/packs/dental-practice-and-surgery',
                        '-o', str(MANIFEST)], check=True)
    assets = {int(a['id']): a for a in json.loads(MANIFEST.read_text())['data']['assets']}
    selection = dict(SELECT)
    for slug, chosen in EXTRA_PACKS.items():
        manifest = ROOT / f'ASSET_MANIFEST_{slug}.json'
        if not manifest.exists():
            subprocess.run(['curl', '--retry', '2', '--max-time', '50', '-fLsS',
                            f'https://3dassets.dev/api/v1/packs/{slug}',
                            '-o', str(manifest)], check=True)
        assets.update({int(a['id']): a for a in json.loads(manifest.read_text())['data']['assets']})
        selection.update(chosen)
    OUT.mkdir(parents=True, exist_ok=True)
    credits = []
    def download(item):
        name, asset_id = item
        a = assets[asset_id]
        if a['license']['slug'] != 'cc0-1.0':
            raise ValueError(f'Unexpected license: {name}')
        path = OUT / f'{name}.glb'
        if not path.exists() or path.stat().st_size != a['stats']['fileSize']:
            subprocess.run(['curl', '--retry', '2', '--max-time', '50', '-fLsS',
                            a['downloadUrl'], '-o', str(path)], check=True)
        if path.stat().st_size != a['stats']['fileSize']:
            raise ValueError(f'Download integrity failed: {name}')
        print(path.name, path.stat().st_size, flush=True)
        return {'file': path.name, 'title': a['title'], 'source': a['url'],
                        'license': a['license']['name'], 'licenseUrl': a['license']['url'],
                        'bytes': path.stat().st_size, 'triangles': a['stats']['triangles'],
                        'sizeMeters': a['stats']['sizeMeters']}
    with ThreadPoolExecutor(max_workers=7) as pool:
        for fut in as_completed([pool.submit(download, item) for item in selection.items()]):
            credits.append(fut.result())
    (ROOT / 'ASSET_LICENSES.json').write_text(json.dumps(credits, indent=2))


if __name__ == '__main__':
    main()
