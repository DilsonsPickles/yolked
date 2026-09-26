"""One-off: extract routine lines + anchored video links from a MoveMore programme PDF.

Usage:
  python scripts/movemore/extract_pdf.py "<programme.pdf>" data/movemore/B1P1.raw.json

Requires: pip install pypdf

The PDF lays each exercise out in columns: "A1." + name on the left, a lone
"-" separator at a fixed x position, then the prescription on the right. Video
links are PDF link annotations; each is matched to the text fragments that sit
inside its rectangle, which gives the anchor text (usually the exercise name,
sometimes a side note like "review 'In Focus'").
"""
import json
import re
import sys

from pypdf import PdfReader

PAGE_TITLES = {3: "Projects", 4: "SSP", 5: "UBSM", 6: "LBC"}
LABEL_RE = re.compile(r"^(?P<label>[A-H]\d{1,2})\.\s*(?P<name>.+)$")
PROJECT_RE = re.compile(r"^•\s*(?P<name>.+)$")
ROUNDS_RE = re.compile(r"^\d+(?:-\d+)?\s*rounds?\b", re.IGNORECASE)
HEADINGS = (
    "Prehabilitation & preparation:",
    "Main-body:",
    "Auxiliary & finishing:",
    "SSP A",
    "SSP B",
    "Movement Projects:",
    "Upper-body Strength & Mobility",
    "Lower-body Complexity",
)
SEPARATOR_X = (300.0, 316.0)


def norm(text):
    return re.sub(r"\s+", " ", text).strip()


def page_rows(page):
    """Return [(y, [(x, text), ...])] top-to-bottom, fragments left-to-right."""
    frags = []

    def visit(text, cm, tm, fd, fs):
        if text:
            frags.append((tm[4], tm[5], text))

    page.extract_text(visitor_text=visit)
    rows = {}
    for x, y, t in frags:
        rows.setdefault(round(y), []).append((x, t))
    return [(y, sorted(rows[y], key=lambda f: f[0])) for y in sorted(rows, reverse=True)]


def page_links(page):
    links = []
    for a in page.get("/Annots") or []:
        a = a.get_object()
        uri = (a.get("/A") or {}).get("/URI")
        if uri and ("youtu" in uri or "drive.google" in uri):
            x0, y0, x1, y1 = [float(v) for v in a["/Rect"]]
            links.append((x0, y0, x1, y1, uri))
    return links


def links_on_row(y, parts, links):
    here = []
    for x0, y0, x1, y1, uri in links:
        if y0 - 2 <= y <= y1 + 2:
            anchor = norm("".join(t for x, t in parts if x0 - 3 <= x <= x1 + 3))
            anchor = re.sub(r"\s*-$", "", anchor)
            here.append((x0, {"anchor": anchor, "url": uri}))
    return [link for _, link in sorted(here, key=lambda h: h[0])]


def split_at(parts, i):
    left = norm("".join(t for _, t in parts[:i]))
    right = norm("".join(t for _, t in parts[i + 1 :]))
    return left, right


def split_columns(parts, labelled):
    """Split fragments at the separator dash. Returns (left, right) or None.

    Prefer the fixed separator column; labelled lines on pages with a different
    layout fall back to the first dash surrounded by whitespace fragments.
    """
    for i, (x, t) in enumerate(parts):
        if t == "-" and SEPARATOR_X[0] <= x <= SEPARATOR_X[1]:
            return split_at(parts, i)
    if labelled:
        for i in range(1, len(parts) - 1):
            if (
                parts[i][1] == "-"
                and parts[i - 1][1].strip() == ""
                and parts[i + 1][1].strip() == ""
            ):
                return split_at(parts, i)
    return None


BENCHMARK_RE = re.compile(r"^\d+\s*(?:”|\"|″|’|'|′)\s")


def classify(parts, links, page_title):
    # Footnote markers ("**C1. Split squat") are not part of the label.
    parts = [(x, t.lstrip("*")) for x, t in parts]
    text = norm("".join(t for _, t in parts))
    if not text:
        return None
    if any(text.startswith(h) for h in HEADINGS):
        return {"kind": "heading", "text": text, "links": links}
    if ROUNDS_RE.match(text):
        return {"kind": "rounds", "text": text, "links": links}

    m = LABEL_RE.match(text)
    p = PROJECT_RE.match(text)
    if not (m or p):
        return None
    cols = split_columns(parts, labelled=bool(m))
    if cols:
        left, prescription = cols
    else:
        left, prescription = text, ""
    lm = LABEL_RE.match(left)
    pm = PROJECT_RE.match(left)
    if lm:
        return {
            "kind": "exercise",
            "text": text,
            "label": lm.group("label"),
            "name": lm.group("name").strip(),
            "prescription": prescription,
            "links": links,
        }
    if pm:
        name = pm.group("name").strip()
        if page_title == "Projects":
            if not links or not BENCHMARK_RE.match(name):
                return None  # reading list, blog links
            return {"kind": "benchmark", "text": text, "name": name, "links": links}
        return {
            "kind": "project",
            "text": text,
            "name": name,
            "prescription": prescription,
            "links": links,
        }
    return None


def main(pdf_path, out_path):
    reader = PdfReader(pdf_path)
    cover = reader.pages[0].extract_text()
    phase = re.search(r"/ (B\dP\d) \(([^)]+)\)", cover)
    if not phase:
        raise SystemExit("Could not find phase/dates on the cover page")

    pages = []
    for num, title in PAGE_TITLES.items():
        page = reader.pages[num - 1]
        links = page_links(page)
        lines = []
        for y, parts in page_rows(page):
            line = classify(parts, links_on_row(y, parts, links), title)
            if line:
                lines.append(line)
        pages.append({"page": num, "title": title, "lines": lines})

    data = {"phase": phase.group(1), "dates": phase.group(2), "pages": pages}
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    summary = ", ".join(
        f"{p['title']}: {sum(1 for l in p['lines'] if l['kind'] == 'exercise')} ex / "
        f"{sum(1 for l in p['lines'] if l['kind'] == 'rounds')} rounds"
        for p in pages
    )
    print(f"wrote {out_path} ({data['phase']}, {data['dates']}): {summary}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
