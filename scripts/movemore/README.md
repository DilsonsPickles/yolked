# MoveMore programme import

Turns the trainer's programme PDFs (Block 1 Phase 1 and Phase 2) into seeded
exercises, workouts with blocks, and goal ladders. The PDFs themselves are not
committed; the extracted data under `data/movemore/` is.

## 1. Extract (one-off, Python)

```bash
pip install pypdf
python scripts/movemore/extract_pdf.py "<B1P1.pdf>" data/movemore/B1P1.raw.json
python scripts/movemore/extract_pdf.py "<B1P2.pdf>" data/movemore/B1P2.raw.json
```

Emits one entry per routine line (heading, exercise, rounds, project,
benchmark) with the YouTube links anchored on that line, resolved from the
PDF's link annotations by position.

## 2. Parse (TypeScript, tested)

```bash
npm run movemore:parse
```

Reads `*.raw.json`, parses prescriptions (`6-8x [3012]`, `DS: 20”, 15”, 10”`)
and block rounds/rest, dedupes exercises across routines, and writes
`data/movemore/B1P1.json` and `B1P2.json`.

## 3. Seed

```bash
SEED_USER_EMAIL=you@example.com npm run seed:movemore
```

Creates the owned exercises (`mm_*`), the workouts (`B1P1 · SSP A`, …,
`Movement Projects`) and the goal ladders for that user. Re-runnable.
