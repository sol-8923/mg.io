"""output/ 아래 결과물을 찾아 study/index.html(목록 페이지)을 만든다.

사용법: python engine/build_index.py        (study 폴더에서 실행)

output/<과목>/<범위>/ 안의 slides.html, quiz.html을 찾아 과목별로 링크를 건다.
questions.json이 있으면 제목·문항 수를 함께 표시한다.
"""
import html
import json
import sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent  # study/
OUT = ROOT / "output"


def collect():
    subjects = {}
    if not OUT.exists():
        return subjects
    for unit_dir in sorted(OUT.glob("*/*/")):
        slides, quiz = unit_dir / "slides.html", unit_dir / "quiz.html"
        if not (slides.exists() or quiz.exists()):
            continue
        info = {"unit": unit_dir.name, "slides": None, "quiz": None, "title": unit_dir.name, "n": None, "desc": ""}
        rel = unit_dir.relative_to(ROOT).as_posix()
        if slides.exists():
            info["slides"] = quote(f"{rel}/slides.html")
        if quiz.exists():
            info["quiz"] = quote(f"{rel}/quiz.html")
        qj = unit_dir / "questions.json"
        if qj.exists():
            try:
                d = json.loads(qj.read_text(encoding="utf-8-sig"))
                m = d.get("meta", {})
                info["title"] = m.get("unit") or m.get("title") or info["title"]
                info["desc"] = m.get("description", "")
                info["n"] = len(d.get("questions", []))
            except (ValueError, OSError):
                pass
        subjects.setdefault(unit_dir.parent.name, []).append(info)
    return subjects


def render(subjects):
    e = html.escape
    sections = []
    for subj, units in subjects.items():
        cards = []
        for u in units:
            links = []
            if u["slides"]:
                links.append(f'<a class="btn" href="{u["slides"]}">📘 요약 정리</a>')
            if u["quiz"]:
                links.append(f'<a class="btn primary" href="{u["quiz"]}">✏️ 사전 시험</a>')
            meta = " · ".join(x for x in [e(u["desc"]), f'{u["n"]}문항' if u["n"] else ""] if x)
            cards.append(f'<div class="card"><h3>{e(u["title"])}</h3>'
                         f'{f"<p class=muted>{meta}</p>" if meta else ""}<div class="row">{"".join(links)}</div></div>')
        sections.append(f'<section><h2>{e(subj)}</h2>{"".join(cards)}</section>')
    body = "".join(sections) or '<p class="muted">아직 만든 자료가 없어요.</p>'
    return f"""<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>시험공부</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
:root{{--bg:#f6f4ef;--card:#fff;--ink:#1d1f24;--muted:#6b6f78;--line:#e3e0d8;--accent:#2f5bea}}
@media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{--bg:#15171b;--card:#1f2228;--ink:#ecedf0;--muted:#9aa0aa;--line:#30343c;--accent:#7d9bff}}}}
:root[data-theme="dark"]{{--bg:#15171b;--card:#1f2228;--ink:#ecedf0;--muted:#9aa0aa;--line:#30343c;--accent:#7d9bff}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--ink);font-family:Pretendard,"Malgun Gothic",system-ui,sans-serif;line-height:1.6}}
.wrap{{max-width:760px;margin:0 auto;padding:28px 16px 60px}} h1{{margin:0 0 4px}} h2{{margin:28px 0 10px;font-size:1.2rem}}
h3{{margin:0 0 4px;font-size:1.05rem}} .muted{{color:var(--muted);margin:0 0 10px;font-size:.92rem}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:10px}}
.row{{display:flex;gap:8px;flex-wrap:wrap}} .btn{{display:inline-block;padding:9px 14px;border-radius:10px;border:1px solid var(--line);color:var(--ink);text-decoration:none;font-weight:600}}
.btn.primary{{background:var(--accent);border-color:var(--accent);color:#fff}}
</style></head><body><div class="wrap">
<h1>시험공부</h1><p class="muted">요약 정리로 공부하고, 사전 시험으로 확인해요.</p>
{body}
<p class="muted" style="margin-top:32px">시험 화면 미리보기: <a href="engine/sample/quiz.html">샘플 시험</a></p>
</div></body></html>
"""


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    subjects = collect()
    (ROOT / "index.html").write_text(render(subjects), encoding="utf-8")
    n = sum(len(v) for v in subjects.values())
    print(f"생성: {ROOT / 'index.html'} (과목 {len(subjects)}개, 단원 {n}개)")
