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
    subprocess.run([browser, "--headless", "--disable-gpu", "--hide-scrollbars", "--virtual-time-budget=2500", "--window-size=%d,%d" % (w, h),
                    "--screenshot=" + str(png), url], capture_output=True, timeout=120)


def page_height(browser, f, w):
    """해당 폭에서 페이지 전체 높이(px)를 잰다(스크립트가 title에 높이를 적게 한 뒤 DOM을 덤프)."""
    t = Path(f).read_text(encoding="utf-8").replace("</body>", "<script>window.addEventListener('load',function(){setTimeout(function(){document.title='H'+Math.max(document.documentElement.scrollHeight,document.body.scrollHeight);},300);});</script></body>")
    g = Path(f).with_name(Path(f).stem + "_h.html"); g.write_text(t, encoding="utf-8")
    r = subprocess.run([browser, "--headless", "--disable-gpu", "--virtual-time-budget=3000", "--window-size=%d,900" % max(w, 500), "--dump-dom", "file:///" + str(g).replace("\\", "/")], capture_output=True, timeout=120)
    m = re.search(rb"<title>H(\d+)</title>", r.stdout)
    return min(int(m.group(1)) if m else 6000, 16000)


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
    from concurrent.futures import ThreadPoolExecutor
    for sz in sizes:
        w, h = SIZES[sz]; d = out / sz; d.mkdir(exist_ok=True)
        jobs = []
        if sz in ("tabp", "phone"):
            # 세로·폰은 슬라이드가 카드로 세로로 이어지는 한 장짜리 화면이라, 쪽 전체 높이로 한 번에 찍는다(s00_full.png)
            f = work / ("%s_full.html" % sz); f.write_text(html, encoding="utf-8")
            hh = page_height(br, f, w)
            if sz == "phone":
                wrap = work / "phone_full_wrap.html"
                wrap.write_text('<body style="margin:0;background:#888"><iframe src="phone_full.html" width="390" height="%d" style="border:0;display:block"></iframe></body>' % hh, encoding="utf-8")
                jobs.append((wrap, d / "s00_full.png", 500, hh + 20))
            else:
                jobs.append((f, d / "s00_full.png", w, hh + 20))
            only_sz = []
        else:
            only_sz = only
        for i in only_sz:
            inj = "<script>for(var q=0;q<%d;q++)document.getElementById('next').click();</script></body>" % (i - 1)
            f = work / ("%s%02d.html" % (sz, i)); f.write_text(html.replace("</body>", inj), encoding="utf-8")
            jobs.append((f, d / ("s%02d.png" % i), w, h))
        with ThreadPoolExecutor(max_workers=4) as ex:
            list(ex.map(lambda j: shot(br, "file:///" + str(j[0]).replace("\\", "/"), j[1], j[2], j[3]), jobs))
        print("%s: %d장 → %s" % (sz, len(jobs), d))
        if sz in ("tabp", "phone"): continue
        try:
            from PIL import Image
            ims = [Image.open(d / ("s%02d.png" % i)) for i in only if (d / ("s%02d.png" % i)).exists()]
            if ims:
                cols = 3 if sz in ("desk", "tabl") else 4; tw = 640 if sz in ("desk", "tabl") else 400
                th = int(ims[0].height * tw / ims[0].width); rows = (len(ims) + cols - 1) // cols
                sheet = Image.new("RGB", (cols * tw, rows * th), "white")
                for k, im in enumerate(ims): sheet.paste(im.convert("RGB").resize((tw, th)), ((k % cols) * tw, (k // cols) * th))
                sheet.save(out / (sz + "_sheet.png"))
        except ImportError:   # Pillow가 없으면 이미지 격자 HTML을 Edge로 찍어 같은 모음 그림을 만든다
            names = [("s%02d.png" % i) for i in only if (d / ("s%02d.png" % i)).exists()]
            if names:
                cols = 3 if sz in ("desk", "tabl") else 4; tw = 640 if sz in ("desk", "tabl") else 400
                rows = (len(names) + cols - 1) // cols; w0, h0 = SIZES[sz]; th = int(tw * (h0 if sz != "phone" else h0 * 2) / (w0 if sz != "phone" else 500))
                grid = "".join('<img src="%s/%s" style="width:%dpx;display:block">' % (sz, n, tw) for n in names)
                page = out / (sz + "_sheet.html")
                page.write_text('<body style="margin:0;background:#fff"><div style="display:grid;grid-template-columns:repeat(%d,%dpx)">%s</div></body>' % (cols, tw, grid), encoding="utf-8")
                shot(br, "file:///" + str(page).replace("\\", "/"), out / (sz + "_sheet.png"), cols * tw, rows * th + 20)
    print("캡처 폴더:", out)


if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(__doc__)
    main(sys.argv[1:])
