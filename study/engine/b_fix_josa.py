"""B개정 기계 수정: '은(는)·이(가)·을(를)·와(과)' 병기를 앞 글자의 받침으로 한 형태로 고친다(한글·㉠~㉤·ⓐ~ⓔ·A~E만; 나머지는 남기고 보고).
사용: python engine/b_fix_josa.py [--apply]  (library 의 questions.json 수정)"""
import json, os, re, sys
apply = "--apply" in sys.argv
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
lib = os.path.join(ROOT, "library")
PAIRS = {"은(는)": ("은", "는"), "이(가)": ("이", "가"), "을(를)": ("을", "를"), "와(과)": ("과", "와")}
def batchim(c):
    if "가" <= c <= "힣": return (ord(c) - 0xAC00) % 28 != 0
    if "ㄱ" <= c <= "ㅎ": return True   # 자음 이름(기역·니은…)은 모두 받침으로 끝남
    if c in "㉠㉡㉢㉣㉤ⓐⓑⓒⓓⓔABCDEabcde": return False
    return None
pat = re.compile(r"(.)(은\(는\)|이\(가\)|을\(를\)|와\(과\))")
def fix(t, left):
    def r(m):
        b = batchim(m.group(1))
        if b is None: left.append(m.group(0)); return m.group(0)
        w, wo = PAIRS[m.group(2)]
        return m.group(1) + (w if b else wo)
    return pat.sub(r, t)
def walk(o, left):
    if isinstance(o, str): return fix(o, left)
    if isinstance(o, list): return [walk(x, left) for x in o]
    if isinstance(o, dict): return {k: walk(v, left) for k, v in o.items()}
    return o
changed = 0; left = []
for book in sorted(os.listdir(lib)):
    if not os.path.isdir(os.path.join(lib, book)): continue
    for unit in sorted(os.listdir(os.path.join(lib, book))):
        qp = os.path.join(lib, book, unit, "questions.json")
        if not os.path.exists(qp): continue
        d = json.load(open(qp, encoding="utf-8"))
        for q in d["questions"]:
            keep = {k: q[k] for k in ("question", "passage", "choices", "answer") if k in q}   # 문제 본문·보기·정답은 건드리지 않는다
            lf = []
            for k in list(q):
                if k in keep or k in ("figure",): continue
                new = walk(q[k], lf)
                if new != q[k]: q[k] = new; changed += 1
            left += [f"{book}/{unit}/{q['id']}:{x}" for x in lf]
        if apply: json.dump(d, open(qp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("수정 필드", changed, "· 남은 병기", len(left)); print("\n".join(left[:20]))
