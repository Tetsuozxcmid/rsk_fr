import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

import { completeMayakSession, listMayakSessions } from "@/lib/mayakSessions";

const execFileAsync = promisify(execFile);

const SESSION_RUNTIME_FILE = path.join(process.cwd(), "data", "mayak-session-runtime.json");
const SESSION_FILES_ROOT = path.join(process.cwd(), "data", "mayak-session-files");
const LIBREOFFICE_WORK_ROOT = path.join(process.cwd(), "tmp_pdf_tools", "mayak-libreoffice");
const LIBREOFFICE_LOG_FILE = path.join(process.cwd(), "data", "mayak-libreoffice.log");
const DEFAULT_REVIEW_TIMEOUT_SECONDS = 130;
const DEFAULT_REWORK_TIMEOUT_SECONDS = 180;
const PREVIEW_PROCESSING_TIMEOUT_MS = 90 * 1000;
const INSPECTOR_ROLE = "\u0418\u041d\u0421\u041f\u0415\u041a\u0422\u041e\u0420";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".avif"]);
const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".m4a", ".ogg"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".ppt", ".pptx", ...IMAGE_EXTENSIONS, ...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS]);
const EXECUTABLE_EXTENSIONS = new Set([".exe", ".msi", ".bat", ".cmd", ".com", ".ps1", ".sh", ".js", ".jar", ".dll", ".scr", ".vbs"]);

function createEmptyStore() {
    return { sessions: {} };
}

function normalizeString(value) {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeTableNumber(value) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function buildTaskKey(taskNumber) {
    return String(taskNumber || "").trim();
}

function getFileExtension(filename = "") {
    return path.extname(String(filename || "")).toLowerCase();
}

function ensureAllowedFile(filename = "", size = 0) {
    const ext = getFileExtension(filename);
    if (!ext || EXECUTABLE_EXTENSIONS.has(ext) || !ALLOWED_EXTENSIONS.has(ext)) {
        throw new Error("Этот тип файла нельзя загружать в сессионную проверку");
    }
    if (size > 15 * 1024 * 1024) {
        throw new Error("Размер файла не должен превышать 15 МБ");
    }
    return ext;
}

function getPreviewKindFromExtension(ext) {
    if (ext === ".pdf") return "pdf";
    if (IMAGE_EXTENSIONS.has(ext)) return "image";
    if (AUDIO_EXTENSIONS.has(ext)) return "audio";
    if (VIDEO_EXTENSIONS.has(ext)) return "video";
    return null;
}

function isOfficePreviewFileExtension(ext) {
    return ext === ".doc" || ext === ".docx" || ext === ".ppt" || ext === ".pptx";
}

function isReviewReadyForInspector(review) {
    const ext = review?.file?.extension || "";
    if (!isOfficePreviewFileExtension(ext)) return true;
    return review?.file?.previewStatus === "ready" || review?.file?.previewStatus === "failed";
}

function logLibreOffice(step, payload = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        step,
        ...payload,
    };
    console.log(`[MAYAK][LibreOffice][${step}]`, entry);
    fs.mkdir(path.dirname(LIBREOFFICE_LOG_FILE), { recursive: true })
        .then(() => fs.appendFile(LIBREOFFICE_LOG_FILE, `${JSON.stringify(entry)}\n`, "utf8"))
        .catch(() => {});
}

function isStalePreviewProcessing(file) {
    if (!file || file.previewStatus !== "processing") return false;
    if (!file.previewProcessingStartedAt) return true;
    const startedAt = Date.parse(file.previewProcessingStartedAt);
    if (!Number.isFinite(startedAt)) return true;
    return Date.now() - startedAt > PREVIEW_PROCESSING_TIMEOUT_MS;
}

async function canAccessExecutable(candidate) {
    if (!candidate) return false;

    const isPathCandidate = candidate.includes("\\") || candidate.includes("/") || candidate.endsWith(".exe");
    if (isPathCandidate) {
        try {
            await fs.access(candidate);
            return true;
        } catch {
            return false;
        }
    }

    try {
        if (process.platform === "win32") {
            await execFileAsync("where.exe", [candidate], { windowsHide: true, timeout: 5000 });
        } else {
            await execFileAsync("which", [candidate], { timeout: 5000 });
        }
        return true;
    } catch {
        return false;
    }
}

async function resolveLibreOfficeCommand() {
    const envCandidate = normalizeString(process.env.MAYAK_LIBREOFFICE_PATH);
    if (envCandidate && (await canAccessExecutable(envCandidate))) {
        logLibreOffice("resolve-command", { source: "env", command: envCandidate });
        return envCandidate;
    }

    const candidates = [
        "soffice",
        "libreoffice",
        "C:/Program Files/LibreOffice/program/soffice.exe",
        "C:/Program Files (x86)/LibreOffice/program/soffice.exe",
    ];

    for (const candidate of candidates) {
        if (await canAccessExecutable(candidate)) {
            logLibreOffice("resolve-command", { source: "fallback", command: candidate });
            return candidate;
        }
    }

    logLibreOffice("resolve-command-missed", {});
    return null;
}

async function ensureStoreFile() {
    try {
        await fs.access(SESSION_RUNTIME_FILE);
    } catch {
        await fs.mkdir(path.dirname(SESSION_RUNTIME_FILE), { recursive: true });
        await fs.writeFile(SESSION_RUNTIME_FILE, JSON.stringify(createEmptyStore(), null, 2), "utf-8");
    }
}

async function readStore() {
    await ensureStoreFile();
    try {
        const raw = await fs.readFile(SESSION_RUNTIME_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : createEmptyStore();
    } catch {
        return createEmptyStore();
    }
}

async function writeStore(store) {
    await fs.mkdir(path.dirname(SESSION_RUNTIME_FILE), { recursive: true });
    const tempFile = `${SESSION_RUNTIME_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(store, null, 2), "utf-8");
    await fs.rename(tempFile, SESSION_RUNTIME_FILE);
}

function ensureSessionBucket(store, sessionId) {
    if (!store.sessions[sessionId]) {
        store.sessions[sessionId] = {
            participants: {},
            reviews: {},
        };
    }
    return store.sessions[sessionId];
}

async function getSessionById(sessionId) {
    const sessions = await listMayakSessions();
    return sessions.find((session) => session.id === sessionId) || null;
}

function getInspectorTargetTable(tableNumber, tableCount) {
    if (tableCount <= 1) return tableNumber;
    return tableNumber === tableCount ? 1 : tableNumber + 1;
}

function getReviewerTableForParticipant(tableNumber, tableCount) {
    if (tableCount <= 1) return tableNumber;
    return tableNumber === 1 ? tableCount : tableNumber - 1;
}

function getReviewTimeoutSeconds(session) {
    const parsed = parseInt(session?.reviewTimeoutSeconds, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REVIEW_TIMEOUT_SECONDS;
}

function getReworkTimeoutSeconds(session) {
    const parsed = parseInt(session?.reworkTimeoutSeconds, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REWORK_TIMEOUT_SECONDS;
}

function buildExpirationMeta(expiresAt) {
    if (!expiresAt) {
        return {
            expiresAt: null,
            remainingSeconds: 0,
        };
    }

    return {
        expiresAt,
        remainingSeconds: Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000)),
    };
}

function serializeStoredFile(sessionId, reviewId, file = {}) {
    if (!file?.storedName) return null;
    const inlineFilename = file.previewStoredName || file.storedName;
    const inlineType = file.previewStoredName ? "converted" : "original";
    return {
        originalName: file.originalName || "",
        size: file.size || 0,
        mimeType: file.mimeType || "",
        extension: file.extension || "",
        previewKind: file.previewKind || null,
        previewStatus: file.previewStatus || null,
        previewError: file.previewError || "",
        previewProcessingStartedAt: file.previewProcessingStartedAt || null,
        fileUrl: `/api/mayak/session-runtime/file?sessionId=${encodeURIComponent(sessionId)}&reviewId=${encodeURIComponent(reviewId)}&type=${inlineType}&filename=${encodeURIComponent(inlineFilename)}`,
        downloadUrl: `/api/mayak/session-runtime/file?sessionId=${encodeURIComponent(sessionId)}&reviewId=${encodeURIComponent(reviewId)}&type=original&download=1&filename=${encodeURIComponent(file.storedName)}`,
    };
}

function expireReviewIfNeeded(review, participant) {
    if (!review || review.status !== "pending" || !review.expiresAt) return false;
    const now = Date.now();
    if (Date.parse(review.expiresAt) > now) return false;

    review.status = "expired";
    review.resolvedAt = new Date(now).toISOString();
    review.resolutionComment = "";
    if (participant?.tasks?.[review.taskKey]) {
        participant.tasks[review.taskKey] = {
            ...participant.tasks[review.taskKey],
            status: "expired",
            isBlocking: false,
            reviewId: review.id,
            expiresAt: null,
            reworkExpiresAt: null,
            updatedAt: review.resolvedAt,
            comment: "",
        };
    }
    return true;
}

function expireReworkIfNeeded(taskState) {
    if (!taskState || taskState.status !== "rejected" || !taskState.reworkExpiresAt) return false;
    const now = Date.now();
    if (Date.parse(taskState.reworkExpiresAt) > now) return false;

    taskState.status = "rework_expired";
    taskState.isBlocking = false;
    taskState.reworkExpiresAt = null;
    taskState.expiresAt = null;
    taskState.updatedAt = new Date(now).toISOString();
    return true;
}

async function expirePendingReviews(store, sessionId) {
    const bucket = ensureSessionBucket(store, sessionId);
    let changed = false;

    Object.values(bucket.reviews || {}).forEach((review) => {
        const participant = bucket.participants?.[review.participantUserId];
        if (expireReviewIfNeeded(review, participant)) {
            changed = true;
        }
    });

    Object.values(bucket.participants || {}).forEach((participant) => {
        Object.values(participant?.tasks || {}).forEach((taskState) => {
            if (expireReworkIfNeeded(taskState)) {
                changed = true;
            }
        });
    });

    if (changed) {
        await writeStore(store);
    }
    return changed;
}

function getBlockingTaskState(participant) {
    const taskStates = Object.values(participant?.tasks || {});
    const blocking = taskStates
        .filter((task) => task && task.isBlocking)
        .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    return blocking[0] || null;
}

function serializeReviewSummary(sessionId, review) {
    const remainingMs = Math.max(0, Date.parse(review.expiresAt || 0) - Date.now());
    return {
        id: review.id,
        participantUserId: review.participantUserId,
        participantName: review.participantName,
        participantTableNumber: review.participantTableNumber,
        reviewerTableNumber: review.reviewerTableNumber,
        taskKey: review.taskKey,
        taskNumber: review.taskNumber,
        taskIndex: review.taskIndex,
        taskName: review.taskName,
        taskTitle: review.taskTitle,
        contentType: review.contentType,
        description: review.description,
        taskText: review.taskText,
        status: review.status,
        createdAt: review.createdAt,
        expiresAt: review.expiresAt,
        remainingSeconds: Math.ceil(remainingMs / 1000),
        durationSeconds: review.durationSeconds || DEFAULT_REVIEW_TIMEOUT_SECONDS,
        resolutionComment: review.resolutionComment || "",
        submissionText: review.submissionText || "",
        file: serializeStoredFile(sessionId, review.id, review.file),
    };
}

async function convertWordToPdf(sourcePath, targetDir) {
    const command = await resolveLibreOfficeCommand();
    if (!command) {
        throw new Error("\u041d\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0435 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d LibreOffice/soffice. \u0423\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u0435 LibreOffice \u0438\u043b\u0438 \u0437\u0430\u0434\u0430\u0439\u0442\u0435 \u043f\u0443\u0442\u044c \u0447\u0435\u0440\u0435\u0437 MAYAK_LIBREOFFICE_PATH.");
    }

    const conversionId = crypto.randomUUID();
    const sourceExt = path.extname(sourcePath).toLowerCase();
    const workDir = path.join(LIBREOFFICE_WORK_ROOT, conversionId);
    const tempDir = path.join(workDir, "temp");
    const profileDir = path.join(workDir, "profile");
    const inputDir = path.join(workDir, "input");
    const outputDir = path.join(workDir, "output");
    const stagedInputPath = path.join(inputDir, "input" + sourceExt);
    const stagedOutputPath = path.join(outputDir, "input.pdf");
    const profileUri = "file:///" + profileDir.replace(/\\/g, "/");

    try {
        await fs.mkdir(tempDir, { recursive: true });
        await fs.mkdir(profileDir, { recursive: true });
        await fs.mkdir(inputDir, { recursive: true });
        await fs.mkdir(outputDir, { recursive: true });
        await fs.copyFile(sourcePath, stagedInputPath);

        const args = [
            "--headless",
            "--nologo",
            "--nodefault",
            "--norestore",
            "--nolockcheck",
            "-env:UserInstallation=" + profileUri,
            "--convert-to",
            "pdf",
            "--outdir",
            outputDir,
            stagedInputPath,
        ];

        logLibreOffice("convert-start", {
            conversionId,
            command,
            sourcePath,
            stagedInputPath,
            targetDir,
        });

        const result = await execFileAsync(command, args, {
            windowsHide: true,
            timeout: 45000,
            maxBuffer: 10 * 1024 * 1024,
            env: {
                ...process.env,
                TEMP: tempDir,
                TMP: tempDir,
            },
        });

        await fs.access(stagedOutputPath);
        const expectedPdf = path.join(targetDir, path.parse(sourcePath).name + ".pdf");
        await fs.copyFile(stagedOutputPath, expectedPdf);

        logLibreOffice("convert-success", {
            conversionId,
            sourcePath,
            expectedPdf,
            stdout: String(result?.stdout || "").trim(),
            stderr: String(result?.stderr || "").trim(),
        });

        return expectedPdf;
    } catch (lastError) {
        logLibreOffice("convert-failed", {
            conversionId,
            command,
            sourcePath,
            targetDir,
            code: lastError?.code || null,
            signal: lastError?.signal || null,
            killed: Boolean(lastError?.killed),
            stdout: String(lastError?.stdout || "").trim(),
            stderr: String(lastError?.stderr || "").trim(),
            message: lastError?.message || "Unknown LibreOffice error",
        });
        if (lastError?.code === "ENOENT") {
            throw new Error("\u041d\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0435 \u043d\u0435 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d LibreOffice. \u0414\u043b\u044f Word \u0438 PowerPoint \u0444\u0430\u0439\u043b\u043e\u0432 \u043f\u043e\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 PDF \u0438\u043b\u0438 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u0435 LibreOffice.");
        }
        if (lastError?.killed || lastError?.signal === "SIGTERM") {
            throw new Error("\u041a\u043e\u043d\u0432\u0435\u0440\u0442\u0430\u0446\u0438\u044f \u0444\u0430\u0439\u043b\u0430 \u0437\u0430\u043d\u044f\u043b\u0430 \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u043c\u043d\u043e\u0433\u043e \u0432\u0440\u0435\u043c\u0435\u043d\u0438. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 PDF \u0438\u043b\u0438 \u0444\u0430\u0439\u043b \u043c\u0435\u043d\u044c\u0448\u0435\u0433\u043e \u0440\u0430\u0437\u043c\u0435\u0440\u0430.");
        }
        throw new Error("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043a\u043e\u043d\u0432\u0435\u0440\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c Word \u0438\u043b\u0438 PowerPoint \u0444\u0430\u0439\u043b \u0432 PDF.");
    } finally {
        await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
}

export async function registerMayakSessionParticipant({ sessionId, userId, name, organization, tableNumber }) {
    const session = await getSessionById(sessionId);
    if (!session || session.status !== "active") {
        throw new Error("Сессия недоступна или уже завершена");
    }

    const normalizedTableNumber = normalizeTableNumber(tableNumber);
    if (normalizedTableNumber < 1 || normalizedTableNumber > normalizeTableNumber(session.tableCount)) {
        throw new Error("Выбранный стол не входит в диапазон активной сессии");
    }

    const store = await readStore();
    const bucket = ensureSessionBucket(store, sessionId);
    const existing = bucket.participants[userId] || {};
    bucket.participants[userId] = {
        userId,
        name: normalizeString(name) || existing.name || "Участник",
        organization: normalizeString(organization) || existing.organization || "",
        tableNumber: normalizedTableNumber,
        role: existing.role || "",
        inspectorTargetTable: existing.inspectorTargetTable || null,
        registeredAt: existing.registeredAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tasks: existing.tasks || {},
    };
    await writeStore(store);
    return bucket.participants[userId];
}

export async function assignMayakSessionRole({ sessionId, userId, role }) {
    const session = await getSessionById(sessionId);
    if (!session || session.status !== "active") {
        throw new Error("Сессия недоступна или уже завершена");
    }

    const normalizedRole = normalizeString(role);
    if (!normalizedRole) {
        throw new Error("Не выбрана роль");
    }

    const store = await readStore();
    const bucket = ensureSessionBucket(store, sessionId);
    const participant = bucket.participants[userId];
    if (!participant) {
        throw new Error("Участник не зарегистрирован в этой сессии");
    }

    if (normalizedRole === INSPECTOR_ROLE) {
        const takenByAnother = Object.values(bucket.participants).find((candidate) => candidate.userId !== userId && candidate.tableNumber === participant.tableNumber && candidate.role === INSPECTOR_ROLE);
        if (takenByAnother) {
            throw new Error(`Для стола ${participant.tableNumber} инспектор уже выбран`);
        }
        participant.inspectorTargetTable = getInspectorTargetTable(participant.tableNumber, normalizeTableNumber(session.tableCount));
    } else {
        participant.inspectorTargetTable = null;
    }

    participant.role = normalizedRole;
    participant.updatedAt = new Date().toISOString();
    await writeStore(store);
    return participant;
}

export async function createMayakSessionReview({
    sessionId,
    userId,
    reviewId,
    taskNumber,
    taskIndex,
    taskName,
    taskTitle,
    contentType,
    description,
    taskText,
    secondsSpent,
    storedFile,
    submissionText,
}) {
    const session = await getSessionById(sessionId);
    if (!session || session.status !== "active") {
        throw new Error("Сессия недоступна или уже завершена");
    }

    const store = await readStore();
    const bucket = ensureSessionBucket(store, sessionId);
    await expirePendingReviews(store, sessionId);

    const participant = bucket.participants[userId];
    if (!participant) {
        throw new Error("Участник не зарегистрирован в этой сессии");
    }

    const taskKey = buildTaskKey(taskNumber);
    if (!taskKey) {
        throw new Error("Не удалось определить номер задания для проверки");
    }

    const existingTaskState = participant.tasks?.[taskKey];
    if (existingTaskState?.status === "pending_review" && existingTaskState?.isBlocking) {
        throw new Error("Это задание уже отправлено инспектору и ждёт проверки");
    }

    const createdAt = new Date().toISOString();
    const nextReviewId = normalizeString(reviewId) || crypto.randomUUID();
    const reviewerTableNumber = getReviewerTableForParticipant(participant.tableNumber, normalizeTableNumber(session.tableCount));
    const reviewDurationSeconds = getReviewTimeoutSeconds(session);
    const review = {
        id: nextReviewId,
        sessionId,
        participantUserId: participant.userId,
        participantName: participant.name,
        participantTableNumber: participant.tableNumber,
        reviewerTableNumber,
        taskKey,
        taskNumber: normalizeString(taskNumber),
        taskIndex: Number.isFinite(taskIndex) ? taskIndex : 0,
        taskName: normalizeString(taskName) || `Задание ${taskNumber}`,
        taskTitle: normalizeString(taskTitle),
        contentType: normalizeString(contentType),
        description: normalizeString(description),
        taskText: normalizeString(taskText),
        secondsSpent: Number.isFinite(secondsSpent) ? secondsSpent : 0,
        submissionText: normalizeString(submissionText).slice(0, 1000),
        file: storedFile,
        createdAt,
        durationSeconds: reviewDurationSeconds,
        expiresAt: new Date(Date.now() + reviewDurationSeconds * 1000).toISOString(),
        status: "pending",
        resolutionComment: "",
        resolvedAt: null,
    };

    bucket.reviews[nextReviewId] = review;
    participant.tasks[taskKey] = {
        taskKey,
        taskNumber: normalizeString(taskNumber),
        taskIndex: Number.isFinite(taskIndex) ? taskIndex : 0,
        taskName: review.taskName,
        status: "pending_review",
        reviewId: nextReviewId,
        isBlocking: true,
        expiresAt: review.expiresAt,
        reworkExpiresAt: null,
        durationSeconds: reviewDurationSeconds,
        comment: "",
        updatedAt: createdAt,
    };
    participant.updatedAt = createdAt;
    await writeStore(store);
    return serializeReviewSummary(sessionId, review);
}

export async function resolveMayakSessionReview({ sessionId, reviewId, inspectorUserId, action, comment }) {
    const session = await getSessionById(sessionId);
    const store = await readStore();
    const bucket = ensureSessionBucket(store, sessionId);
    await expirePendingReviews(store, sessionId);

    const review = bucket.reviews?.[reviewId];
    if (!review) {
        throw new Error("Заявка на проверку не найдена");
    }
    if (review.status !== "pending") {
        throw new Error("Эта заявка уже обработана");
    }

    const inspector = bucket.participants?.[inspectorUserId];
    if (!inspector || inspector.role !== INSPECTOR_ROLE) {
        throw new Error("Проверку может выполнить только инспектор");
    }
    if (inspector.inspectorTargetTable !== review.participantTableNumber) {
        throw new Error("Этот инспектор не закреплён за выбранным столом");
    }

    const participant = bucket.participants?.[review.participantUserId];
    if (!participant) {
        throw new Error("Участник проверки не найден");
    }

    const normalizedAction = normalizeString(action);
    const normalizedComment = normalizeString(comment);
    if (normalizedAction === "reject" && !normalizedComment) {
        throw new Error("При отклонении нужно указать причину");
    }

    const resolvedAt = new Date().toISOString();
    const isApproved = normalizedAction === "approve";
    const reworkDurationSeconds = getReworkTimeoutSeconds(session);
    const reworkExpiresAt = isApproved ? null : new Date(Date.now() + reworkDurationSeconds * 1000).toISOString();
    review.status = isApproved ? "approved" : "rejected";
    review.resolutionComment = normalizedComment;
    review.resolvedAt = resolvedAt;
    participant.tasks[review.taskKey] = {
        ...(participant.tasks[review.taskKey] || {}),
        taskKey: review.taskKey,
        taskNumber: review.taskNumber,
        taskIndex: review.taskIndex,
        taskName: review.taskName,
        reviewId,
        updatedAt: resolvedAt,
        comment: normalizedComment,
        status: isApproved ? "approved" : "rejected",
        isBlocking: !isApproved,
        expiresAt: null,
        reworkExpiresAt,
        durationSeconds: isApproved ? null : reworkDurationSeconds,
    };
    participant.updatedAt = resolvedAt;
    await writeStore(store);
    return serializeReviewSummary(sessionId, review);
}

export async function getMayakSessionRuntimeState({ sessionId, userId }) {
    const session = await getSessionById(sessionId);
    if (!session || session.status !== "active") {
        return {
            sessionActive: false,
            participant: null,
            blockingTask: null,
            inspectorQueue: [],
        };
    }

    const store = await readStore();
    await expirePendingReviews(store, sessionId);
    const freshStore = await readStore();
    const bucket = ensureSessionBucket(freshStore, sessionId);
    Object.values(bucket.reviews || {}).forEach((review) => {
        const isOfficePreviewFile = isOfficePreviewFileExtension(review?.file?.extension || "");
        if (review?.file?.previewStatus === "pending" && isOfficePreviewFile) {
            void startMayakSessionBackgroundPreviewConversion({ sessionId, reviewId: review.id }).catch(() => {});
        } else if (isStalePreviewProcessing(review?.file) && isOfficePreviewFile) {
            void startMayakSessionBackgroundPreviewConversion({ sessionId, reviewId: review.id }).catch(() => {});
        }
    });
    const participant = bucket.participants?.[userId] || null;

    if (!participant) {
        return {
            sessionActive: true,
            participant: null,
            blockingTask: null,
            inspectorQueue: [],
        };
    }

    const blockingTask = getBlockingTaskState(participant);
    const inspectorQueue =
        participant.role === INSPECTOR_ROLE && participant.inspectorTargetTable
            ? Object.values(bucket.reviews || {})
                  .filter((review) => review.status === "pending" && review.participantTableNumber === participant.inspectorTargetTable)
                  .filter((review) => isReviewReadyForInspector(review))
                  .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
                  .map((review) => serializeReviewSummary(sessionId, review))
            : [];

    const taskStates = Object.values(participant.tasks || {})
        .sort((a, b) => (Number(a.taskIndex) || 0) - (Number(b.taskIndex) || 0))
        .map((task) => ({
            taskKey: task.taskKey,
            taskNumber: task.taskNumber,
            taskIndex: task.taskIndex,
            status: task.status,
            comment: task.comment || "",
            isBlocking: Boolean(task.isBlocking),
            reviewId: task.reviewId || null,
            updatedAt: task.updatedAt || null,
        }));

    return {
        sessionActive: true,
        participant: {
            ...participant,
            tasks: undefined,
            taskStates,
        },
        blockingTask: blockingTask
            ? {
                  taskKey: blockingTask.taskKey,
                  taskNumber: blockingTask.taskNumber,
                  taskIndex: blockingTask.taskIndex,
                  status: blockingTask.status,
                  comment: blockingTask.comment || "",
                  reviewId: blockingTask.reviewId || null,
                  durationSeconds: blockingTask.durationSeconds || bucket.reviews?.[blockingTask.reviewId]?.durationSeconds || 0,
                  ...buildExpirationMeta(blockingTask.status === "pending_review" ? blockingTask.expiresAt || bucket.reviews?.[blockingTask.reviewId]?.expiresAt || null : blockingTask.reworkExpiresAt || null),
              }
            : null,
        inspectorQueue,
    };
}

export async function saveMayakSessionUploadFile({ sessionId, userId, reviewId, file }) {
    const originalName = normalizeString(file?.originalFilename) || "file";
    const size = Number(file?.size) || 0;
    const extension = ensureAllowedFile(originalName, size);

    const userDir = path.join(SESSION_FILES_ROOT, sessionId, userId);
    await fs.mkdir(userDir, { recursive: true });

    const storedName = `${reviewId}${extension}`;
    const targetPath = path.join(userDir, storedName);
    await fs.copyFile(file.filepath, targetPath);
    await fs.rm(file.filepath, { force: true });

    let previewStoredName = null;
    let previewKind = getPreviewKindFromExtension(extension);
    let previewStatus = previewKind ? "ready" : null;
    let previewError = "";

    if (extension === ".doc" || extension === ".docx" || extension === ".ppt" || extension === ".pptx") {
        previewStatus = "pending";
    }

    return {
        originalName,
        storedName,
        previewStoredName,
        size,
        extension,
        mimeType: normalizeString(file?.mimetype),
        previewKind,
        previewStatus,
        previewError,
        previewProcessingStartedAt: null,
    };
}

export async function getMayakSessionReviewFile({ sessionId, reviewId, type, filename }) {
    const store = await readStore();
    const bucket = ensureSessionBucket(store, sessionId);
    const review = bucket.reviews?.[reviewId];
    if (!review?.file) {
        throw new Error("Файл проверки не найден");
    }

    const selectedName = type === "converted" ? review.file.previewStoredName : review.file.storedName;
    if (!selectedName || selectedName !== filename) {
        throw new Error("Файл проверки не найден");
    }

    const fullPath = path.join(SESSION_FILES_ROOT, sessionId, review.participantUserId, selectedName);
    await fs.access(fullPath);
    return {
        fullPath,
        file: review.file,
    };
}

export async function cleanupMayakSessionRuntime(sessionId) {
    const store = await readStore();
    if (store.sessions?.[sessionId]) {
        delete store.sessions[sessionId];
        await writeStore(store);
    }
    await fs.rm(path.join(SESSION_FILES_ROOT, sessionId), { recursive: true, force: true });
}

export async function completeMayakSessionWithRuntimeCleanup(sessionId) {
    const completedSession = await completeMayakSession(sessionId);
    await cleanupMayakSessionRuntime(sessionId);
    return completedSession;
}


export async function startMayakSessionBackgroundPreviewConversion({ sessionId, reviewId }) {
    const store = await readStore();
    const bucket = ensureSessionBucket(store, sessionId);
    const review = bucket.reviews?.[reviewId];
    const file = review?.file;
    if (!review || !file?.storedName) return false;
    if (!(file.extension === ".doc" || file.extension === ".docx" || file.extension === ".ppt" || file.extension === ".pptx")) return false;
    if (file.previewStoredName) return false;
    if (file.previewStatus === "processing" && !isStalePreviewProcessing(file)) return false;

    file.previewStatus = "processing";
    file.previewError = "";
    file.previewProcessingStartedAt = new Date().toISOString();
    logLibreOffice("background-preview-start", {
        sessionId,
        reviewId,
        storedName: file.storedName,
        previewStatus: file.previewStatus,
    });
    await writeStore(store);

    try {
        const userDir = path.join(SESSION_FILES_ROOT, sessionId, review.participantUserId);
        const sourcePath = path.join(userDir, file.storedName);
        const pdfPath = await convertWordToPdf(sourcePath, userDir);

        const freshStore = await readStore();
        const freshBucket = ensureSessionBucket(freshStore, sessionId);
        const freshReview = freshBucket.reviews?.[reviewId];
        if (!freshReview?.file) return false;

        freshReview.file.previewStoredName = path.basename(pdfPath);
        freshReview.file.previewKind = "pdf";
        freshReview.file.previewStatus = "ready";
        freshReview.file.previewError = "";
        freshReview.file.previewProcessingStartedAt = null;
        await writeStore(freshStore);
        logLibreOffice("background-preview-success", {
            sessionId,
            reviewId,
            previewStoredName: freshReview.file.previewStoredName,
        });
        return true;
    } catch (error) {
        const freshStore = await readStore();
        const freshBucket = ensureSessionBucket(freshStore, sessionId);
        const freshReview = freshBucket.reviews?.[reviewId];
        if (freshReview?.file) {
            freshReview.file.previewKind = null;
            freshReview.file.previewStatus = "failed";
            freshReview.file.previewError = error.message || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u0438\u0442\u044c \u043f\u0440\u0435\u0434\u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440 \u0444\u0430\u0439\u043b\u0430.";
            freshReview.file.previewProcessingStartedAt = null;
            await writeStore(freshStore);
        }
        logLibreOffice("background-preview-failed", {
            sessionId,
            reviewId,
            message: error?.message || "Unknown background preview error",
        });
        return false;
    }
}

