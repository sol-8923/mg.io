# -*- coding: utf-8 -*-
"""단원별 진행 상태 기록·조회: drafts/<책>/STATE.json (개선 제안 6).

사용:
  python engine/pipeline_state.py <책id> init [--dry-run]
  python engine/pipeline_state.py <책id> show
  python engine/pipeline_state.py <책id> set <단원> <단계> [--round N] [--pending a,b] [--changed N]
                                   [--a-grade] [--slides 상태] [--note 텍스트]
  python engine/pipeline_state.py <책id> next

단계: notes, blueprint, quiz, explain, made(출제·풀이 끝), gate, review, fix, pass, moved, done
검수자 이름(--pending): content, overall, explanation (빈 문자열 ''이면 대기 없음)
"""
import argparse, json, re, sys
from pathlib import Path
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8")
    except Exception: pass

ROOT = Path(__file__).resolve().parent.parent
STAGES = ["notes", "blueprint", "quiz", "explain", "made", "gate", "review", "fix", "pass", "moved", "done"]
REVIEWERS = ["content", "overall", "explanation"]
SLIDES = ["none", "todo", "done"]


def unit_key(u):
    m = re.match(r"u(\d+)$", u)
    return (0, int(m.group(1))) if m else (1, u)


def units_from_md(path):
    if not path.exists(): return []
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"\|\s*(u\d+)\s*\|", line)
        if m: out.append(m.group(1))
    return out


def lib_pass(book, u):
    p = ROOT / "library" / book / u / "review" / "status.json"
    if not p.exists(): return None
    try: d = json.loads(p.read_text(encoding="utf-8"))
    except Exception: return None
    return d if d.get("verdict") == "PASS" else None


def discover(book):
    found = set(units_from_md(ROOT / "drafts" / book / "units.md"))
    for base in (ROOT / "drafts" / book, ROOT / "library" / book):
        if base.is_dir():
            found |= {p.name for p in base.iterdir() if p.is_dir() and re.fullmatch(r"u\d+", p.name)}
    return sorted(found, key=unit_key)


def infer_stage(book, u):
    d = ROOT / "drafts" / book / u
    if (d / "questions.json").exists(): return "made", "questions.json 있음(풀이 완료 여부는 확인 필요)"
    if (d / "blueprint.json").exists(): return "blueprint", ""
    if (d / "notes.md").exists(): return "notes", ""
    return "notes", "자료 없음(시작 전)"


def new_entry(book, u):
    p = lib_pass(book, u)
    if p:
        return {"stage": "done", "round": p.get("round", 0), "pending": [], "changed": 0,
                "a_grade": False, "slides": "none", "note": "library PASS"}
    st, note = infer_stage(book, u)
    return {"stage": st, "round": 0, "pending": [], "changed": 0, "a_grade": False,
            "slides": "none", "note": note}


def state_path(book): return ROOT / "drafts" / book / "STATE.json"


def load(book):
    p = state_path(book)
    if not p.exists(): sys.exit(f"STATE.json이 없습니다: {p}\n먼저 init을 실행하세요.")
    return json.loads(p.read_text(encoding="utf-8"))


def save(book, state):
    state_path(book).write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def table(state):
    rows = [("단원", "단계", "라운드", "대기 검수자", "바뀐 문항", "A급", "슬라이드", "메모")]
    for u in sorted(state["units"], key=unit_key):
        e = state["units"][u]
        rows.append((u, e["stage"], str(e["round"]), ",".join(e["pending"]) or "-", str(e["changed"]),
                     "예" if e["a_grade"] else "-", e.get("slides", "none"), e.get("note", "")))
    def w(s): return sum(2 if ord(c) > 0x2E80 else 1 for c in s)
    widths = [max(w(r[i]) for r in rows) for i in range(len(rows[0]) - 1)]
    for r in rows:
        print("  ".join(c + " " * (widths[i] - w(c)) for i, c in enumerate(r[:-1])) + "  " + r[-1])


def suggest(book, u, e):
    st, rnd, pend = e["stage"], e["round"], e["pending"]
    if st == "done":
        return None
    if st == "notes": return "blueprint(설계도) 작성: exam-designer 호출"
    if st == "blueprint": return "선택형 출제(study-quiz) -> avoid_motifs.py 출력으로 서술형 설계"
    if st == "quiz": return "오답풀이 작성(study-explain)"
    if st == "explain": return "출제·풀이 완료 처리 후 gate 실행: set %s gate" % u
    if st in ("made", "gate"):
        return f"gate 실행(python engine/gate.py {book} {u} --drafts) -> 종료 코드 0이면 검수 1라운드(내용+해설·종합 2명)"
    if st in ("review", "fix") and pend:
        who = ",".join(pend)
        pre = "수정 반영 후 " if st == "fix" else ""
        return (f"{pre}반려한 검수자만 재검수: {who} (라운드 {rnd + 1}, "
                f"review_diff.py {book} {u} --diff 의 바뀐 문항만)")
    if st == "fix": return "수정 끝나면 set %s review --pending <반려한 검수자>" % u
    if st == "review":
        if rnd < 1: return "검수 1라운드 실행(내용+해설·종합 2명, 책 단위 일괄)"
        if e["a_grade"]: return "A급 이력 있음: 4명 최종 확인(내용·해설·종합·형식 눈검사) 후 통과면 set %s pass" % u
        return "검수자 전원 통과 확인 -> set %s pass" % u
    if st == "pass": return f"library로 옮기기(drafts->library, review/status.json PASS 기록) 후 set {u} moved"
    if st == "moved": return f"build_library.py {book} 실행·확인 후 set {u} done"
    return "?"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("book")
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("init"); a.add_argument("--dry-run", action="store_true")
    sub.add_parser("show"); sub.add_parser("next")
    s = sub.add_parser("set")
    s.add_argument("unit"); s.add_argument("stage", choices=STAGES)
    s.add_argument("--round", type=int); s.add_argument("--pending"); s.add_argument("--changed", type=int)
    s.add_argument("--a-grade", action="store_true"); s.add_argument("--slides", choices=SLIDES)
    s.add_argument("--note")
    args = ap.parse_args()
    book = args.book

    if args.cmd == "init":
        units = discover(book)
        if not units: sys.exit("단원을 찾지 못했습니다(units.md·drafts·library 확인).")
        p = state_path(book)
        state = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {"book": book, "units": {}}
        added = [u for u in units if u not in state["units"]]
        for u in added: state["units"][u] = new_entry(book, u)
        print(f"{book}: 단원 {len(units)}개, 새로 추가 {len(added)}개 (기존 항목은 유지)")
        table(state)
        if args.dry_run: print("\n[dry-run] 파일을 쓰지 않았습니다.")
        else:
            if not p.parent.is_dir(): sys.exit(f"폴더 없음: {p.parent}")
            save(book, state); print(f"\n저장: {p}")
        return

    state = load(book)
    if args.cmd == "show":
        table(state)
    elif args.cmd == "set":
        e = state["units"].get(args.unit)
        if e is None: sys.exit(f"STATE에 없는 단원: {args.unit} (있는 단원: {', '.join(sorted(state['units'], key=unit_key))})")
        e["stage"] = args.stage
        if args.round is not None: e["round"] = args.round
        if args.pending is not None:
            pend = [x for x in args.pending.split(",") if x]
            bad = [x for x in pend if x not in REVIEWERS]
            if bad: sys.exit(f"알 수 없는 검수자: {bad} (가능: {','.join(REVIEWERS)})")
            e["pending"] = pend
        elif args.stage in ("pass", "moved", "done"): e["pending"] = []
        if args.changed is not None: e["changed"] = args.changed
        if args.a_grade: e["a_grade"] = True
        if args.slides: e["slides"] = args.slides
        if args.note is not None: e["note"] = args.note
        save(book, state)
        print(f"{args.unit}: {e['stage']} / 라운드 {e['round']} / 대기 {','.join(e['pending']) or '-'}")
    elif args.cmd == "next":
        todo = 0
        for u in sorted(state["units"], key=unit_key):
            e = state["units"][u]
            m = suggest(book, u, e)
            if m is None:
                if e.get("slides") == "todo": print(f"{u}: 슬라이드 제작 대기(책 전체 완성 후 한꺼번에)")
                continue
            todo += 1; print(f"{u}: {m}")
        if not todo: print("할 일 없음(모든 단원 done)")


if __name__ == "__main__":
    main()
