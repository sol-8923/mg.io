"""B개정 기계 점검: 해설 품질·형식 B급 후보를 찾는다. 사용: python engine/b_scan.py [--book 책id] [--unit 단원id] [--json out.json]"""
import json, os, re, argparse
ap = argparse.ArgumentParser(); ap.add_argument("--book"); ap.add_argument("--unit"); ap.add_argument("--json"); ap.add_argument("--root", help="점검할 폴더(기본 library, 예: drafts)"); a = ap.parse_args()
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
lib = os.path.join(ROOT, a.root or "library")
CIRC = re.compile(r"[①②③④⑤]")
PAGEREF = re.compile(r"\(\s*(?:교과서\s*)?p\.?\s*\d+[^)]*\)")   # '(교과서 p.NN)'·'(p.NN)' 쪽 표기
SRCNOTE = re.compile(r"\(\s*(?:교과서|지도서|p\.)[^)]*\)\.?\s*$")   # 끝의 '(교과서 밖 일반 상식).'·'(교과서 p.NN)' 출처 표기
def sents(t): return [x for x in re.split(r"(?<=[.!?요다])\s+", str(t or "").strip()) if x.strip()]
def sents_nopage(t):   # 쪽 표기 조각은 문장 수에서 제외
    return [x for x in sents(t) if re.sub(r"[\s.]", "", PAGEREF.sub("", x))]
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
            vis = " ".join(str(x) for x in [q.get("passage"), q.get("question")] + list(q.get("choices") or []))
            if q.get("origin") != "past-exam" and re.search(r"(?:을/를|은/는|이/가|와/과|으로/로|을\(를\)|은\(는\)|이\(가\))", vis): f.append("지문조사병기")
            if q.get("detail") and len(sents_nopage(PAGEREF.sub("", q["detail"]))) < 3: f.append("detail3문장미만")
            if CIRC.search(" ".join(str(x) for x in [q.get("explanation")] + list(q.get("choiceExplanations") or []))): f.append("번호언급")
            ceL = list(q.get("choiceExplanations") or [])
            wrongL = [str(x) for x in ceL if not str(x).startswith("정답")]
            if len(wrongL) >= 3:
                keys = [" ".join(sents(x)[1:]) for x in wrongL]
                top = max((keys.count(k) for k in set(keys) if k), default=0)
                if top >= 3: f.append("오답해설템플릿반복")
            if len(wrongL) >= 3:   # 오답 해설 3개 이상이 같은 끝 문장으로 끝남(인물·용어 문항 포함)
                tails = [(sents_nopage(SRCNOTE.sub("", str(x))) or [""])[-1] for x in wrongL]   # 끝의 출처 표기는 빼고 마지막 설명 문장을 비교
                if max((tails.count(k) for k in set(tails) if k), default=0) >= 3: f.append("오답해설끝문장반복")
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
