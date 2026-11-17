"""앱의 '문제 오류 신고'(Firestore reports 컬렉션)를 내려받아 정리한다.
사용:
  python engine/reports_pull.py                 # 새 신고를 내려받아 drafts/reports/all.json 에 합치고 미처리 요약을 출력
  python engine/reports_pull.py --md            # 요약을 drafts/reports/summary.md 로도 저장(문항별 묶음, 신고 많은 순)
  python engine/reports_pull.py --done all      # 지금 보이는 미처리 신고를 모두 '처리함'으로 표시(일괄 개정을 끝낸 뒤)
  python engine/reports_pull.py --done u2-Q16-a,u3-Q01-b   # 문항 id 지정
저장 위치: drafts/reports/ (git 제외). all.json = 신고 원본(문서 id별), processed.json = 처리한 문서 id 목록.
신고 문서: {qid, book, unit, slot, cat(answer|unclear|explain|typo|other), reason, snap(JSON 문자열), ver, at(밀리초)}.
qid 가 TEST 로 시작하는 것은 시험용이라 제외한다."""
import sys, json, urllib.request, urllib.parse, re, datetime, collections
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "drafts" / "reports"
CATS = {"answer": "정답이 이상해요", "unclear": "문제·보기가 헷갈려요", "explain": "해설이 틀리거나 이상해요", "typo": "오타·그림이 이상해요", "other": "기타"}


def config():
    t = (ROOT / "app" / "config.js").read_text(encoding="utf-8")
    pid = re.search(r'projectId:\s*"([^"]+)"', t).group(1)
    key = re.search(r'apiKey:\s*"([^"]+)"', t).group(1)
    return pid, key


def val(v):
    if "stringValue" in v: return v["stringValue"]
    if "integerValue" in v: return int(v["integerValue"])
    if "doubleValue" in v: return v["doubleValue"]
    return None


def fetch_all():
    pid, key = config()
    docs, token = [], None
    while True:
        q = {"pageSize": "300", "key": key}
        if token: q["pageToken"] = token
        url = "https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/reports?%s" % (pid, urllib.parse.urlencode(q))
        with urllib.request.urlopen(url, timeout=30) as r:
            d = json.load(r)
        for x in d.get("documents", []):
            rec = {k: val(v) for k, v in x.get("fields", {}).items()}
            rec["id"] = x["name"].rsplit("/", 1)[-1]
            docs.append(rec)
        token = d.get("nextPageToken")
        if not token: break
    return docs


def load(name, default):
    p = OUT / name
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


def main(argv):
    OUT.mkdir(parents=True, exist_ok=True)
    allr = load("all.json", {})
    done = set(load("processed.json", []))
    if "--done" not in argv or True:
        try:
            for rec in fetch_all():
                allr[rec["id"]] = rec
        except Exception as e:
            print("내려받기 실패(저장된 것으로만 요약합니다): %s" % e)
    (OUT / "all.json").write_text(json.dumps(allr, ensure_ascii=False, indent=1), encoding="utf-8")
    real = {i: r for i, r in allr.items() if not str(r.get("qid", "")).startswith("TEST")}

    if "--done" in argv:
        arg = argv[argv.index("--done") + 1] if argv.index("--done") + 1 < len(argv) else "all"
        want = None if arg == "all" else set(arg.split(","))
        for i, r in real.items():
            if i not in done and (want is None or r.get("qid") in want): done.add(i)
        (OUT / "processed.json").write_text(json.dumps(sorted(done), ensure_ascii=False, indent=1), encoding="utf-8")
        print("처리함으로 표시: 총 %d건 처리됨" % len(done))

    todo = {i: r for i, r in real.items() if i not in done}
    by = collections.defaultdict(list)
    for r in todo.values(): by[(r.get("book", ""), r.get("qid", ""))].append(r)
    lines = ["# 문제 오류 신고 요약 (미처리 %d건 / 문항 %d개, 전체 %d건)" % (len(todo), len(by), len(real)), ""]
    for (book, qid), rs in sorted(by.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        rs.sort(key=lambda r: r.get("at", 0))
        lines.append("## %s / %s — %d건" % (book or "?", qid, len(rs)))
        try:
            snap = json.loads(rs[-1].get("snap") or "{}")
            lines.append("- 문제: %s" % str(snap.get("q", ""))[:160].replace("\n", " "))
            lines.append("- 정답: %s" % str(snap.get("ans", ""))[:120])
        except Exception:
            pass
        for r in rs:
            t = datetime.datetime.fromtimestamp((r.get("at") or 0) / 1000).strftime("%m/%d %H:%M")
            my = ""
            try: my = json.loads(r.get("snap") or "{}").get("my") or ""
            except Exception: pass
            lines.append("- [%s] %s · %s%s (앱 %s)" % (t, CATS.get(r.get("cat"), r.get("cat")), r.get("reason", ""), (" · 고른 답: " + str(my)[:60]) if my else "", r.get("ver", "")))
        lines.append("")
    text = "\n".join(lines)
    print(text if len(todo) else "미처리 신고가 없어요. (전체 %d건)" % len(real))
    if "--md" in argv:
        (OUT / "summary.md").write_text(text, encoding="utf-8")
        print("저장: %s" % (OUT / "summary.md"))


if __name__ == "__main__":
    main(sys.argv[1:])
