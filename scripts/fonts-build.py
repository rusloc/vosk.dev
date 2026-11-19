"""Build the self-hosted woff2 files in src/fonts/ from Google Fonts' own sources (google/fonts, pinned commit).

Why: next/font/google downloads fonts during `next build`, and on 2026-11-18 three of five Vercel production builds
failed on that download. These files replace the download; next/font/local reads them from the repo.

Each face is cut to the same character sets Google serves for it (the unicode ranges below, copied from Google's CSS),
keeps every OpenType feature (the reports use tabular numbers), and pins the axes Google pins when only weights are
requested (Inter opsz 14, IBM Plex Sans wdth 100). Weight ranges follow what each font module asked Google for.

Run from the repo root (needs network; fonttools + brotli come from uv, nothing is installed in the project):
    uv run --with fonttools --with brotli python scripts/fonts-build.py
"""

import io
import pathlib
import sys
import urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

COMMIT = "5bd87dfc525c8a0d1d8529d3684716e00c3fc59a"  # google/fonts main, 2026-11-18
RAW = f"https://raw.githubusercontent.com/google/fonts/{COMMIT}/ofl"
OUT = pathlib.Path("src/fonts")
CACHE = pathlib.Path.home() / ".cache" / "vosk-fonts" / COMMIT

LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
LATIN_EXT = "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF"
CYRILLIC = "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116"
CYRILLIC_EXT = "U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F"

# The ru pages are parked with English text (11-19: 0 Cyrillic characters on /ru), and Cyrillic adds ~20 kB to the two
# fonts every page preloads. When ru gets real Russian copy, add CYRILLIC + CYRILLIC_EXT here and re-run.
SITE = [LATIN, LATIN_EXT]
REPORT = [LATIN, LATIN_EXT]  # the reports are English

# (output file, source path under ofl/, axis limits, ranges)
FACES = [
    ("geist/Geist-Variable.woff2", "geist/Geist[wght].ttf", {}, SITE),
    ("geist/GeistMono-Variable.woff2", "geistmono/GeistMono[wght].ttf", {}, SITE),
    ("inter/Inter-Variable.woff2", "inter/Inter[opsz,wght].ttf", {"opsz": 14, "wght": (400, 800)}, REPORT),
    ("manrope/Manrope-Variable.woff2", "manrope/Manrope[wght].ttf", {"wght": (600, 700)}, REPORT),
    ("ibm-plex/IBMPlexSans-Variable.woff2", "ibmplexsans/IBMPlexSans[wdth,wght].ttf", {"wdth": 100, "wght": (400, 700)}, REPORT),
    ("ibm-plex/IBMPlexSans-Italic-Variable.woff2", "ibmplexsans/IBMPlexSans-Italic[wdth,wght].ttf", {"wdth": 100, "wght": (400, 700)}, REPORT),
] + [
    (f"ibm-plex/IBMPlexSansCondensed-{s}.woff2", f"ibmplexsanscondensed/IBMPlexSansCondensed-{s}.ttf", None, REPORT)
    for s in ["Regular", "Italic", "Medium", "MediumItalic", "SemiBold", "SemiBoldItalic", "Bold", "BoldItalic"]
]
LICENSES = {"geist": "geist", "inter": "inter", "manrope": "manrope", "ibm-plex": "ibmplexsans"}


def fetch(path: str) -> bytes:
    f = CACHE / path
    if not f.exists():
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_bytes(urllib.request.urlopen(f"{RAW}/{path}").read())
    return f.read_bytes()


def unicodes(ranges: list[str]) -> list[int]:
    out: list[int] = []
    for part in ",".join(ranges).split(","):
        a, _, b = part.removeprefix("U+").partition("-")
        out.extend(range(int(a, 16), int(b or a, 16) + 1))
    return out


def build(dest: str, src: str, axes: dict | None, ranges: list[str]) -> None:
    font = TTFont(io.BytesIO(fetch(src)), lazy=False)
    if axes:
        font = instancer.instantiateVariableFont(font, axes)
    if "gvar" in font:  # glyphs without variation data are absent from gvar, which the subsetter can't handle
        gv = font["gvar"]
        v = gv.variations
        gv.variations = {g: (v[g] if g in v else []) for g in font.getGlyphOrder()}
    opts = subset.Options()
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.hinting = False
    opts.flavor = "woff2"
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=unicodes(ranges))
    sub.subset(font)
    out = OUT / dest
    out.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff2"
    font.save(out)
    print(f"{out}  {out.stat().st_size / 1024:.1f} kB")


if __name__ == "__main__":
    for face in FACES:
        build(*face)
    for folder, ofl in LICENSES.items():
        (OUT / folder / "OFL.txt").write_bytes(fetch(f"{ofl}/OFL.txt"))
    (OUT / "ibm-plex" / "OFL-condensed.txt").write_bytes(fetch("ibmplexsanscondensed/OFL.txt"))
    (OUT / "geist" / "OFL-mono.txt").write_bytes(fetch("geistmono/OFL.txt"))
    sys.exit(0)
