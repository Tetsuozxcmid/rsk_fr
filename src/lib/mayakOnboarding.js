import { randomUUID } from "crypto";
import { extname } from "path";
import {
    readOnboardingConfig,
    writeOnboardingConfig,
    readOnboardingLinks,
    writeOnboardingLinks,
    readOnboardingSubmissions,
    writeOnboardingSubmissions,
    readOnboardingSurveyResponses,
    writeOnboardingSurveyResponses,
    writeOnboardingFile,
    removeOnboardingDir,
} from "./mayakOnboardingStorage.js";
import { getOnboardingSubmissionProgress, getStructuredChecklistItems as getProgressStructuredChecklistItems } from "./mayakOnboardingProgress.js";
import { DEFAULT_MAYAK_ONBOARDING_SURVEY, getSurveyResponseEntries, normalizeMayakOnboardingSurvey, normalizeSurveyAnswers, validateSurveyAnswers } from "./mayakOnboardingSurvey.js";

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function normalizeChecklistSection(section = {}, prefix = "section", index = 0) {
    const id = String(section.id || `${prefix}-${index + 1}`).trim();
    const requirePhoto = Boolean(section.requirePhoto);
    const parsedMinPhotos = Number.parseInt(String(section.minPhotos ?? section.requiredPhotoCount ?? ""), 10);
    const minPhotos = requirePhoto ? Math.max(Number.isFinite(parsedMinPhotos) ? parsedMinPhotos : 1, 1) : 0;
    return {
        id,
        title: String(section.title || "").trim(),
        description: String(section.description || "").trim(),
        requirePhoto,
        minPhotos,
        photoLabel: String(section.photoLabel || ""),
        examplePhotoHint: String(section.examplePhotoHint || ""),
        examplePhotos: Array.isArray(section.examplePhotos)
            ? section.examplePhotos
                  .map((photo) => ({
                      image: String(photo?.image || ""),
                      caption: String(photo?.caption || ""),
                  }))
                  .filter((photo) => photo.image || photo.caption)
            : [],
        items: Array.isArray(section.items)
            ? section.items.map((item, itemIndex) => ({
                  id: String(item?.id || `${id}-item-${itemIndex + 1}`),
                  title: String(item?.title || ""),
              }))
            : [],
    };
}

function cloneChecklistItems(items = []) {
    return Array.isArray(items) ? items.map((item) => ({ id: String(item?.id || ""), title: String(item?.title || "") })) : [];
}

function normalizeService(service = {}, index = 0) {
    return {
        id: String(service?.id || `service-${index + 1}`),
        name: String(service?.name || ""),
        url: String(service?.url || ""),
        instructionImage: String(service?.instructionImage || ""),
        instructionHint: String(service?.instructionHint || ""),
    };
}

export function normalizeChecklistConfig(rawConfig = {}) {
    const techSections = Array.isArray(rawConfig.techSections) ? rawConfig.techSections.map((section, index) => normalizeChecklistSection(section, "tech", index)) : [];
    const participantSections = Array.isArray(rawConfig.participantSections) ? rawConfig.participantSections.map((section, index) => normalizeChecklistSection(section, "participant", index)) : [];
    const techLaptopSection = techSections.find((section) => section.id === "laptops");

    return {
        organizer: rawConfig.organizer
            ? {
                  name: String(rawConfig.organizer.name || ""),
                  phone: String(rawConfig.organizer.phone || ""),
              }
            : { name: "", phone: "" },
        services: Array.isArray(rawConfig.services) ? rawConfig.services.map((service, index) => normalizeService(service, index)) : [],
        techSections,
        participantSections: participantSections.map((section) =>
            section.id === "laptop" && section.items.length === 0 && techLaptopSection?.items?.length
                ? {
                      ...section,
                      items: cloneChecklistItems(techLaptopSection.items),
                  }
                : section
        ),
        survey: normalizeMayakOnboardingSurvey(rawConfig.survey || DEFAULT_MAYAK_ONBOARDING_SURVEY),
    };
}

function slugifyTitle(title) {
    const slugBase = String(title || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9а-яё]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
    return slugBase || "session";
}

export function getStructuredChecklistItems(checklist = {}) {
    return getProgressStructuredChecklistItems(checklist);
}

export function getCompletionPercent(checklist = {}) {
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

function normalizeSubmissionChecklist(checklist = {}) {
    if (checklist && typeof checklist === "object" && "items" in checklist) {
        return {
            items: checklist.items && typeof checklist.items === "object" ? checklist.items : {},
            meta: checklist.meta && typeof checklist.meta === "object" ? checklist.meta : undefined,
        };
    }
    return checklist && typeof checklist === "object" ? checklist : {};
}

function normalizeSubmission(submission = {}) {
    return {
        id: String(submission.id || ""),
        linkId: String(submission.linkId || ""),
        kind: submission.kind === "tech" ? "tech" : "participant",
        name: String(submission.name || ""),
        contact: String(submission.contact || ""),
        checklist: normalizeSubmissionChecklist(submission.checklist || {}),
        completed: Boolean(submission.completed),
        createdAt: submission.createdAt || null,
        updatedAt: submission.updatedAt || null,
    };
}

function normalizeLink(link = {}) {
    return {
        id: String(link.id || ""),
        slug: String(link.slug || ""),
        title: String(link.title || ""),
        location: String(link.location || ""),
        eventDate: String(link.eventDate || ""),
        endDate: String(link.endDate || ""),
        chatLink: String(link.chatLink || ""),
        status: String(link.status || "active"),
        createdAt: link.createdAt || null,
    };
}

function normalizeSurveyResponse(response = {}) {
    const schemaSnapshot = normalizeMayakOnboardingSurvey(response?.schemaSnapshot || DEFAULT_MAYAK_ONBOARDING_SURVEY);
    return {
        id: String(response.id || ""),
        linkId: String(response.linkId || ""),
        answers: normalizeSurveyAnswers(schemaSnapshot, response.answers || {}),
        schemaSnapshot,
        createdAt: response.createdAt || null,
        updatedAt: response.updatedAt || null,
        completedAt: response.completedAt || null,
    };
}

function decorateSubmission(config, submission, { includeContact = true } = {}) {
    const progress = getOnboardingSubmissionProgress(config, submission);
    return {
        ...clone(submission),
        ...(includeContact ? {} : { contact: "" }),
        progressPercent: progress.progressPercent,
        statusLabel: progress.statusLabel,
        completedSectionIds: progress.completedSectionIds,
        photos: progress.photos,
        completed: progress.completed,
    };
}

function buildPublicSummary(config, submissions = []) {
    const decorated = submissions.map((submission) => decorateSubmission(config, submission, { includeContact: false }));
    const participants = decorated
        .filter((item) => item.kind === "participant")
        .map((item) => ({
            id: item.id,
            name: item.name,
            progressPercent: item.progressPercent,
            statusLabel: item.statusLabel,
            completed: item.completed,
            updatedAt: item.updatedAt,
        }));
    const tech = decorated
        .filter((item) => item.kind === "tech")
        .map((item) => ({
            id: item.id,
            name: item.name,
            progressPercent: item.progressPercent,
            statusLabel: item.statusLabel,
            completed: item.completed,
            updatedAt: item.updatedAt,
            photos: clone(item.photos || []),
        }));

    return {
        participantCount: participants.length,
        participantReady: participants.filter((item) => item.completed).length,
        techCount: tech.length,
        techReady: tech.filter((item) => item.completed).length,
        participants,
        tech,
    };
}

function validateSurveyLink(link) {
    if (!link || link.status !== "active") {
        throw new Error("Ссылка онбординга не найдена");
    }
}

export async function getMayakOnboardingConfig() {
    return normalizeChecklistConfig(await readOnboardingConfig());
}

export async function updateMayakOnboardingConfig(rawConfig) {
    const config = normalizeChecklistConfig(rawConfig);
    await writeOnboardingConfig(config);
    return config;
}

export async function listMayakOnboardingLinks() {
    const links = await readOnboardingLinks();
    return links.map(normalizeLink).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export async function getMayakOnboardingLinkBySlug(slug) {
    const links = await listMayakOnboardingLinks();
    const normalizedSlug = String(slug || "");
    const directMatch = links.find((link) => link.slug === normalizedSlug);
    if (directMatch) {
        return directMatch;
    }

    try {
        const decodedSlug = decodeURIComponent(normalizedSlug);
        return links.find((link) => link.slug === decodedSlug) || null;
    } catch {
        return null;
    }
}

export async function createMayakOnboardingLink(payload = {}) {
    const title = String(payload.title || "").trim();
    if (!title) {
        throw new Error("Укажите название сессии");
    }

    const eventDate = String(payload.startDate || payload.eventDate || "").trim();
    if (!eventDate) {
        throw new Error("Укажите дату начала");
    }

    const endDate = String(payload.endDate || "").trim();
    if (!endDate && false /* single-day onboarding keeps endDate optional */) {
        throw new Error("Укажите дату окончания");
    }

    if (endDate && endDate < eventDate) {
        throw new Error("Дата окончания не может быть раньше даты начала");
    }

    const links = await listMayakOnboardingLinks();
    const baseSlug = slugifyTitle(title);
    let slug = `${baseSlug}-${Date.now().toString().slice(-6)}`;
    while (links.some((link) => link.slug === slug)) {
        slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;
    }

    const nextLink = normalizeLink({
        id: randomUUID(),
        slug,
        title,
        location: String(payload.location || "").trim(),
        eventDate,
        endDate,
        chatLink: String(payload.chatLink || "").trim(),
        status: "active",
        createdAt: new Date().toISOString(),
    });

    const nextLinks = [nextLink, ...links];
    await writeOnboardingLinks(nextLinks);
    return nextLink;
}

export async function deleteMayakOnboardingLink(linkId) {
    const links = await listMayakOnboardingLinks();
    const submissions = (await readOnboardingSubmissions()).map(normalizeSubmission);
    const surveyResponses = (await readOnboardingSurveyResponses()).map(normalizeSurveyResponse);
    const target = links.find((link) => link.id === linkId);
    if (!target) {
        throw new Error("Ссылка не найдена");
    }

    const remainingLinks = links.filter((link) => link.id !== linkId);
    const removedSubmissions = submissions.filter((submission) => submission.linkId === linkId);
    const remainingSubmissions = submissions.filter((submission) => submission.linkId !== linkId);
    const remainingSurveyResponses = surveyResponses.filter((response) => response.linkId !== linkId);

    await writeOnboardingLinks(remainingLinks);
    await writeOnboardingSubmissions(remainingSubmissions);
    await writeOnboardingSurveyResponses(remainingSurveyResponses);
    await removeOnboardingDir("links", linkId);
    await Promise.all(removedSubmissions.map((submission) => removeOnboardingDir("submissions", submission.id)));
    return target;
}

export async function createMayakOnboardingSubmission({ slug, kind, name, contact = "" }) {
    const link = await getMayakOnboardingLinkBySlug(slug);
    validateSurveyLink(link);

    const trimmedName = String(name || "").trim();
    if (!trimmedName) {
        throw new Error("Не хватает данных для старта онбординга");
    }

    const normalizedKind = kind === "tech" ? "tech" : "participant";
    const trimmedContact = String(contact || "").trim();
    if (normalizedKind === "tech" && trimmedContact && !/^\+7\d{10}$/.test(trimmedContact.replace(/\s+/g, ""))) {
        throw new Error("Укажите телефон в формате +7XXXXXXXXXX");
    }

    const submissions = (await readOnboardingSubmissions()).map(normalizeSubmission);
    const timestamp = new Date().toISOString();
    const nextSubmission = normalizeSubmission({
        id: randomUUID(),
        linkId: link.id,
        kind: normalizedKind,
        name: trimmedName,
        contact: trimmedContact,
        checklist: {},
        completed: false,
        createdAt: timestamp,
        updatedAt: timestamp,
    });
    submissions.push(nextSubmission);
    await writeOnboardingSubmissions(submissions);
    return nextSubmission;
}

export async function getMayakOnboardingSubmission(submissionId) {
    const submissions = (await readOnboardingSubmissions()).map(normalizeSubmission);
    return submissions.find((submission) => submission.id === submissionId) || null;
}

export async function updateMayakOnboardingSubmission(submissionId, payload = {}) {
    const submissions = (await readOnboardingSubmissions()).map(normalizeSubmission);
    const targetIndex = submissions.findIndex((submission) => submission.id === submissionId);
    if (targetIndex === -1) {
        throw new Error("Анкета онбординга не найдена");
    }

    const current = submissions[targetIndex];
    const nextSubmission = normalizeSubmission({
        ...current,
        checklist: payload.checklist ?? current.checklist,
        completed: payload.completed ?? current.completed,
        updatedAt: new Date().toISOString(),
    });
    submissions[targetIndex] = nextSubmission;
    await writeOnboardingSubmissions(submissions);
    return nextSubmission;
}

export async function createMayakOnboardingSurveyResponse({ slug, answers = {}, completed = true } = {}) {
    const link = await getMayakOnboardingLinkBySlug(slug);
    validateSurveyLink(link);

    const config = await getMayakOnboardingConfig();
    const schemaSnapshot = normalizeMayakOnboardingSurvey(config.survey || DEFAULT_MAYAK_ONBOARDING_SURVEY);
    const validation = validateSurveyAnswers(schemaSnapshot, answers);
    if (completed && !validation.valid) {
        const firstError = Object.values(validation.errors)[0];
        throw new Error(firstError?.message || "Заполните анкету полностью");
    }

    const timestamp = new Date().toISOString();
    const responses = (await readOnboardingSurveyResponses()).map(normalizeSurveyResponse);
    const nextResponse = normalizeSurveyResponse({
        id: randomUUID(),
        linkId: link.id,
        answers: validation.answers,
        schemaSnapshot,
        createdAt: timestamp,
        updatedAt: timestamp,
        completedAt: completed ? timestamp : null,
    });

    responses.push(nextResponse);
    await writeOnboardingSurveyResponses(responses);
    return nextResponse;
}

export async function listMayakOnboardingSurveyResponses({ linkId = "" } = {}) {
    const responses = (await readOnboardingSurveyResponses()).map(normalizeSurveyResponse);
    return responses.filter((response) => !linkId || response.linkId === linkId).sort((a, b) => String(b.completedAt || b.updatedAt || "").localeCompare(String(a.completedAt || a.updatedAt || "")));
}

export async function getMayakOnboardingSurveyResponse(responseId) {
    const responses = (await readOnboardingSurveyResponses()).map(normalizeSurveyResponse);
    return responses.find((response) => response.id === responseId) || null;
}

export async function updateMayakOnboardingSurveyResponse(responseId, payload = {}) {
    const responses = (await readOnboardingSurveyResponses()).map(normalizeSurveyResponse);
    const targetIndex = responses.findIndex((response) => response.id === responseId);
    if (targetIndex === -1) {
        throw new Error("Ответ анкеты не найден");
    }

    const current = responses[targetIndex];
    const schemaSnapshot = normalizeMayakOnboardingSurvey(payload.schemaSnapshot || current.schemaSnapshot || DEFAULT_MAYAK_ONBOARDING_SURVEY);
    const completed = payload.completedAt === null ? false : Boolean(payload.completed || payload.completedAt || current.completedAt);
    const validation = validateSurveyAnswers(schemaSnapshot, payload.answers ?? current.answers ?? {});
    if (completed && !validation.valid) {
        const firstError = Object.values(validation.errors)[0];
        throw new Error(firstError?.message || "Заполните анкету полностью");
    }

    const now = new Date().toISOString();
    const nextCompletedAt = payload.completedAt === null ? null : payload.completedAt || (completed && current.completedAt ? current.completedAt : completed ? now : null);
    const nextResponse = normalizeSurveyResponse({
        ...current,
        answers: validation.answers,
        schemaSnapshot,
        updatedAt: now,
        completedAt: nextCompletedAt,
    });

    responses[targetIndex] = nextResponse;
    await writeOnboardingSurveyResponses(responses);
    return nextResponse;
}

export async function getMayakOnboardingLinkSummary(linkId) {
    const config = await getMayakOnboardingConfig();
    const submissions = (await readOnboardingSubmissions()).map(normalizeSubmission).filter((submission) => submission.linkId === linkId);
    return buildPublicSummary(config, submissions);
}

export async function getMayakOnboardingSurveyResults(linkId = "") {
    const [responses, links] = await Promise.all([listMayakOnboardingSurveyResponses({ linkId }), listMayakOnboardingLinks()]);
    const linkMap = new Map(links.map((link) => [link.id, link]));

    return responses.map((response) => {
        const link = linkMap.get(response.linkId) || null;
        return {
            ...clone(response),
            link: link
                ? {
                      id: link.id,
                      slug: link.slug,
                      title: link.title,
                      eventDate: link.eventDate,
                      endDate: link.endDate,
                  }
                : null,
            entries: getSurveyResponseEntries(response.schemaSnapshot, response.answers),
        };
    });
}

export async function getMayakOnboardingDashboard() {
    const [links, config, submissions, surveyResponses] = await Promise.all([listMayakOnboardingLinks(), getMayakOnboardingConfig(), readOnboardingSubmissions(), readOnboardingSurveyResponses()]);

    const normalizedSubmissions = submissions.map(normalizeSubmission);
    const normalizedSurveyResponses = surveyResponses.map(normalizeSurveyResponse);

    return links.map((link) => {
        const linkSubmissions = normalizedSubmissions.filter((submission) => submission.linkId === link.id).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
        const decoratedSubmissions = linkSubmissions.map((submission) => decorateSubmission(config, submission));
        const summary = buildPublicSummary(config, linkSubmissions);

        return {
            ...clone(link),
            participantCount: summary.participantCount,
            techCount: summary.techCount,
            participantReady: summary.participantReady,
            techReady: summary.techReady,
            surveyResponseCount: normalizedSurveyResponses.filter((response) => response.linkId === link.id).length,
            submissions: decoratedSubmissions.map(clone),
        };
    });
}

const ONBOARDING_IMAGE_EXTENSION_BY_MIME = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
};

function getOnboardingAssetBaseName(folder) {
    if (folder === "section-photos") return "section-photo";
    if (folder === "instructions" || folder === "service-guides") return "instruction";
    if (folder === "examples") return "example-photo";
    return "asset";
}

async function writeUploadedOnboardingAsset({ scope, parentId, folder, fileName, mimeType, buffer }) {
    if (!fileName || !Buffer.isBuffer(buffer) || buffer.length === 0 || !String(mimeType || "").startsWith("image/")) {
        throw new Error("Не удалось обработать изображение");
    }

    const extension = ONBOARDING_IMAGE_EXTENSION_BY_MIME[String(mimeType).toLowerCase()] || extname(String(fileName)) || ".jpg";
    const safeName = `${getOnboardingAssetBaseName(folder)}-${Date.now()}${extension}`;
    const uploaded = await writeOnboardingFile({
        scope,
        parentId,
        folder,
        filename: safeName,
        buffer,
    });
    return {
        url: uploaded.url,
        fileName: uploaded.filename,
    };
}

export async function uploadMayakOnboardingAsset({ scope, parentId, folder, fileName, dataUrl }) {
    const match = String(dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!fileName || !match) {
        throw new Error("Не удалось обработать изображение");
    }

    return writeUploadedOnboardingAsset({
        scope,
        parentId,
        folder,
        buffer: Buffer.from(match[2], "base64"),
        fileName,
        mimeType: match[1],
    });
}

export async function uploadMayakOnboardingBinaryAsset({ scope, parentId, folder, fileName, mimeType, buffer }) {
    return writeUploadedOnboardingAsset({
        scope,
        parentId,
        folder,
        fileName,
        mimeType,
        buffer: Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || ""),
    });
}
