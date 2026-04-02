# Project Instructions for Codex

`CLAUDE.md` in the repository root is the baseline instruction set for this project.

All file references below are repository-root relative for the current workspace.

## Required Workflow

Before starting any substantial task in this repository:

1. Read `./CLAUDE.md`.
2. Read `./CODEX_LEARNINGS.md`.
3. For MAYAK product intent, methodology, analytics, role logic, Master workflows, or scenario design, also read:
   - `./docs/local-product-context/README.md`
   - `./docs/local-product-context/mayak-patent-full.md`
   - `./docs/local-product-context/mayak-master-guide-full.md`
4. Treat `CLAUDE.md` as the source of truth for repository architecture, ownership boundaries, data formats, and MAYAK-specific behavior.
5. In `CLAUDE.md`, use the split intentionally:
   - `Portal / Platform` for shared app structure and non-MAYAK areas
   - `MAYAK` for trainer, admin, sessions, onboarding, results, and Telegram-related flows
6. If a task changes portal structure, MAYAK architecture, API/data contracts, core runtime logic, or active-vs-legacy routing assumptions in a meaningful way, update `CLAUDE.md` in the same task so it stays current.

## Self-Learning Rule

- When you encounter a new bug, failure mode, integration trap, or project-specific pitfall for the first time and find a verified fix, automatically record it in `./CODEX_LEARNINGS.md` in the same task without waiting for a separate user request.
- Each learning entry must be short and reusable: problem, root cause, working fix, and prevention rule.
- Before doing similar work later, apply the recorded learning instead of repeating the same failed approach.
- When an existing learning becomes outdated or incomplete, update it automatically as part of the current task.
- If the learning changes the long-term project contract or MAYAK architecture, also reflect it in `CLAUDE.md`.

## Scope Guardrails

- Work across the whole repository when the task requires it, but keep the distinction between the shared portal/platform layer and the MAYAK domain explicit.
- Do not modify unrelated areas of the project unless they are part of the requested change or are required to keep the system consistent.
- For non-MAYAK portal tasks, verify whether the real business logic lives in this repo or is only proxied here to `https://api.rosdk.ru`.
- Preserve the MAYAK content model built around `sectionId` as the slug identifier and `taskRange` as the navigation constraint.

## High-Priority Rules

- `sectionId` is the folder slug and is not interchangeable with the numeric range.
- `manifest.json` stores slugs, not numeric ranges.
- Text fields and uploaded file fields in MAYAK tasks are separate concepts; do not collapse them.
- When saving MAYAK section data, do not overwrite `meta.json` destructively.
- MAYAK admin auth and portal auth are separate systems; do not conflate them during refactors.
- Keep compatibility with existing MAYAK tokens, admin flows, Telegram bot flows, and JSON-backed storage unless the task explicitly requires changing them.

If this file conflicts with `CLAUDE.md`, follow `CLAUDE.md`.
