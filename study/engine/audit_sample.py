"""표본 감사용 문항 추출. 사용: python engine/audit_sample.py [--rate 0.1] [--book g1s2-math] [--seed N]
library 전체(또는 한 책)에서 단원마다 문항의 rate 비율(최소 3개, 기출·새 문항 모두 포함)을 무작위로 뽑아
drafts/audit/<날짜>/<책>-<단원>.json 과 요약 audit-plan.md 를 만든다(검수자에게 줄 목록)."""
import argparse, json, os, random, datetime, math
ap = argparse.ArgumentParser(); ap.add_argument("--rate", type=float, default=0.1)
ap.add_argument("--book"); ap.add_argument("--seed", type=int)
a = ap.parse_args()
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
lib = os.path.join(ROOT, "library")
rnd = random.Random(a.seed)
day = datetime.date.today().isoformat()
out = os.path.join(ROOT, "drafts", "audit", day); os.makedirs(out, exist_ok=True)
lines = [f"# 표본 감사 계획 {day} (비율 {a.rate:.0%}, 최소 3문항/단원)\n"]
total = 0
for book in sorted(os.listdir(lib)):
    bp = os.path.join(lib, book)
    if not os.path.isdir(bp) or (a.book and book != a.book): continue
    for unit in sorted(os.listdir(bp)):
        qp = os.path.join(bp, unit, "questions.json")
        if not os.path.exists(qp): continue
        qs = json.load(open(qp, encoding="utf-8"))["questions"]
        k = min(len(qs), max(3, math.ceil(len(qs) * a.rate)))
        pick = rnd.sample(qs, k)
        json.dump([q["id"] for q in pick], open(os.path.join(out, f"{book}-{unit}.json"), "w", encoding="utf-8"), ensure_ascii=False)
        past = sum(1 for q in pick if q.get("origin") == "past-exam")
        lines.append(f"- {book}/{unit}: {k}/{len(qs)}문항 (기출 {past}) → {', '.join(q['id'] for q in pick)}")
        total += k
lines.append(f"\n합계 {total}문항")
open(os.path.join(out, "audit-plan.md"), "w", encoding="utf-8").write("\n".join(lines))
print("\n".join(lines))
