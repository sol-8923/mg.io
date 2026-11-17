# -*- coding: utf-8 -*-
# (precheck_unit.py 가 exec 로 불러 쓰는 조각 — 반복 반려 사유를 자동으로 잡는 규칙. 모든 과목 공통)
import html as _html

def A1(q):
    """복수 정답(배열)이면 첫 번째 정답 번호 — 복수 정답 기출에서 TypeError 방지"""
    a = q["answer"]
    return a[0] if isinstance(a, list) else a

SYM = re.compile(r"(?:\([가-힣]\)|[㉠-㉿]|[ㄱ-ㅎ](?![가-힣])|[A-Z]군?|[①-⑤])")
def combo_sets(choices):
    """합답형 보기('ㄱ, ㄴ' / '㉠, ㉢' / '(가), (나)')를 기호 집합으로. 아니면 None"""
    res = []
    for c in choices:
        s = re.sub(r"[\s,·및와과]", "", c)
        toks = SYM.findall(c)
        rest = SYM.sub("", s)
        if not toks or len(rest) > 0: return None
        kinds = {("paren" if t.startswith("(") else "circ" if "㉠" <= t[0] <= "㉿" else "jamo" if "ㄱ" <= t[0] <= "ㅎ" else "other") for t in toks}
        if len(kinds) > 1: return None   # (가)-㉠ 처럼 짝짓기 보기는 합답이 아님
        res.append(frozenset(toks))
    return res

def strip_tags(x):
    return _html.unescape(re.sub(r"<[^>]+>", " ", x or ""))

def ref_text(r):
    parts = [r.get("title", ""), r.get("text", "")]
    if r.get("head"): parts += r["head"]
    for row in r.get("rows", []) or []: parts += [str(c) for c in row]
    if r.get("svg"): parts.append(strip_tags(r["svg"]))
    return " ".join(parts)

def side_text(q):
    """풀이 화면 옆 자료(refs)·그림 캡션·그림 속 글자"""
    t = [ref_text(r) for r in (q.get("refs") or [])]
    f = q.get("figure") or {}
    t.append(f.get("caption", "")); t.append(strip_tags(f.get("svg", "")))
    return norm(" ".join(t))

# ── R-A. 합답 구조 ─────────────────────────────────────────
for q in qs:
    if q["type"] != "mc": continue
    cs = combo_sets(q["choices"])
    if not cs: continue
    ans = cs[A1(q) - 1]
    sizes = [len(c) for c in cs]
    if sizes.count(len(ans)) == 1 and len(set(sizes)) > 1:
        E("%s: 합답 정답만 %d개짜리 조합 — 같은 크기의 오답 조합을 1개 이상 만들 것(모양으로 정답이 드러남)" % (q["id"], len(ans)))
    common = frozenset.intersection(*cs)
    if common: E("%s: 기호 %s이(가) 5개 보기 모두에 들어 있음 — 그 진술이 참인 것이 드러남(조합을 다시 짤 것)" % (q["id"], ",".join(sorted(common))))
    if len(set(cs)) < len(cs): E("%s: 합답 보기 조합이 중복" % q["id"])

# ── R-B. 정답이 단독 최장인 보기 ───────────────────────────
for q in qs:
    if q["type"] != "mc": continue
    if combo_sets(q["choices"]): continue
    ls = [len(norm(c)) for c in q["choices"]]
    a_i = A1(q) - 1
    others = sorted(l for i, l in enumerate(ls) if i != a_i)
    if ls[a_i] > others[-1] and ls[a_i] >= 14:
        if ls[a_i] - others[-1] >= 3: E("%s: 정답이 단독 최장 보기(%d자 > %d자) — 오답을 비슷한 길이·구조로 늘리거나 정답을 줄일 것" % (q["id"], ls[a_i], others[-1]))
        else: W("%s: 정답이 근소하게 최장(%d자 vs %d자)" % (q["id"], ls[a_i], others[-1]))

# ── R-C. 풀이 화면 옆 자료·그림 캡션이 다른 슬롯 정답을 노출 ──
slot_answers = collections.defaultdict(list)     # slot -> [(id, 정답 문자열)]
for q in qs:
    if q["type"] == "mc" and not combo_sets(q["choices"]):
        t = q["choices"][A1(q) - 1]
        if len(norm(t)) >= 8: slot_answers[q["slot"]].append((q["id"], t))
    elif q["type"] == "short":
        for t in q["answer"]:
            if len(norm(t)) >= 2 and not re.fullmatch(r"\d{1,2}(개)?", t.strip()): slot_answers[q["slot"]].append((q["id"], t))
for q in qs:
    st = side_text(q)
    if not st: continue
    for slot, lst in slot_answers.items():
        if slot == q["slot"]: continue
        for qid, t in lst:
            if norm(t) in st: E("%s: refs·그림 캡션·그림 글자에 다른 슬롯 %s의 정답 '%s'이(가) 나옴(풀이 화면에서 노출)" % (q["id"], qid, t[:30]))
    for slot, ws in conds.items():
        if slot == q["slot"]: continue
        for w in ws:
            if norm(w) in st: E("%s: refs·그림 캡션에 서술형 %s의 조건 낱말 '%s'이(가) 나옴" % (q["id"], slot, w))
# 변형 a/b 사례가 서로의 refs에 섞이는지(같은 슬롯 다른 변형의 지문 고유 문장이 refs에)는 검수자 판단

# ── R-D. 정답 번호 분포(변형 a·b 각각) ─────────────────────
byv = collections.defaultdict(list)
for q in qs:
    if q["type"] == "mc": byv[q["id"].rsplit("-", 1)[-1]].append(q)
for v, lst in byv.items():
    if len(lst) < 8: continue
    cnt = collections.Counter(A1(x) for x in lst)
    full = [cnt.get(i, 0) for i in range(1, 6)]
    if max(full) - min(full) >= 3: E("변형 %s: 정답 번호 분포가 쏠림 %s — 3~4개씩 고르게 재배치(fixedOrder 문항은 보기 순서를 바꿔서)" % (v, full))
    run = 1
    for i in range(1, len(lst)):
        run = run + 1 if A1(lst[i]) == A1(lst[i - 1]) else 1
        if run >= 3: E("변형 %s: 정답 번호 %d이(가) %s부터 3연속" % (v, A1(lst[i]), lst[i - 2]["id"])); break

# ── R-E. 발문이 지문에 없는 표시를 가리킴 ──────────────────
for q in qs:
    if "밑줄" in q.get("question", "") and not q.get("figure"):
        if not re.search(r"[㉠-㉿]|<u>", q.get("passage", "") + " ".join(q.get("choices", []))):
            E("%s: 발문이 '밑줄'을 가리키지만 지문에 표시(㉠㉡ 등)가 없음 — 단어를 직접 지목하거나 기호를 붙일 것" % q["id"])

# ── R-F. 서술형 문장 수 조건과 모범 답안 ───────────────────
NUMW = {"한": 1, "두": 2, "세": 3, "네": 4}
for q in qs:
    if q["type"] != "essay": continue
    cond = q.get("answerHint", "") + " " + q.get("question", "")
    nums = [NUMW[m] for m in re.findall(r"(한|두|세|네)\s*문장", cond)]
    if not nums: continue
    ma = q.get("modelAnswer", "") or ""
    if not isinstance(ma, str): ma = " ".join(str(v) for v in (ma.values() if isinstance(ma, dict) else ma))   # 선택지별 dict·리스트 답안
    n = len([s for s in re.split(r"(?<=[.?!다요])\s+", re.sub(r"[‘“'\"]([^’”'\"]*)[’”'\"]", lambda m: m.group(0).replace(".", ""), ma)) if len(s.strip()) > 3])
    if n > sum(nums) + 1: W("%s: 서술형 문장 수 조건(합 %d문장)보다 모범 답안이 길어 보임(%d문장 추정) — 발문 조건을 지키는지 확인" % (q["id"], sum(nums), n))

# ── R-G. 자료 간격과 맞지 않는 표현 ────────────────────────
for q in qs:
    if q.get("figure") and re.search(r"해마다|매년", q.get("explanation", "") + q.get("detail", "")):
        W("%s: 해설의 '해마다/매년' — 그림 자료의 값 간격(몇 해 간격)과 맞는지 확인" % q["id"])

# ── R-H. SVG 글자 겹침·잘림(근사 검사) ─────────────────────
TXT = re.compile(r"<text\b([^>]*)>(.*?)</text>", re.S)
def attr(a, k, d=None):
    m = re.search(r"\b%s\s*=\s*['\"]([^'\"]+)['\"]" % k, a)
    return m.group(1) if m else d
def width(s, fs):
    return sum(fs * (1.0 if ord(c) > 0x2E80 else (0.35 if c in " .,'`|:;i" else 0.58)) for c in s)
def svg_boxes(svg):
    vb = re.search(r"viewBox=['\"]([\d.\s-]+)['\"]", svg)
    W_, H_ = (float(vb.group(1).split()[2]), float(vb.group(1).split()[3])) if vb else (None, None)
    boxes = []
    for m in TXT.finditer(svg):
        a, inner = m.group(1), strip_tags(m.group(2)).strip()
        if not inner or "<tspan" in m.group(2): continue
        try: x = float(attr(a, "x", "0")); y = float(attr(a, "y", "0"))
        except ValueError: continue
        if "transform" in a: continue
        fs = float(attr(a, "font-size", "12") or 12)
        w = width(inner, fs); anc = attr(a, "text-anchor", "start")
        x0 = x - w / 2 if anc == "middle" else (x - w if anc == "end" else x)
        boxes.append((x0, y - fs * 0.8, x0 + w, y + fs * 0.2, inner))
    return W_, H_, boxes
# ── R-H2. SVG 박스·선·화살표 점검(근사, 모두 ⚠) ─────────────
_NUMRE = r"-?\d*\.?\d+(?:[eE]-?\d+)?"
def _fa(a, k):
    v = attr(a, k)
    try: return float(v.replace("px", "")) if v is not None else None
    except ValueError: return None
def svg_rects(svg):
    out = []
    for m in re.finditer(r"<rect\b([^>]*?)/?>", svg):
        a = m.group(1)
        x, y, w, h = (_fa(a, "x") or 0.0), (_fa(a, "y") or 0.0), _fa(a, "width"), _fa(a, "height")
        if w is None or h is None or w < 6 or h < 6: continue     # 범례 색 표시 같은 작은 사각형은 제외
        out.append((x, y, x + w, y + h))
    return out
def _light_or_dashed(a):
    """격자선·보조선(점선, 연한 색, 아주 가는 선)은 라벨 위를 지나도록 일부러 그리는 경우가 많아 선 점검에서 뺀다"""
    if "stroke-dasharray" in a: return True
    sw = _fa(a, "stroke-width")
    if sw is not None and sw < 1: return True
    col = (attr(a, "stroke", "") or "").lstrip("#")
    if re.fullmatch(r"[0-9a-fA-F]{6}", col):
        r_, g_, b_ = int(col[0:2], 16), int(col[2:4], 16), int(col[4:6], 16)
        if 0.299 * r_ + 0.587 * g_ + 0.114 * b_ > 170: return True
    if re.fullmatch(r"[0-9a-fA-F]{3}", col) and sum(int(ch, 16) for ch in col) > 33: return True
    return False
def svg_segments(svg):
    """직선 선분 [(x1,y1,x2,y2)]와, 서브패스 M이 2개 이상인데 marker-end가 있는 path 수. 곡선(C·Q·A) 구간은 근사가 어려워 건너뜀"""
    segs, multi = [], 0
    for m in re.finditer(r"<line\b([^>]*?)/?>", svg):
        v = [_fa(m.group(1), k) for k in ("x1", "y1", "x2", "y2")]
        if None not in v and not _light_or_dashed(m.group(1)): segs.append(tuple(v))
    for m in re.finditer(r"<path\b([^>]*?)/?>", svg):
        a = m.group(1); d = attr(a, "d", "") or ""
        if len(re.findall(r"[Mm]", d)) >= 2 and "marker-end" in a: multi += 1
        if _light_or_dashed(a) or (attr(a, "fill", "black") or "black") != "none": continue    # 채워진 도형·보조선은 제외
        cx = cy = sx = sy = 0.0; curve = False
        for cmd, args in re.findall(r"([MmLlHhVvZzCcSsQqTtAa])([^MmLlHhVvZzCcSsQqTtAa]*)", d):
            nums = [float(t) for t in re.findall(_NUMRE, args)]
            rel = cmd.islower(); c = cmd.upper()
            if c == "Z":
                if (cx, cy) != (sx, sy) and not curve: segs.append((cx, cy, sx, sy))
                cx, cy = sx, sy; continue
            if c == "M" and len(nums) >= 2:
                cx, cy = (cx + nums[0], cy + nums[1]) if rel else (nums[0], nums[1]); sx, sy = cx, cy; curve = False
                for k in range(2, len(nums) - 1, 2):
                    nx, ny = (cx + nums[k], cy + nums[k + 1]) if rel else (nums[k], nums[k + 1]); segs.append((cx, cy, nx, ny)); cx, cy = nx, ny
            elif c == "L":
                for k in range(0, len(nums) - 1, 2):
                    nx, ny = (cx + nums[k], cy + nums[k + 1]) if rel else (nums[k], nums[k + 1]); segs.append((cx, cy, nx, ny)); cx, cy = nx, ny
            elif c == "H":
                for n_ in nums: nx = cx + n_ if rel else n_; segs.append((cx, cy, nx, cy)); cx = nx
            elif c == "V":
                for n_ in nums: ny = cy + n_ if rel else n_; segs.append((cx, cy, cx, ny)); cy = ny
            elif nums:
                curve = True
                k = {"C": 6, "S": 4, "Q": 4, "T": 2, "A": 7}[c]
                if len(nums) >= k: cx, cy = (cx + nums[k - 2], cy + nums[k - 1]) if rel else (nums[k - 2], nums[k - 1])
    return segs, multi
def _clip_len(seg, box):
    """선분이 사각형 안을 지나는 길이(Liang-Barsky)"""
    x1, y1, x2, y2 = seg; dx, dy = x2 - x1, y2 - y1
    t0, t1 = 0.0, 1.0
    for p, q_ in ((-dx, x1 - box[0]), (dx, box[2] - x1), (-dy, y1 - box[1]), (dy, box[3] - y1)):
        if p == 0:
            if q_ < 0: return 0.0
        else:
            r = q_ / p
            if p < 0: t0 = max(t0, r)
            else: t1 = min(t1, r)
            if t0 > t1: return 0.0
    return (t1 - t0) * (dx * dx + dy * dy) ** 0.5
def check_svg_extra(qid, where, svg, W_, H_, bx):
    rc = svg_rects(svg)
    for i in range(len(rc)):          # (a) 박스끼리 겹침(완전 포함은 제외)
        for j in range(i + 1, len(rc)):
            a_, b_ = rc[i], rc[j]
            ox = min(a_[2], b_[2]) - max(a_[0], b_[0]); oy = min(a_[3], b_[3]) - max(a_[1], b_[1])
            if ox <= 1 or oy <= 1: continue
            inside = lambda p, q_: p[0] >= q_[0] - 1 and p[1] >= q_[1] - 1 and p[2] <= q_[2] + 1 and p[3] <= q_[3] + 1
            if inside(a_, b_) or inside(b_, a_): continue
            W("%s %s: SVG 박스 (%d,%d)-(%d,%d)와(과) (%d,%d)-(%d,%d)이(가) 일부만 겹침" % ((qid, where) + tuple(round(v) for v in a_ + b_)))
    if W_ and H_:                      # (b) 박스 테두리가 그림 가장자리에 접하거나 넘음
        for r_ in rc:
            if (r_[2] - r_[0]) * (r_[3] - r_[1]) >= 0.9 * W_ * H_: continue     # 배경 사각형
            if min(r_[0], r_[1], W_ - r_[2], H_ - r_[3]) < 1:       # 1px 미만(접하거나 넘음). 1~2px 여백은 테두리 선 두께 때문에 일부러 두는 경우가 대부분이라 제외
                W("%s %s: SVG 박스 (%d,%d)-(%d,%d)의 테두리가 그림 가장자리(viewBox %d×%d)에 닿거나 넘음" % (qid, where, r_[0], r_[1], r_[2], r_[3], W_, H_))
    segs, multi = svg_segments(svg)
    for sg in segs:                   # (c) 선·화살표가 글자 영역을 가로지름 (한 선이 글자 3개 이상을 지나면 눈금·격자로 보고 제외)
        hit = []
        for b in bx:
            bw, bh = b[2] - b[0], b[3] - b[1]
            inner = (b[0] + bw * 0.1, b[1] + bh * 0.25, b[2] - bw * 0.1, b[3] - bh * 0.25)
            if _clip_len(sg, inner) > 3: hit.append(b)
        if 0 < len(hit) < 3:
            for b in hit: W("%s %s: SVG 선·화살표 (%d,%d)→(%d,%d)이(가) 글자 '%s'을(를) 가로지름" % (qid, where, sg[0], sg[1], sg[2], sg[3], b[4][:10]))
    if multi: W("%s %s: SVG path %d개가 서브패스(M) 2개 이상인데 marker-end(화살촉)를 씀 — 화살촉이 마지막 선에만 붙음(선마다 path를 나눌 것)" % (qid, where, multi))
def check_svg(qid, where, svg):
    if "transform" in svg: return   # 이동·회전이 있는 그림은 좌표를 근사할 수 없어 눈으로 확인(스크린샷)
    W_, H_, bx = svg_boxes(svg)
    for b in bx:
        if W_ and (b[0] < -2 or b[2] > W_ + 2): E("%s %s: SVG 글자 '%s'이(가) 그림 가로 밖으로 잘림" % (qid, where, b[4][:12]))
        if H_ and (b[1] < -2 or b[3] > H_ + 2): E("%s %s: SVG 글자 '%s'이(가) 그림 세로 밖으로 잘림" % (qid, where, b[4][:12]))
    for i in range(len(bx)):
        for j in range(i + 1, len(bx)):
            a_, b_ = bx[i], bx[j]
            ox = min(a_[2], b_[2]) - max(a_[0], b_[0]); oy = min(a_[3], b_[3]) - max(a_[1], b_[1])
            if ox > 1 and oy > 1:
                small = min((a_[2] - a_[0]) * (a_[3] - a_[1]), (b_[2] - b_[0]) * (b_[3] - b_[1]))
                if small > 0 and ox * oy / small > 0.3: E("%s %s: SVG 글자 '%s'와(과) '%s'이(가) 겹침" % (qid, where, a_[4][:10], b_[4][:10]))
    check_svg_extra(qid, where, svg, W_, H_, bx)
for q in qs:
    if (q.get("figure") or {}).get("svg"): check_svg(q["id"], "figure", q["figure"]["svg"])
    for i, r in enumerate(q.get("refs") or []):
        if r.get("svg"): check_svg(q["id"], "refs[%d]" % i, r["svg"])

# ── R-I. 조사 오류('로/으로') — 해설 템플릿이 받침을 안 보고 '로'를 붙이는 사고 ──
_JOSA_C = re.compile(r"[㉠㉡㉢㉤-㉿]로")                       # ㉣(ㄹ)만 '로', 나머지 원문자는 '으로'
_JOSA_H = re.compile(r"([가-힣]{1,3})로(?![가-힣])")
def _has_batchim_not_rieul(ch):
    code = ord(ch) - 0xAC00
    if not (0 <= code < 11172): return False
    j = code % 28
    return j != 0 and j != 8
for q in qs:
    for fname, text in fields(q):
        if not text: continue
        if _JOSA_C.search(text): E("%s %s: 조사 오류 '㉡로' 꼴 — 원문자 ㉠㉡㉢㉤… 뒤에는 '으로'(㉣만 '로')" % (q["id"], fname))
        for m in _JOSA_H.finditer(text):
            w = m.group(1)
            if _has_batchim_not_rieul(w[-1]) and norm(w[-1:] + "로") not in ("진로", "경로", "항로", "통로", "활로", "수로", "도로", "정로", "근로", "노로"):
                word = norm(w + "로")
                if not any(word[-k:] in full for k in (3, 4) if len(word) >= k):
                    W("%s %s: 조사 오류 의심 '%s' — 받침 뒤 '로'(→ '으로')이거나 원문에 없는 합성어" % (q["id"], fname, (w + "로")))
                    break

# ── R-J. source(근거 쪽) 복사 실수 — 모든 문항이 같은 값 ────────
_src = collections.Counter(q.get("source", "") for q in qs)
if qs and _src:
    top, n = _src.most_common(1)[0]
    if n > 0.6 * len(qs) and len(qs) >= 10:
        E("source가 문항 대부분(%d/%d)에서 같음 → '%s' — 슬롯별 근거 쪽수로 고칠 것(설계도 사실 배분표의 쪽과 대조)" % (n, len(qs), top[:40]))

# ── R-K. 정답 글자((가)~(바))가 섞이는 문항의 해설 속 정답 글자 일치 ──
_PL = re.compile(r"\(([가-힣])\)")
for q in qs:
    if q["type"] != "mc": continue
    ch = q["choices"]; ans_txt = ch[A1(q) - 1]
    m = _PL.match(ans_txt.strip())
    if not m: continue
    L = m.group(1)
    others = {_PL.match(c.strip()).group(1) for i, c in enumerate(ch) if i != A1(q) - 1 and _PL.match(c.strip())}
    if not others: continue
    text = q.get("explanation", "") + " " + q.get("detail", "") + " " + " ".join(c for c in (q.get("choiceExplanations") or []) if c.startswith("정답."))
    found = set(_PL.findall(text))
    if ("(%s)" % L) not in text and (found & others):
        E("%s: 정답 보기는 (%s)인데 정답 해설·detail은 (%s)를 정답처럼 서술 — 보기 순서가 섞이면 해설의 정답 글자가 틀어짐(글자를 변수로 생성할 것)" % (q["id"], L, ",".join(sorted(found & others))))

# ── R-L. 학생이 보는 풀이가 교사용 교과서·지도서를 근거로 듦 ────
for q in qs:
    txt = " ".join([f[1] for f in fields(q)] + [ref_text(r) for r in (q.get("refs") or [])])
    m = re.search(r"(지도서|교사용)", txt)
    if m: E("%s: 학생이 보는 풀이·참고 자료에 '%s'가 나옴 — 근거는 학생 교과서 쪽수로만(교사용·지도서는 제작자용)" % (q["id"], m.group(1)))

# ── R-M. 풀이가 다른 문항·변형을 가리킴('앞의 문항') — 시험지에는 슬롯당 변형 하나만 들어감 ──
for q in qs:
    txt = " ".join(f[1] for f in fields(q) if f[0] in ("explanation", "detail", "tip") or f[0].startswith("choiceExplanations"))
    m = re.search(r"(앞의 문항|앞 문항|위 문항|이전 문항|다음 문항|같은 슬롯|다른 변형|변형 [ab]|[0-9]번 문항|앞선 (?:표|그림|문항|자료|사례)|앞의 (?:표|그림|자료|사례)|이전 (?:표|그림|자료|사례)|(?:표|그림|자료|기호)의? ?위치가 바뀌|이번 그림)", txt)
    if m: E("%s: 풀이가 다른 문항·변형을 가리킴 '%s' — 시험지에는 슬롯당 변형 하나만 들어가므로 이 문항만으로 읽히게" % (q["id"], m.group(1)))

# ── R-N. 섞이는 보기가 다른 보기를 가리킴('위의', '앞의', '이런 활동') ────
_REF_E = re.compile(r"(?<![가-힣])(위의|앞의|위 보기|앞 보기|앞서 말한|바로 위)")
_REF_W = re.compile(r"(?<![가-힣])(이런|이와 같은|이와 같이)")
for q in qs:
    if q["type"] != "mc" or q.get("fixedOrder"): continue
    for i, c in enumerate(q["choices"]):
        m = _REF_E.search(c)
        if m: E("%s: 섞이는 보기[%d]가 다른 보기를 가리킴 '%s' — 보기 순서가 바뀌면 의미를 잃음(그 보기만으로 읽히게)" % (q["id"], i, m.group(1))); break
        m = _REF_W.search(c)
        if m: W("%s: 섞이는 보기[%d]의 '%s' — 다른 보기를 가리키는 말이면 순서가 바뀌어 의미를 잃음(장면·지문을 가리키는 말이면 무시)" % (q["id"], i, m.group(1))); break

# ── R-O. 어색한 조사 병기 '은(는)·을(를)·이(가)' (해설 템플릿) ────
_PAR = re.compile(r"[가-힣㉠-㉿]\((?:는|를|은|을|이)\)|이\(가\)")   # (가)(나) 같은 보기 기호는 조사 병기가 아님(2026-11-17 B4)
for q in qs:
    n = sum(len(_PAR.findall(f[1])) for f in fields(q) if f[1])
    if n: W("%s: 조사 병기('은(는)' 등) %d곳 — 받침을 판정해 정확한 조사로" % (q["id"], n))


# ── R-M. (수학 등) 글자 그대로의 역슬래시+n, 단원 내 다른 슬롯 정답 값과 같은 선택지 ──
_BSN = chr(92) + "n"
def _strs(o):
    if isinstance(o, str): yield o
    elif isinstance(o, dict):
        for k, v in o.items():
            if k != "svg": yield from _strs(v)
    elif isinstance(o, list):
        for v in o: yield from _strs(v)
for q in qs:
    if any(_BSN in t for t in _strs(q)):
        E("%s: 문자열에 글자 그대로의 역슬래시+n이 있음 — gen.py에서 줄바꿈을 이스케이프하지 않았는지 확인" % q["id"])
_NUMV = re.compile(r"\d[\d.,/]*\s*(?:π|cm|m|km|°|g|L|개|바퀴|점)?")
_slot_val = {}
for q in qs:
    if q["type"] == "mc" and not combo_sets(q["choices"]):
        t = norm(q["choices"][A1(q) - 1])
        if re.search(r"\d", t) and len(t) >= 3: _slot_val.setdefault(t, set()).add(q["slot"])
for q in qs:
    if q["type"] != "mc" or combo_sets(q["choices"]): continue
    for i, c in enumerate(q["choices"]):
        t = norm(c)
        if t in _slot_val and (_slot_val[t] - {q["slot"]}):
            W("%s: 선택지 '%s'가 다른 슬롯 %s의 정답 값과 같음 — 수치 세트를 슬롯마다 따로 정할 것(수학)" % (q["id"], c[:20], ",".join(sorted(_slot_val[t] - {q["slot"]}))))

# ── R-P. 서술형 answerHint 'N문장 이상' ↔ 모범 답안 문장 수 (✖) ──────
_NUMK = {"한": 1, "두": 2, "세": 3, "네": 4, "다섯": 5, "여섯": 6}
def _sent_split(t):
    t = re.sub(r"[‘“'\"]([^’”'\"]*)[’”'\"]", lambda m: m.group(0).replace(".", ""), t or "")   # 인용 속 마침표는 문장 끝이 아님
    t = re.sub(r"\((?:교과서\s*)?p\.\s*\d+[^)]*\)", " ", t)                                  # '(교과서 p.NN)' 쪽 표기 제외
    return [x for x in re.split(r"(?<=[.?!])\s+|(?<=[요다])\s+", t.strip()) if re.sub(r"[\s.?!()0-9ㄱ-ㅎ가-힣]{0,2}$", "", x.strip()) and len(norm(x)) >= 2]
def _model_answers(ma):
    """modelAnswer가 문자열이면 [(None, 문자열)], dict·리스트(선택지별)면 [(키, 문자열)…]"""
    if isinstance(ma, str): return [(None, ma)]
    if isinstance(ma, dict): return [(str(k), v) for k, v in ma.items() if isinstance(v, str)]
    if isinstance(ma, list): return [("[%d]" % i, v) for i, v in enumerate(ma) if isinstance(v, str)]
    return []
for q in qs:
    if q["type"] != "essay": continue
    m = re.search(r"(\d+|한|두|세|네|다섯|여섯)\s*문장\s*이상", q.get("answerHint", "") or "")
    if not m: continue
    need = int(m.group(1)) if m.group(1).isdigit() else _NUMK[m.group(1)]
    for key, txt in _model_answers(q.get("modelAnswer")):
        n = len(_sent_split(txt))
        if n < need: E("%s: answerHint는 '%d문장 이상'인데 모범 답안%s은 %d문장 — 모범 답안을 늘리거나 hint를 고칠 것" % (q["id"], need, "(%s)" % key if key else "", n))

# ── R-Q. 서술형 발문·쪽지·모범 답안이 같은 단원 선택형의 보기·정답 문장과 거의 같음 (⚠) ──
def _lcs_len(a, b):
    import difflib
    return difflib.SequenceMatcher(None, a, b, autojunk=False).find_longest_match(0, len(a), 0, len(b)).size
def _eoj(s): return set(w for w in re.split(r"\s+", re.sub(r"[.,?!…·‘’“”\"'()\[\]]", " ", s).strip()) if len(w) >= 2)
_src_norm = "".join("".join(v) for v in pages.values()) if pages else ""
_mc_sents = []      # (문항 id, 보기 문장 원문)
for q in qs:
    if q["type"] == "mc" and not combo_sets(q["choices"]):
        for c in q["choices"]:
            if len(norm(c)) >= 12: _mc_sents.append((q["id"], c))
for q in qs:
    if q["type"] != "essay": continue
    parts = [("발문", q.get("question", "")), ("쪽지", q.get("passage", ""))] + [("모범 답안" + ("(%s)" % k if k else ""), t) for k, t in _model_answers(q.get("modelAnswer"))]
    for label, txt in parts:
        hit = None
        for s_ in _sent_split(txt):
            ns = norm(s_)
            if len(ns) < 12: continue
            es = _eoj(s_)
            for qid, c in _mc_sents:
                nc = norm(c)
                jac = len(es & _eoj(c)) / max(1, len(es | _eoj(c))) if len(es) >= 4 else 0
                if jac >= 0.7 or _lcs_len(ns, nc) >= 12:
                    hit = (s_, qid, c, ns in _src_norm if _src_norm else False); break
            if hit: break
        if hit:
            note = " — 교과서 정의·인용 문장이면 허용될 수 있으나 확인" if hit[3] else " — 선택형 정답·보기를 서술형이 다시 알려 주는지 확인"
            W("%s %s: 서술형 문장 '%s'이(가) 같은 단원 선택형 %s의 보기 '%s'와(과) 거의 같음%s" % (q["id"], label, hit[0].strip()[:30], hit[1], hit[2].strip()[:30], note))

# ── R-R. 설계도·발문 괄호 안 서술형 조건 낱말('…' 낱말을 사용)이 다른 슬롯에 나옴 (⚠) ──
_cw = collections.defaultdict(set)
for q in qs:
    if q["type"] != "essay": continue
    for par in re.findall(r"\(([^()]*(?:낱말|용어|말)[^()]*(?:사용|써)[^()]*)\)", (q.get("question", "") or "") + " " + (q.get("answerHint", "") or "")):
        _cw[q["slot"]].update(re.findall(r"['‘“\"]([^'’”\"]{1,8})['’”\"]", par))
for s_ in bp["slots"]:
    if s_.get("type") == "essay":
        for mm in re.findall(r"조건 낱말\s*((?:['‘][^'’]{1,8}['’][,，、 ·및과와]*)+)", s_.get("intent", "") or ""):
            _cw[s_["id"]].update(re.findall(r"['‘]([^'’]{1,8})['’]", mm))
for slot, ws in _cw.items():
    for w in sorted(ws - conds.get(slot, set())):      # 기존 규칙이 이미 보고한 낱말은 중복 보고하지 않음
        for o in qs:
            if o["slot"] != slot and norm(w) in open_text(o):
                W("서술형 %s 조건 낱말 '%s'(발문·설계도)이(가) %s의 발문·지문·보기에 나옴 (정답·조건을 알려 주는지 검수자가 판단)" % (slot, w, o["id"]))
