"""같은 사실을 묻는 슬롯 쌍을 찾아 library/<책>/<단원>/blueprint.json 슬롯에 avoid(슬롯 id 목록, 대칭)를 기록한다.
앱의 시험 조합(planExam)이 avoid 에 든 슬롯을 한 시험지에 함께 뽑지 않는다(후보가 모자라면 무시).
판정: (1) concept 가 같거나 (2) 한 슬롯의 정답 낱말(3자 이상)이 다른 슬롯의 발문·지문·보기·정답에 들어 있음.
사용: python engine/derive_avoid.py [--book 책id]"""
import json, os, re, argparse
ap = argparse.ArgumentParser(); ap.add_argument("--book"); a = ap.parse_args()
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
lib = os.path.join(ROOT, "library")
def n(s): return re.sub(r"[\s.,·'\"‘’“”()\[\]{}~\-_/!?㉠㉡㉢㉣㉤ⓐⓑⓒⓓⓔ]", "", str(s or "")).lower()
def answers(q):
    ch = q.get("choices") or []
    ans = q.get("answer")
    if q.get("type") == "mc":
        idx = ans if isinstance(ans, list) else [ans]
        return [ch[i - 1] for i in idx if isinstance(i, int) and 0 < i <= len(ch)]
    if q.get("type") == "short":
        return ans if isinstance(ans, list) else [ans]
    return []
def surface(q):
    parts = [q.get("question"), q.get("passage")] + list(q.get("choices") or []) + answers(q)
    return n(" ".join(str(p) for p in parts if p))
tot = 0
for book in sorted(os.listdir(lib)):
    if not os.path.isdir(os.path.join(lib, book)) or (a.book and book != a.book): continue
    for unit in sorted(os.listdir(os.path.join(lib, book))):
        bpath = os.path.join(lib, book, unit, "blueprint.json"); qpath = os.path.join(lib, book, unit, "questions.json")
        if not os.path.exists(bpath): continue
        bp = json.load(open(bpath, encoding="utf-8")); qs = json.load(open(qpath, encoding="utf-8"))["questions"]
        by = {}
        for q in qs: by.setdefault(q["slot"], []).append(q)
        pairs = {s["id"]: set() for s in bp["slots"]}
        slots = bp["slots"]
        for i, s in enumerate(slots):
            for t in slots[i + 1:]:
                hit = bool(s.get("concept")) and s.get("concept") == t.get("concept")
                if not hit:
                    for x, y in ((s, t), (t, s)):
                        ys = " ".join(surface(q) for q in by.get(y["id"], []))
                        for q in by.get(x["id"], []):
                            for ans in answers(q):
                                w = n(ans)
                                if len(w) >= 3 and w in ys: hit = True; break
                            if hit: break
                        if hit: break
                if hit: pairs[s["id"]].add(t["id"]); pairs[t["id"]].add(s["id"])
        for s in slots:
            if pairs[s["id"]]: s["avoid"] = sorted(pairs[s["id"]])
            else: s.pop("avoid", None)
        tot += sum(len(v) for v in pairs.values()) // 2
        json.dump(bp, open(bpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"{book}/{unit}: 슬롯 {len(slots)}, 겹침 쌍 {sum(len(v) for v in pairs.values())//2}")
print("총 겹침 쌍", tot)
