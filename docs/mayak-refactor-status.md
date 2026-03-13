# MAYAK Refactor Status

## Rules

- Update this file after every important MAYAK architectural or refactoring change.
- Update this file before any likely context compression point.
- After context compression, read this file first before continuing MAYAK work.
- Use this file for progress/status, not `CODEX_LEARNINGS.md`.
- Use `CODEX_LEARNINGS.md` only for reusable pitfalls, root causes, fixes, and prevention rules.

## Current Goal

Stabilize MAYAK architecture around:
- server-side content storage and API access,
- safer admin auth,
- cleaner trainer orchestration,
- predictable runtime behavior after content edits.

## Done Today

### Security and access

- Removed hardcoded MAYAK admin password usage from client/admin API flow.
- Added server-side MAYAK admin auth with httpOnly cookie.
- Switched MAYAK admin login to `MAYAK_ADMIN_PASSWORD` env.
- Removed old client-side token bypass logic from `tools-2` trainer flow.
- Removed server-side bypass token handling from `/api/mayak/validate-token`.
- Reintroduced `fffff` only for localhost development through API behavior, not as a production bypass.

### Content architecture

- Added shared MAYAK content storage layer in `src/lib/mayakContentStorage.js`.
- Added runtime content APIs:
  - `/api/mayak/content-bundle`
  - `/api/mayak/content-file`
  - `/api/mayak/settings`
- Switched MAYAK admin preview/file access to `content-file` API.
- Switched MAYAK v2 runtime loading in `useMayakTaskManager` from direct `/tasks-2/v2/*.json` fetches to `content-bundle` and `content-file` APIs.
- Local content was verified to work through `data/mayak-content`.
- Added shared MAYAK questionnaire-link settings in `data/mayak-settings.json` with admin editing in `/admin/mayak-content`.


### Storage hardening

- Hardened `getMayakContentDir()` so default fallback selection prefers a valid MAYAK storage, not just the first existing directory.
- Kept explicit `MAYAK_CONTENT_DIR` as the authoritative server override when set.
- Added atomic JSON writes in `mayakContentStorage.js`.
- Switched MAYAK admin task saves to `writeSectionJson()` so `index.json`, `TaskText.json`, and merged `meta.json` writes use the atomic storage path.
### Content admin hardening

- Repaired legacy-broken range data in storage:
  - `301-400-2/index.json`
  - `9001-9100/index.json`
- Restored missing task numbers and standard task shape for those sections.
- Added missing `9001-9100/meta.json`.

- Confirmed `sectionId` remains the slug identifier.
- Confirmed `meta.json` is updated non-destructively for `rangeName`.
- Added validation in admin tasks save flow for missing and duplicate task numbers.
- Investigated broken sections where `index.json` had lost `number` fields.

### Trainer refactor

- Reduced `src/components/features/tools-2/trainer.js` substantially from the original monolith.
- Extracted multiple hooks/utilities/components, including:
  - `useMayakQwenEvaluation`
  - `useMayakTaskManager`
  - `useMayakAccessGate`
  - `useMayakRuntimeData`
  - `useMayakPromptActions`
  - `useMayakCompletionActions`
  - `useMayakTaskExecutionActions`
  - `useMayakPopupState`
  - `useMayakTypeUiState`
  - `useMayakQuestionnaireActions`
  - `useMayakConfirmationActions`
  - `useMayakPopupActions`
  - `useMayakSessionActions`
  - `useMayakBufferActions`
  - `useMayakTrainerControlActions`
  - `useMayakPageActions`
  - `useMayakModalActions`
  - `TrainerUiSections`
  - `MayakServicesPanel`
  - `InstructionImageModal`
  - `TrainerPopups`
  - prompt/history/buffer/copy/session document helpers
- Fixed a long chain of runtime regressions caused by the extraction process:
  - missing imports,
  - missing state,
  - missing helpers like `isIntroTask` and `formatTaskTime`,
  - lost wiring between trainer and new hooks.
- Restored `trainer.js` to a syntactically valid state after each unstable refactor segment.

### Qwen and scoring

- Kept new score model:
  - score = green field count / 7
  - 1-2 red
  - 3-5 yellow
  - 6-7 green
- Moved Qwen evaluation logic into dedicated hook layer.

## Current State

- MAYAK content admin is on the new auth model.
- MAYAK v2 runtime content now goes through API instead of direct public JSON fetches.
- `trainer.js` is much smaller and closer to orchestration-only, but still needs behavioral smoke-check.
- Storage directory selection now prefers an explicit MAYAK_CONTENT_DIR when set, otherwise the first valid MAYAK storage instead of the first merely existing directory.
- The largest remaining trainer risk is behavioral regression, not syntax.

## Remaining Work

### High priority

1. Smoke-check the main MAYAK trainer flows after the latest refactor:
   - token entry,
   - task navigation,
   - prompt creation/copy,
   - buffer,
   - instructions/materials,
   - Qwen evaluation,
   - completion popups.
2. Content storage selection and JSON save path were hardened: valid storage detection plus atomic JSON writes are now in place.

### Medium priority

1. Review upload architecture (`base64` JSON upload vs multipart).
2. Continue reducing page-local orchestration in `trainer.js` only after smoke-check passes.
3. Reassess whether any extracted hook is becoming a new mini-monolith.

## Server Changes To Remember Later

- Set `MAYAK_ADMIN_PASSWORD` in server environment.
- Set `MAYAK_CONTENT_DIR` to the real server MAYAK content directory if needed.
- Verify admin login through `/api/admin/mayak-auth` after deploy.
- Verify runtime `content-bundle` / `content-file` behavior after deploy.
- Verify regular token flow works and old production bypasses do not.

## Stopping Rule For This Refactor Stage

Stop this stage when:
- there are no runtime `ReferenceError` issues,
- main MAYAK user flows pass smoke-check,
- `trainer.js` is primarily orchestration,
- the next refactor step would mostly move state around without clear architectural gain.
### Follow-up checks on 2026-03-11

- Confirmed `ADMIN-BYPASS-TOKEN` is no longer present in runtime MAYAK code; current localhost-only bypass is `fffff` via `/api/mayak/validate-token` with `isBypass` flag.
- Confirmed current local bypass still maps to `isAdmin` inside `useMayakAccessGate`, which explains admin-like behavior under `fffff`.
- Fixed broken `Пройти Тестирование` trigger in `useMayakTrainerControlActions.js`; the handler had a corrupted Cyrillic string and no longer opened the ranking popup for those tasks.
- Reconfirmed content contract: admin save writes to shared storage through `mayakContentStorage.js`, and MAYAK v2 runtime reads through `content-bundle` / `content-file` from the same storage root.
- Switched localhost bypass flow from plain `fffff` to `fffff + MAYAK admin password` through `/api/admin/mayak-auth`.
- Added automatic cleanup of legacy `ADMIN-BYPASS-TOKEN` from `activated_key` cookie on MAYAK settings load.
- Tightened `useMayakAccessGate` so bypass token access requires an authenticated MAYAK admin cookie before opening the trainer.

