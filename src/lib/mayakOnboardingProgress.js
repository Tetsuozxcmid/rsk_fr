function getChecklistMeta(checklist = {}) {
    return checklist && typeof checklist === "object" && "items" in checklist && checklist.meta && typeof checklist.meta === "object" ? checklist.meta : {};
}

export function getStructuredChecklistItems(checklist = {}) {
    if (checklist && typeof checklist === "object" && checklist.items && typeof checklist.items === "object") {
        return checklist.items;
    }
    return checklist && typeof checklist === "object" ? checklist : {};
}

export function normalizeChecklistItemState(item = {}) {
    return {
        done: Boolean(item?.done),
        photos: Array.isArray(item?.photos) ? item.photos : item?.photoUrl ? [{ url: item.photoUrl, name: item.photoName || "photo" }] : [],
    };
}

export function getNormalizedChecklistItems(checklist = {}) {
    const items = getStructuredChecklistItems(checklist);
    return Object.fromEntries(Object.entries(items).map(([id, value]) => [id, normalizeChecklistItemState(value)]));
}

export function sectionPhotoId(sectionId) {
    return `section-photo:${sectionId}`;
}

export function getSubmissionPhotos(submission = {}) {
    const items = getStructuredChecklistItems(submission?.checklist || {});
    return Object.values(items).flatMap((item) => normalizeChecklistItemState(item).photos);
}

export function getParticipantLaptopType(checklist = {}) {
    const rawValue = getChecklistMeta(checklist)?.participantLaptopType;
    if (rawValue === "work") return "corporate";
    return rawValue === "corporate" || rawValue === "personal" ? rawValue : "";
}

export function isParticipantLaptopSectionReady(config = {}, checklist = {}, laptopType = getParticipantLaptopType(checklist)) {
    const items = getNormalizedChecklistItems(checklist);
    const laptopSection = (config?.participantSections || []).find((section) => section.id === "laptop") || null;
    const laptopItems = laptopSection?.items || [];

    if (!laptopType) return false;
    return laptopItems.every((item) => items[item.id]?.done);
}

export function isParticipantServicesSectionReady(config = {}, checklist = {}, laptopType = getParticipantLaptopType(checklist)) {
    const items = getNormalizedChecklistItems(checklist);
    const services = config?.services || [];
    if (!laptopType) return false;
    return services.every((service) => items[`participant-service:${service.id}`]?.done);
}

export function getParticipantProgressState(config = {}, submission = {}) {
    const checklist = submission?.checklist || {};
    const checklistItems = getNormalizedChecklistItems(checklist);
    const meta = getChecklistMeta(checklist);
    const participantLaptopType = getParticipantLaptopType(checklist);
    const services = config?.services || [];
    const laptopSection = (config?.participantSections || []).find((section) => section.id === "laptop") || null;
    const laptopItems = laptopSection?.items || [];
    const isLaptopReady = isParticipantLaptopSectionReady(config, checklist, participantLaptopType);
    const isServicesReady = isParticipantServicesSectionReady(config, checklist, participantLaptopType);
    const completedSectionIds = [];

    if (isLaptopReady) completedSectionIds.push("laptop");
    if (isServicesReady) completedSectionIds.push("services");

    const totalParts = 1 + laptopItems.length + services.length;
    const completedParts = [
        Boolean(participantLaptopType),
        ...laptopItems.map((item) => Boolean(checklistItems[item.id]?.done)),
        ...services.map((service) => Boolean(checklistItems[`participant-service:${service.id}`]?.done)),
    ].filter(Boolean).length;

    return {
        checklistItems,
        meta,
        participantLaptopType,
        laptopItems,
        services,
        completedSectionIds,
        completedParts,
        totalParts,
        progressPercent: totalParts ? Math.round((completedParts / totalParts) * 100) : 0,
        isLaptopSectionReady: isLaptopReady,
        isServicesSectionReady: isServicesReady,
        completed: isLaptopReady && isServicesReady,
    };
}

export function getTechCorporateLaptops(checklist = {}) {
    const value = getChecklistMeta(checklist)?.corporateLaptops;
    return value === "yes" || value === "no" ? value : "";
}

export function getMinPhotosForSection(section = {}) {
    if (!section?.requirePhoto) return 0;
    return Math.max(Number(section.minPhotos || 1), 1);
}

export function getTechSectionValidation(config = {}, section = {}, checklist = {}, corporateLaptops = getTechCorporateLaptops(checklist)) {
    const items = getNormalizedChecklistItems(checklist);
    const services = config?.services || [];
    const photoKey = sectionPhotoId(section.id);
    const photoState = normalizeChecklistItemState(items[photoKey]);
    const minPhotos = getMinPhotosForSection(section);
    const shouldCheckItems = section.id !== "laptops" || corporateLaptops === "yes";

    return {
        missingCorporateAnswer: section.id === "laptops" && !corporateLaptops,
        missingItemIds: shouldCheckItems ? (section.items || []).filter((item) => !items[item.id]?.done).map((item) => item.id) : [],
        missingServiceIds: section.id === "laptops" && corporateLaptops === "yes" ? services.filter((service) => !items[`tech-service:${service.id}`]?.done).map((service) => service.id) : [],
        missingPhotoCount: section.requirePhoto ? Math.max(minPhotos - photoState.photos.length, 0) : 0,
        photoKey,
        minPhotos,
        photoState,
    };
}

export function getTechSectionStatus(config = {}, section = {}, checklist = {}, corporateLaptops = getTechCorporateLaptops(checklist)) {
    const items = getNormalizedChecklistItems(checklist);
    const services = config?.services || [];
    const validation = getTechSectionValidation(config, section, checklist, corporateLaptops);
    const photoState = validation.photoState;

    let totalParts = (section.items || []).length;
    let completedParts = (section.items || []).filter((item) => Boolean(items[item.id]?.done)).length;

    if (section.id === "laptops") {
        totalParts = 1;
        completedParts = corporateLaptops ? 1 : 0;

        if (corporateLaptops === "yes") {
            totalParts += (section.items || []).length + services.length;
            completedParts += (section.items || []).filter((item) => Boolean(items[item.id]?.done)).length + services.filter((service) => Boolean(items[`tech-service:${service.id}`]?.done)).length;
        }
    }

    if (section.requirePhoto) {
        totalParts += validation.minPhotos;
        completedParts += Math.min(validation.minPhotos, photoState.photos.length);
    }

    const completed = !validation.missingCorporateAnswer && validation.missingItemIds.length === 0 && validation.missingServiceIds.length === 0 && validation.missingPhotoCount === 0;

    return {
        validation,
        completed,
        completedParts,
        totalParts,
        photoState,
    };
}

export function getTechProgressState(config = {}, submission = {}) {
    const checklist = submission?.checklist || {};
    const sections = config?.techSections || [];
    const corporateLaptops = getTechCorporateLaptops(checklist);
    const sectionStatuses = Object.fromEntries(sections.map((section) => [section.id, getTechSectionStatus(config, section, checklist, corporateLaptops)]));
    const completedSectionIds = sections.filter((section) => sectionStatuses[section.id]?.completed).map((section) => section.id);
    const totalProgressParts = sections.reduce((sum, section) => sum + (sectionStatuses[section.id]?.totalParts || 0), 0);
    const completedProgressParts = sections.reduce((sum, section) => sum + (sectionStatuses[section.id]?.completedParts || 0), 0);

    return {
        checklistItems: getNormalizedChecklistItems(checklist),
        meta: getChecklistMeta(checklist),
        sections,
        corporateLaptops,
        sectionStatuses,
        completedSectionIds,
        completedProgressParts,
        totalProgressParts,
        progressPercent: totalProgressParts ? Math.round((completedProgressParts / totalProgressParts) * 100) : 0,
        completed: sections.length > 0 && completedSectionIds.length === sections.length,
    };
}

export function getOnboardingSubmissionProgress(config = {}, submission = {}) {
    if (submission?.kind === "tech") {
        const techState = getTechProgressState(config, submission);
        return {
            completed: techState.completed,
            completedSectionIds: techState.completedSectionIds,
            progressPercent: techState.progressPercent,
            photos: getSubmissionPhotos(submission),
            statusLabel: techState.completed ? "Готово" : "В процессе",
        };
    }

    const participantState = getParticipantProgressState(config, submission);
    return {
        completed: participantState.completed,
        completedSectionIds: participantState.completedSectionIds,
        progressPercent: participantState.progressPercent,
        photos: [],
        statusLabel: participantState.completed ? "Готово" : "В процессе",
    };
}
