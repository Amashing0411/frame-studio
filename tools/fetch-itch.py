# Free ("name your own price") download of every file on an itch.io page, the way the site's own Download button does it:
# page -> csrf token -> /download_url -> download page -> /file/<upload_id> (free files need no key) -> CDN url.
#   python -I tools/fetch-itch.py <author> <game> <outdir>      e.g. ggbot psx-style-cars qa/asset-src/itch/psx-style-cars
# Pause between packs: itch.io answers 429 (too many requests) to quick repeats.
import sys, os, re, html, json, urllib.request, urllib.parse, http.cookiejar
a, g, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'
jar = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def req(url, data=None, xhr=False):
    r = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode() if data else None, headers={'User-Agent': UA, **({'X-Requested-With': 'XMLHttpRequest'} if xhr else {})})
    return op.open(r, timeout=120).read()
tok = lambda h: re.search(r'name="csrf_token" value="([^"]+)"', h).group(1)
base = f'https://{a}.itch.io/{g}'
page = req(base).decode('utf8', 'ignore')
dl = json.loads(req(base + '/download_url', {'csrf_token': tok(page)}, True))['url']
key = dl.split('/download/')[1]
page = req(dl).decode('utf8', 'ignore')
t2 = tok(page)
for m in re.finditer(r'data-upload_id="(\d+)".*?<strong[^>]*class="name"[^>]*>(.*?)</strong>.*?class="file_size"><span>(.*?)</span>', page, re.S):
    uid, name, size = m.group(1), html.unescape(re.sub(r'<[^>]+>', '', m.group(2))).strip(), m.group(3)
    info = json.loads(req(f'{base}/file/{uid}?source=game_download', {'csrf_token': t2}, True))
    if 'url' not in info: print('no url for', name, json.dumps(info)[:300]); continue
    safe = re.sub(r'[^A-Za-z0-9._-]', '_', name)
    data = urllib.request.urlopen(urllib.request.Request(info['url'], headers={'User-Agent': UA}), timeout=300).read()
    open(os.path.join(out, safe), 'wb').write(data)
    print(f'{g} | {name} | listed {size} | got {len(data)} bytes', flush=True)
