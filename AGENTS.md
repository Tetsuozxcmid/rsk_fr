# Project Instructions for Codex

`CLAUDE.md` in the repository root is the baseline instruction set for this project.

## Required Workflow

Before starting any substantial task in this repository:

1. Read `D:\mayak-test\rsk_fr\CLAUDE.md`.
2. Read `D:\mayak-test\rsk_fr\CODEX_LEARNINGS.md`.
3. For MAYAK product intent, methodology, analytics, role logic, Master workflows, or scenario design, also read:
   - `D:\mayak-test\rsk_fr\docs\local-product-context\README.md`
   - `D:\mayak-test\rsk_fr\docs\local-product-context\mayak-patent-full.md`
   - `D:\mayak-test\rsk_fr\docs\local-product-context\mayak-master-guide-full.md`
4. Treat `CLAUDE.md` as the source of truth for project architecture, allowed scope, data formats, and MAYAK-specific behavior. Treat the two extracted full-text files as the baseline product-context supplements.
5. If a task changes MAYAK architecture, API, data structure, core logic, or the default product-context contract in a meaningful way, update `CLAUDE.md` in the same task so it stays current.

## Self-Learning Rule

- When you encounter a new bug, failure mode, integration trap, or project-specific pitfall for the first time and find a verified fix, automatically record it in `D:\mayak-test\rsk_fr\CODEX_LEARNINGS.md` in the same task without waiting for a separate user request.
- Each learning entry must be short and reusable: problem, root cause, working fix, and prevention rule.
- Before doing similar work later, apply the recorded learning instead of repeating the same failed approach.
- When an existing learning becomes outdated or incomplete, update it automatically as part of the current task.
- If the learning changes the long-term project contract or MAYAK architecture, also reflect it in `CLAUDE.md`.

## Scope Guardrails

- Work only on the MAYAK trainer and its related admin/API/bot functionality.
- Do not modify non-MAYAK parts of the project unless the user explicitly overrides this rule.
- Preserve the MAYAK content model built around `sectionId` as the slug identifier and `taskRange` as the navigation constraint.

## High-Priority Rules

- `sectionId` is the folder slug and is not interchangeable with the numeric range.
- `manifest.json` stores slugs, not numeric ranges.
- Text fields and uploaded file fields in MAYAK tasks are separate concepts; do not collapse them.
- When saving MAYAK section data, do not overwrite `meta.json` destructively.
- Keep compatibility with existing MAYAK tokens, admin flows, Telegram bot flows, and JSON-backed storage unless the task explicitly requires changing them.

If this file conflicts with `CLAUDE.md`, follow `CLAUDE.md`.
