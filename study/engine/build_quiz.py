"""문제 데이터(questions.json)를 검사하고 시험 엔진에 넣어 quiz.html을 만든다.

사용법:
    python engine/build_quiz.py output/<과목>/<단원>/questions.json
    python engine/build_quiz.py <questions.json> --check-only   # 검사만 (HTML 생성 안 함)

같은 폴더에 blueprint.json(시험 설계도)이 있으면 설계도와 실제 구성을 비교한다.
오류가 하나라도 있으면 종료 코드 1로 끝나고 HTML을 만들지 않는다.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ENGINE = Path(__file__).resolve().parent / "quiz-template.html"
TYPES = {"mc", "ox", "short", "essay"}
DIFFS = {"상", "중", "하"}


def norm(s):
    return re.sub(r"[\s.,·・'\"‘’“”()\[\]{}~\-_/!?]", "", str(s)).lower()


def check(data, blueprint=None):
    errors, warns, info = [], [], []
    meta = data.get("meta") or {}
    qs = data.get("questions")
    if not isinstance(qs, list) or not qs:
        return ["questions 배열이 없거나 비어 있음"], warns, info

    for key in ("title", "subject", "grade"):
        if not meta.get(key):
            errors.append(f"meta.{key} 없음")

    ids = [q.get("id") for q in qs]
    dup_ids = [i for i, c in Counter(ids).items() if c > 1]
    if dup_ids:
        errors.append(f"중복된 문항 id: {dup_ids}")

    seen_q = {}
    mc_answer_pos = Counter()
    for n, q in enumerate(qs, 1):
        tag = f"[{n}번 id={q.get('id')}]"
        t = q.get("type")
        if t not in TYPES:
            errors.append(f"{tag} type이 잘못됨: {t!r} (mc/ox/short/essay)")
            continue
        if not str(q.get("question", "")).strip():
            errors.append(f"{tag} question(발문) 없음")
        if q.get("difficulty") not in DIFFS:
            errors.append(f"{tag} difficulty는 상/중/하 중 하나여야 함: {q.get('difficulty')!r}")
        if not isinstance(q.get("points"), (int, float)) or q.get("points", 0) <= 0:
            errors.append(f"{tag} points(배점)가 양수가 아님")
        if not q.get("concept"):
            errors.append(f"{tag} concept(개념) 없음")
        if not q.get("source"):
            errors.append(f"{tag} source(출처 쪽수) 없음")
        if t != "essay" and not q.get("explanation"):
            errors.append(f"{tag} explanation(해설) 없음")
        # 상세 오답풀이용 항목
        if not str(q.get("detail", "")).strip():
            errors.append(f"{tag} detail(상세 정답 풀이) 없음")
        if not str(q.get("tip", "")).strip():
            warns.append(f"{tag} tip(기억할 점) 없음")
        if t == "mc":
            ce = q.get("choiceExplanations")
            if not isinstance(ce, list):
                errors.append(f"{tag} choiceExplanations(보기별 해설) 없음")
            elif isinstance(q.get("choices"), list) and len(ce) != len(q["choices"]):
                errors.append(f"{tag} 보기별 해설 {len(ce)}개 ≠ 보기 {len(q['choices'])}개")
            elif any(not str(x).strip() for x in ce):
                errors.append(f"{tag} 비어 있는 보기별 해설이 있음")
        if t == "short":
            cm = q.get("commonMistakes")
            if cm is None:
                warns.append(f"{tag} commonMistakes(자주 하는 오답) 없음")
            elif not isinstance(cm, list) or any(not m.get("answer") or not m.get("why") for m in cm):
                errors.append(f"{tag} commonMistakes 항목은 answer와 why가 모두 있어야 함")
            else:
                acc = {norm(a) for a in (q.get("answer") if isinstance(q.get("answer"), list) else [q.get("answer")])}
                for m in cm:
                    for a in (m["answer"] if isinstance(m["answer"], list) else [m["answer"]]):
                        if norm(a) in acc:
                            errors.append(f"{tag} 자주 하는 오답 '{a}'가 정답 목록에도 있음")
        if t == "essay" and isinstance(q.get("rubric"), list):
            if any(not r.get("tip") for r in q["rubric"]):
                warns.append(f"{tag} 채점 기준에 tip(빠졌을 때 보완 방법)이 없는 항목이 있음")

        key = norm(q.get("question", "")) + norm(q.get("passage", ""))
        if key in seen_q:
            errors.append(f"{tag} 발문이 {seen_q[key]}번과 똑같음")
        seen_q.setdefault(key, n)

        if t == "mc":
            ch = q.get("choices")
            if not isinstance(ch, list) or len(ch) < 2:
                errors.append(f"{tag} choices(보기)가 2개 미만")
                continue
            if len(ch) != 5:
                warns.append(f"{tag} 보기가 {len(ch)}개 (내신 선택형은 보통 5지선다)")
            normed = [norm(c) for c in ch]
            dups = [c for c, k in Counter(normed).items() if k > 1]
            if dups:
                errors.append(f"{tag} 보기 중복: {[ch[normed.index(d)] for d in dups]}")
            if any(not str(c).strip() for c in ch):
                errors.append(f"{tag} 빈 보기가 있음")
            ans = q.get("answer")
            answers = ans if isinstance(ans, list) else [ans]
            if not answers or any(not isinstance(a, int) or isinstance(a, bool) for a in answers):
                errors.append(f"{tag} mc answer는 1부터 시작하는 보기 번호(정수) 또는 그 배열이어야 함: {ans!r}")
                continue
            if any(a < 1 or a > len(ch) for a in answers):
                errors.append(f"{tag} 정답 번호가 보기 범위를 벗어남: {ans!r}")
            if len(set(answers)) != len(answers):
                errors.append(f"{tag} 정답 번호 중복: {ans!r}")
            if isinstance(ans, list) and len(ans) == 1:
                warns.append(f"{tag} 정답이 1개인데 배열로 적음 (복수 정답 문항으로 표시됨)")
            if not isinstance(ans, list):
                mc_answer_pos[ans] += 1
        elif t == "ox":
            if not isinstance(q.get("answer"), bool):
                errors.append(f"{tag} ox answer는 true/false여야 함")
        elif t == "short":
            ans = q.get("answer")
            answers = ans if isinstance(ans, list) else [ans]
            if not answers or any(not str(a).strip() for a in answers):
                errors.append(f"{tag} short answer(정답)가 비어 있음")
            elif len({norm(a) for a in answers}) != len(answers):
                warns.append(f"{tag} 인정 답안 중 사실상 같은 것이 있음: {answers}")
        elif t == "essay":
            if not q.get("modelAnswer"):
                errors.append(f"{tag} essay modelAnswer(모범 답안) 없음")
            rub = q.get("rubric")
            if not isinstance(rub, list) or not rub:
                errors.append(f"{tag} essay rubric(채점 기준) 없음")
            else:
                s = sum(r.get("points", 0) for r in rub)
                if s != q.get("points"):
                    errors.append(f"{tag} 채점 기준 점수 합({s})이 배점({q.get('points')})과 다름")
                if any(not r.get("criterion") for r in rub):
                    errors.append(f"{tag} 채점 기준 문장이 빈 항목이 있음")

    total = sum(q.get("points", 0) for q in qs if isinstance(q.get("points"), (int, float)))
    if meta.get("totalPoints") is not None and total != meta["totalPoints"]:
        errors.append(f"배점 합계 {total}점 ≠ meta.totalPoints {meta['totalPoints']}점")

    # 구성 요약
    tc = Counter(q.get("type") for q in qs)
    dc = Counter(q.get("difficulty") for q in qs)
    info.append(f"문항 {len(qs)}개 / 총점 {total}점")
    info.append("유형: " + ", ".join(f"{k} {v}" for k, v in sorted(tc.items())))
    info.append("난이도: " + ", ".join(f"{k} {dc.get(k, 0)}" for k in ("상", "중", "하")))
    if mc_answer_pos:
        info.append("선택형 정답 위치: " + ", ".join(f"{k}번 {mc_answer_pos.get(k, 0)}" for k in range(1, 6)))
        n_mc = sum(mc_answer_pos.values())
        if n_mc >= 5:
            top, cnt = mc_answer_pos.most_common(1)[0]
            if cnt / n_mc > 0.4:
                warns.append(f"선택형 정답이 {top}번에 몰림 ({cnt}/{n_mc})")
            missing = [k for k in range(1, 6) if mc_answer_pos.get(k, 0) == 0]
            if n_mc >= 10 and missing:
                warns.append(f"선택형 정답에 한 번도 안 나온 번호: {missing}")

    # 설계도 비교
    if blueprint:
        bp_n = blueprint.get("totalQuestions")
        if bp_n is not None and bp_n != len(qs):
            errors.append(f"설계도 문항 수 {bp_n} ≠ 실제 {len(qs)}")
        bp_pts = blueprint.get("totalPoints")
        if bp_pts is not None and bp_pts != total:
            errors.append(f"설계도 총점 {bp_pts} ≠ 실제 {total}")
        for k, v in (blueprint.get("types") or {}).items():
            if tc.get(k, 0) != v:
                errors.append(f"설계도 유형 {k} {v}개 ≠ 실제 {tc.get(k, 0)}개")
        for k, v in (blueprint.get("difficulty") or {}).items():
            if dc.get(k, 0) != v:
                errors.append(f"설계도 난이도 {k} {v}개 ≠ 실제 {dc.get(k, 0)}개")
        bp_ids = {s.get("id") for s in blueprint.get("slots") or []}
        if bp_ids:
            q_ids = set(ids)
            if bp_ids - q_ids:
                errors.append(f"설계도에 있지만 출제 안 된 슬롯: {sorted(bp_ids - q_ids)}")
            if q_ids - bp_ids:
                errors.append(f"설계도에 없는 문항: {sorted(q_ids - bp_ids)}")
            slot = {s.get("id"): s for s in blueprint.get("slots")}
            for q in qs:
                s = slot.get(q.get("id"))
                if not s:
                    continue
                for f in ("type", "difficulty", "points"):
                    if s.get(f) is not None and s.get(f) != q.get(f):
                        errors.append(f"[id={q.get('id')}] 설계도 {f}={s.get(f)!r} ≠ 문항 {q.get(f)!r}")
    return errors, warns, info


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        sys.exit(2)
    src = Path(args[0])
    data = json.loads(src.read_text(encoding="utf-8-sig"))
    bp_path = src.with_name("blueprint.json")
    blueprint = json.loads(bp_path.read_text(encoding="utf-8-sig")) if bp_path.exists() else None

    errors, warns, info = check(data, blueprint)
    print(f"== {src}")
    for line in info:
        print("  ·", line)
    for w in warns:
        print("  ⚠ 경고:", w)
    for e in errors:
        print("  ✖ 오류:", e)
    if errors:
        print(f"결과: 실패 (오류 {len(errors)}개, 경고 {len(warns)}개)")
        sys.exit(1)
    print(f"결과: 통과 (경고 {len(warns)}개)")

    if "--check-only" in sys.argv:
        return
    # 같은 폴더에 요약 발표 자료가 있으면 오답풀이에서 링크한다
    if src.with_name("slides.html").exists():
        data.setdefault("meta", {})["slidesHref"] = "slides.html"
    payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    html = ENGINE.read_text(encoding="utf-8").replace("/*__QUIZ_DATA__*/", payload, 1)
    out = src.with_name("quiz.html")
    out.write_text(html, encoding="utf-8")
    print(f"생성: {out}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
