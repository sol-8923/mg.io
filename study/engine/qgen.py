# -*- coding: utf-8 -*-
"""문항 생성 도우미(정식 책용). 사용: from qgen import K, card, table  (engine/ 폴더를 sys.path에 추가)
  g = K("<책id>", "<단원id>")           # drafts/<책id>/<단원id>/blueprint.json을 읽는다
  g.src = "교과서 p.N"                     # 이후 문항의 source
  g.mc(슬롯id, 발문, 정답 보기, [(오답 보기, 왜 틀렸나)×4], 정답 해설, detail, tip, refs, passage=None, ptitle='지문', fixed=False)
  g.short(슬롯id, 발문, [정답들], 힌트, [([오답], 왜 틀렸나)], 해설, detail, tip, refs)
  g.essay(슬롯id, 발문, 힌트, 모범답안, [(채점항목, 점수, tip)], detail, tip, refs, basis='', pitfalls='', passage=None, ptitle='보기')
  g.write()   # 슬롯마다 변형 2개(a, b)를 호출 순서대로 받아 drafts/.../questions.json 작성(정답 번호는 자동 분산)
호출 순서 = 변형 a, b. 정답 보기는 5개 중 자동으로 위치가 정해지므로 해설에서 보기를 번호(①~⑤)로 가리키면 안 된다."""
import json, pathlib, collections, re
ROOT = pathlib.Path(r"E:\dev\mg.io\study")
class K:
    def __init__(self, book, unit):
        self.dir = ROOT / "drafts" / book / unit
        self.bp = json.load(open(self.dir / "blueprint.json", encoding="utf-8"))
        self.slots = {s["id"]: s for s in self.bp["slots"]}
        self.qs = []; self.pos = collections.Counter(); self.src = ""; self.cnt = collections.Counter()
    def _base(self, sid, t, **kw):
        s = self.slots[sid]; assert s["type"] == t, (sid, t)
        v = "abcdefgh"[self.cnt[sid]]; self.cnt[sid] += 1
        d = {"id": "%s-%s-%s" % (self.dir.name, sid, v), "slot": sid, "type": t, "difficulty": s["difficulty"], "points": s["points"], "concept": s["concept"], "source": self.src}
        d.update(kw); return d
    def mc(self, sid, q, correct, wrongs, expl, detail, tip, refs, passage=None, ptitle="지문", fixed=False):
        assert len(wrongs) == 4, sid
        p = min(range(1, 6), key=lambda k: (self.pos[k], k)); self.pos[p] += 1
        ch = [w[0] for w in wrongs]; ch.insert(p - 1, correct); why = {w[0]: w[1] for w in wrongs}
        assert len(set(ch)) == 5, sid
        ce = [("정답. " + expl) if c == correct else why[c] for c in ch]
        d = self._base(sid, "mc", question=q, choices=ch, answer=p, explanation=expl, choiceExplanations=ce, detail=detail, tip=tip, refs=refs)
        if passage: d.update({"passageTitle": ptitle, "passage": passage})
        if fixed: d["fixedOrder"] = True
        self.qs.append(d)
    def short(self, sid, q, answer, hint, mistakes, expl, detail, tip, refs):
        self.qs.append(self._base(sid, "short", question=q, answer=answer, answerHint=hint, commonMistakes=[{"answer": a, "why": w} for a, w in mistakes], explanation=expl, detail=detail, tip=tip, refs=refs))
    def essay(self, sid, q, hint, model, rub, detail, tip, refs, basis="", pitfalls="", passage=None, ptitle="보기"):
        assert sum(r[1] for r in rub) == self.slots[sid]["points"], sid
        cond = [r[0] for r in rub if "사용" in r[0]]
        guide = "채점 안내: 조건 낱말을 쓰지 않으면 그 조건 항목은 0점이고, 나머지 항목은 내용에 따라 따로 점수를 줘요. 모범 답안과 뜻이 같으면 다른 표현도 인정해요."
        NL = chr(10)
        d = detail + NL + guide + ((NL + "흔한 감점: " + pitfalls) if pitfalls else "")
        self.qs.append(self._base(sid, "essay", question=q, answerHint=hint, modelAnswer=model, explanation="모범 답안: " + model + ((" (근거: " + basis + ")") if basis else ""),
            rubric=[{"criterion": c, "points": p, "tip": t} for c, p, t in rub], detail=d, tip=tip, refs=refs))
        if passage: self.qs[-1].update({"passageTitle": ptitle, "passage": passage})
    def write(self):
        order = {"mc": 0, "short": 1, "essay": 2}
        self.qs.sort(key=lambda q: (order[q["type"]], q["slot"], q["id"]))
        cnt = collections.Counter(q["slot"] for q in self.qs)
        assert set(cnt) == set(self.slots) and all(v == self.bp["variantsPerSlot"] for v in cnt.values()), cnt
        (self.dir / "questions.json").write_text(json.dumps({"questions": self.qs}, ensure_ascii=False, indent=1), encoding="utf-8")
        mcq = [q for q in self.qs if q["type"] == "mc" and not q.get("fixedOrder")]
        st = sum(1 for q in mcq if len(q["choices"][q["answer"] - 1]) > max(len(c) for i, c in enumerate(q["choices"]) if i != q["answer"] - 1))
        pos = collections.Counter(q["answer"] for q in self.qs if q["type"] == "mc")
        print("작성:", len(self.qs), "문항, 정답 위치", dict(sorted(pos.items())), "엄격 최장 정답 %d/%d" % (st, len(mcq)))
def card(title, text): return {"kind": "text", "title": title, "text": text}
def table(title, head, rows): return {"kind": "table", "title": title, "head": head, "rows": rows}
