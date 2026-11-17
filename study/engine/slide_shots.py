"""슬라이드 화면 캡처(검수용): 한 단원의 slides.html 을 4가지 화면 크기로 장마다 찍고 한 장짜리 모음(contact sheet)을 만든다.
사용: python engine/slide_shots.py <slides.html 경로 또는 책id 단원id> [--out 폴더] [--only 1,5,9] [--sizes desk,tabl,tabp,phone]
화면 크기: desk=1920×1080(데스크톱) · tabl=1280×800(갤럭시탭 S10 FE 가로, 16:10) · tabp=800×1280(탭 세로) · phone=390×844(폰, 카드 배치)
출력: <out>/<크기>/sNN.png, <out>/<크기>_sheet.png (Pillow가 있으면). 기본 out = 임시 폴더(출력 경로를 알려 준다).
Edge(헤드리스)를 쓴다. 한 장씩 '다음' 버튼을 눌러 넘긴 화면을 찍는다(편집 모드·진행 표시 포함)."""
import sys, os, io, re, subprocess, tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
EDGES = [r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", r"C:\Program Files\Microsoft\Edge\Application\msedge.exe", r"C:\Program Files\Google\Chrome\Application\chrome.exe"]
SIZES = {"desk": (1920, 1080), "tabl": (1280, 800), "tabp": (800, 1280), "phone": (390, 844)}


def edge():
    for e in EDGES:
        if os.path.exists(e): return e
    sys.exit("Edge/Chrome 을 찾지 못했어요")


def shot(browser, url, png, w, h):
    subprocess.run([browser, "--headless", "--disable-gpu", "--hide-scrollbars", "--virtual-time-budget=6000", "--window-size=%d,%d" % (w, h),
                    "--screenshot=" + str(png), url], capture_output=True, timeout=120)


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    opt = lambda k, d=None: argv[argv.index(k) + 1] if k in argv and argv.index(k) + 1 < len(argv) else d
    if len(args) >= 2 and not args[0].lower().endswith(".html"): src = ROOT / "library" / args[0] / args[1] / "slides.html"
    else: src = Path(args[0])
    html = src.read_text(encoding="utf-8")
    n = len(re.findall(r'<section class="slide', html))
    out = Path(opt("--out") or tempfile.mkdtemp(prefix="slideshots_"))
    only = [int(x) for x in opt("--only").split(",")] if opt("--only") else list(range(1, n + 1))
    sizes = (opt("--sizes") or "desk,tabl,tabp,phone").split(",")
    br = edge(); work = out / "_work"; work.mkdir(parents=True, exist_ok=True)
    for sz in sizes:
        w, h = SIZES[sz]; d = out / sz; d.mkdir(exist_ok=True)
        for i in only:
            inj = "<script>for(var q=0;q<%d;q++)document.getElementById('next').click();</script></body>" % (i - 1)
            if sz == "phone":   # 헤드리스 창이 500px 밑으로 안 줄어서 390px 틀(iframe) 안에 넣어 찍는다
                inner = work / ("p%02d.html" % i); inner.write_text(html.replace("</body>", inj), encoding="utf-8")
                wrap = work / ("w%02d.html" % i)
                wrap.write_text('<body style="margin:0;background:#888"><iframe src="p%02d.html" width="390" height="%d" style="border:0;display:block"></iframe></body>' % (i, h * 2), encoding="utf-8")
                shot(br, "file:///" + str(wrap).replace("\\", "/"), d / ("s%02d.png" % i), 500, h * 2)
            else:
                f = work / ("%s%02d.html" % (sz, i)); f.write_text(html.replace("</body>", inj), encoding="utf-8")
                shot(br, "file:///" + str(f).replace("\\", "/"), d / ("s%02d.png" % i), w, h)
        print("%s: %d장 → %s" % (sz, len(only), d))
        try:
            from PIL import Image
            ims = [Image.open(d / ("s%02d.png" % i)) for i in only if (d / ("s%02d.png" % i)).exists()]
            if ims:
                cols = 3 if sz in ("desk", "tabl") else 4; tw = 640 if sz in ("desk", "tabl") else 400
                th = int(ims[0].height * tw / ims[0].width); rows = (len(ims) + cols - 1) // cols
                sheet = Image.new("RGB", (cols * tw, rows * th), "white")
                for k, im in enumerate(ims): sheet.paste(im.convert("RGB").resize((tw, th)), ((k % cols) * tw, (k // cols) * th))
                sheet.save(out / (sz + "_sheet.png"))
        except ImportError:
            pass
    print("캡처 폴더:", out)


if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(__doc__)
    main(sys.argv[1:])
