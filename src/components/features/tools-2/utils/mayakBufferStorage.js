const FIELD_MAPPING = {
    m: "mission",
    a: "audience",
    y: "role",
    k: "criteria",
    o1: "limitations",
    k2: "context",
    o2: "format",
};

function readCookie(name) {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
}

function writeCookie(name, value, days = 365) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

export function loadMayakBuffer(storageKey) {
    const raw = readCookie(storageKey);
    if (!raw) {
        return {};
    }

    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

export function saveMayakBuffer(storageKey, buffer) {
    writeCookie(storageKey, JSON.stringify(buffer));
}

export function appendMayakBufferValue(buffer, code, value, maxItems = 6) {
    const trimmedValue = value?.trim();
    if (!trimmedValue) {
        return buffer;
    }

    const nextBuffer = { ...buffer };
    const currentItems = Array.isArray(nextBuffer[code]) ? nextBuffer[code] : [];
    if (currentItems.includes(trimmedValue)) {
        return buffer;
    }

    nextBuffer[code] = [trimmedValue, ...currentItems].slice(0, maxItems);
    return nextBuffer;
}

export function ensureMayakBufferOptions({ buffer, code, type, contentTypeOptions, maxItems = 6 }) {
    if (buffer[code] !== undefined) {
        return buffer;
    }

    const mappedKey = FIELD_MAPPING[code];
    if (!mappedKey) {
        return buffer;
    }

    const typeOptions = contentTypeOptions?.[type];
    const options = typeOptions?.[mappedKey];
    if (!Array.isArray(options) || options.length === 0) {
        return buffer;
    }

    const nextBuffer = { ...buffer };
    nextBuffer[code] = [...options].sort(() => 0.5 - Math.random()).slice(0, maxItems);
    return nextBuffer;
}


export function pickRandomMayakFieldValue({ code, type, contentTypeOptions }) {
    const mappedKey = FIELD_MAPPING[code];
    if (!mappedKey) {
        return null;
    }

    const typeOptions = contentTypeOptions?.[type];
    const options = typeOptions?.[mappedKey];
    if (!Array.isArray(options) || options.length === 0) {
        return null;
    }

    return options[Math.floor(Math.random() * options.length)] || null;
}
