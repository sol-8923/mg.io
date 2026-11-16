"""B개정 기계 점검: 해설 품질·형식 B급 후보를 찾는다. 사용: python engine/b_scan.py [--book 책id] [--unit 단원id] [--json out.json]"""
import json, os, re, argparse
ap = argparse.ArgumentParser(); ap.add_argument("--book"); ap.add_argument("--unit"); ap.add_argument("--json"); a = ap.parse_args()
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
lib = os.path.join(ROOT, "library")
CIRC = re.compile(r"[①②③④⑤]")
def sents(t): return [x for x in re.split(r"(?<=[.!?요다])\s+", str(t or "").strip()) if x.strip()]
res = []
for book in sorted(os.listdir(lib)):
    if not os.path.isdir(os.path.join(lib, book)) or (a.book and book != a.book): continue
    for unit in sorted(os.listdir(os.path.join(lib, book))):
        qp = os.path.join(lib, book, unit, "questions.json")
        if not os.path.exists(qp) or (a.unit and unit != a.unit): continue
        for q in json.load(open(qp, encoding="utf-8"))["questions"]:
            f = []
            txt = " ".join(str(x) for x in [q.get("explanation"), q.get("detail"), q.get("tip")] + list(q.get("choiceExplanations") or []))
            if "은(는)" in txt or "이(가)" in txt or "을(를)" in txt or "와(과)" in txt: f.append("조사병기")
            if q.get("detail") and len(sents(q["detail"])) < 3: f.append("detail3문장미만")
            if CIRC.search(" ".join(str(x) for x in [q.get("explanation")] + list(q.get("choiceExplanations") or []))): f.append("번호언급")
            ch = q.get("choices") or []
            if q.get("type") == "mc" and len(ch) >= 4 and not q.get("fixedOrder") and all(re.match(r"^\s*[㉠-㉤ⓐ-ⓔ]\s*[:.]", str(c)) for c in ch): f.append("fixedOrder누락")
            if f: res.append({"book": book, "unit": unit, "id": q["id"], "flags": f})
from collections import Counter
c = Counter(); bu = Counter()
for r in res:
    bu[(r["book"], r["unit"])] += 1
    for x in r["flags"]: c[x] += 1
print("항목별:", dict(c)); print("합계 문항:", len(res))
for k, v in sorted(bu.items(), key=lambda kv: -kv[1])[:30]: print(f"  {k[0]}/{k[1]}: {v}")
if a.json: json.dump(res, open(a.json, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
