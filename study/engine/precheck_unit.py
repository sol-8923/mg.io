# -*- coding: utf-8 -*-
"""검수 전 자동 사전 점검 (4중 검수 앞에서 흔한 반려 사유를 스크립트로 먼저 잡는다).

사용: python engine/precheck_unit.py <책id> <단원id> [--pages 8-67] [--offset 0] [--src <원문 txt 이름들>]
  - 원문: drafts/<책id>/src/교과서.txt (+ 교사용 교과서.txt)  (쪽 구분은 \\f, PDF 쪽 = 인쇄 쪽 + offset)
  - 검사 대상: drafts/<책id>/<단원id>/questions.json, blueprint.json
✖ = 반드시 고칠 것(0건이 될 때까지), ⚠ = 검수자가 판단할 참고 사항.
"""
import argparse, json, re, sys, collections
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
PUNCT = re.compile(r"[\s .,?!…·ㆍ‘’“”\"'()\[\]{}<>《》「」『』〈〉~\-–—:;/*]")
def norm(s): return PUNCT.sub("", s or "")

ap = argparse.ArgumentParser()
ap.add_argument("book"); ap.add_argument("unit")
ap.add_argument("--pages", default=""); ap.add_argument("--offset", type=int, default=0)
ap.add_argument("--src", nargs="*", default=["교과서.txt", "교사용 교과서.txt"])
a = ap.parse_args()
D = ROOT / "drafts" / a.book / a.unit
qs = json.load(open(D / "questions.json", encoding="utf-8"))["questions"]
bp = json.load(open(D / "blueprint.json", encoding="utf-8"))
pages = {}      # 파일 -> [쪽별 정규화 텍스트]
for name in a.src:
    f = ROOT / "drafts" / a.book / "src" / name
    if f.exists(): pages[name] = [norm(p) for p in f.read_text(encoding="utf-8").split("\f")]
if not pages: print("원문 텍스트가 없어 인용·쪽수 검사를 건너뜁니다.");
full = "".join("".join(v) for v in pages.values())
errs, warns = [], []
def E(m): errs.append(m)
def W(m): warns.append(m)

def fields(q):
    """(필드이름, 문자열) 목록 — 원문 인용이 나올 수 있는 곳"""
    out = [("question", q.get("question", "")), ("passage", q.get("passage", "")), ("explanation", q.get("explanation", "")), ("detail", q.get("detail", "")), ("tip", q.get("tip", ""))]
    for i, c in enumerate(q.get("choices", [])): out.append(("choices[%d]" % i, c))
    for i, c in enumerate(q.get("choiceExplanations", []) or []): out.append(("choiceExplanations[%d]" % i, c))
    for i, r in enumerate(q.get("rubric", []) or []): out.append(("rubric[%d].tip" % i, r.get("tip", "")))
    return out
QUOTE = re.compile(r"“([^”]+)”|‘([^’]+)’|\"([^\"]+)\"")
def quotes(text):
    res = []
    for m in QUOTE.finditer(text):
        seg = next(g for g in m.groups() if g)
        for part in re.split(r"\(…\)|…", seg):
            n = norm(part)
            if len(n) >= 7: res.append((part.strip(), n))
    return res

# 1) 원문 인용 + 쪽수
page_cites = collections.defaultdict(list)
for q in qs:
    for fname, text in fields(q):
        if not text: continue
        for part, n in quotes(text):
            if pages and n not in full:
                W("%s %s: 원문에서 찾을 수 없는 인용 → '%s' (직접 만든 〈보기〉·바꿔 쓴 말이면 무시)" % (q["id"], fname, part[:40]))
        # 같은 문장 안에 인용과 쪽수가 함께 있으면 그 쪽에 인용이 있는지
        for sent in re.split(r"(?<=[.다요])\s+", text):
            ps = []
            for m in re.finditer(r"p\.(\d+)(?:\s*~\s*(\d+))?((?:\s*,\s*(?:p\.)?\d+)*)", sent):
                lo = int(m.group(1)); hi = int(m.group(2) or lo); ps += list(range(lo, hi + 1))
                for x in re.findall(r"\d+", m.group(3) or ""): ps.append(int(x))
            qq = quotes(sent)
            if not ps or not qq or not pages: continue
            for part, n in qq:
                if n not in full: continue
                ok = any(n in pg[p + a.offset - 1] for pg in pages.values() for p in ps if 0 <= p + a.offset - 1 < len(pg))
                if not ok: E("%s %s: 인용 '%s'이(가) 적힌 쪽(%s)에 없음" % (q["id"], fname, part[:30], ",".join("p.%d" % p for p in ps)))

# 2) 다른 슬롯으로의 정답·조건 낱말 노출
def open_text(q): return norm(" ".join([q.get("question", ""), q.get("passage", "")] + q.get("choices", [])))
conds = {}
for q in qs:
    if q["type"] == "essay":
        m = re.findall(r"'([^']{1,8})'", q.get("answerHint", ""))
        conds.setdefault(q["slot"], set()).update(m)
for q in qs:
    if q["type"] == "short":
        for t in q["answer"]:
            if re.fullmatch(r"\d{1,2}(개)?", t.strip()): continue
            for o in qs:
                if o["slot"] != q["slot"] and norm(t) in open_text(o): E("%s: 단답 정답 '%s'이(가) %s의 발문·지문·보기에 나옴" % (q["id"], t, o["id"]))
for slot, ws in conds.items():
    for w in ws:
        for o in qs:
            if o["slot"] != slot and norm(w) in open_text(o): W("서술형 %s 조건 낱말 '%s'이(가) %s의 발문·지문·보기에 나옴 (정답·조건을 알려 주는지 검수자가 판단)" % (slot, w, o["id"]))
for q in qs:
    if q["type"] != "mc" or q.get("fixedOrder"): continue
    ans = norm(q["choices"][q["answer"] - 1])
    if len(ans) < 12: continue
    for o in qs:
        if o["slot"] != q["slot"] and o["type"] == "mc" and ans in [norm(c) for c in o["choices"]]: E("%s: 정답 보기 문장이 %s의 보기에 그대로 나옴" % (q["id"], o["id"]))

# 3) 풀이 충실도
for q in qs:
    d = q.get("detail", "") or ""
    if len(d) < 60: E("%s: detail이 너무 짧음(%d자) — 정답 근거·장면·오해 포인트를 풀어 쓸 것" % (q["id"], len(d)))
    if q["type"] == "mc":
        ce = q.get("choiceExplanations") or []
        wrong = [c for c in ce if not c.startswith("정답.")]
        n_ok = len(q["answer"]) if isinstance(q.get("answer"), list) else 1   # 복수 정답 문항은 '정답.' 해설이 정답 개수만큼
        if len(wrong) != len(ce) - n_ok or len(ce) != len(q["choices"]): E("%s: choiceExplanations 구성 오류" % q["id"])
        for c in wrong:
            if len(c) < 14: E("%s: 오답 해설이 너무 짧음 → '%s'" % (q["id"], c))
        if len(set(wrong)) < len(wrong): E("%s: 오답 해설 중 똑같은 문장이 있음" % q["id"])
        if len(q.get("tip", "")) < 6: W("%s: tip이 비어 있거나 너무 짧음" % q["id"])
    if q["type"] == "essay":
        if not q.get("explanation"): E("%s: 서술형 explanation 없음" % q["id"])
        if "조건 낱말" not in d and "조건" not in d: W("%s: detail에 조건 낱말 채점 안내가 없음" % q["id"])
        if sum(r["points"] for r in q["rubric"]) != q["points"]: E("%s: rubric 합이 배점과 다름" % q["id"])
    if q["type"] == "short":
        if not q.get("commonMistakes"): E("%s: commonMistakes 없음" % q["id"])
        hint = q.get("answerHint", "")
        m = re.search(r"(한|두|세|네|다섯|\d+)\s*글자", hint)
        if m and "도 인정" not in hint:
            want = {"한": 1, "두": 2, "세": 3, "네": 4, "다섯": 5}.get(m.group(1)) or int(m.group(1))
            bad = [t for t in q["answer"] if len(t.replace(" ", "")) != want]
            if bad: E("%s: answerHint는 %d글자인데 인정 답에 다른 길이가 있음 %s ('도 인정'을 hint에 적거나 답을 정리)" % (q["id"], want, bad))
    if q.get("refs") is not None and not (1 <= len(q["refs"]) <= 3): W("%s: refs 개수 %d" % (q["id"], len(q["refs"])))
# 4) 설계도 일치
slots = {s["id"]: s for s in bp["slots"]}
for q in qs:
    s = slots.get(q["slot"])
    if not s: E("%s: 설계도에 없는 슬롯" % q["id"]); continue
    for k in ("type", "difficulty", "points", "concept"):
        if q.get(k) != s.get(k): E("%s: %s가 설계도와 다름(%s ≠ %s)" % (q["id"], k, q.get(k), s.get(k)))
for sid, s in slots.items():
    n = sum(1 for q in qs if q["slot"] == sid)
    if n < bp.get("variantsPerSlot", 2) and not all(q.get("origin") == "past-exam" for q in qs if q["slot"] == sid): E("슬롯 %s: 변형 %d개(필요 %d)" % (sid, n, bp.get("variantsPerSlot", 2)))

exec(compile(open(ROOT / "engine" / "_precheck_extra.py", encoding="utf-8").read(), "_precheck_extra.py", "exec"))   # 공통 반려 예방 규칙
print("사전 점검: %s/%s — 문항 %d개" % (a.book, a.unit, len(qs)))
for m in errs: print("✖", m)
for m in warns: print("⚠", m)
print("결과: ✖ %d건, ⚠ %d건" % (len(errs), len(warns)))
sys.exit(1 if errs else 0)
