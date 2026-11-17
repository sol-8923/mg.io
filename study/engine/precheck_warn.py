"""library 단원의 precheck ⚠ 경고만 모아 보여 준다(B4 정비용, gate와 같은 쪽 범위·오프셋 판별을 쓴다).
사용: python engine/precheck_warn.py <책id> [단원id ...] [--root library|drafts] [--count]"""
import sys, os, re, subprocess
sys.stdout.reconfigure(encoding="utf-8")
ENG = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(ENG); sys.path.insert(0, ENG)
import split_src, page_offset
args = [a for a in sys.argv[1:] if not a.startswith("--")]; book, units = args[0], args[1:]
root = sys.argv[sys.argv.index("--root") + 1] if "--root" in sys.argv else "library"
if root in units: units.remove(root)
pages, off, _ = split_src.parse_units(book)
p = os.path.join(ROOT, "drafts", book, "src", "교과서.txt")
if os.path.exists(p):
    try:
        a, _ = page_offset.detect(p)
        if a is not None: off = a
    except Exception: pass
tot = 0
for u in sorted([d for d in os.listdir(os.path.join(ROOT, root, book)) if re.fullmatch(r"u\d+", d)], key=lambda s: int(s[1:])):
    if units and u not in units: continue
    cmd = [sys.executable, os.path.join(ENG, "precheck_unit.py"), book, u, "--root", root, "--src", "교과서.txt", "교사용 교과서.txt", "--offset", str(off)]
    if u in pages: cmd += ["--pages", "%d-%d" % pages[u]]
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", env=env)
    ws = [l.strip() for l in r.stdout.splitlines() if l.strip().startswith("⚠")]
    tot += len(ws)
    if "--count" not in sys.argv:
        print("## %s/%s ⚠ %d" % (book, u, len(ws)))
        for w in ws: print(w)
    else:
        print("%s/%s ⚠ %d" % (book, u, len(ws)))
print("합계 ⚠ %d" % tot)
