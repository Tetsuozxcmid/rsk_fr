import { promises as fs } from "fs";
import path from "path";
import { ensureMayakCertificateNumberInStore } from "@/lib/mayakCertificateNumbers";

const RESULTS_FILE = path.join(process.cwd(), "data", "results.json");
const PROFILE_ARTIFACTS_ROOT = path.join(process.cwd(), "data", "mayak-profile-artifacts");

let writeLock = Promise.resolve();

function normalizeString(value) {
    return typeof value === "string" ? value.trim() : "";
}

function toSafeObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function sanitizeFileName(value, fallback = "artifact.pdf") {
    const baseValue = normalizeString(value) || fallback;
    const sanitized = baseValue.replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "_").replace(/\s+/g, "_");
    return sanitized || fallback;
}

async function ensureResultsFile() {
    try {
        await fs.access(RESULTS_FILE);
    } catch {
        await fs.mkdir(path.dirname(RESULTS_FILE), { recursive: true });
        await fs.writeFile(RESULTS_FILE, JSON.stringify({}, null, 2), "utf-8");
    }
}

async function readResultsStore() {
    await ensureResultsFile();

    try {
        const raw = await fs.readFile(RESULTS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        return toSafeObject(parsed);
    } catch {
        return {};
    }
}

async function writeResultsStore(store) {
    await fs.mkdir(path.dirname(RESULTS_FILE), { recursive: true });
    const tempFile = `${RESULTS_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(store, null, 2), "utf-8");
    await fs.rename(tempFile, RESULTS_FILE);
}

async function withWriteLock(callback) {
    let releaseLock;
    const previousLock = writeLock;
    writeLock = new Promise((resolve) => {
        releaseLock = resolve;
    });
    await previousLock;

    try {
        return await callback();
    } finally {
        releaseLock();
    }
}

function listUserResultEntries(store, userId) {
    const safeUserId = normalizeString(userId);
    const entries = [];

    Object.entries(toSafeObject(store)).forEach(([tokenKey, users]) => {
        Object.entries(toSafeObject(users)).forEach(([entryUserId, entryValue]) => {
            const entry = toSafeObject(entryValue);
            const ownerUserId = normalizeString(entry.portalUserId || entry.id || entryUserId);
            if (ownerUserId !== safeUserId) {
                return;
            }

            entries.push({
                tokenKey,
                entryUserId,
                entry,
            });
        });
    });

    return entries;
}

function sortArtifactsNewestFirst(items) {
    return items.sort((left, right) => {
        const leftDate = new Date(left.completedAt || left.createdAt || 0).getTime();
        const rightDate = new Date(right.completedAt || right.createdAt || 0).getTime();
        return rightDate - leftDate;
    });
}

export function buildMayakProfileArtifactDownloadUrl({ artifactId, fileId }) {
    return `/api/profile/mayak-artifacts/file?artifactId=${encodeURIComponent(artifactId)}&fileId=${encodeURIComponent(fileId)}`;
}

export async function createMayakProfileArtifactFiles({ userId, artifactId, files }) {
    const safeUserId = normalizeString(userId);
    const safeArtifactId = normalizeString(artifactId);

    if (!safeUserId || !safeArtifactId) {
        throw new Error("Missing user or artifact identifier");
    }

    const artifactDir = path.join(PROFILE_ARTIFACTS_ROOT, safeUserId, safeArtifactId);
    await fs.mkdir(artifactDir, { recursive: true });

    const savedFiles = [];

    for (const file of Array.isArray(files) ? files : []) {
        const fileId = normalizeString(file.id);
        const base64 = normalizeString(file.base64);

        if (!fileId || !base64) {
            continue;
        }

        const originalFileName = sanitizeFileName(file.fileName, `${file.kind || "artifact"}.pdf`);
        const extension = path.extname(originalFileName) || ".pdf";
        const storedName = `${fileId}${extension}`;
        const fileBuffer = Buffer.from(base64, "base64");
        const filePath = path.join(artifactDir, storedName);

        await fs.writeFile(filePath, fileBuffer);

        savedFiles.push({
            id: fileId,
            kind: normalizeString(file.kind) || "artifact",
            fileName: originalFileName,
            contentType: normalizeString(file.contentType) || "application/octet-stream",
            byteSize: fileBuffer.length,
            storedName,
        });
    }

    return savedFiles;
}

export async function saveMayakProfileArtifacts({ tokenKey, userId, bundle }) {
    const safeTokenKey = normalizeString(tokenKey);
    const safeUserId = normalizeString(userId);
    const artifactBundle = toSafeObject(bundle);

    if (!safeTokenKey || !safeUserId) {
        throw new Error("Token key and user id are required");
    }

    return withWriteLock(async () => {
        const store = await readResultsStore();
        if (!store[safeTokenKey] || typeof store[safeTokenKey] !== "object" || Array.isArray(store[safeTokenKey])) {
            store[safeTokenKey] = {};
        }

        const currentEntry = toSafeObject(store[safeTokenKey][safeUserId]);
        const currentArtifacts = Array.isArray(currentEntry.mayakArtifacts) ? currentEntry.mayakArtifacts : [];
        const completedAt = normalizeString(artifactBundle.completedAt) || new Date().toISOString();
        const certificateNumber = ensureMayakCertificateNumberInStore(store, { tokenKey: safeTokenKey, userId: safeUserId });
        const persistedArtifactBundle = {
            ...artifactBundle,
            certificateNumber,
        };

        store[safeTokenKey][safeUserId] = {
            ...currentEntry,
            id: currentEntry.id || safeUserId,
            portalUserId: currentEntry.portalUserId || safeUserId,
            certificateNumber,
            finishedAt: completedAt,
            isFinished: true,
            mayakArtifacts: [persistedArtifactBundle, ...currentArtifacts],
        };

        await writeResultsStore(store);
        return store[safeTokenKey][safeUserId];
    });
}

export async function listMayakProfileArtifacts(userId) {
    const safeUserId = normalizeString(userId);
    if (!safeUserId) {
        return [];
    }

    const store = await readResultsStore();
    const entries = listUserResultEntries(store, safeUserId);
    const artifacts = [];

    entries.forEach(({ tokenKey, entryUserId, entry }) => {
        const entryArtifacts = Array.isArray(entry.mayakArtifacts) ? entry.mayakArtifacts : [];

        entryArtifacts.forEach((artifactValue) => {
            const artifact = toSafeObject(artifactValue);
            const files = Array.isArray(artifact.files) ? artifact.files : [];

            artifacts.push({
                id: normalizeString(artifact.id),
                tokenKey,
                entryUserId,
                sessionId: normalizeString(artifact.sessionId || entry.sessionId),
                tokenType: normalizeString(artifact.tokenType || entry.tokenType),
                sectionId: normalizeString(artifact.sectionId),
                role: normalizeString(artifact.role),
                tableNumber: normalizeString(artifact.tableNumber),
                createdAt: normalizeString(artifact.createdAt),
                completedAt: normalizeString(artifact.completedAt || entry.finishedAt),
                files: files.map((fileValue) => ({
                    ...toSafeObject(fileValue),
                    id: normalizeString(fileValue?.id),
                    kind: normalizeString(fileValue?.kind),
                    fileName: normalizeString(fileValue?.fileName),
                    contentType: normalizeString(fileValue?.contentType),
                    byteSize: Number(fileValue?.byteSize) || 0,
                    storedName: normalizeString(fileValue?.storedName),
                })),
            });
        });
    });

    return sortArtifactsNewestFirst(artifacts);
}

export async function resolveMayakProfileArtifactFile({ userId, artifactId, fileId }) {
    const safeUserId = normalizeString(userId);
    const safeArtifactId = normalizeString(artifactId);
    const safeFileId = normalizeString(fileId);

    if (!safeUserId || !safeArtifactId || !safeFileId) {
        return null;
    }

    const artifacts = await listMayakProfileArtifacts(safeUserId);
    const artifact = artifacts.find((item) => item.id === safeArtifactId);
    if (!artifact) {
        return null;
    }

    const file = artifact.files.find((item) => item.id === safeFileId);
    if (!file || !file.storedName) {
        return null;
    }

    const filePath = path.join(PROFILE_ARTIFACTS_ROOT, safeUserId, safeArtifactId, file.storedName);

    return {
        artifact,
        file,
        filePath,
    };
}
