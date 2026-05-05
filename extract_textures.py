"""
extract_textures.py
Decodes the base64 texture data URLs to PNG files and patches void_walker.html
to load them externally instead.
"""
import base64, re, pathlib, sys

ROOT = pathlib.Path(__file__).parent

def decode_dataurl_file(src_path: pathlib.Path, out_path: pathlib.Path) -> str:
    """Decode a file whose content is a data URL. Returns the full data URL string."""
    raw = src_path.read_text(encoding="utf-8").strip()
    # Format: data:image/png;base64,<b64data>
    header, b64 = raw.split(",", 1)
    png_bytes = base64.b64decode(b64)
    out_path.write_bytes(png_bytes)
    print(f"  Written {out_path.name}  ({len(png_bytes)/1024/1024:.2f} MB)")
    return raw  # the full original data URL string used inside the HTML

# ── 1. Decode textures ───────────────────────────────────────────────────────
print("Decoding textures...")
img2_dataurl = decode_dataurl_file(ROOT / "_img2_dataurl.txt", ROOT / "orb_tex.png")
img1_dataurl = decode_dataurl_file(ROOT / "_img_dataurl.txt",  ROOT / "tile.png")

# ── 2. Patch the HTML ────────────────────────────────────────────────────────
print("\nPatching void_walker.html...")
html_path = ROOT / "void_walker.html"
html = html_path.read_text(encoding="utf-8")

before = len(html)

# Replace each data URL (quoted with single quotes in the source) with the filename
html, n2 = re.subn(re.escape(f"'{img2_dataurl}'"), "'orb_tex.png'", html)
html, n1 = re.subn(re.escape(f"'{img1_dataurl}'"), "'tile.png'", html)

print(f"  Replaced orb_tex  : {n2} occurrence(s)")
print(f"  Replaced tile     : {n1} occurrence(s)  (floor + wall)")

after = len(html)
print(f"\n  HTML size before  : {before/1024/1024:.2f} MB")
print(f"  HTML size after   : {after/1024/1024:.2f} MB")
print(f"  Saved             : {(before-after)/1024/1024:.2f} MB")

if n2 == 0 and n1 == 0:
    print("\nWARNING: No replacements made. Data URLs in HTML may not match the .txt files exactly.")
    sys.exit(1)

html_path.write_text(html, encoding="utf-8")
print("\nDone. Open http://localhost:8080/void_walker.html after running:")
print("  python -m http.server 8080")
