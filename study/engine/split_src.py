# -*- coding: utf-8 -*-
"""원문 텍스트를 단원별로 잘라 저장 (검수자 컨텍스트 절감·쪽수 대조용)

사용: python engine/split_src.py <책id> [--with-guide]
  입력: drafts/<책>/units.md 의 표(단원id·쪽 범위) + drafts/<책>/src/{교과서,교사용 교과서,지도서}.txt (쪽 구분 \f)
  출력: drafts/<책>/src/units/<단원>_<원문이름>.txt  — 각 쪽 앞에 '=== p.N ===' 표시
  쪽 번호: units.md 표의 쪽 범위를 따른다. 머리글에 '인쇄'가 있으면 인쇄쪽으로 보고, units.md/BUILDER.md의
  'PDF 쪽 = 인쇄 쪽 + N' 값(없으면 0)을 더해 PDF 쪽을 찾는다. 'PDF 쪽' 머리글이면 그대로 PDF 쪽.
  지도서.txt는 쪽 번호 체계가 교과서와 달라(앞부분 총론이 길다) 기본은 자르지 않는다. --with-guide 로 같은
  쪽 범위를 적용해 자를 수 있으나 쪽이 어긋난다(g1s2-ethics 확인) — 쓰려면 지도서 쪽 범위를 따로 확인할 것.
  표를 읽지 못하는 책은 건너뛰고 사유를 보고한다(종료 코드 1).
모듈로도 쓴다: parse_units(book) -> (units{id:(lo,hi)}, offset, note)
"""
import re, sys
from pathlib import Path
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass
ROOT = Path(__file__).resolve().parent.parent
SRC_NAMES = ["교과서", "교사용 교과서", "지도서"]


def parse_units(book):
    """-> (units: {단원id: (시작쪽, 끝쪽)} 표기 쪽 기준, offset: 인쇄쪽→PDF쪽 가산값(문서에 적힌 값), 설명). 실패 시 ({}, 0, 사유)"""
    bdir = ROOT / "drafts" / book
    f = bdir / "units.md"
    if not f.exists(): return {}, 0, "units.md 없음"
    text = f.read_text(encoding="utf-8")
    units, printed = {}, False
    for line in text.splitlines():
        if not line.lstrip().startswith("|"): continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if cells and cells[0] == "단원id": printed = "인쇄" in cells[-1]; continue
        if not re.fullmatch(r"u\d+", cells[0] if cells else ""): continue
        m = re.fullmatch(r"(\d+)\s*(?:[–—\-~]\s*(\d+))?", cells[-1].replace(" ", ""))
        if m: units[cells[0]] = (int(m.group(1)), int(m.group(2) or m.group(1)))
    if not units: return {}, 0, "units.md 표에서 '| uN | … | 시작–끝 |' 행을 읽지 못함"
    srcs = text + "\n" + ((bdir / "BUILDER.md").read_text(encoding="utf-8") if (bdir / "BUILDER.md").exists() else "")
    m = re.search(r"PDF\s*쪽\s*=\s*\**\s*인쇄\s*쪽\s*\+\s*(\d+)", srcs) or re.search(r"--offset\s+(\d+)", srcs)
    offset = int(m.group(1)) if m else 0   # 인쇄쪽 → PDF쪽 (precheck의 --offset과 같은 뜻, 문서에 적힌 값)
    return units, offset, ("인쇄쪽 기준" if printed else "PDF쪽 기준")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1: sys.exit("사용: python engine/split_src.py <책id> [--with-guide]")
    book = args[0]
    names = SRC_NAMES if "--with-guide" in sys.argv else SRC_NAMES[:2]
    units, offset, note = parse_units(book)
    if not units:
        print("건너뜀 [%s]: %s" % (book, note)); sys.exit(1)
    sdir = ROOT / "drafts" / book / "src"
    out = sdir / "units"; out.mkdir(parents=True, exist_ok=True)
    if "PDF쪽" in note: offset = 0   # 표가 이미 PDF 쪽이면 가산하지 않는다
    if "PDF쪽" in note: offset = 0   # 표가 이미 PDF 쪽이면 가산하지 않는다
    print("[%s] %s, 오프셋 %d, 단원 %d개" % (book, note, offset, len(units)))
    for name in names:
        f = sdir / (name + ".txt")
        if not f.exists(): print("  (없음: %s.txt)" % name); continue
        pages = f.read_text(encoding="utf-8").split("\f")
        for uid, (lo, hi) in units.items():
            parts, miss = [], []
            for p in range(lo, hi + 1):
                i = p + offset - 1
                if 0 <= i < len(pages): parts.append("=== p.%d ===\n%s" % (p, pages[i].strip("\n")))
                else: miss.append(p)
            (out / ("%s_%s.txt" % (uid, name))).write_text("\n\n".join(parts) + "\n", encoding="utf-8")
            print("  %s_%s.txt: p.%d–%d (%d쪽, %d자)%s" % (uid, name, lo, hi, len(parts), sum(len(x) for x in parts), "  ⚠ 범위 밖 쪽 %s" % miss if miss else ""))


if __name__ == "__main__": main()
