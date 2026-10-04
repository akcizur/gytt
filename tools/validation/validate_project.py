from pathlib import Path
import json, sys
ROOT=Path(__file__).resolve().parents[2]
required=["package.json","tsconfig.json","vite.config.ts","index.html","src/main.ts","src/core/Game.ts","docs/PRD.md","ASSETS.md"]
missing=[p for p in required if not (ROOT/p).exists()]
if missing:
    print("Missing:", ", ".join(missing)); sys.exit(1)
json.loads((ROOT/"package.json").read_text())
print("GYTT project validation: OK")
