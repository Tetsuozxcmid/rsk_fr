function getProfileData(payload) {
    if (payload && typeof payload === "object" && payload.data && typeof payload.data === "object") {
        return payload.data;
    }
    return payload && typeof payload === "object" ? payload : {};
}

export function getPortalOrganizationId(payload) {
    const data = getProfileData(payload);
    return String(data.Organization_id || data.organization_id || data?.Organization?.id || "").trim();
}

export function getPortalOrganizationLabel(payload) {
    const data = getProfileData(payload);
    return String(data?.Organization?.short_name || data?.Organization?.name || data.organization_name || data.Organization_name || "").trim();
}

export function buildPortalFullName(payload) {
    const data = getProfileData(payload);
    return [data.Surname, data.NameIRL, data.Patronymic]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(" ")
        .trim();
}

export function normalizePortalProfile(payload) {
    const data = getProfileData(payload);
    const fullName = buildPortalFullName(data);
    const organizationId = getPortalOrganizationId(data);
    const organizationLabel = getPortalOrganizationLabel(data);

    return {
        raw: data,
        id: String(data.id || data.user_id || "").trim(),
        email: String(data.email || "").trim(),
        username: String(data.username || "").trim(),
        name: String(data.NameIRL || "").trim(),
        surname: String(data.Surname || "").trim(),
        patronymic: String(data.Patronymic || "").trim(),
        fullName: fullName || String(data.NameIRL || data.username || data.email || "Участник").trim(),
        region: String(data.Region || "").trim(),
        role: String(data.role || data.Type || "student").trim(),
        organizationId,
        organizationLabel,
    };
}

export function isPortalProfileComplete(payload) {
    const profile = normalizePortalProfile(payload);
    return Boolean(profile.name && profile.surname && profile.organizationId);
}

export function buildPortalUserCookiePayload(payload, extra = {}) {
    const profile = normalizePortalProfile(payload);
    return {
        id: profile.id,
        name: profile.fullName || "Участник",
        organization: profile.organizationLabel,
        organizationId: profile.organizationId,
        portalUserId: profile.id,
        ...extra,
    };
}

export function buildPortalAuthCookieSnapshot(payload) {
    const profile = normalizePortalProfile(payload);
    return {
        email: profile.email,
        username: profile.name || profile.username || profile.email,
    };
}
