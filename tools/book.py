"""Unpack / repack the encrypted recipe book.

  RECIPE_PW=... python3 tools/book.py unpack   # index.html -> .work/book.html + .work/data.json
  RECIPE_PW=... python3 tools/book.py pack     # .work/data.json -> .work/book.html -> index.html (encrypted)
  python3 tools/book.py todo                   # .work/todo.json: recipes whose steps are missing (need video analysis)

window.DATA = {ui, recipes}. Every recipe: id, video_id, dish, video_title, kind, date, source, category,
ingredients[{name, amount, tag, pantry, group, basis{type, at?, quote?, url?}}], steps[], tips[], thumb, also[],
tab (cooking|sandwich|dessert), channel, note?. ui.tabs holds per-tab categories / channels / pantry.
"""
import json, os, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = os.path.join(ROOT, ".work"); os.makedirs(W, exist_ok=True)
HEAD = "<script>window.DATA = "

def crypt(mode):
    subprocess.run(["node", os.path.join(ROOT, "tools/crypt.js"), mode, os.path.join(ROOT, "index.html"), os.path.join(W, "book.html")], check=True)

def split(html):
    i = html.index(HEAD) + len(HEAD); j = html.index("</script>", i)
    body = html[i:j].rstrip().rstrip(";")
    return html[:i], json.loads(body), html[j:]

cmd = sys.argv[1] if len(sys.argv) > 1 else ""
if cmd == "unpack":
    crypt("dec")
    _, data, _ = split(open(os.path.join(W, "book.html")).read())
    json.dump(data, open(os.path.join(W, "data.json"), "w"), ensure_ascii=False, indent=1)
    print("recipes", len(data["recipes"]), "-> .work/data.json")
elif cmd == "pack":
    pre, _, post = split(open(os.path.join(W, "book.html")).read())
    data = json.load(open(os.path.join(W, "data.json")))
    ids = [r["id"] for r in data["recipes"]]
    assert len(ids) == len(set(ids)), "duplicate recipe ids"
    blob = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    open(os.path.join(W, "book.html"), "w").write(pre + blob + ";" + post)
    crypt("enc")
elif cmd == "todo":
    data = json.load(open(os.path.join(W, "data.json")))
    todo = [{"id": r["id"], "video_id": r["video_id"], "channel": r["channel"], "kind": r["kind"], "dish": r["dish"], "note": r.get("note", "")}
            for r in data["recipes"] if r.get("tab") != "cooking" and (not r["steps"] or "챕터" in r.get("note", "") or "영상 참고" in r.get("note", ""))]
    json.dump(todo, open(os.path.join(W, "todo.json"), "w"), ensure_ascii=False, indent=1)
    print(len(todo), "recipes need video analysis -> .work/todo.json")
else:
    print(__doc__)
