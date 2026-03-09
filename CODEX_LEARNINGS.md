# Codex Learnings

This file stores short project-specific lessons so repeated mistakes are not made across future tasks.

## Entry Format

- Problem: what failed or almost failed.
- Root cause: why it happened.
- Fix: what worked.
- Prevention: what to do next time before repeating the same action.

Add only verified, reusable lessons. Skip one-off noise.

## Learnings

### 2026-03-06 - apply_patch sandbox failure in this workspace

- Problem: `apply_patch` can fail here with `windows sandbox: setup refresh failed with status exit code: 1`, which blocks normal file edits.
- Root cause: the current Codex Windows sandbox in this workspace is unstable for `apply_patch`, even when the target file is inside the writable project root.
- Fix: retry once, then switch to an escalated PowerShell write operation when the patch tool failure is environmental rather than a file-content conflict.
- Prevention: do not keep retrying `apply_patch` repeatedly in this repository after the same sandbox error appears; move to the PowerShell fallback and continue the task.

### 2026-03-06 - ESLint config fails before file-level validation

- Problem: `npx eslint src/components/features/tools-2/trainer.js` fails before linting with `TypeError: Converting circular structure to JSON`.
- Root cause: the current ESLint configuration chain in this repository contains a circular plugin/config structure, so lint cannot be trusted as a file verification step.
- Fix: when this happens, use an independent syntax check for the edited file, for example `@babel/parser` with the `jsx` plugin.
- Prevention: do not treat an ESLint failure in this repository as proof that the edited file is broken until the failure is separated from the shared ESLint config.

### 2026-03-06 - FFmpeg colorkey for transparent mascot video

- Problem: converting `mascot-bad.mp4` to a transparent video initially produced a WebM with alpha metadata, but the white background still stayed visually opaque.
- Root cause: applying `colorkey` before converting frames to RGBA was not enough for this asset; the keying step needed an explicit RGBA stage first.
- Fix: use `format=rgba,colorkey=0xFCFCFC:0.12:0.02,format=yuva420p` before VP9 WebM encoding.
- Prevention: for future MAYAK mascot/video cutouts, validate transparency on a test frame first instead of trusting `alpha_mode=1` alone.

### 2026-03-06 - APNG is easier to verify than alpha WebM for this mascot

- Problem: the alpha WebM pipeline exposed transparency metadata, but local frame extraction still made browser-visible transparency hard to trust.
- Root cause: VP9 alpha is more awkward to validate quickly in local tooling than a directly inspectable animated PNG.
- Fix: for this mascot, export a transparent APNG with `format=rgba,colorkey=0xFCFCFC:0.12:0.02` and use it as the animated asset.
- Prevention: when the goal is a short UI mascot animation without background, prefer APNG if you need straightforward visual and pixel-level verification.

### 2026-03-06 - Large APNG UI assets cause visible hanging

- Problem: the first transparent mascot APNG was about 60 MB at `960x960`, which made the small UI animation feel laggy and heavy.
- Root cause: the asset was exported at source resolution and full frame rate even though the interface only renders it around `96-112px`.
- Fix: re-export the mascot APNG close to display size (`224x224`) while keeping a smooth frame rate close to the source (`24 fps`), which preserved motion quality and kept the file around 3 MB.
- Prevention: for MAYAK UI mascots, export animated PNGs near their actual render size instead of relying on browser downscaling.

### 2026-03-06 - Qwen gateway reports expired tokens as 500, not 401

- Problem: the MAYAK Qwen gateway can return HTTP `500` when a token is expired or invalid, which makes naive status-only retry logic miss automatic rotation.
- Root cause: `https://qwen.aikit.club/v1/chat/completions` wraps session/token failures inside a generic upstream error body like `Your session has expired, or the token is no longer valid`.
- Fix: classify retryable Qwen failures by both status code and response text, then fall through to the next token in the pool.
- Prevention: do not rely only on `401/403/429` when implementing Qwen failover in this repository; inspect the upstream body for expiry/invalid/limit markers too.

### 2026-03-06 - PDF extraction is more reliable from an ASCII temp filename

- Problem: extracting local MAYAK reference PDFs through Node can fail or produce brittle path handling when the source filename stays in Cyrillic.
- Root cause: the current Windows toolchain in this workspace is more reliable with ASCII temp filenames when piping inline Node scripts and local file paths together.
- Fix: copy the source PDF to an ASCII scratch filename like `tmp_pdf_tools/input.pdf`, run `pdf-parse` there, and write the tracked UTF-8 markdown mirror back into `docs/local-product-context/`.
- Prevention: for future local reference-document conversions in this repository, stage the binary into an ASCII temp path before parsing instead of reading the Cyrillic path directly.

### 2026-03-06 - Qwen structured output is more stable with a minimal schema

- Problem: when the Qwen evaluator is asked to return rich per-field commentary, it is more likely to drift into alternative JSON wrappers or verbose extras.
- Root cause: the gateway model follows strict JSON more reliably when the required schema is narrow and the detailed user-facing phrasing is assembled server-side.
- Fix: request only `summary` plus ordered `field_assessments[{code, zone}]`, then derive compact strong/weak field feedback and overall zone inside `mayakQwen.js`.
- Prevention: for MAYAK prompt scoring, keep the model response schema minimal and move presentational aggregation out of the LLM prompt unless raw field comments are absolutely required.

### 2026-03-08 - Component callbacks cannot be referenced before declaration

- Problem: the trainer crashed at runtime with `Cannot access 'syncQwenEvaluationQuota' before initialization`.
- Root cause: a `useEffect` dependency referenced a `const ... = useCallback(...)` declared later in the same component, which hits the JavaScript temporal dead zone during component initialization.
- Fix: move the dependent `useEffect` below the callback declarations, or hoist the referenced function above all effects that use it.
- Prevention: when adding new hooks in large React components in this repository, keep helper callbacks above the effects that depend on them instead of relying on function-hoisting semantics that do not apply to `const`.

### 2026-03-09 - Animated WebP is a better final-format choice for smooth transparent MAYAK mascots

- Problem: APNG was easy to verify for transparent mascots, but smooth versions with interpolated frames became too heavy for responsive UI playback.
- Root cause: doubling frame count in APNG inflates file size quickly, while the browser still only renders a small mascot around 96-112px.
- Fix: keep APNG or PNG exports for verification/last-frame work, but ship the final smooth mascot as animated WebP near display size (`224x224`) with frame interpolation when the UI needs softer motion.
- Prevention: for future MAYAK mascot upgrades, compare transparent APNG against animated WebP before shipping and prefer animated WebP when motion smoothness matters more than pixel-inspection convenience.

### 2026-03-09 - Switching a mascot from animated WebP to a separate PNG can look like a fake blink

- Problem: the bad-result owl appeared to "blink" at the end even though the source animation did not actually close the eyes.
- Root cause: the UI swapped from the animated WebP to a separately exported PNG whose pose did not exactly match the final animation frame, creating a visible jump.
- Fix: keep the MAYAK mascot rendered on the animated asset instead of switching to a separate static fallback frame.
- Prevention: when a MAYAK mascot should visually stop on its last pose, do not assume an exported PNG matches the real final frame of the animated asset; verify exact frame parity first or avoid the swap entirely.

### 2026-03-09 - Qwen field scoring becomes falsely positive when the prompt forces praise and seeded green examples

- Problem: the MAYAK Qwen evaluator could praise clearly mismatched fields, for example treating an API-documentation mission as a strength for a dorm-activity task.
- Root cause: the model prompt pushed it to "first praise strong fields" and the JSON template itself seeded several fields as `green`, which biased the output toward artificial positives.
- Fix: rewrite the evaluator prompt to prioritize truthful task alignment, explicitly mark cross-domain substitutions as `red`, allow summaries with no strong fields, and use neutral zone placeholders in the response template instead of prefilled green examples.
- Prevention: for MAYAK scoring prompts, do not require balanced praise when the submission is plainly off-task, and do not anchor the model with example zone values that imply success by default.

### 2026-03-09 - Medium-quality MAYAK prompts need deterministic downgrades after Qwen scoring

- Problem: even after the prompt rewrite, Qwen still tended to over-score medium submissions as `green` when fields were generic but not obviously wrong.
- Root cause: model-side truthfulness improved for clearly bad cases, but generic phrases like short audience/role/format fields still sounded acceptable enough for the LLM to mark them green.
- Fix: pass raw `fields` and `taskContext` into `normalizeQwenEvaluation()` and apply field-specific specificity guards server-side, downgrading weakly grounded `green` fields straight to `red` because field-level scoring in MAYAK now allows only `green/red`; keep the intermediate `yellow` only for the overall prompt result by green-field count.
- Prevention: for MAYAK scoring, do not trust the upstream model alone for the middle band; keep a deterministic post-normalization layer that checks task anchoring, numeric requirements, and field specificity.

### 2026-03-09 - User-facing Qwen summaries must not leak transport field names

- Problem: the MAYAK Qwen evaluator could mention transport keys like `task_context` in the user-visible summary, which reads like debug output instead of product text.
- Root cause: the prompt and normalization layer allowed the model to echo technical input names back into the final explanation.
- Fix: explicitly forbid service-key mentions in the prompt and sanitize the final summary server-side before returning it to the trainer.
- Prevention: when MAYAK passes structured payloads to an LLM, treat transport field names as internal API details and strip them from any user-facing text.

### 2026-03-09 - One-shot animated WebP mascots need a timeout because <img> has no ended event

- Problem: a MAYAK mascot animation that should fly away once and disappear cannot be stopped cleanly when rendered as an animated WebP inside <img>.
- Root cause: animated WebP keeps playing inside the image element, but the browser does not provide an ended event for that playback.
- Fix: store per-asset playback metadata like hideAfterMs, schedule a timeout when the asset starts, and hide the mascot after that duration.
- Prevention: when a MAYAK animated WebP must behave like a one-shot clip instead of a loop, attach explicit timing metadata in code instead of expecting media-style lifecycle events.

### 2026-03-09 - Short field-fix guidance is safer to assemble server-side than to request as verbose LLM output

- Problem: users need a bit more explanation about what to fix in weak MAYAK fields, but widening the Qwen JSON schema makes structured output less stable.
- Root cause: the more per-field prose the model is forced to emit, the easier it is for the response to drift away from the exact JSON contract.
- Fix: keep the upstream schema minimal (`summary` + `field_assessments`) and build one short server-side correction sentence that is folded into the main summary instead of asking the model for verbose field commentary.
- Prevention: when MAYAK needs corrective feedback, prefer a compact summary plus strong/weak field lists over a separate long `Как усилить` block with repetitive phrasing.

### 2026-03-09 - Anchor-word hints create noisy MAYAK feedback

- Problem: server-generated Qwen hints started repeating low-value phrases like `мэрия, запускает, новый` in every recommendation.
- Root cause: the guidance layer tried to reuse extracted task-anchor words literally, which reads mechanical and rarely helps the user improve the prompt.
- Fix: remove anchor-word hints and keep one compact weak-fields note built from field semantics instead of raw task tokens.
- Prevention: when MAYAK needs corrective feedback, do not surface extracted anchor words directly to the user unless they carry clear instructional value.

### 2026-03-09 - Qwen field guards should reject only obvious noise, not overfit task details

- Problem: server-side MAYAK field guards started downgrading valid fields like `Миссия` because of incidental details such as `15 минут` in the task text.
- Root cause: numeric and highly specific heuristics in `applyFieldSpecificityGuards()` were overfitting task wording and overriding otherwise sensible LLM judgments.
- Fix: remove numeric and field-specific micro-rules from the guard layer and keep only a soft fallback that downgrades obviously empty or meaningless `green` fields.
- Prevention: use server-side guards only for broad sanity checks; do not encode narrow task-pattern logic there unless the product explicitly requires rigid validation.

### 2026-03-09 - Single-process Qwen pools should pick the least-loaded token, not always start from the first

- Problem: when several users hit MAYAK Qwen at once, always iterating the token pool from the first token concentrates load on the same credential and makes rate-limit spikes more likely.
- Root cause: the old handler treated the token pool only as failover order, not as a live load-balancing pool.
- Fix: keep per-token active-request counters in process memory, choose the least-loaded token for each new request, and still release the token in `finally` so failover retries and concurrent users rebalance naturally within one Node instance.
- Prevention: in this repository, if Qwen traffic can overlap and the app runs as a single Node process, prefer least-loaded in-memory token selection over fixed first-token iteration.

### 2026-03-09 - Do not assign or depend on NEXT_PUBLIC env vars inside Next API routes

- Problem: the MAYAK admin settings API started failing with SyntaxError: Invalid left-hand side in assignment and returned the Next HTML error page instead of JSON.
- Root cause: process.env.NEXT_PUBLIC_BASE_URL was used inside an API route; Next inlined it to a string literal in the dev bundle, and an old runtime assignment produced invalid compiled code in the server bundle.
- Fix: remove runtime assignment to NEXT_PUBLIC_BASE_URL, stop reading NEXT_PUBLIC values in this server route, and use server-managed settings or a server-only env like BASE_URL instead.
- Prevention: never write to process.env.NEXT*PUBLIC*\* at runtime inside API routes, and avoid using public env names as mutable server configuration.

### 2026-03-09 - Animated WebP mascots should restart by remount, not by cache-busting the URL

- Problem: MAYAK owl animations could feel much less smooth in the trainer than the source asset, especially on repeated plays.
- Root cause: the UI restarted the mascot by appending a changing `?v=...` query to the animated WebP URL, which forced the browser to treat each playback as a new resource and re-decode the heavy asset.
- Fix: restart the mascot by remounting the `<img>` with a React `key`, keep the URL stable, and preload the mascot assets once on page load.
- Prevention: for MAYAK animated mascot playback, do not use cache-busting query params as the replay mechanism unless a real asset version change is intended.
