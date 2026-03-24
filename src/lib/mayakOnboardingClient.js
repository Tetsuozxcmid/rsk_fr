function getErrorText(value) {
    if (!value) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value?.message === "string") return value.message.trim();
    if (Array.isArray(value?.errors)) {
        return value.errors.map(getErrorText).find(Boolean) || "";
    }
    return "";
}

async function parseJson(response) {
    const rawText = await response.text().catch(() => "");
    let data = {};

    if (rawText) {
        try {
            data = JSON.parse(rawText);
        } catch {
            data = {};
        }
    }

    if (!response.ok) {
        const message = getErrorText(data?.error) || getErrorText(data) || (rawText && !rawText.includes("<!DOCTYPE") && !rawText.includes("<html") ? rawText.slice(0, 300) : "") || `Запрос завершился с ошибкой (${response.status})`;
        throw new Error(message);
    }

    return data;
}

export function getSubmissionStorageKey(slug, kind) {
    return `mayak_onboarding_submission:${slug}:${kind}`;
}

export function getStructuredChecklistItems(checklist) {
    if (checklist && typeof checklist === "object" && checklist.items && typeof checklist.items === "object") {
        return checklist.items;
    }
    return {};
}

export function getCompletionPercent(checklist) {
    const values =
        checklist && typeof checklist === "object" && checklist.items
            ? Object.values(checklist.items).map((item) => {
                  const photos = Array.isArray(item?.photos) ? item.photos : item?.photoUrl ? [{ url: item.photoUrl, name: item.photoName || "photo" }] : [];
                  return Boolean(item?.done) || photos.length > 0;
              })
            : Object.values(checklist || {}).map(Boolean);
    if (values.length === 0) return 0;
    return Math.round((values.filter(Boolean).length / values.length) * 100);
}

export function formatOnboardingDate(value) {
    if (!value) return "";
    const [year, month, day] = String(value).split("-");
    return day && month && year ? `${day}.${month}.${year}` : value;
}

export async function getOnboardingLink(slug) {
    return parseJson(await fetch(`/api/mayak/onboarding-link/${encodeURIComponent(slug)}`));
}

export async function getChecklistConfig() {
    return parseJson(await fetch("/api/mayak/onboarding-config"));
}

export async function startOnboarding(payload) {
    return parseJson(
        await fetch("/api/mayak/onboarding-submissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function getOnboardingSubmission(id) {
    return parseJson(await fetch(`/api/mayak/onboarding-submissions/${encodeURIComponent(id)}`));
}

export async function updateOnboardingSubmission(id, payload) {
    return parseJson(
        await fetch(`/api/mayak/onboarding-submissions/${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function uploadOnboardingPhoto(payload) {
    if (typeof FormData !== "undefined" && payload?.file instanceof File) {
        const formData = new FormData();
        formData.append("itemId", String(payload.itemId || ""));
        formData.append("file", payload.file, payload.file.name || "image");

        return parseJson(
            await fetch(`/api/mayak/onboarding-submissions/${encodeURIComponent(payload.submissionId)}/photos`, {
                method: "POST",
                body: formData,
            })
        );
    }

    return parseJson(
        await fetch(`/api/mayak/onboarding-submissions/${encodeURIComponent(payload.submissionId)}/photos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function getAdminDashboard() {
    return parseJson(await fetch("/api/admin/mayak-onboarding/dashboard"));
}

export async function getAdminChecklistConfig() {
    return parseJson(await fetch("/api/admin/mayak-onboarding/config"));
}

export async function updateAdminChecklistConfig(config) {
    return parseJson(
        await fetch("/api/admin/mayak-onboarding/config", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config }),
        })
    );
}

export async function createOnboardingLink(payload) {
    return parseJson(
        await fetch("/api/admin/mayak-onboarding/links", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function archiveOnboardingLink(id) {
    return parseJson(
        await fetch(`/api/admin/mayak-onboarding/links/${encodeURIComponent(id)}`, {
            method: "DELETE",
        })
    );
}

export async function uploadAdminInstructionAsset(payload) {
    if (typeof FormData !== "undefined" && payload?.file instanceof File) {
        const formData = new FormData();
        formData.append("scope", payload.scope === "submissions" ? "submissions" : "links");
        formData.append("parentId", String(payload.parentId || ""));
        formData.append("folder", String(payload.folder || "instructions"));
        formData.append("file", payload.file, payload.file.name || "image");

        return parseJson(
            await fetch("/api/admin/mayak-onboarding/upload", {
                method: "POST",
                body: formData,
            })
        );
    }

    return parseJson(
        await fetch("/api/admin/mayak-onboarding/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}
