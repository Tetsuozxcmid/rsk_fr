import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const HISTORY_FILE = path.join(process.cwd(), "data", "mayak-user-history.json");
const ARTIFACTS_ROOT = path.join(process.cwd(), "data", "mayak-user-artifacts");
const ARTIFACT_TYPE_META = {
    certificate: {
        filename: "certificate.pdf",
        contentType: "application/pdf",
    },
    log: {
        filename: "log.pdf",
        contentType: "application/pdf",
    },
    analytics: {
        filename: "analytics.pdf",
        contentType: "application/pdf",
    },
};

function createEmptyStore() {
    return { entries: [] };
}

function sanitizeIdSegment(value, fallback = "unknown") {
    const normalized = String(value || "").trim();
    if (!normalized) return fallback;
    return normalized.replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function ensureStoreFile() {
    try {
        await fs.access(HISTORY_FILE);
    } catch {
        await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true });
        await fs.writeFile(HISTORY_FILE, JSON.stringify(createEmptyStore(), null, 2), "utf-8");
    }
}

async function readStore() {
    await ensureStoreFile();
    try {
        const raw = await fs.readFile(HISTORY_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        return {
            entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
        };
    } catch {
        return createEmptyStore();
    }
}

async function writeStore(store) {
    await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true });
    const tempFile = `${HISTORY_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(store, null, 2), "utf-8");
    await fs.rename(tempFile, HISTORY_FILE);
}

function buildArtifactUrls(runId) {
    const encodedRunId = encodeURIComponent(runId);
    return {
        certificate: `/api/mayak/my-history/${encodedRunId}/file?type=certificate`,
        log: `/api/mayak/my-history/${encodedRunId}/file?type=log`,
        analytics: `/api/mayak/my-history/${encodedRunId}/file?type=analytics`,
    };
}

export function serializeMayakHistoryEntry(entry) {
    const { artifactDir, ...safeEntry } = entry;
    return {
        ...safeEntry,
        files: buildArtifactUrls(entry.runId),
    };
}

export async function createMayakHistoryEntry({
    portalProfile,
    tokenContext,
    activeUser,
    selectedRole,
    logData,
    completedAt,
    certificateBuffer,
    logBuffer,
    analyticsBuffer,
}) {
    const runId = crypto.randomUUID();
    const completedIso = new Date(completedAt || new Date()).toISOString();
    const userSegment = sanitizeIdSegment(portalProfile.id, "anonymous");
    const artifactDir = path.join(ARTIFACTS_ROOT, userSegment, runId);

    await fs.mkdir(artifactDir, { recursive: true });
    await fs.writeFile(path.join(artifactDir, ARTIFACT_TYPE_META.certificate.filename), Buffer.from(certificateBuffer));
    await fs.writeFile(path.join(artifactDir, ARTIFACT_TYPE_META.log.filename), Buffer.from(logBuffer));
    await fs.writeFile(path.join(artifactDir, ARTIFACT_TYPE_META.analytics.filename), Buffer.from(analyticsBuffer));

    const entry = {
        runId,
        portalUserId: portalProfile.id,
        fullName: portalProfile.fullName,
        organization: portalProfile.organizationLabel,
        organizationId: portalProfile.organizationId,
        completedAt: completedIso,
        tokenType: tokenContext.tokenType || "legacy",
        sectionId: tokenContext.sectionId || null,
        sessionId: tokenContext.sessionId || null,
        sessionName: tokenContext.sessionName || "",
        tableNumber: activeUser?.tableNumber ? String(activeUser.tableNumber) : "",
        selectedRole: String(selectedRole || logData.userRole || "").trim(),
        trainerName: "МАЯК ОКО",
        completedTaskCount: Array.isArray(logData.tasks) ? logData.tasks.length : 0,
        totalTime: String(logData.totalTime || "").trim(),
        artifactDir,
    };

    const store = await readStore();
    store.entries.push(entry);
    await writeStore(store);
    return entry;
}

export async function listMayakHistoryByPortalUserId(portalUserId) {
    const store = await readStore();
    return store.entries
        .filter((entry) => String(entry.portalUserId || "") === String(portalUserId || ""))
        .sort((a, b) => String(b.completedAt || "").localeCompare(String(a.completedAt || "")));
}

export async function getMayakHistoryEntryForUser(portalUserId, runId) {
    const entries = await listMayakHistoryByPortalUserId(portalUserId);
    return entries.find((entry) => String(entry.runId) === String(runId || "")) || null;
}

export async function readMayakHistoryArtifact({ portalUserId, runId, type }) {
    const entry = await getMayakHistoryEntryForUser(portalUserId, runId);
    if (!entry) {
        return null;
    }

    const artifactMeta = ARTIFACT_TYPE_META[type];
    if (!artifactMeta) {
        return null;
    }

    const filePath = path.join(entry.artifactDir, artifactMeta.filename);
    const buffer = await fs.readFile(filePath);

    return {
        buffer,
        contentType: artifactMeta.contentType,
        filename: artifactMeta.filename,
        entry,
    };
}
