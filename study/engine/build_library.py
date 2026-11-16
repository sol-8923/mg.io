"""문제 은행 검사 + 책(book.json)·책장 목록(catalog.json) 생성.

사용법 (study 폴더에서):
    python engine/build_library.py                 # 모든 책 검사·생성
    python engine/build_library.py g1s2-science    # 한 책만
    python engine/build_library.py --check-only    # 검사만
    python engine/build_library.py --check-unit drafts/<책id>/<단원id>   # 검수 중인 단원 검사 (통과 기록 불필요)

폴더 구조:
    library/<책id>/meta.json                 {"grade":1,"semester":2,"subject":"과학", "color"?, "description"?, "sample"?}
    library/<책id>/<단원id>/blueprint.json   시험 설계도 (unitName, timeLimitMin, totalPoints, variantsPerSlot, slots[])
    library/<책id>/<단원id>/questions.json   문제 은행 (슬롯마다 변형 문제 여러 개)
    library/<책id>/<단원id>/slides.html      요약 정리 (있으면 연결)
오류가 하나라도 있으면 종료 코드 1, 파일을 만들지 않는다.
"""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIB = ROOT / "library"
TYPES = {"mc", "ox", "short", "essay"}
DIFFS = {"상", "중", "하"}
CIRCLED = re.compile(r"[①②③④⑤⑥⑦⑧]")
BAD_SVG = re.compile(r"<script|\son\w+\s*=|javascript:|<foreignObject|href\s*=\s*[\"']https?:", re.I)


# 과목별 배점 상한(점): 화곡중 1학년 2학기 기출의 문항별 최대 배점. 선택형=객관식, 단답형=서답형 단답·소문항, 서술형=서술·논술 한 문항.
# 국어 객관 4·서답 6 / 영어 객관 5·서술 6 / 수학 객관 6·서술 10 / 과학 객관 5·서술 10 / 사회 객관 5(서술 없음) / 도덕 객관 4·논술 20
PTS_LIMITS = {
    "국어": {"mc": 4, "short": 6, "essay": 6},
    "영어": {"mc": 5, "short": 6, "essay": 6},
    "수학": {"mc": 6, "short": 5, "essay": 10},
    "과학": {"mc": 5, "short": 5, "essay": 10},
    "사회": {"mc": 5, "short": 5, "essay": 8},
    "도덕": {"mc": 4, "short": 5, "essay": 20},
    "_default": {"mc": 5, "short": 5, "essay": 10},
}

def norm(s):
    return re.sub(r"[\s.,·・'\"‘’“”()\[\]{}~\-_/!?]", "", str(s)).lower()


def load(p):
    return json.loads(p.read_text(encoding="utf-8-sig"))


def check_svg(tag, where, svg, errors):
    if not isinstance(svg, str) or "<svg" not in svg:
        errors.append(f"{tag} {where}: svg 문자열이 아님")
    elif BAD_SVG.search(svg):
        errors.append(f"{tag} {where}: svg에 스크립트·이벤트·외부 링크가 있음 (금지)")


def check_question(q, tag, errors, warns):
    t = q.get("type")
    if t not in TYPES:
        errors.append(f"{tag} type 오류: {t!r}")
        return
    for f in ("question", "concept", "source", "detail"):
        if not str(q.get(f, "")).strip():
            errors.append(f"{tag} {f} 없음")
    if q.get("difficulty") not in DIFFS:
        errors.append(f"{tag} difficulty는 상/중/하")
    if not isinstance(q.get("points"), (int, float)) or q.get("points", 0) <= 0:
        errors.append(f"{tag} points가 양수가 아님")
    if t != "essay" and not q.get("explanation"):
        errors.append(f"{tag} explanation 없음")
    if not q.get("tip"):
        warns.append(f"{tag} tip 없음")
    # 기출 변환 문항: origin="past-exam" + pastExamRef(시험·문항 번호, 학교명 금지)
    origin = q.get("origin")
    if origin is not None and origin != "past-exam":
        errors.append(f"{tag} origin은 'past-exam'만 쓸 수 있음 (새로 만든 문항은 origin 생략)")
    if origin == "past-exam" and not str(q.get("pastExamRef", "")).strip():
        errors.append(f"{tag} 기출 변환 문항인데 pastExamRef(예: '2025-1학기-기말-07') 없음")
    if q.get("pastExamRef") and origin != "past-exam":
        errors.append(f"{tag} pastExamRef가 있는데 origin이 'past-exam'이 아님")
    if q.get("figure"):
        check_svg(tag, "figure", q["figure"].get("svg"), errors)
    refs = q.get("refs") or []
    if not refs:
        warns.append(f"{tag} refs(참고 자료) 없음")
    for i, r in enumerate(refs):
        k = r.get("kind")
        if k not in ("svg", "table", "text") or not r.get("title"):
            errors.append(f"{tag} refs[{i}] kind(svg/table/text)·title 필요")
        elif k == "svg":
            check_svg(tag, f"refs[{i}]", r.get("svg"), errors)
        elif k == "table" and (not r.get("head") or not r.get("rows") or any(len(row) != len(r["head"]) for row in r["rows"])):
            errors.append(f"{tag} refs[{i}] 표의 head/rows 칸 수가 맞지 않음")
        elif k == "text" and not r.get("text"):
            errors.append(f"{tag} refs[{i}] text 비어 있음")

    if t == "mc":
        ch = q.get("choices")
        if not isinstance(ch, list) or len(ch) < 2:
            errors.append(f"{tag} choices 2개 미만")
            return
        if len(ch) != 5:
            warns.append(f"{tag} 보기 {len(ch)}개 (내신은 보통 5지선다)")
        normed = [norm(c) for c in ch]
        if len(set(normed)) != len(normed):
            errors.append(f"{tag} 보기 중복")
        ans = q.get("answer")
        answers = ans if isinstance(ans, list) else [ans]
        if not answers or any(not isinstance(a, int) or isinstance(a, bool) or a < 1 or a > len(ch) for a in answers):
            errors.append(f"{tag} answer 범위 오류: {ans!r}")
        elif len(set(answers)) != len(answers):
            errors.append(f"{tag} answer 중복")
        ce = q.get("choiceExplanations")
        if not isinstance(ce, list) or len(ce) != len(ch) or any(not str(x).strip() for x in ce):
            errors.append(f"{tag} choiceExplanations가 보기 수만큼 있어야 함")
        if not q.get("fixedOrder"):
            texts = [q.get("detail", ""), q.get("explanation", ""), q.get("tip", "")] + list(ce or [])
            if any(CIRCLED.search(str(x)) for x in texts):
                errors.append(f"{tag} 보기가 섞이는 문항인데 해설에 ①~⑤ 번호가 있음 (보기 내용으로 가리키거나 fixedOrder:true)")
    elif t == "ox":
        if not isinstance(q.get("answer"), bool):
            errors.append(f"{tag} ox answer는 true/false")
    elif t == "short":
        ans = q.get("answer")
        answers = ans if isinstance(ans, list) else [ans]
        if not answers or any(not str(a).strip() for a in answers):
            errors.append(f"{tag} short answer 비어 있음")
        acc = {norm(a) for a in answers}
        for m in q.get("commonMistakes") or []:
            if not m.get("answer") or not m.get("why"):
                errors.append(f"{tag} commonMistakes는 answer·why 필요")
                continue
            for a in (m["answer"] if isinstance(m["answer"], list) else [m["answer"]]):
                if norm(a) in acc:
                    errors.append(f"{tag} 자주 하는 오답 '{a}'가 정답에도 있음")
        if not q.get("commonMistakes"):
            warns.append(f"{tag} commonMistakes 없음")
    elif t == "essay":
        if not q.get("modelAnswer"):
            errors.append(f"{tag} modelAnswer 없음")
        rub = q.get("rubric")
        if not isinstance(rub, list) or not rub:
            errors.append(f"{tag} rubric 없음")
        else:
            if sum(r.get("points", 0) for r in rub) != q.get("points"):
                errors.append(f"{tag} rubric 점수 합 ≠ 배점")
            if any(not r.get("criterion") for r in rub):
                errors.append(f"{tag} rubric criterion 빈 항목")
            if any(not r.get("tip") for r in rub):
                warns.append(f"{tag} rubric tip 없는 항목")


def build_book(bdir, errors, warns, info):
    meta = load(bdir / "meta.json")
    for k in ("grade", "semester", "subject"):
        if not meta.get(k):
            errors.append(f"[{bdir.name}] meta.{k} 없음")
    units, questions, ids = [], [], Counter()
    # 단원 폴더는 숫자 순서로(u2 다음에 u10이 오도록): 문자열 정렬이면 u1, u10, u11, u12, u2 … 로 꼬인다
    import re as _re
    def _unit_key(p):
        m = _re.search(r"(\d+)", p.name)
        return (int(m.group(1)) if m else 10**6, p.name)
    for udir in sorted((p for p in bdir.iterdir() if p.is_dir() and (p / "blueprint.json").exists()), key=_unit_key):
        bp = load(udir / "blueprint.json")
        qpath = udir / "questions.json"
        qs = load(qpath).get("questions", []) if qpath.exists() else []
        slots = bp.get("slots") or []
        slot_map = {s["id"]: s for s in slots}
        target = bp.get("variantsPerSlot", 2)
        tagu = f"[{bdir.name}/{udir.name}]"
        # 검수 통과 기록이 있는 단원만 사이트에 올린다 (검수 중인 단원은 drafts/ 에서 작업)
        if not CHECK_UNIT:
            st_path = udir / "review" / "status.json"
            st = load(st_path) if st_path.exists() else {}
            if st.get("verdict") != "PASS":
                errors.append(f"{tagu} 검수 통과 기록(review/status.json, verdict=PASS)이 없음 — drafts/에서 4중 검수 만장일치 후 옮길 것")
        if not bp.get("unitName"):
            errors.append(f"{tagu} blueprint.unitName 없음")
        if bp.get("totalPoints") is not None and sum(s.get("points", 0) for s in slots) != bp["totalPoints"]:
            errors.append(f"{tagu} 슬롯 배점 합 ≠ totalPoints")
        by_slot = defaultdict(list)
        seen_text = {}
        for q in qs:
            tag = f"{tagu}[{q.get('id')}]"
            ids[q.get("id")] += 1
            s = slot_map.get(q.get("slot"))
            if not s:
                errors.append(f"{tag} slot '{q.get('slot')}'이 설계도에 없음")
                continue
            for f in ("type", "difficulty", "points", "concept"):
                if s.get(f) is not None and s.get(f) != q.get(f):
                    errors.append(f"{tag} 설계도 {f}={s.get(f)!r} ≠ 문항 {q.get(f)!r}")
            check_question(q, tag, errors, warns)
            key = norm(q.get("question", "")) + norm(q.get("passage", ""))
            if key in seen_text:
                errors.append(f"{tag} 발문이 {seen_text[key]}와 같음")
            seen_text.setdefault(key, q.get("id"))
            by_slot[s["id"]].append(q)
            q = dict(q, unit=udir.name)
            questions.append(q)
        # 기출 반영 검사: 설계도 슬롯의 pastExams 목록 ↔ 문항의 pastExamRef가 서로 맞아야 한다
        past_refs = Counter(q.get("pastExamRef") for q in qs if q.get("origin") == "past-exam")
        for ref, c in past_refs.items():
            if c > 1:
                errors.append(f"{tagu} 같은 기출 {ref}이(가) 문항 {c}개로 들어감 (기출 하나 = 문항 하나, 나머지는 새 변형으로)")
        for s in slots:
            listed = s.get("pastExams") or []
            have = {q.get("pastExamRef") for q in by_slot[s["id"]] if q.get("origin") == "past-exam"}
            for ref in listed:
                if ref not in have:
                    errors.append(f"{tagu} 슬롯 {s['id']} 설계도에 기출 {ref}이(가) 배정됐는데 변환 문항이 없음")
            for ref in have - set(listed):
                errors.append(f"{tagu} 슬롯 {s['id']}의 기출 문항 {ref}이(가) 설계도 pastExams에 없음")
        if past_refs:
            info.append(f"{tagu} 기출 변환 문항 {sum(past_refs.values())}개")
        for s in slots:
            n = len(by_slot[s["id"]])
            if n == 0:
                errors.append(f"{tagu} 슬롯 {s['id']}에 문제가 없음")
            elif n < target and not all(q.get("origin") == "past-exam" for q in by_slot[s["id"]]):   # 기출 원문 슬롯은 변형 1개가 정상
                warns.append(f"{tagu} 슬롯 {s['id']} 변형 {n}개 (목표 {target}개)")
        # ── 내신 현실성 점검 (경고만, 개정안 R1·R4 — docs/내신-적합성-검토와-개정안.md) ──
        # 배점 상한은 과목별 기출(화곡중 1-2, 2023~2025)의 최대 배점에서 도출한 값 (docs/subjects/<과목>.md 0번 절). 기출 없는 과목은 기본값.
        lims = PTS_LIMITS.get(meta.get("subject"), PTS_LIMITS["_default"])
        for t_, label in (("mc", "선택형"), ("short", "단답형"), ("essay", "서술형")):
            lim = lims[t_]
            big = [x for x in slots if x.get("type") == t_ and x.get("points", 0) > lim]
            if big:
                warns.append(f"{tagu} {label} {len(big)}슬롯의 배점이 {lim}점을 넘음({meta.get('subject')} 기출 최대 배점 기준): " + ", ".join(f"{x['id']}={x['points']}점" for x in big[:4]))
        n_essay = sum(1 for x in slots if x.get("type") == "essay")
        if not meta.get("sample") and bp.get("profile") != "past-exam" and (len(slots) < 15 or n_essay < 3):   # profile=past-exam: 기출 비율(단답 위주 서답형)을 따르는 설계도는 서술형 3문항 권장 면제
            warns.append(f"{tagu} 정식 단원은 15~20슬롯, 서술형 3~5문항을 권장(현재 {len(slots)}슬롯, 서술형 {n_essay}문항)")
        mcq = [q for q in qs if q.get("type") == "mc" and not q.get("fixedOrder") and isinstance(q.get("answer"), int) and isinstance(q.get("choices"), list) and len(q["choices"]) >= 2]
        if len(mcq) >= 8:
            longest = sum(1 for q in mcq if len(str(q["choices"][q["answer"] - 1])) > max(len(str(c)) for i, c in enumerate(q["choices"]) if i != q["answer"] - 1))  # 동률은 단서가 아니므로 엄격하게 더 긴 경우만
            if longest / len(mcq) > 0.4:
                warns.append(f"{tagu} 정답이 다른 모든 보기보다 긴 선택형이 {longest}/{len(mcq)}({round(longest * 100 / len(mcq))}%)로 40% 초과 — 보기 길이로 정답이 드러남(오답을 정답과 비슷한 길이·구조로 쓸 것)")
        dc = Counter(s.get("difficulty") for s in slots)
        tc = Counter(s.get("type") for s in slots)
        info.append(f"{tagu} {bp.get('unitName')} · 시험 {len(slots)}문항/{sum(s.get('points',0) for s in slots)}점 · 은행 {len(qs)}문항 · "
                    + "유형 " + ", ".join(f"{k} {v}" for k, v in sorted(tc.items())) + " · 난이도 " + "/".join(f"{k}{dc.get(k,0)}" for k in "상중하"))
        unit = {"id": udir.name, "name": bp.get("unitName", udir.name), "timeLimitMin": bp.get("timeLimitMin", 0),
                "slots": [{k: s.get(k) for k in ("id", "type", "difficulty", "points", "concept", "avoid") if s.get(k) is not None} for s in slots]}
        _sp = udir / "review" / "status.json"
        _mode = load(_sp).get("mode") if _sp.exists() else None
        if _mode:
            unit["reviewMode"] = _mode   # 예: "reduced" = 임시 축약 검수 (개정안 R8)
        if (udir / "slides.html").exists():
            unit["slides"] = f"{udir.name}/slides.html"
        units.append(unit)
    dup = [i for i, c in ids.items() if c > 1]
    if dup:
        errors.append(f"[{bdir.name}] 중복 문항 id: {dup}")
    if not units:
        errors.append(f"[{bdir.name}] 단원이 없음")
    book = {"id": bdir.name, **{k: meta.get(k) for k in ("grade", "semester", "subject", "color", "description", "sample", "exam", "textbookUnits") if meta.get(k) is not None},
            "units": units, "questions": questions}
    return book


COVER_EXT = (".jpg", ".jpeg", ".png", ".webp")


def sync_cover(book):
    """materials/<N>학년/<M>학기/<과목>/ 안의 '표지.*'(또는 cover.*)를 library/<책id>/cover.<확장자>로 복사하고 상대 경로를 돌려준다.
    원본 교과서 표지는 저작물이라 library/*/cover.* 는 .gitignore로 올라가지 않게 해 두었다(공개 사이트에 보이려면 그 줄을 지운다)."""
    src_dir = ROOT / "materials" / f"{book.get('grade')}학년" / f"{book.get('semester')}학기" / str(book.get("subject"))
    dst_dir = LIB / book["id"]
    for old in dst_dir.glob("cover.*"):
        old.unlink()
    if not src_dir.is_dir():
        return None
    for stem in ("표지", "cover"):
        for ext in COVER_EXT:
            f = src_dir / (stem + ext)
            if f.exists():
                import shutil
                dst = dst_dir / ("cover" + ext)
                shutil.copy2(f, dst)
                if dst.stat().st_size > 800_000:
                    print(f"  ⚠ [{book['id']}] 표지 이미지가 {dst.stat().st_size // 1000}KB로 큽니다 (800KB 이하로 줄이면 앱이 빨리 열려요)")
                return f"{book['id']}/{dst.name}?v={int(dst.stat().st_mtime)}"
    # 파일 이름이 '표지'·'cover'가 아니어도(예: 서점에서 받은 해시 이름) 폴더에 이미지가 딱 하나면 그것을 표지로 쓴다
    imgs = sorted(f for f in src_dir.iterdir() if f.is_file() and f.suffix.lower() in COVER_EXT)
    if len(imgs) == 1:
        import shutil
        dst = dst_dir / ("cover" + imgs[0].suffix.lower())
        shutil.copy2(imgs[0], dst)
        if dst.stat().st_size > 800_000:
            print(f"  ⚠ [{book['id']}] 표지 이미지가 {dst.stat().st_size // 1000}KB로 큽니다 (800KB 이하로 줄이면 앱이 빨리 열려요)")
        return f"{book['id']}/{dst.name}?v={int(dst.stat().st_mtime)}"
    if len(imgs) > 1:
        print(f"  ⚠ [{book['id']}] 이미지가 {len(imgs)}개라 표지를 고를 수 없어요. 표지 파일 이름을 '표지.jpg'로 바꿔 주세요")
    return None


CHECK_UNIT = False


def check_draft_unit(path):
    """drafts/<책id>/<단원id> 하나를 검사만 한다 (검수 통과 기록 불필요)."""
    global CHECK_UNIT
    CHECK_UNIT = True
    udir = Path(path).resolve()
    bdir = udir.parent
    errors, warns, info = [], [], []
    if not (bdir / "meta.json").exists():
        errors.append(f"[{bdir.name}] meta.json 없음 (drafts/<책id>/meta.json)")
    else:
        # 해당 단원만 남긴 가상의 책으로 검사
        meta = load(bdir / "meta.json")
        class OneUnit:
            name = bdir.name
            def iterdir(self_inner):
                return [udir]
            def __truediv__(self_inner, other):
                return bdir / other
        build_book(OneUnit(), errors, warns, info)
    for line in info: print("  ·", line)
    for w in warns: print("  ⚠", w)
    for e in errors: print("  ✖", e)
    print(f"결과: {'실패' if errors else '통과'} (오류 {len(errors)}, 경고 {len(warns)})")
    sys.exit(1 if errors else 0)


def main():
    if "--check-unit" in sys.argv:
        i = sys.argv.index("--check-unit")
        return check_draft_unit(sys.argv[i + 1])
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    check_only = "--check-only" in sys.argv
    errors, warns, info = [], [], []
    bdirs = sorted(p for p in LIB.iterdir() if p.is_dir() and (p / "meta.json").exists()) if LIB.exists() else []
    if args:
        bdirs = [b for b in bdirs if b.name in args]
    books = {b.name: build_book(b, errors, warns, info) for b in bdirs}
    for line in info:
        print("  ·", line)
    for w in warns:
        print("  ⚠", w)
    for e in errors:
        print("  ✖", e)
    if errors:
        print(f"결과: 실패 (오류 {len(errors)}, 경고 {len(warns)})")
        sys.exit(1)
    print(f"결과: 통과 (경고 {len(warns)})")
    if check_only:
        return
    for bid, book in books.items():
        cv = sync_cover(book)
        if cv:
            book["cover"] = cv
        (LIB / bid / "book.json").write_text(json.dumps(book, ensure_ascii=False), encoding="utf-8")
    # 책장 목록은 항상 전체 책으로 다시 만든다
    catalog = []
    for b in sorted(p for p in LIB.iterdir() if (p / "book.json").exists()):
        bk = books.get(b.name) or load(b / "book.json")
        catalog.append({"id": bk["id"], "grade": bk.get("grade"), "semester": bk.get("semester"), "subject": bk.get("subject"),
                        "color": bk.get("color"), "cover": bk.get("cover"), "sample": bk.get("sample", False), "units": len(bk["units"]), "questions": len(bk["questions"])})
    (LIB / "catalog.json").write_text(json.dumps({"books": catalog}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"생성: 책 {len(books)}권, catalog.json (전체 {len(catalog)}권)")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
