"""교과 정리 슬라이드 v2 (시범, 과학) — 기존 library/<책>/<단원>/slides.html 을 덮어쓰지 않고 pilot/slides-v2/ 에 따로 만든다.

구조 (pilot/slides-v2/<책id>/):
  template/skeleton.html   공통 뼈대(글꼴·편집 모드·컨트롤러·궤도 진행 표시). 자리표시자 {{TITLE}} {{CSS}} {{SLIDES}} {{N}}
  template/base.css        공통 스타일
  assets/<이름>.svg        여러 슬라이드가 같이 쓰는 그림(마스코트·장식). 본문에서는 {{asset:이름}}
  <단원>/slides.v2.json    목차(메타): 제목·쪽 예산·슬라이드 목록(id, 파일, class, style)
  <단원>/slides/sNN.html   슬라이드 하나의 본문 조각 (그림 자리는 {{figure:ID}} / {{asset:이름}})
  <단원>/figures/ID.svg    이 단원에만 쓰는 내용 그림(파일 하나 = 그림 하나)
  out/<책id>/<단원>.html   빌드 결과(앱에 연결되지 않음)

사용:
  python engine/slides_v2.py extract <책id> [단원 ...]   # library 슬라이드 → v2 파일로 분해(기존 파일은 읽기만)
  python engine/slides_v2.py build   <책id> [단원 ...]   # v2 파일 → out/ 조립 + 점검(✖면 종료코드 1)
  python engine/slides_v2.py compare <책id> [단원 ...]   # 조립 결과와 기존 slides.html 을 비교(동일 여부, 시범 모드 전용)
  --drafts 는 검수 중 작업 공간(drafts/<책>/<단원>/slides.v2/ → 같은 폴더 slides.html), --prod 를 붙이면 운영 배치: 원본 library/<책>/<단원>/slides.v2/, 공통 config/slide-v2/<책>/, 결과 library/<책>/<단원>/slides.html
점검(build): 자리표시자 누락, 그림 XML 형식, <section> 짝, 장수 예산(과목 10~12장, 넘으면 ⚠), 그림 글자 잘림·겹침(기존 SVG 점검기 재사용)."""
import sys, re, json, hashlib, xml.etree.ElementTree as ET
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
LIB = ROOT / "library"
V2 = ROOT / "pilot" / "slides-v2"
BUDGET = {"min": 10, "max": 12}
SEC = re.compile(r"<section\b([^>]*)>(.*?)</section>", re.S)
SVG = re.compile(r"<svg\b[^>]*>.*?</svg>", re.S)


DRAFTS = "--drafts" in sys.argv   # 검수 중인 작업 공간: drafts/<책>/<단원>/slides.v2/ → drafts/<책>/<단원>/slides.html
PROD = "--prod" in sys.argv or DRAFTS   # 운영 배치: 원본은 library/<책>/<단원>/slides.v2/, 공통은 config/slide-v2/<책>/, 결과는 library/<책>/<단원>/slides.html


def tpl_dir(book): return (ROOT / "config" / "slide-v2" / book) if PROD else (V2 / book / "template")
def ast_dir(book): return (ROOT / "config" / "slide-v2" / book / "assets") if PROD else (V2 / book / "assets")
def unit_dir(book, u): return ((ROOT / "drafts" if DRAFTS else LIB) / book / u / "slides.v2") if PROD else (V2 / book / u)
def out_path(book, u): return ((ROOT / "drafts" if DRAFTS else LIB) / book / u / "slides.html") if PROD else (V2 / "out" / book / (u + ".html"))


def units_of(book, names):
    base = LIB / book
    allu = sorted((p.name for p in base.iterdir() if p.is_dir() and (p / "slides.html").exists()), key=lambda s: (len(s), s))
    return [u for u in allu if not names or u in names]


def rd(p): return Path(p).read_text(encoding="utf-8")
def wr(p, t):
    p = Path(p); p.parent.mkdir(parents=True, exist_ok=True); p.write_text(t, encoding="utf-8", newline="")


def extract(book, names):
    us = units_of(book, names)
    htmls = {u: rd(LIB / book / u / "slides.html") for u in us}
    # 1) 공통 뼈대·스타일 (첫 단원 기준, 다른 단원과 같은지 확인)
    first = htmls[us[0]]
    css = {u: re.search(r"<style>(.*?)</style>", h, re.S).group(1) for u, h in htmls.items()}
    base_css = max(css.values(), key=len)       # 가장 많은 규칙을 가진 쪽(예: .lb 라벨 알약 포함)
    skel = first
    skel = skel.replace(re.search(r"<style>(.*?)</style>", first, re.S).group(1), "{{CSS}}", 1)
    t = re.search(r"<title>(.*?)</title>", first).group(1); skel = skel.replace("<title>%s</title>" % t, "<title>{{TITLE}}</title>", 1)
    a = skel.index('<main class="deck-stage"'); a = skel.index(">", a) + 1
    b = skel.rindex("</section>") + len("</section>")
    skel = skel[:a] + "\n\n{{SLIDES}}\n\n" + skel[b:].lstrip("\n")
    n0 = len(SEC.findall(first)); skel = skel.replace('id="count">1 / %d<' % n0, 'id="count">1 / {{N}}<', 1)
    wr(tpl_dir(book) / "skeleton.html", skel); wr(tpl_dir(book) / "base.css", base_css)
    # 2) 단원 간에 같은 그림 → 공통 자산
    cnt = {}
    for h in htmls.values():
        for m in SVG.finditer(h): cnt[m.group(0)] = cnt.get(m.group(0), 0) + 1
    ctrl = re.search(r'<div class="deck-controls".*?</div>', first, re.S).group(0)   # 컨트롤러 안 그림은 뼈대가 가진다
    assets = {}
    for svg, c in cnt.items():
        if c >= 2 and svg not in ctrl:
            cl = re.search(r'class="([^"\s]+)', svg.split(">", 1)[0])
            name = (cl.group(1) if cl else "svg") + "-" + hashlib.md5(svg.encode()).hexdigest()[:5]
            assets[svg] = name; wr(ast_dir(book) / (name + ".svg"), svg)
    # 3) 단원마다 목차 + 조각 + 내용 그림
    for u, h in htmls.items():
        title = re.search(r"<title>(.*?)</title>", h).group(1)
        slides, k = [], 0
        for i, m in enumerate(SEC.finditer(h), 1):
            attrs, inner = m.group(1), m.group(2)
            def rep(mm):
                nonlocal k
                svg = mm.group(0)
                if svg in assets: return "{{asset:%s}}" % assets[svg]
                k += 1; fid = "%s-s%02d-%d" % (u, i, k); wr(unit_dir(book, u) / "figures" / (fid + ".svg"), svg); return "{{figure:%s}}" % fid
            inner = SVG.sub(rep, inner)
            cls = re.search(r'class="([^"]*)"', attrs); sty = re.search(r'style="([^"]*)"', attrs)
            wr(unit_dir(book, u) / "slides" / ("s%02d.html" % i), inner)
            slides.append({"id": "s%02d" % i, "file": "slides/s%02d.html" % i, "class": cls.group(1) if cls else "slide", "style": sty.group(1) if sty else None})
        man = {"schema": "slides-v2/1", "book": book, "unit": u, "title": re.sub(r"\s*-\s*교과 정리$", "", title), "titleFull": title,
               "budget": BUDGET, "slides": slides}
        wr(unit_dir(book, u) / "slides.v2.json", json.dumps(man, ensure_ascii=False, indent=1) + "\n")
        print("[%s/%s] 슬라이드 %d장, 내용 그림 %d개" % (book, u, len(slides), k))
    print("공통 자산 %d개, 뼈대·스타일 저장: %s" % (len(assets), tpl_dir(book)))


_SVGNS = None


def _svg_ns(errs, warns):
    """_precheck_extra.py 는 precheck_unit 이 exec 로 불러 쓰는 조각이라, 함수 정의만 골라 따로 올려 SVG 점검기를 재사용한다."""
    global _SVGNS
    import ast, collections
    if _SVGNS is None:
        src = rd(ROOT / "engine" / "_precheck_extra.py")
        tree = ast.parse(src)
        keep = [n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.Import, ast.ImportFrom))
                or (isinstance(n, ast.Assign) and isinstance(n.value, (ast.Constant, ast.Dict, ast.List, ast.Tuple))
                    or (isinstance(n, ast.Assign) and isinstance(n.value, ast.Call) and "re.compile" in ast.unparse(n.value)))]   # 정규식·상수 정의도 함께
        ns = {"re": re, "json": json, "collections": collections, "sys": sys}
        exec(compile(ast.Module(body=keep, type_ignores=[]), "_precheck_extra.py", "exec"), ns)
        _SVGNS = ns
    _SVGNS["E"] = lambda m: errs.append(m)
    _SVGNS["W"] = lambda m: warns.append(m)
    return _SVGNS


def check_svg_file(fid, svg, errs, warns):
    try:
        ET.fromstring(svg)
    except Exception as e:
        errs.append("%s: SVG 형식 오류 (%s)" % (fid, e)); return
    try:
        ns = _svg_ns(errs, warns)
        ns["check_svg"](fid, "슬라이드 그림", svg)
        W_, H_, bx = ns["svg_boxes"](svg)
        ns["check_svg_extra"](fid, "슬라이드 그림", svg, W_, H_, bx)
    except Exception as e:
        warns.append("%s: 그림 점검기를 못 돌림 (%s)" % (fid, e))


def assemble(book, u, errs, warns):
    man = json.loads(rd(unit_dir(book, u) / "slides.v2.json"))
    skel, css = rd(tpl_dir(book) / "skeleton.html"), rd(tpl_dir(book) / "base.css")
    parts, figs = [], {}
    for i, s in enumerate(man["slides"], 1):
        frag = rd(unit_dir(book, u) / s["file"])
        def tok(m):
            kind, name = m.group(1), m.group(2)
            if kind == "asset": p = ast_dir(book) / (name + ".svg")
            else: p = unit_dir(book, u) / "figures" / (name + ".svg")
            if not p.exists(): errs.append("%s/%s %s: {{%s:%s}} 파일이 없음" % (book, u, s["id"], kind, name)); return ""
            t = rd(p)
            if kind == "figure" and name not in figs: figs[name] = t
            return t
        frag = re.sub(r"\{\{(asset|figure):([\w\-]+)\}\}", tok, frag)
        if re.search(r"\{\{", frag): errs.append("%s/%s %s: 해석되지 않은 {{…}}" % (book, u, s["id"]))
        attrs = ' class="%s"' % s["class"] + (' style="%s"' % s["style"] if s.get("style") else "")
        parts.append("<!-- === %d === -->\n<section%s>%s</section>\n" % (i, attrs, frag))
    n = len(man["slides"])
    out = skel.replace("{{TITLE}}", man["titleFull"]).replace("{{CSS}}", css).replace("{{N}}", str(n)).replace("{{SLIDES}}", "\n".join(parts).rstrip("\n"))
    if out.count("<section") != n or out.count("</section>") != n: errs.append("%s/%s: <section> 개수가 목차(%d)와 다름" % (book, u, n))
    b = man.get("budget", BUDGET)
    if n > b["max"]: warns.append("%s/%s: 슬라이드 %d장 — 분량 예산(%d~%d장) 초과" % (book, u, n, b["min"], b["max"]))
    if n < b["min"]: warns.append("%s/%s: 슬라이드 %d장 — 분량 예산(%d~%d장) 미만" % (book, u, n, b["min"], b["max"]))
    for fid, svg in figs.items(): check_svg_file(fid, svg, errs, warns)
    return out


def v2_units(book, names):
    if PROD: files = sorted(((ROOT / "drafts" if DRAFTS else LIB) / book).glob("u*/slides.v2/slides.v2.json"), key=lambda p: (len(p.parent.parent.name), p.parent.parent.name)); nm = lambda p: p.parent.parent.name
    else: files = sorted((V2 / book).glob("u*/slides.v2.json"), key=lambda p: (len(p.parent.name), p.parent.name)); nm = lambda p: p.parent.name
    return [nm(p) for p in files if not names or nm(p) in names]


def build(book, names):
    bad = 0
    for u in v2_units(book, names):
        errs, warns = [], []
        out = assemble(book, u, errs, warns)
        if not errs: wr(out_path(book, u), out)
        print("[%s/%s] %s  (✖ %d, ⚠ %d)  → %s" % (book, u, "실패" if errs else "조립 완료", len(errs), len(warns), out_path(book, u)))
        for m in errs: print("  ✖", m)
        for m in warns[:10]: print("  ⚠", m)
        bad += len(errs)
    return 1 if bad else 0


def compare(book, names):
    bad = 0
    for u in v2_units(book, names):
        errs, warns = [], []
        new = assemble(book, u, errs, warns); old = rd(LIB / book / u / "slides.html")
        if new == old: print("[%s/%s] 동일(글자 하나까지 같음)" % (book, u)); continue
        # 스타일 블록만 다른 경우(예: 공통 스타일이 더 많은 규칙을 가짐)는 별도로 알린다
        strip = lambda h: re.sub(r"<style>.*?</style>", "<style></style>", h, flags=re.S)
        if strip(new) == strip(old): print("[%s/%s] 본문 동일, 스타일 블록만 다름(공통 스타일이 규칙을 더 가짐: %d자 차이)" % (book, u, len(new) - len(old))); continue
        a, b = strip(new), strip(old); i = next((k for k in range(min(len(a), len(b))) if a[k] != b[k]), min(len(a), len(b)))
        print("[%s/%s] ✖ 다름: 처음 다른 위치 %d\n  새: %r\n  옛: %r" % (book, u, i, a[max(0, i - 40):i + 60], b[max(0, i - 40):i + 60])); bad += 1
    return 1 if bad else 0


if __name__ == "__main__":
    if len(sys.argv) < 3: sys.exit(__doc__)
    cmd, book, names = sys.argv[1], sys.argv[2], [a for a in sys.argv[3:] if a not in ("--prod", "--drafts")]
    if cmd == "extract": extract(book, names)
    elif cmd == "build": sys.exit(build(book, names))
    elif cmd == "compare": sys.exit(compare(book, names))
    else: sys.exit(__doc__)
