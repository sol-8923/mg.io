# -*- coding: utf-8 -*-
"""슬라이드 무결성 검사 (library의 slides.html)

사용: python engine/slide_integrity.py [책id [단원id]]
  <html>·</html> 각 1개 / <script> 여닫음 일치 / <section class="slide…> 수 == #count 총 장수 /
  .pg 번호가 2..장수까지 중복 없이 연속 / 파일이 </html>로 끝남. 위반마다 ✖ 한 줄. 오류가 있으면 종료 코드 1.
모듈로도 쓴다: check_file(path) -> [오류 문자열], iter_slides(root, book, unit)
"""
import re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent


def check_file(path):
    errs = []
    t = Path(path).read_text(encoding="utf-8")
    n_open = len(re.findall(r"<html[\s>]", t)); n_close = len(re.findall(r"</html\s*>", t))
    if n_open != 1: errs.append("<html> 개수 %d (1이어야 함)" % n_open)
    if n_close != 1: errs.append("</html> 개수 %d (1이어야 함)" % n_close)
    if not t.rstrip().endswith("</html>"): errs.append("파일이 </html>로 끝나지 않음(잘렸거나 뒤에 내용이 있음)")
    so = len(re.findall(r"<script[\s>]", t)); sc = len(re.findall(r"</script\s*>", t))
    if so != sc: errs.append("<script> 열림 %d · 닫힘 %d 불일치" % (so, sc))
    secs = len(re.findall(r'<section\s+class="slide', t))
    i = t.find('id="count"')
    seg = re.sub(r"<[^>]+>", "", t[t.index(">", i) + 1:t.index(">", i) + 300]) if i >= 0 else ""
    m = re.search(r"\d+\s*/\s*(\d+)", seg)
    if not m: errs.append("#count 총 장수를 찾을 수 없음")
    elif int(m.group(1)) != secs: errs.append("슬라이드(section) %d장 ≠ #count 총 %s장" % (secs, m.group(1)))
    pgs = [int(x) for x in re.findall(r'<div\s+class="pg"[^>]*>\s*(\d+)\s*</div>', t)]
    exp = list(range(2, secs + 1))
    if pgs != exp:
        dup = sorted({p for p in pgs if pgs.count(p) > 1})
        miss = [p for p in exp if p not in pgs]
        extra = [p for p in pgs if p not in exp]
        errs.append(".pg 번호가 2..%d 연속이 아님 (중복 %s, 빠짐 %s, 범위 밖 %s, 순서 %s)" % (
            secs, dup, miss, extra, "정상" if sorted(pgs) == pgs else "뒤섞임"))
    return errs


def iter_slides(root, book=None, unit=None):
    root = Path(root)
    for b in sorted(p for p in root.iterdir() if p.is_dir()):
        if book and b.name != book: continue
        for u in sorted(p for p in b.iterdir() if p.is_dir()):
            if unit and u.name != unit: continue
            if (u / "slides.html").exists(): yield b.name, u.name, u / "slides.html"


def main():
    try: sys.stdout.reconfigure(encoding="utf-8")
    except Exception: pass
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    book = args[0] if args else None; unit = args[1] if len(args) > 1 else None
    total = bad = nerr = 0
    for b, u, f in iter_slides(ROOT / "library", book, unit):
        total += 1; e = check_file(f)
        if e: bad += 1
        for x in e: nerr += 1; print("  ✖ [%s/%s] %s" % (b, u, x))
    print("슬라이드 무결성: %d개 파일 검사, 오류 파일 %d, 오류 %d건 → %s" % (total, bad, nerr, "실패" if nerr else "통과"))
    sys.exit(1 if nerr else 0)

if __name__ == "__main__": main()
