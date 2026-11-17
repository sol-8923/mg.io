# -*- coding: utf-8 -*-
"""기계 관문(Gate): LLM 검수를 시작하기 전에 기계 점검을 한 번에 돌린다.

사용: python engine/gate.py <책id> [단원id ...] [--drafts]
  단원 폴더(기본 library/<책>/<단원>, --drafts면 drafts/<책>/<단원>)마다
    ① build_library.py --check-unit   ② precheck_unit.py (쪽 범위는 drafts/<책>/units.md, --src 교과서·교사용 교과서)
    ③ b_scan.py --book --unit (--drafts면 --root drafts)   ④ 슬라이드가 있으면 slide_integrity
  단원마다 ✖/⚠/플래그 건수 표를 출력한다. 단원 id를 생략하면 책 전체.
종료 코드: ✖·b_scan 플래그·슬라이드 무결성 오류가 하나라도 있으면 1, ⚠만 있으면 0.
  (--drafts가 아닌 library 단원은 precheck가 drafts 경로만 읽으므로, 같은 단원 폴더를 임시로 가리키도록 실행 시에만 경로를 바꿔 돌린다.)
"""
import json, re, subprocess, sys, os
from pathlib import Path
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass
ENG = Path(__file__).resolve().parent
ROOT = ENG.parent
sys.path.insert(0, str(ENG))
import slide_integrity, split_src

ENV = dict(os.environ, PYTHONIOENCODING="utf-8")
PRE_DRIVER = r'''
import sys
P, UDIR, rest = sys.argv[1], sys.argv[2], sys.argv[3:]
src = open(P, encoding="utf-8").read()
old = 'D = ROOT / "drafts" / a.book / a.unit'
assert old in src, "precheck_unit.py의 D 경로 줄을 찾지 못함"
from pathlib import Path
src = src.replace(old, 'D = Path(%r)' % UDIR)
sys.argv = [P] + rest
exec(compile(src, P, "exec"), {"__file__": P, "__name__": "__main__"})
'''


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, env=ENV, cwd=str(ROOT))
    return r.returncode, (r.stdout.decode("utf-8", "replace") + r.stderr.decode("utf-8", "replace"))


def num(rx, text, default=0):
    m = re.search(rx, text)
    return int(m.group(1)) if m else default


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    drafts = "--drafts" in sys.argv
    if not args: sys.exit("사용: python engine/gate.py <책id> [단원id ...] [--drafts]")
    book, units = args[0], args[1:]
    base = ROOT / ("drafts" if drafts else "library") / book
    if not base.is_dir(): sys.exit("없음: %s" % base)
    if not units:
        units = sorted((p.name for p in base.iterdir() if p.is_dir() and (p / "questions.json").exists()),
                       key=lambda s: (len(s), s))
    pages, offset, note = split_src.parse_units(book)
    if not pages: print("안내: 쪽 범위를 읽지 못해 precheck를 쪽 범위 없이 실행합니다 (%s)" % note)
    rows, details, bad_units = [], [], []
    for u in units:
        udir = base / u
        if not (udir / "questions.json").exists():
            rows.append((u, "-", "-", "-", "-", "단원 폴더 없음")); bad_units.append(u); continue
        # ① build --check-unit
        rc1, o1 = run([sys.executable, str(ENG / "build_library.py"), "--check-unit", str(udir)])
        e1, w1 = num(r"오류 (\d+)", o1), num(r"경고 (\d+)", o1)
        if rc1 and not e1: e1 = 1
        # ② precheck
        cmd_tail = [book, u, "--src", "교과서.txt", "교사용 교과서.txt", "--offset", str(offset)]
        if u in pages: cmd_tail += ["--pages", "%d-%d" % pages[u]]
        if drafts: rc2, o2 = run([sys.executable, str(ENG / "precheck_unit.py")] + cmd_tail)
        else: rc2, o2 = run([sys.executable, str(ENG / "precheck_unit.py")] + cmd_tail + ["--root", "library"])
        e2, w2 = num(r"✖ (\d+)건", o2), num(r"⚠ (\d+)건", o2)
        if rc2 and not e2: e2 = 1   # 실행 자체가 실패한 경우도 오류로 센다
        # 허용 목록: <단원>/review/gate-waivers.json = [{"match": "✖ 줄에 들어 있는 문자열", "reason": "…"}] — 사유를 적은 것만 오류에서 뺀다
        wf = udir / "review" / "gate-waivers.json"
        if wf.exists() and e2:
            try:
                wv = json.loads(wf.read_text(encoding="utf-8"))
                waived = [l for l in o2.splitlines() if l.lstrip().startswith("✖") and any(w.get("match") and w.get("reason") and w["match"] in l for w in wv)]
                if waived:
                    e2 = max(0, e2 - len(waived))
                    rc2 = 0 if not e2 else rc2
                    o2 += "\n(허용 목록으로 제외한 ✖ %d건)" % len(waived)
            except Exception as ex:
                o2 += "\n허용 목록을 읽지 못함: %s" % ex
        # ③ b_scan
        cmd3 = [sys.executable, str(ENG / "b_scan.py"), "--book", book, "--unit", u] + (["--root", "drafts"] if drafts else [])
        rc3, o3 = run(cmd3)
        f3 = num(r"합계 문항: (\d+)", o3, 1 if rc3 else 0)
        # ④ 슬라이드
        if (udir / "slides.html").exists():
            se = slide_integrity.check_file(udir / "slides.html"); s4 = str(len(se))
        else: se, s4 = [], "-"
        bad = e1 or e2 or f3 or se
        if bad: bad_units.append(u)
        rows.append((u, "%d/%d" % (e1, w1), "%d/%d" % (e2, w2), str(f3), s4, "1(실패)" if bad else "0(통과)"))
        for tag, o, rc in (("check-unit", o1, rc1), ("precheck", o2, rc2), ("b_scan", o3, rc3)):
            lines = [l for l in o.splitlines() if "✖" in l or (tag == "b_scan" and (l.startswith("  ") or l.startswith("항목별"))) ]
            if rc and tag != "b_scan" and "결과:" not in o: lines = ["✖ 스크립트가 중간에 중단됨(종료 %d): %s" % (rc, " | ".join(o.strip().splitlines()[-2:]))]
            if lines and (rc or tag == "b_scan" and f3): details.append((u, tag, lines))
        for m in se: details.append((u, "slide", ["✖ " + m]))
    hdr = ("단원", "build ✖/⚠", "precheck ✖/⚠", "b_scan 플래그", "슬라이드 ✖", "종료")
    print("\n기계 관문 결과 — %s (%s)" % (book, "drafts" if drafts else "library"))
    w = [max(len(str(r[i])) for r in rows + [hdr]) for i in range(6)]
    for r in [hdr] + rows: print("  " + "  ".join(str(c).ljust(w[i]) for i, c in enumerate(r)))
    for u, tag, lines in details:
        print("\n[%s / %s]" % (u, tag))
        for l in lines[:15]: print("  " + l)
        if len(lines) > 15: print("  … 외 %d줄" % (len(lines) - 15))
    print("\n종합: %s" % ("실패 — 고칠 것이 있는 단원: " + ", ".join(bad_units) if bad_units else "통과 (⚠는 검수자 참고용)"))
    sys.exit(1 if bad_units else 0)


if __name__ == "__main__": main()
