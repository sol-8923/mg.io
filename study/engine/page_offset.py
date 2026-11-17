"""교과서 텍스트(쪽 구분 \\f)의 '인쇄쪽 → 조각 번호' 오프셋을 쪽에 인쇄된 쪽번호로 자동 판별한다.
사용: python engine/page_offset.py <책id> [원문파일]      모듈: detect(path) -> (offset 또는 None, 근거 dict)
오프셋 = 조각 번호(1부터) − 인쇄쪽. 즉 인쇄쪽 N은 조각 N+offset.
쪽번호는 각 쪽의 숫자만 있는 줄과 마지막 줄의 '문구 N' / 'N 문구' 표기에서 읽는다. 쪽번호가 안 읽히는 쪽은 건너뛰고
최빈값이 8표 이상이고 2등의 2배 이상이어야 결과를 낸다(아니면 None: 호출한 쪽이 문서 값 등으로 대신한다)."""
import re, sys, collections
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent


def printed_nums(piece):
    ls = [l.strip() for l in piece.split("\n") if l.strip()]
    out = []
    for l in ls[:2] + ls[-3:]:
        if re.fullmatch(r"\d{1,3}", l):
            out.append(int(l))
    if ls:
        last = ls[-1]
        m = re.fullmatch(r"\D.{0,30}?\s(\d{1,3})", last) or re.fullmatch(r"(\d{1,3})\s\D.{0,30}", last)
        if m:
            out.append(int(m.group(1)))
    return out


def detect(path):
    pieces = Path(path).read_text(encoding="utf-8", errors="ignore").split("\f")
    votes = collections.Counter()
    for i, pc in enumerate(pieces, 1):
        for n in printed_nums(pc):
            if 0 < n < 400:
                votes[i - n] += 1
    top = dict(votes.most_common(4))
    if not votes:
        return None, {"조각": len(pieces), "사유": "쪽번호를 읽지 못함"}
    off, cnt = votes.most_common(1)[0]
    total = sum(votes.values())
    second = votes.most_common(2)[1][1] if len(votes) > 1 else 0
    if cnt < 8 or cnt < 2 * second:
        return None, {"조각": len(pieces), "표": top, "사유": "표가 모자라거나 갈림(신뢰 부족)"}
    return off, {"조각": len(pieces), "표": top, "일치": "%d/%d" % (cnt, total)}


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    book = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "교과서.txt"
    f = ROOT / "drafts" / book / "src" / name
    print(book, name, detect(f))
