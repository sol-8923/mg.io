# -*- coding: utf-8 -*-
"""검수 재검수용 '바뀐 문항 목록' 만들기

사용: python engine/review_diff.py <책id> <단원id> --save   [--root library|drafts]
      python engine/review_diff.py <책id> <단원id> --diff   [--root library|drafts]
  --save: questions.json·blueprint.json의 문항별·슬롯별 해시를 <단원>/review/.snapshot.json 에 저장
  --diff: 저장된 스냅샷과 현재를 비교해 바뀐·추가·삭제된 문항 id와 바뀐 필드 이름을 출력
          (바뀐 것이 없으면 종료 코드 0, 있으면 1 — 스크립트에서 '재검수 필요' 판단용)
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass
ROOT = Path(__file__).resolve().parent.parent


def h(v):
    return hashlib.sha1(json.dumps(v, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()[:12]


def snapshot(udir):
    qs = json.load(open(udir / "questions.json", encoding="utf-8"))["questions"]
    bp = json.load(open(udir / "blueprint.json", encoding="utf-8"))
    snap = {"questions": {}, "slots": {}, "blueprint_meta": {}}
    for q in qs:
        snap["questions"][q["id"]] = {"_all": h(q), **{k: h(v) for k, v in q.items()}}
    for s in bp.get("slots", []):
        snap["slots"][str(s.get("id"))] = {"_all": h(s), **{k: h(v) for k, v in s.items()}}
    snap["blueprint_meta"] = {"_all": h({k: v for k, v in bp.items() if k != "slots"}),
                              **{k: h(v) for k, v in bp.items() if k != "slots"}}
    return snap


def cmp_group(name, old, new, out):
    for k in sorted(set(old) | set(new)):
        if k not in old: out.append(("추가", name, k, []))
        elif k not in new: out.append(("삭제", name, k, []))
        elif old[k]["_all"] != new[k]["_all"]:
            fs = sorted(f for f in set(old[k]) | set(new[k]) if f != "_all" and old[k].get(f) != new[k].get(f))
            out.append(("변경", name, k, fs))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("book"); ap.add_argument("unit")
    ap.add_argument("--save", action="store_true"); ap.add_argument("--diff", action="store_true")
    ap.add_argument("--root", default="library")   # library|drafts (또는 다른 폴더 경로)
    a = ap.parse_args()
    if a.save == a.diff: ap.error("--save 또는 --diff 중 하나를 고르세요")
    udir = (ROOT / a.root) / a.book / a.unit
    if not (udir / "questions.json").exists(): sys.exit("없음: %s" % (udir / "questions.json"))
    sp = udir / "review" / ".snapshot.json"
    cur = snapshot(udir)
    if a.save:
        sp.parent.mkdir(parents=True, exist_ok=True)
        sp.write_text(json.dumps(cur, ensure_ascii=False, indent=1), encoding="utf-8")
        print("스냅샷 저장: %s (문항 %d, 슬롯 %d)" % (sp, len(cur["questions"]), len(cur["slots"])))
        return
    if not sp.exists(): sys.exit("스냅샷이 없습니다. 먼저 --save 하세요: %s" % sp)
    old = json.load(open(sp, encoding="utf-8"))
    out = []
    cmp_group("문항", old["questions"], cur["questions"], out)
    cmp_group("슬롯", old["slots"], cur["slots"], out)
    if old["blueprint_meta"]["_all"] != cur["blueprint_meta"]["_all"]:
        fs = sorted(f for f in set(old["blueprint_meta"]) | set(cur["blueprint_meta"]) if f != "_all" and old["blueprint_meta"].get(f) != cur["blueprint_meta"].get(f))
        out.append(("변경", "설계도", "(슬롯 제외 최상위)", fs))
    if not out:
        print("바뀐 것 없음 (%s/%s)" % (a.book, a.unit)); return
    print("바뀐 문항 목록 (%s/%s) — 스냅샷 %s 기준" % (a.book, a.unit, time.strftime("%Y-%m-%d %H:%M", time.localtime(sp.stat().st_mtime))))
    for kind, grp, k, fs in out:
        print("  %s %s %s%s" % (kind, grp, k, (" — 필드: " + ", ".join(fs)) if fs else ""))
    ids = [k for kind, grp, k, _ in out if grp == "문항" and kind != "삭제"]
    print("재검수 대상 문항 id(%d): %s" % (len(ids), " ".join(ids)))
    sys.exit(1)


if __name__ == "__main__": main()
