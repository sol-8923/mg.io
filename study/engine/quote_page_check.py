"""영어 문항의 해설·refs가 '영어 인용 + 쪽수'로 적은 근거가 실제 교과서 그 쪽에 있는지 확인한다(2026-11-17, 발간 검수의 반복 지적을 코드로).
사용: python engine/quote_page_check.py <책id> [단원id ...] [--root library|drafts] [--json 파일]
방법: drafts/<책>/src/units/<단원>_교과서.txt 의 `=== p.N ===` 구간별 텍스트에서, 해설류 필드(explanation·detail·tip·choiceExplanations·refs)의
  따옴표 속 영어 구절(영단어 2개 이상) 뒤 40자 안에 `p.N`(또는 `pN`, `교과서 pN`)이 있으면 그 구절이 p.N(±0쪽)에 있는지 본다.
  없으면 ⚠(다른 쪽에 있으면 그 쪽을 알려 준다). 끝 종료코드는 항상 0(검수자 참고)."""
import sys, re, json
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent

def norm(s): return re.sub(r"[^a-z0-9]+", " ", s.lower().replace("’", "'").replace("'", "")).strip()

def pages_of(path):
    t = Path(path).read_text(encoding="utf-8", errors="ignore")
    parts = re.split(r"=== p\.(\d+) ===\n", t)
    return {int(parts[i]): norm(parts[i + 1]) for i in range(1, len(parts), 2)}

def flat(v):
    if v is None: return []
    if isinstance(v, str): return [v]
    if isinstance(v, list): return [x for e in v for x in flat(e)]
    if isinstance(v, dict): return [x for e in v.values() for x in flat(e)]
    return []

QUOTE = re.compile(r"[\"“‘']([A-Za-z][A-Za-z0-9 ,.!?'’\-]{4,80}?)[\"”’']")
PAGE = re.compile(r"p\.?\s*(\d{2,3})")

def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    root = argv[argv.index("--root") + 1] if "--root" in argv else "library"
    book, units = args[0], args[1:]
    base = ROOT / root / book
    hits = {}
    for ud in sorted(base.glob("u*"), key=lambda p: (len(p.name), p.name)):
        if units and ud.name not in units: continue
        tb = ROOT / "drafts" / book / "src" / "units" / (ud.name + "_교과서.txt")
        qf = ud / "questions.json"
        if not tb.exists() or not qf.exists(): continue
        pg = pages_of(tb); allp = " ".join(pg.values())
        for q in json.load(open(qf, encoding="utf-8"))["questions"]:
            for field in ("explanation", "detail", "tip", "choiceExplanations", "refs", "source"):
                for text in flat(q.get(field)):
                    for m in QUOTE.finditer(text):
                        phrase = norm(m.group(1))
                        if len(phrase.split()) < 2: continue
                        tail = text[m.end(): m.end() + 40] + text[max(0, m.start() - 12): m.start()]
                        pm = PAGE.search(tail)
                        if not pm: continue
                        n = int(pm.group(1))
                        if n not in pg: continue
                        if phrase in pg[n]: continue
                        where = [k for k, v in pg.items() if phrase in v]
                        msg = "%s %s: '%s'을(를) p.%d 근거로 적었으나 그 쪽에 없음%s" % (q["id"], field, m.group(1)[:50], n, (" (p.%s에 있음)" % ",".join(map(str, where[:3]))) if where else " (교과서 어디에도 없음 — 교과서 밖/새로 쓴 문장이면 표시 필요)")
                        hits.setdefault(q["id"], []).append(msg)
    n = sum(len(v) for v in hits.values())
    for qid, ms in hits.items():
        for m in ms: print("⚠", m)
    print("결과: ⚠ %d건 (%d문항)" % (n, len(hits)))
    if "--json" in argv: Path(argv[argv.index("--json") + 1]).write_text(json.dumps(hits, ensure_ascii=False, indent=1), encoding="utf-8")

if __name__ == "__main__":
    main(sys.argv[1:])
