from pathlib import Path
import sys
text=(Path(__file__).resolve().parents[2]/"ASSETS.md").read_text().lower()
if "license" not in text or "source" not in text:
    print("Asset provenance policy missing"); sys.exit(1)
print("Asset provenance policy: OK")
