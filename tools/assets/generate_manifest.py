from pathlib import Path
import json
root=Path(__file__).resolve().parents[2]; assets=root/"public"/"assets"; items=[]
if assets.exists():
    for p in sorted(assets.rglob("*")):
        if p.is_file(): items.append({"path":p.relative_to(root).as_posix(),"bytes":p.stat().st_size})
out=root/"data"/"asset-manifest.json"; out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps({"version":1,"assets":items},indent=2)+"\n"); print("Asset manifest:",len(items))