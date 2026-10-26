"""Embed GLB binaries into a JavaScript module for file:// offline usage."""
import base64
import json
from pathlib import Path

root=Path(__file__).resolve().parents[1]
assets={p.stem:base64.b64encode(p.read_bytes()).decode('ascii') for p in sorted((root/'assets/models').glob('*.glb'))}
if len(assets)<30:raise RuntimeError('Missing bundled dental models')
out=root/'src/embedded-assets.js'
out.write_text('// Generated asset payload — CC0 GLB, see ASSET_LICENSES.json\nexport const MODEL_DATA = '+json.dumps(assets,separators=(',',':'))+';\n',encoding='utf-8')
print(f'{len(assets)} assets embedded, {out.stat().st_size} bytes')
