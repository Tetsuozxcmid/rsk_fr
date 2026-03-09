# MAYAK Product Context

This folder contains local product references that clarify what MAYAK is meant to become.

Tracked machine-readable mirrors:

- `mayak-patent-full.md`
- `mayak-master-guide-full.md`

Local source files expected here (gitignored):

- `Патент оформленный.docx`
- `Подробное_описание_МАЯК_для_Мастера_от_03_10_2025 (4).pdf`

The binary source files stay local and gitignored. For model-readable context, use the tracked full-text mirrors first.

## Baseline Context

- MAYAK is not only a prompt-training interface. The long-term product direction is an assessment platform for objective diagnosis of cognitive-behavioral competences.
- The patent draft describes a combined model that correlates three layers of data:
  - intellectual activity (`prompt`, task structure, final result),
  - behavioral metadata (time, interaction patterns, process cost),
  - psychophysiological state (for example heart-rate-derived load).
- The master guide frames MAYAK as a master-led transformation practicum for teams, with staged progression, reflection points, role mechanics, and the `ЗВЕЗДА` maturity model.
- The methodology layer inside this repo is the `МАЯК-ОКО` framework. It is the core lens for task structure, prompt quality assessment, and future diagnostic interpretation.
- The current Next.js project implements the software layer of the product:
  - MAYAK trainer,
  - content/admin/token flows,
  - Telegram bot delivery,
  - analytics/reporting,
  - prep-session support.
- When product intent is ambiguous, use this default order:
  - `README.md`
  - `mayak-patent-full.md`
  - `mayak-master-guide-full.md`

## Practical Working Default

- Treat the current repository as the operational software shell of the broader MAYAK product.
- Preserve compatibility with existing MAYAK trainer flows, but keep in mind that the broader product vision includes richer diagnostics than the current web-only implementation already exposes.
- Do not assume that every concept from the patent is already implemented in code; use the documents as direction, not as proof of existing functionality.
- Prefer the tracked full-text mirrors for model reasoning, summarization, and architecture decisions; open the local binary `docx` or `pdf` only when extraction quality is in doubt.
