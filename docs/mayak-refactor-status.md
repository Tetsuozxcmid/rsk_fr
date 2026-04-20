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
- Replaced the old MAYAK post-token participant form in `tools-2/settings` with the embedded platform auth flow (login, registration, VK, Yandex).
- MAYAK token entry now resumes external Yandex auth back into `/tools/mayak-oko`, while popup-based VK auth is detected in place without leaving the trainer settings flow.
- MAYAK settings now block trainer entry until the platform profile contains at least `Фамилия + Имя`; if an authorized user has no FIO yet, the trainer shows an in-place mandatory FIO form and saves it back into the platform profile before entry.

### Content architecture

- Added shared MAYAK content storage layer in `src/lib/mayakContentStorage.js`.
- Added runtime content APIs:
    - `/api/mayak/content-bundle`
    - `/api/mayak/content-file`
    - `/api/mayak/settings`
- Switched MAYAK admin preview/file access to `content-file` API.
- Switched MAYAK v2 runtime loading in `useMayakTaskManager` from direct `/tasks-2/v2/*.json` fetches to `content-bundle` and `content-file` APIs.
- Added a dedicated MAYAK `maps` attachment channel in storage/admin/runtime with split-view PDF preview in the trainer.
- Local content was verified to work through `data/mayak-content`.
- Added shared MAYAK questionnaire-link settings in `data/mayak-settings.json` with admin editing in `/admin/mayak-content`.
- Telegram bot runtime now also falls back to saved MAYAK settings for token/webhook mode, so webhook configuration survives process restarts and does not silently fall back to polling.
- Added a separate experimental MAYAK session domain in `data/mayak-sessions.json` plus isolated session-token storage in `data/mayak-session-tokens.json`, with admin APIs for create/update/complete and cleanup of `data/mayak-session-files/<sessionId>/`.
- Added experimental session runtime storage in `data/mayak-session-runtime.json` with participant registration, role assignment, inspector queue, review statuses, and session-scoped uploaded review files.
- Session admin now lets the operator set token usage count separately from table count, so one session can have, for example, `3` tables and `100` token uses.
- Session admin now also stores shared review/rework timers per session (`reviewTimeoutSeconds`, `reworkTimeoutSeconds`).
- Session admin now uses one destructive `Р—Р°РІРµСЂС€РёС‚СЊ СЃРµСЃСЃРёСЋ` action in the UI: it fully deletes the session instead of moving it into a visible history section.
- Session admin now also shows registered participants by table and lets the operator manually reassign roles, including the extra reviewer role `РђР”РњРРќРРЎРўР РђРўРћР `.
- Added a separate MAYAK onboarding domain with JSON-backed storage for config, links, and submissions.
- Added public onboarding runtime routes under `/mayak-onboarding/...` for link landing, participant flow, and tech-specialist flow.
- Added dedicated MAYAK onboarding admin surface at `/admin/mayak-onboarding`.
- Added separate onboarding file storage under `data/mayak-onboarding-files/` plus API-backed file serving/upload.
- Onboarding constructor/runtime now support configurable minimum required photo count per checklist section (`minPhotos`) with runtime validation on section completion.
- Onboarding link creation now allows a single required date; `endDate` stays optional and the UI shows one date for single-day events.

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
- Experimental MAYAK sessions now have a dedicated admin surface (`/admin/mayak-sessions`) and remain isolated from the legacy token flow.
- Session creation/editing now keeps an explicit `tokenUsageLimit` field instead of deriving token capacity from `tableCount`.
- Session tokens are now accepted by `/api/mayak/validate-token`, and session-mode registration in `settings` requires a table selection derived from the active session.
- Session-mode registration now also creates a session participant record bound to `sessionId`, `userId`, and `tableNumber`.
- Session trainer flow now supports:
    - one server-enforced inspector per table,
    - one additional server-enforced administrator reviewer per table,
    - participant upload on task completion,
    - blocking next-task navigation while a task is pending review or rejected,
    - inspector review queue with accept/reject and session-configured review/rework timers,
    - inline preview of PDF, images, audio, video, and converted `doc/docx/ppt/pptx` materials.
- MAYAK trainer access now uses portal identity: after token validation, settings reuses the current portal session or shows the embedded portal auth flow, then blocks trainer entry until required profile fields are filled.
- Required portal profile gate for MAYAK is now `NameIRL + Surname + Organization`.
- If portal auth succeeds but the backend responds with `Profile not found`, MAYAK now routes that user into profile completion instead of crashing during the bootstrap fetch.
- `active_user.id` is now the portal user id, and session participant registration reuses that id for idempotent session membership.
- Trainer completion is now finalized server-side through `/api/mayak/completions/finalize`, which stores canonical certificate/log/analytics files in MAYAK storage.
- Personal-cabinet MAYAK history now reads from `/api/mayak/my-history` and downloads canonical artifacts through `/api/mayak/my-history/[runId]/file`.
- Inspector review UI now uses a compact top-right queue with per-task countdown bars and an `РћС‚РєСЂС‹С‚СЊ` action that expands into a split review modal; participants see a matching `Р—Р°РґР°РЅРёРµ РЅР° РїСЂРѕРІРµСЂРєРµ` timer banner while navigation stays blocked.
- Session upload allowlist now also accepts `ppt/pptx`; unsupported preview types fall back to download-only inside the inspector panel.
- `doc/docx` conversion now supports an explicit `MAYAK_LIBREOFFICE_PATH` override before default `soffice/libreoffice` lookup, so server deploys can bind LibreOffice without changing code.
- MAYAK task maps now auto-open as a right-side desktop preview while a task is running and close automatically on task completion.
- MAYAK instructions can now reuse the same right-side preview panel: map opens by default, and the `РРЅСЃС‚СЂСѓРєС†РёСЏ` button toggles instruction preview / return to map.
- The desktop right-side preview panel is now resizable by drag with saved width and desktop-only min/max constraints.
- Storage directory selection now prefers an explicit MAYAK_CONTENT_DIR when set, otherwise the first valid MAYAK storage instead of the first merely existing directory.
- The largest remaining trainer risk is behavioral regression, not syntax.
- Onboarding public flow now uses lighter MAYAK-style white surfaces, inline progress blocks in the hero area, and tech-section validation that highlights missing checklist items/photos before a section can be closed.
- Onboarding admin now uses native date pickers for link creation, removes location from the main create-link flow, and exposes per-section minimum photo count in the constructor.
- Onboarding public landing is now a two-step flow:
  - external questionnaire first, persisted per device via `mayak_onboarding_questionnaire:<slug>` with legacy survey-key fallback
  - role selection plus public progress summary only after the questionnaire link has been opened
- The public questionnaire landing now shows a CTA button, the configured Yandex Form link, and an auto-generated QR code instead of the embedded anonymous survey schema.
- Participant onboarding now always requires both the laptop checklist and service confirmations after laptop-type selection; the ownership choice no longer hides required sections.
- Public onboarding summary now shows:
  - participants with `ФИО`, status, and progress percent
  - tech specialists with `ФИО`, status, progress percent, and uploaded photos
- Tech specialist phone remains admin-only and is excluded from the public summary contract.
- Onboarding admin now supports external questionnaire-link management with auto-generated QR preview instead of embedded survey-schema editing and response export.
- MAYAK admin frontend pages now trust the shared `/api/admin/mayak-auth` cookie directly and redirect unauthenticated users to `/admin?next=...` instead of keeping separate page-local login flows.
- MAYAK settings now build `active_user` from the platform profile snapshot (`portal user id + full name`) and keep the legacy `results.json` snapshot only as a compatibility mirror fed from portal data.
- MAYAK certificate/history identity now relies on the platform profile full name; organization stays optional and is omitted from MAYAK surfaces when empty instead of showing a placeholder.

## Remaining Work

### High priority

1. Smoke-check the main MAYAK trainer flows after the latest refactor:
    - token entry,
    - task navigation,
    - prompt creation/copy,
    - buffer,
    - instructions/materials,
    - Qwen evaluation,
    - completion popups,
    - session participant upload / inspector review flow.
2. Content storage selection and JSON save path were hardened: valid storage detection plus atomic JSON writes are now in place.
3. Smoke-check the onboarding questionnaire-first flow end-to-end:
   - clean-device questionnaire gate,
   - opening the Yandex form in a new tab while the current page immediately unlocks the next step,
   - local resume through `mayak_onboarding_questionnaire:<slug>` and legacy survey-key fallback,
   - public summary rendering,
   - admin URL update with live QR refresh.

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
- For session review `doc/docx` preview, ensure LibreOffice is installed on the server or set `MAYAK_LIBREOFFICE_PATH` to the real `soffice` binary before restarting `nextjs.service`.

## Stopping Rule For This Refactor Stage

Stop this stage when:

- there are no runtime `ReferenceError` issues,
- main MAYAK user flows pass smoke-check,
- `trainer.js` is primarily orchestration,
- the next refactor step would mostly move state around without clear architectural gain.

### Follow-up checks on 2026-03-11

- Confirmed `ADMIN-BYPASS-TOKEN` is no longer present in runtime MAYAK code; current localhost-only bypass is `fffff` via `/api/mayak/validate-token` with `isBypass` flag.
- Confirmed current local bypass still maps to `isAdmin` inside `useMayakAccessGate`, which explains admin-like behavior under `fffff`.
- Fixed broken `РџСЂРѕР№С‚Рё РўРµСЃС‚РёСЂРѕРІР°РЅРёРµ` trigger in `useMayakTrainerControlActions.js`; the handler had a corrupted Cyrillic string and no longer opened the ranking popup for those tasks.
- Reconfirmed content contract: admin save writes to shared storage through `mayakContentStorage.js`, and MAYAK v2 runtime reads through `content-bundle` / `content-file` from the same storage root.
- Switched localhost bypass flow from plain `fffff` to `fffff + MAYAK admin password` through `/api/admin/mayak-auth`.
- Added automatic cleanup of legacy `ADMIN-BYPASS-TOKEN` from `activated_key` cookie on MAYAK settings load.
- Tightened `useMayakAccessGate` so bypass token access requires an authenticated MAYAK admin cookie before opening the trainer.

- 2026-03-18: Office preview conversion on local Windows was diagnosed to fail because LibreOffice could not use the ambient TEMP/user path reliably; the runtime now uses an isolated ASCII temp workspace plus explicit `TEMP/TMP` overrides and logs conversion steps.

- 2026-03-18: doc/docx session review uploads were moved from synchronous LibreOffice conversion to the same background-preview flow as ppt/pptx, so upload no longer blocks on office conversion.
