# -*- coding: utf-8 -*-
"""서술형 설계 시 피할 소재·문장 목록 만들기 (제작자·exam-designer에게 줄 입력)

사용: python engine/avoid_motifs.py <책id> <단원id> [--root library|drafts] [--out 파일]
  선택형(mc) 문항의 지문·발문·보기·정답에서 뽑는다.
    1) 이름(사례 주인공)  2) 고유명사·인용어(따옴표 낱말, 영문, 연도, 지명 꼴)
    3) 핵심 명사구(빈도 기준 추정 — 휴리스틱)  4) 정답 문장(문항별)
  결과는 마크다운. --out 이 없으면 화면 출력.
한계: 이름·명사 추출은 정규식 휴리스틱이라 누락·오탐이 있다. 사람이 훑어보고 쓸 것.
"""
import argparse, collections, json, re, sys
from pathlib import Path
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass
ROOT = Path(__file__).resolve().parent.parent

COMMON_NAMES = set("""하준 서준 도윤 민준 지호 시우 예준 주원 현우 지후 준서 건우 우진 선우 유준 서진 민재 지훈 은우 승현 태민 도현 수호 재민 정우 하늘
수빈 서연 서윤 지우 하윤 지아 서아 하은 민서 지유 채원 지민 수아 예린 소윤 다은 유나 아린 예은 시은 가은 나연 윤서 하린 은서 소희 지원 민지 유진 예나 채윤 서현 현서 연우 세은 지안 이안 라희 보라""".split())
NAME_SUFFIX = r"(?:이는|이가|이의|이를|이도|이와|이에게|이한테|이랑|이만|이처럼|이네|이도)"
PART = r"(?:은|는|이|가|의|를|을|에게|한테|와|과|도|만|랑|처럼)"
STOP = set("""것을 것만 대로 이에 위해 삶의 고른 나타낸 순서대 도덕적 꾸준히 다른 같은 어떤 모든 여러 각각 그림 다음 다음과 보기 설명 내용 경우 관련 것은 모두 하나 이상 이하 대한 위한 통해 따라 대해 가장 알맞 옳은 옳지 않은 사람 우리 자신 마음 사이 때문 이유 방법 모습 상황 생각 행동 사례 이야기 학생 선생님 친구들 친구 지내 느끼 추구하 노력하 원하 일어나 변하 나타나 해당하 실천하 존중하 지향하 배려하 지키 짝지 요구하 이루려 도움 그래프 시간 변화 대부분 주민 나라 지역""".split())
VERBY = re.compile(r"(?:하|되|시키|시|려|면|서|며|고|지|게|는|은|한|할|된|될|인|적인|다|른|해|히|의|을|를|로)$")


def strip_part(tok):
    for p in sorted(["이라는", "으로써", "으로", "에서", "에게", "에는", "까지", "부터", "라는", "처럼", "한테", "이다", "이며", "과의", "와의", "은", "는", "이", "가", "을", "를", "의", "에", "와", "과", "도", "로", "만"], key=len, reverse=True):
        if tok.endswith(p) and len(tok) - len(p) >= 2: return tok[:-len(p)]
    return tok


def sents(t): return [x.strip() for x in re.split(r"(?<=[.!?다요])\s+|\n", t or "") if x.strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("book"); ap.add_argument("unit")
    ap.add_argument("--root", default="library"); ap.add_argument("--out")
    a = ap.parse_args()
    f = (ROOT / a.root) / a.book / a.unit / "questions.json"
    if not f.exists(): sys.exit("없음: %s" % f)
    mcs = [q for q in json.load(open(f, encoding="utf-8"))["questions"] if q.get("type") == "mc"]
    if not mcs: sys.exit("선택형(mc) 문항이 없습니다.")
    texts = {q["id"]: " ".join([q.get("passage") or "", q.get("question") or ""] + [str(c) for c in q.get("choices", [])]) for q in mcs}
    alltext = " ".join(texts.values())

    # 1) 이름
    names = collections.Counter()
    for m in re.finditer(r"(?<![가-힣])([가-힣]{2})" + NAME_SUFFIX + r"(?![가-힣])", alltext): names[m.group(1)] += 1
    found = set(names)
    for n in COMMON_NAMES:
        if re.search(r"(?<![가-힣])" + n + PART + r"(?![가-힣])", alltext): names[n] += 1
    names = {n: sum(1 for t in texts.values() if re.search(r"(?<![가-힣])" + n, t)) for n in names}
    names = {n: c for n, c in names.items() if c}
    # 2) 고유명사·인용어
    props = collections.Counter()
    for m in re.finditer(r"[‘“\"《〈「『]([^’”\"》〉」』]{2,20})[’”\"》〉」』]", alltext): props[m.group(1).strip()] += 1 if m.group(1).strip() not in ("보기", "가", "나", "다") else 0
    for m in re.finditer(r"[A-Za-z][A-Za-z0-9\-]{1,}(?: [A-Z][A-Za-z]+)*", alltext): props[m.group(0)] += 1
    for m in re.finditer(r"\d{4}년", alltext): props[m.group(0)] += 1
    for m in re.finditer(r"(?<![가-힣])([가-힣]{1,5}(?:강|산|섬|협약|조약|선언|헌장))(?![가-힣])", alltext):
        props[m.group(1)] += 1
    props = collections.Counter({k: v for k, v in props.items() if v})
    # 3) 핵심 명사구
    nouns = collections.Counter()
    for t in texts.values():
        seen = set()
        for tok in re.findall(r"[가-힣]{2,}", t):
            w = strip_part(tok)
            if len(w) < 2 or w in STOP or w in names or VERBY.search(w) or w in seen: continue
            seen.add(w); nouns[w] += 1
    top_nouns = [(w, c) for w, c in nouns.most_common(40) if c >= 3][:25]
    # 4) 정답 문장
    ans = []
    for q in mcs:
        ch = q.get("choices", []); a_ = q.get("answer")
        idx = a_ if isinstance(a_, list) else [a_]
        for i in idx:
            if isinstance(i, int) and 1 <= i <= len(ch): ans.append((q["id"], ch[i - 1]))

    L = ["# 서술형 설계 시 피할 소재·문장 — %s/%s" % (a.book, a.unit), "",
         "선택형 %d문항에서 자동 추출(휴리스틱 — 누락·오탐 가능). 서술형 쪽지·사례·모범 답안·채점 요소는 아래와 겹치지 않게 새로 설계한다." % len(mcs), "",
         "## 이름(사례 주인공) — 서술형에서 다른 이름 사용", ""]
    L += ["- %s (%d문항)" % (n, c) for n, c in sorted(names.items(), key=lambda x: (-x[1], x[0]))] or ["- (없음)"]
    L += ["", "## 고유명사·인용어", ""]
    L += ["- %s" % p for p, _ in sorted(props.items(), key=lambda x: (-x[1], x[0]))[:40]] or ["- (없음)"]
    L += ["", "## 핵심 명사구(여러 문항에 등장, 서술형 사례의 주제·장면으로 반복 금지)", ""]
    L += ["- %s (%d문항)" % (w, c) for w, c in top_nouns] or ["- (없음)"]
    L += ["", "## 정답 문장 — 서술형 모범 답안·채점 요소에 같은 표현 금지", ""]
    L += ["- [%s] %s" % (i, s) for i, s in ans]
    out = "\n".join(L) + "\n"
    if a.out:
        Path(a.out).parent.mkdir(parents=True, exist_ok=True)
        Path(a.out).write_text(out, encoding="utf-8"); print("저장: %s (이름 %d, 고유 %d, 명사구 %d, 정답 %d)" % (a.out, len(names), len(props), len(top_nouns), len(ans)))
    else:
        print(out)


if __name__ == "__main__": main()
