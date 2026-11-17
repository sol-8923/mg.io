#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""빠짐없음(커버리지) 측정 도구 — 개선 제안서 제안 7.

notes.md 에서 '개념 후보'를 뽑아 문항(questions.json)과 슬라이드(slides.html)에
각각 나오는지 확인한다. 참고용 도구라 종료 코드는 항상 0.

사용법:
  python engine/coverage_check.py <책id> [단원id ...] [--root library|drafts] [--json 파일]
"""
import sys, os, re, json, glob, html, unicodedata

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---- 불용어(개념이 되기엔 너무 일반적인 말) ----
STOP = set("""
의미 내용 조건 방법 사례 예 예시 특징 이유 결과 원인 관계 역할 종류 정의 개념 구분 항목 비교 정리 요약 기준 중요 문제 상황
목적 성격 모습 자료 활동 단원 사람 우리 생각 질문 탐구 시험 포인트 시대 사회 하나 가지 이상 이하 이후 이전 때문 경우
해결 상태 일정 서술 분리 분류 구분 확립 방법 논술형 논술 서술형 기출 확장 도입 특집 그림 표 사진 도표 그래프 지도 만화 본문 출처 참고 주의 핵심 기본 일반 전체 부분 과정 방향 변화 관점 입장 차이 공통 장점 단점
""".split())
SECTION_SKIP = re.compile(r"불일치|대조 못|출처|근거|참고|차례")
META_RE = re.compile(r"기출|논술|〈|<|보기|소거|이 단원|범위|특집|도입|활동$|한다$|으로 자주|에 나옴|에 나온|사례에|연결|적용|^위 |^이 ")
PAGE_RE = re.compile(r"^[pP]?\.?\s*\d|쪽|^\d+$|^[×○O\-–—~]+$")
PARTICLES = ("에서는", "으로는", "에서", "으로", "에게", "이다", "이란", "라는", "이며", "으며", "하는", "한",
             "은", "는", "이", "가", "을", "를", "의", "에", "와", "과", "로", "도", "만", "인", "란")


def norm(s):
    s = unicodedata.normalize("NFC", s)
    return re.sub(r"[\s\W_]+", "", s)


def clean_text(s):
    s = re.sub(r"\[[pP][^\]]*\]", "", s)          # [p52] 쪽 표기
    s = re.sub(r"\([^)]*\)", "", s)               # 괄호 설명
    s = re.sub(r"[`*]", "", s)
    return s.strip(" \t:：-·,.;")


def stem(tok):
    for p in PARTICLES:
        if tok.endswith(p) and len(tok) - len(p) >= 2:
            return tok[: -len(p)]
    return tok


def acceptable(c):
    n = norm(c)
    if len(n) < 2 or len(n) > 22:
        return False
    if PAGE_RE.search(c.strip()) or META_RE.search(c):
        return False
    if re.fullmatch(r"[\d\W]*", n):
        return False
    if n in STOP:
        return False
    # 불용어로만 이루어진 경우 제외
    toks = [t for t in re.split(r"\s+", c.strip()) if t]
    if toks and all(stem(t) in STOP or norm(stem(t)) in STOP for t in toks):
        return False
    return True


def extract_concepts(md):
    """notes.md → [개념 문자열] (순서 유지, 정규화 기준 중복 제거)."""
    out, seen = [], set()

    def add(c):
        c = clean_text(c)
        # 문장형 개념 정리: '=' / ',' 양쪽, 'A와 B를 구분', 주어(은/는/이/가) 앞까지, 긴 '·' 나열
        c = re.sub(r"\s*(\d+|[두세네다여일])\s*(가지|종|요소|원칙|단계|유형|관점|특징|형태|개)(과|와)?", "", c).strip()
        c = re.sub(r"\s+[와과]\s*$", "", c)
        if re.search(r"[=,/.]", c):
            for x in re.split(r"=|,|/|\.\s*", c):
                add(x)
            return
        if re.search(r"(구분|비교|설명|이해|분리)$", c) and len(c.split()) >= 3:
            c = re.sub(r"\s*(구분|비교|설명|이해|분리)$", "", c)
            c = re.sub(r"(?<=[을를])$", "", c)
            for x in re.split(r"(?<=\S)[과와]\s+", c):
                add(re.sub(r"[을를]$", "", x))
            return
        toks = c.split()
        VERBISH = re.compile(r"(하는|되는|있는|없는|같은|하지|되지|하고|하며|이자|이며|으며|없|않|못|상관없)$")
        if len(toks) >= 2:
            for k, t in enumerate(toks[:-1]):
                if len(t) >= 3 and t[-1] in "은는이가" and not VERBISH.search(t):
                    c = " ".join(toks[:k]) + (" " if k else "") + t[:-1]
                    if len(c.split()) > 3:
                        return
                    break
        # 끝에 붙은 조사 제거(자기정당화의 → 자기정당화)
        lt = c.split()[-1] if c.split() else ""
        if (len(lt) >= 4 and lt[-1] in "의은는을를이가와과") or (len(lt) == 3 and lt[-1] == "의"):
            c = c[:-1]
        if len(c.split()) > 4 or re.search(r"(중에|일어나|에서|에는)$", c):
            return
        # '분류/구분' 따위로 끝나는 두 어절 이하 항목은 개념이 아님
        if len(c.split()) <= 2 and re.search(r"\s(구분|분류|서술|분리|비교|확립 방법)$", c):
            return
        if VERBISH.search(c.split()[-1] if c.split() else "") or re.search(r"(하|되|이자)$", c):
            return
        if "·" in c and len(norm(c)) > 10:
            for x in c.split("·"):
                add(x)
            return
        if c and acceptable(c):
            k = norm(c)
            if k not in seen:
                seen.add(k)
                out.append(c)

    section = ""
    skip = False
    in_points = False
    for line in md.splitlines():
        m = re.match(r"^(#{1,6})\s*(.*)", line)
        if m:
            section = m.group(2)
            skip = bool(SECTION_SKIP.search(section))
            in_points = bool(re.search(r"시험 포인트|꼭 외울", section))
            continue
        if skip or line.lstrip().startswith(">"):
            continue
        s = line.strip()
        # 표: 첫 열(머리글·구분선 제외)
        if s.startswith("|"):
            cells = [x.strip() for x in s.strip("|").split("|")]
            if cells and not re.fullmatch(r"[-: ]+", cells[0]) and not _is_header_cache(line, md):
                add(cells[0])
            for b in re.findall(r"\*\*(.+?)\*\*", s):
                add(b)
            continue
        # 굵은 글씨
        for b in re.findall(r"\*\*(.+?)\*\*", s):
            add(b)
        # 시험 포인트 항목
        if in_points and re.match(r"^(\d+[.)]|[-*])\s+", s):
            item = re.sub(r"^(\d+[.)]|[-*])\s+", "", s)
            item = re.sub(r"\*\*", "", item)
            item = re.sub(r"\[[pP][^\]]*\]", "", item)
            item = re.sub(r"\([^)]*\)", "", item)
            parts = re.split(r"\s+—\s+|\s+[-–]\s+|:", item, maxsplit=1)
            head = parts[0]
            if len(norm(head)) <= 14:
                add(head)
            if len(parts) > 1:
                for seg in re.split(r"\s*/\s*|[,，]\s*|\.\s+|\.$|=", parts[1]):
                    seg = seg.strip()
                    if 2 <= len(norm(seg)) <= 10 and not re.search(r"(음|함|다|요|됨|님|임|멂|짐|줌)$", seg):
                        add(seg)
    return out


_HEADER_LINES = {}


def _is_header_cache(line, md):
    """표의 머리글 행인지(바로 다음 줄이 |---|)."""
    if md not in _HEADER_LINES:
        lines = md.splitlines()
        hs = set()
        for i in range(len(lines) - 1):
            if lines[i].strip().startswith("|") and re.fullmatch(r"[|\-: ]+", lines[i + 1].strip()):
                hs.add(lines[i])
        _HEADER_LINES.clear()
        _HEADER_LINES[md] = hs
    return line in _HEADER_LINES[md]


# ---- 문항 텍스트 ----
def flat(v):
    if v is None:
        return ""
    if isinstance(v, str):
        return v
    if isinstance(v, (int, float)):
        return ""
    if isinstance(v, list):
        return " ".join(flat(x) for x in v)
    if isinstance(v, dict):
        return " ".join(flat(x) for x in v.values())
    return ""


def question_texts(q):
    """(정답·보기 계열 텍스트, 해설 계열 텍스트)."""
    main = [q.get("question"), q.get("passage"), q.get("passageTitle"), q.get("choices"),
            q.get("modelAnswer"), q.get("answerHint"), q.get("answerText")]
    # 서술형 채점 기준의 기준문(정답 요소)도 정답 쪽으로
    if isinstance(q.get("rubric"), list):
        main.append([r.get("criterion", "") for r in q["rubric"] if isinstance(r, dict)])
    ans = q.get("answer")
    if isinstance(ans, str):
        main.append(ans)
    expl = [q.get("explanation"), q.get("choiceExplanations"), q.get("detail"), q.get("tip"), q.get("refs")]
    if isinstance(q.get("rubric"), list):
        expl.append([{k: v for k, v in r.items() if k != "criterion"} for r in q["rubric"] if isinstance(r, dict)])
    return flat(main), flat(expl)


def slide_text(path):
    h = open(path, encoding="utf-8", errors="replace").read()
    h = re.sub(r"(?is)<(script|style)\b.*?</\1>", " ", h)
    h = re.sub(r"(?s)<!--.*?-->", " ", h)
    h = re.sub(r"<[^>]+>", " ", h)
    return html.unescape(h)


# ---- 매칭 ----
def make_matcher(concept):
    """공백 무시·조사 무시 부분일치 판정 함수."""
    n = norm(concept)
    toks = [stem(t) for t in re.split(r"\s+", clean_text(concept)) if t]
    toks = [norm(t) for t in toks if norm(t)]
    pat = None
    if len(toks) >= 2:
        # 어절 사이에 조사 등 최대 3자 허용
        pat = re.compile(r".{0,3}".join(re.escape(t) for t in toks))

    def match(hay_norm):
        if n in hay_norm:
            return True
        return bool(pat and pat.search(hay_norm))

    return match


def analyze_unit(udir):
    notes = os.path.join(udir, "notes.md")
    qpath = os.path.join(udir, "questions.json")
    spath = os.path.join(udir, "slides.html")
    res = {"unit": os.path.basename(udir), "missing": []}
    if not os.path.exists(notes):
        res["missing"].append("notes.md")
        return res
    concepts = extract_concepts(open(notes, encoding="utf-8").read())
    main_t, expl_t = "", ""
    nq = 0
    if os.path.exists(qpath):
        data = json.load(open(qpath, encoding="utf-8"))
        qs = data.get("questions", data) if isinstance(data, dict) else data
        nq = len(qs)
        mt, et = [], []
        for q in qs:
            a, b = question_texts(q)
            mt.append(a)
            et.append(b)
        main_t, expl_t = norm(" ".join(mt)), norm(" ".join(et))
    else:
        res["missing"].append("questions.json")
    sl_t = norm(slide_text(spath)) if os.path.exists(spath) else ""
    if not os.path.exists(spath):
        res["missing"].append("slides.html")
    both_q = norm(main_t + expl_t) if False else main_t + expl_t
    rows = []
    for c in concepts:
        m = make_matcher(c)
        in_main = m(main_t)
        in_expl = m(expl_t) or m(main_t + expl_t)  # 문항 어디든
        in_q = in_main or in_expl
        rows.append({"concept": c, "main": in_main, "question": in_q, "slide": m(sl_t)})
    n = len(rows)
    res.update({
        "questions": nq,
        "concepts": n,
        "q_cover": sum(r["question"] for r in rows),
        "s_cover": sum(r["slide"] for r in rows),
        "main_cover": sum(r["main"] for r in rows),
        "expl_only": sum(1 for r in rows if r["question"] and not r["main"]),
        "uncovered_q": [r["concept"] for r in rows if not r["question"]],
        "uncovered_s": [r["concept"] for r in rows if not r["slide"]],
        "uncovered_both": [r["concept"] for r in rows if not r["question"] and not r["slide"]],
        "detail": rows,
    })
    return res


# ---- 출력 ----
def wid(s):
    return sum(2 if unicodedata.east_asian_width(ch) in "WF" else 1 for ch in s)


def pad(s, w):
    return s + " " * max(0, w - wid(s))


def pct(a, b):
    return "-" if not b else f"{100 * a / b:.0f}%"


def unit_key(name):
    m = re.search(r"\d+", name)
    return (int(m.group()) if m else 9999, name)


def main(argv):
    root, jpath, pos = "library", None, []
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--root" and i + 1 < len(argv):
            root = argv[i + 1]; i += 2
        elif a == "--json" and i + 1 < len(argv):
            jpath = argv[i + 1]; i += 2
        else:
            pos.append(a); i += 1
    if not pos:
        print(__doc__)
        return 0
    book, units = pos[0], pos[1:]
    bdir = os.path.join(BASE, root, book)
    if not os.path.isdir(bdir):
        print(f"책 폴더 없음: {bdir}")
        return 0
    if not units:
        units = sorted((d for d in os.listdir(bdir)
                        if os.path.isdir(os.path.join(bdir, d)) and re.fullmatch(r"u\d+", d)), key=unit_key)
    results = []
    for u in units:
        udir = os.path.join(bdir, u)
        if not os.path.isdir(udir):
            print(f"[건너뜀] 단원 폴더 없음: {udir}")
            continue
        try:
            results.append(analyze_unit(udir))
        except Exception as e:  # 참고 도구: 한 단원 실패가 전체를 막지 않게
            print(f"[오류] {u}: {type(e).__name__}: {e}")
    print(f"# 커버리지 점검: {root}/{book}")
    print("개념=notes.md 후보 / 문항=발문·지문·보기·정답·해설 / 정답·보기=해설 말고 발문·지문·보기·정답에도 나온 개념\n")
    for r in results:
        print(f"## {r['unit']}  (문항 {r.get('questions', 0)}개)" + (f"  [없음: {', '.join(r['missing'])}]" if r["missing"] else ""))
        if not r.get("concepts"):
            continue
        n = r["concepts"]
        print(f"  개념 {n} | 문항 커버 {r['q_cover']}/{n} ({pct(r['q_cover'], n)}) | 슬라이드 커버 {r['s_cover']}/{n} ({pct(r['s_cover'], n)})"
              f" | 정답·보기까지 {r['main_cover']}개, 해설에만 {r['expl_only']}개")
        if r["uncovered_q"]:
            print(f"  문항에 안 나온 개념({len(r['uncovered_q'])}): " + ", ".join(r["uncovered_q"]))
        if r["uncovered_s"]:
            print(f"  슬라이드에 안 나온 개념({len(r['uncovered_s'])}): " + ", ".join(r["uncovered_s"]))
        print()
    valid = [r for r in results if r.get("concepts")]
    if valid:
        print("## 책 전체 요약 (문항 커버율 낮은 단원 순)")
        hdr = f"{pad('단원', 6)}{pad('개념', 6)}{pad('문항%', 8)}{pad('슬라이드%', 11)}{pad('정답·보기%', 12)}미커버(문항)"
        print(hdr)
        tot = [0, 0, 0, 0]
        for r in sorted(valid, key=lambda r: (r["q_cover"] / r["concepts"], unit_key(r["unit"]))):
            n = r["concepts"]
            print(f"{pad(r['unit'], 6)}{pad(str(n), 6)}{pad(pct(r['q_cover'], n), 8)}{pad(pct(r['s_cover'], n), 11)}"
                  f"{pad(pct(r['main_cover'], n), 12)}{len(r['uncovered_q'])}")
            tot[0] += n; tot[1] += r["q_cover"]; tot[2] += r["s_cover"]; tot[3] += r["main_cover"]
        print(f"{pad('합계', 6)}{pad(str(tot[0]), 6)}{pad(pct(tot[1], tot[0]), 8)}{pad(pct(tot[2], tot[0]), 11)}{pad(pct(tot[3], tot[0]), 12)}")
    if jpath:
        os.makedirs(os.path.dirname(os.path.abspath(jpath)), exist_ok=True)
        with open(jpath, "w", encoding="utf-8") as f:
            json.dump({"book": book, "root": root, "units": results}, f, ensure_ascii=False, indent=1)
        print(f"\nJSON 저장: {jpath}")
    return 0


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except Exception as e:
        print(f"[오류] {type(e).__name__}: {e}")
    sys.exit(0)
