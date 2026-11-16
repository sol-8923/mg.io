"""슬라이드 내용 검수 1단계(기계): 슬라이드 본문에 있는 숫자·연도·단위 수치와 굵은 용어가 notes.md에 있는지 대조한다.
사용: python engine/slide_check.py [--book 책id] [--unit 단원id] [--json out.json]
출력: 단원별 '노트에 없는 수치/용어' 후보 목록(에이전트 검수의 입력). 오탐은 있을 수 있다."""
import os, re, json, html, argparse
ap = argparse.ArgumentParser(); ap.add_argument("--book"); ap.add_argument("--unit"); ap.add_argument("--json"); a = ap.parse_args()
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
lib = os.path.join(ROOT, "library")
NUM = re.compile(r"\d[\d,]*(?:\.\d+)?")
def norm(t): return re.sub(r"\s+", "", html.unescape(t))
def slide_text(s):
    m = re.search(r"<main.*?</main>", s, re.S); t = m.group(0) if m else s
    t = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", t, flags=re.S)
    svg = " ".join(re.findall(r"<text[^>]*>(.*?)</text>", t, re.S))
    t = re.sub(r"<svg.*?</svg>", " ", t, flags=re.S)
    bold = re.findall(r"<(?:b|strong)[^>]*>(.*?)</(?:b|strong)>", t, re.S)
    plain = html.unescape(re.sub(r"<[^>]+>", " ", t)) + " " + html.unescape(re.sub(r"<[^>]+>", "", svg))
    bold = [html.unescape(re.sub(r"<[^>]+>", "", b)).strip() for b in bold]
    return plain, bold
res = []
for book in sorted(os.listdir(lib)):
    bp = os.path.join(lib, book)
    if not os.path.isdir(bp) or (a.book and book != a.book): continue
    for unit in sorted(os.listdir(bp)):
        sp, npth = os.path.join(bp, unit, "slides.html"), os.path.join(bp, unit, "notes.md")
        if not os.path.exists(sp) or not os.path.exists(npth) or (a.unit and unit != a.unit): continue
        plain, bold = slide_text(open(sp, encoding="utf-8").read())
        notes = open(npth, encoding="utf-8").read(); nn = norm(notes)
        nums = sorted({x for x in NUM.findall(plain)} - {x for x in NUM.findall(notes)}, key=lambda x: (len(x), x))
        nums = [x for x in nums if x not in ("1", "2", "3", "4", "5", "6", "7", "8", "9", "10")]
        miss = sorted({b for b in bold if 1 < len(b) <= 30 and norm(b) not in nn})
        res.append({"book": book, "unit": unit, "numbers_not_in_notes": nums, "bold_not_in_notes": miss})
for r in res:
    print(f"{r['book']}/{r['unit']}: 수치 {len(r['numbers_not_in_notes'])} {r['numbers_not_in_notes'][:25]} | 굵은 용어 {len(r['bold_not_in_notes'])} {r['bold_not_in_notes'][:12]}")
if a.json: json.dump(res, open(a.json, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
