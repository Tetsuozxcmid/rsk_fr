"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import { archiveOnboardingLink, createOnboardingLink, getAdminChecklistConfig, getAdminDashboard, updateAdminChecklistConfig, uploadAdminInstructionAsset } from "@/lib/mayakOnboardingClient";

const AUTH_KEY = "mayak_content_admin_auth";
const DRAFT_KEY = "mayak_onboarding_constructor_draft";
const inputClassName =
    "!w-full !rounded-[0.95rem] !border-2 !border-stone-700/80 !bg-white !px-4 !py-3 !text-sm !text-(--color-black) !shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] outline-none transition placeholder:!text-[#94a3b8] focus:!border-black";
const primaryButtonClassName =
    "!inline-flex !w-auto !items-center !justify-center !rounded-[1rem] !border-0 !bg-[linear-gradient(135deg,#0f766e_0%,#115e59_100%)] !px-4 !py-3 !text-sm !font-bold !text-white shadow-[0_12px_24px_rgba(15,118,110,0.18)] transition hover:-translate-y-px";
const secondaryButtonClassName =
    "!inline-flex !w-auto !items-center !justify-center !rounded-[1rem] !border !border-(--color-gray-plus-50) !bg-white !px-4 !py-3 !text-sm !font-semibold !text-(--color-black) transition hover:!border-(--color-main) hover:!text-(--color-main)";
const dangerButtonClassName = "!inline-flex !w-auto !items-center !justify-center !rounded-[1rem] !border !border-[#fecaca] !bg-[#fff5f5] !px-4 !py-3 !text-sm !font-semibold !text-[#b91c1c] transition hover:!bg-[#fee2e2]";

function createSection(prefix, index) {
    return { id: `${prefix}-${index + 1}`, title: "", description: "", requirePhoto: false, minPhotos: 0, photoLabel: "", examplePhotoHint: "", examplePhotos: [], items: [] };
}

function createService(index) {
    return { id: `service-${index + 1}`, name: "", url: "", instructionImage: "", instructionHint: "" };
}

function formatDates(startDate, endDate) {
    const format = (value) => {
        const [year, month, day] = String(value || "").split("-");
        return day && month && year ? `${day}.${month}.${year}` : value || "";
    };
    if (!startDate) return "";
    return endDate ? `${format(startDate)} - ${format(endDate)}` : format(startDate);
}

function getSubmissionPhotos(submission) {
    const items = submission?.checklist?.items || {};
    return Object.values(items).flatMap((item) => (Array.isArray(item?.photos) ? item.photos : item?.photoUrl ? [{ url: item.photoUrl, name: item.photoName || "photo" }] : []));
}

function buildOnboardingUrl(slug, { encoded = false } = {}) {
    const safeSlug = encoded ? encodeURIComponent(String(slug || "")) : String(slug || "");
    const path = `/mayak-onboarding/${safeSlug}`;
    return typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
}

function EditorBlock({ title, hint, children, className = "" }) {
    return (
        <div className={`rounded-[1rem] border border-(--color-gray-plus-50) bg-white p-4 ${className}`.trim()}>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">{title}</div>
            {hint ? <div className="mt-2 text-sm leading-6 text-[#64748b]">{hint}</div> : null}
            <div className={hint ? "mt-4" : "mt-3"}>{children}</div>
        </div>
    );
}

function EditorField({ label, hint, children, invalid = false, required = false, className = "" }) {
    return (
        <label className={`flex h-full flex-col rounded-[1rem] border-2 p-3 ${invalid ? "border-[#fca5a5] bg-[#fff1f2]" : "border-stone-300 bg-white"} ${className}`.trim()}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">
                <span>{label}</span>
                {required ? <span className="text-[#dc2626]">*</span> : null}
            </div>
            {hint ? <div className="mt-2 text-sm leading-6 text-[#64748b]">{hint}</div> : null}
            <div className={`${hint ? "mt-3" : "mt-2"} mt-auto`}>{children}</div>
        </label>
    );
}

function CompactEditorField({ label, children, className = "" }) {
    return (
        <label className={`block rounded-[0.95rem] border-2 border-stone-300 bg-white px-3 py-2 ${className}`.trim()}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748b]">{label}</div>
            <div className="mt-2">{children}</div>
        </label>
    );
}

function normalizeImportedSection(section = {}, prefix = "section", index = 0) {
    const id = String(section.id || `${prefix}-${index + 1}`).trim();
    return {
        id,
        title: String(section.title || ""),
        description: String(section.description || ""),
        requirePhoto: Boolean(section.requirePhoto),
        minPhotos: Boolean(section.requirePhoto) ? Math.max(Number(section.minPhotos || 1), 1) : 0,
        photoLabel: String(section.photoLabel || ""),
        examplePhotoHint: String(section.examplePhotoHint || ""),
        examplePhotos: Array.isArray(section.examplePhotos) ? section.examplePhotos.map((photo) => ({ image: String(photo?.image || ""), caption: String(photo?.caption || "") })) : [],
        items: Array.isArray(section.items)
            ? section.items.map((item, itemIndex) => ({
                  id: String(item?.id || `${id}-item-${itemIndex + 1}`),
                  title: String(item?.title || ""),
              }))
            : [],
    };
}

function normalizeImportedService(service = {}, index = 0) {
    return {
        id: String(service.id || `service-${index + 1}`),
        name: String(service.name || ""),
        url: String(service.url || ""),
        instructionImage: String(service.instructionImage || ""),
        instructionHint: String(service.instructionHint || ""),
    };
}

function getConstructorExportPayload(view, config) {
    if (view === "participant") {
        return {
            scope: "participant",
            participantSections: (config.participantSections || []).map((section, index) => normalizeImportedSection(section, "participant", index)),
        };
    }

    if (view === "tech") {
        return {
            scope: "tech",
            techSections: (config.techSections || []).map((section, index) => normalizeImportedSection(section, "tech", index)),
        };
    }

    return {
        scope: "services",
        organizer: {
            name: String(config.organizer?.name || ""),
            phone: String(config.organizer?.phone || ""),
        },
        services: (config.services || []).map((service, index) => normalizeImportedService(service, index)),
    };
}

function applyImportedConstructorPayload(view, payload, currentConfig) {
    if (view === "participant") {
        const participantSections = Array.isArray(payload) ? payload : Array.isArray(payload?.participantSections) ? payload.participantSections : null;
        if (!participantSections) {
            throw new Error("JSON участника должен содержать массив participantSections.");
        }

        return {
            ...currentConfig,
            participantSections: participantSections.map((section, index) => normalizeImportedSection(section, "participant", index)),
        };
    }

    if (view === "tech") {
        const techSections = Array.isArray(payload) ? payload : Array.isArray(payload?.techSections) ? payload.techSections : null;
        if (!techSections) {
            throw new Error("JSON техспециалиста должен содержать массив techSections.");
        }

        return {
            ...currentConfig,
            techSections: techSections.map((section, index) => normalizeImportedSection(section, "tech", index)),
        };
    }

    if (!payload || typeof payload !== "object" || !Array.isArray(payload?.services)) {
        throw new Error("JSON сервисов должен содержать organizer и services.");
    }

    return {
        ...currentConfig,
        organizer: {
            name: String(payload?.organizer?.name || ""),
            phone: String(payload?.organizer?.phone || ""),
        },
        services: Array.isArray(payload?.services) ? payload.services.map((service, index) => normalizeImportedService(service, index)) : [],
    };
}

function LoginForm({ onLogin }) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        try {
            const res = await fetch("/api/admin/mayak-auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            const json = await res.json();
            if (!json.success) {
                setError(json.error || "Неверный пароль");
                setPassword("");
                return;
            }
            sessionStorage.setItem(AUTH_KEY, "true");
            onLogin();
        } catch {
            setError("Ошибка входа");
        }
    };

    return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
            <form onSubmit={handleSubmit} className="flex w-full max-w-[380px] flex-col gap-4 rounded-[1.25rem] border border-(--color-gray-plus-50) bg-white p-8 shadow-sm">
                <h2 className="text-center text-2xl font-black text-(--color-black)">Онбординг MAYAK</h2>
                <input type="password" placeholder="Пароль" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClassName} />
                {error ? <div className="text-sm font-medium text-[#b91c1c]">{error}</div> : null}
                <button type="submit" className={primaryButtonClassName}>
                    Войти
                </button>
            </form>
        </div>
    );
}

function SectionEditor({ section, onChange, onDelete, onUploadExamplePhoto }) {
    const photos = section.examplePhotos || [];
    const [uploadingPhotoIndex, setUploadingPhotoIndex] = useState(-1);
    return (
        <div className="rounded-[1.35rem] border border-(--color-gray-plus-50) bg-[#f8fafc] p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Редактируемый блок</div>
                    <div className="mt-2 text-xl font-black text-(--color-black)">{section.title || "Новый раздел"}</div>
                    <div className="mt-1 text-sm leading-6 text-[#64748b]">Все поля ниже оформлены отдельными карточками, чтобы сразу было видно, что именно меняется в чек-листе.</div>
                </div>
                <button type="button" className={dangerButtonClassName} onClick={onDelete}>
                    Удалить
                </button>
            </div>
            <div className="mt-4 space-y-3">
                <EditorBlock title="Название раздела">
                    <input value={section.title} onChange={(event) => onChange({ ...section, title: event.target.value })} placeholder="Например: Аудиовизуальное оборудование" className={inputClassName} />
                </EditorBlock>

                <EditorBlock title="Описание" hint="Короткий текст под заголовком блока на публичной странице.">
                    <textarea
                        value={section.description}
                        onChange={(event) => onChange({ ...section, description: event.target.value })}
                        placeholder="Что нужно проверить и подготовить"
                        className={`${inputClassName} min-h-[100px] resize-y`}
                    />
                </EditorBlock>

                <EditorBlock title="Фотоподтверждение" hint="Настройка обязательной фотофиксации для этого раздела.">
                    <EditorField label="Нужно ли фото" hint="Включите, если раздел нельзя завершить без фотофиксации.">
                        <label className="inline-flex items-center gap-2 text-sm font-medium text-[#4b5d70]">
                            <input
                                type="checkbox"
                                checked={Boolean(section.requirePhoto)}
                                onChange={(event) =>
                                    onChange({
                                        ...section,
                                        requirePhoto: event.target.checked,
                                        minPhotos: event.target.checked ? Math.max(Number(section.minPhotos || 1), 1) : 0,
                                    })
                                }
                            />
                            <span>Требовать фото</span>
                        </label>
                    </EditorField>

                    {section.requirePhoto ? (
                        <div className="mt-3 grid items-stretch gap-3 lg:grid-cols-3">
                            <EditorField label="Кнопка загрузки" hint="Например: Загрузить фото оборудования">
                                <input value={section.photoLabel || ""} onChange={(event) => onChange({ ...section, photoLabel: event.target.value })} placeholder="Текст кнопки загрузки" className={inputClassName} />
                            </EditorField>
                            <EditorField label="Минимум фото" hint="Сколько файлов нужно загрузить, чтобы раздел считался завершённым.">
                                <input
                                    type="number"
                                    min="1"
                                    value={String(section.minPhotos || 1)}
                                    onChange={(event) => onChange({ ...section, minPhotos: Math.max(Number(event.target.value || 1), 1) })}
                                    placeholder="Минимум фото"
                                    className={inputClassName}
                                />
                            </EditorField>
                            <EditorField label="Подсказка по фото" hint="Короткое пояснение, что должно попасть в кадр.">
                                <input value={section.examplePhotoHint || ""} onChange={(event) => onChange({ ...section, examplePhotoHint: event.target.value })} placeholder="Подсказка по фото" className={inputClassName} />
                            </EditorField>
                        </div>
                    ) : (
                        <div className="mt-3 text-sm text-[#64748b]">Фото для этого раздела не требуется.</div>
                    )}
                </EditorBlock>

                <EditorBlock title="Чек-лист" hint="Каждая строка станет отдельным пунктом в публичном чек-листе.">
                    <div className="space-y-3">
                        {section.items.map((item, index) => (
                            <div key={`${section.id}-${item.id}-${index}`} className="grid gap-3 rounded-[1rem] border border-(--color-gray-plus-50) bg-white p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                                <input
                                    value={item.title}
                                    onChange={(event) => {
                                        const items = [...section.items];
                                        items[index] = { ...items[index], title: event.target.value };
                                        onChange({ ...section, items });
                                    }}
                                    placeholder="Пункт чек-листа"
                                    className={inputClassName}
                                />
                                <button type="button" className={secondaryButtonClassName} onClick={() => onChange({ ...section, items: section.items.filter((_, itemIndex) => itemIndex !== index) })}>
                                    Удалить
                                </button>
                            </div>
                        ))}
                        <button type="button" className={secondaryButtonClassName} onClick={() => onChange({ ...section, items: [...section.items, { id: `${section.id}-item-${section.items.length + 1}`, title: "" }] })}>
                            Добавить пункт
                        </button>
                    </div>
                </EditorBlock>

                <EditorBlock title="Примеры фото" hint="Показываются под чек-листом и помогают понять, что именно нужно снять.">
                    <div className="space-y-3">
                        {photos.map((photo, index) => (
                            <div key={`${section.id}-photo-${index}`} className="rounded-[1rem] border border-(--color-gray-plus-50) bg-white p-3">
                                <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                                    <div className="flex min-h-[140px] items-center justify-center rounded-[1rem] border border-(--color-gray-plus-50) bg-[#f8fafc]">
                                        {photo.image ? (
                                            <img src={photo.image} alt={photo.caption || "Пример"} className="max-h-[160px] w-full rounded-[1rem] object-contain" />
                                        ) : (
                                            <span className="text-xs text-[#94a3b8]">Фото не загружено</span>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <input
                                            value={photo.caption}
                                            onChange={(event) => {
                                                const next = [...photos];
                                                next[index] = { ...next[index], caption: event.target.value };
                                                onChange({ ...section, examplePhotos: next });
                                            }}
                                            placeholder="Подпись"
                                            className={inputClassName}
                                        />
                                        <div className="flex flex-wrap gap-3">
                                            <label htmlFor={`${section.id}-example-photo-${index}`} className={secondaryButtonClassName}>
                                                {uploadingPhotoIndex === index ? "Загрузка..." : photo.image ? "Заменить фото" : "Загрузить"}
                                            </label>
                                            <input
                                                id={`${section.id}-example-photo-${index}`}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={async (event) => {
                                                    const file = event.target.files?.[0];
                                                    if (!file) return;
                                                    setUploadingPhotoIndex(index);
                                                    try {
                                                        await onUploadExamplePhoto(index, file);
                                                    } finally {
                                                        setUploadingPhotoIndex(-1);
                                                        event.target.value = "";
                                                    }
                                                }}
                                            />
                                            <button type="button" className={secondaryButtonClassName} onClick={() => onChange({ ...section, examplePhotos: photos.filter((_, photoIndex) => photoIndex !== index) })}>
                                                Удалить фото
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button type="button" className={secondaryButtonClassName} onClick={() => onChange({ ...section, examplePhotos: [...photos, { image: "", caption: "" }] })}>
                            Добавить фото-инструкцию
                        </button>
                    </div>
                </EditorBlock>
            </div>
        </div>
    );
}

function ServiceEditor({ service, onChange, onDelete, onUpload }) {
    const fileInputId = `service-image-${service.id}`;
    const [isUploading, setIsUploading] = useState(false);
    return (
        <div className="rounded-[1.1rem] border border-(--color-gray-plus-50) bg-[#f8fafc] p-3 shadow-sm">
            <div className="grid gap-2 xl:grid-cols-[minmax(170px,0.85fr)_minmax(230px,1fr)_minmax(260px,1.15fr)_84px_auto] xl:items-center">
                <CompactEditorField label="Название">
                    <input value={service.name} onChange={(event) => onChange({ ...service, name: event.target.value })} placeholder="Название сервиса" className={inputClassName} />
                </CompactEditorField>
                <CompactEditorField label="Ссылка">
                    <input value={service.url} onChange={(event) => onChange({ ...service, url: event.target.value })} placeholder="Ссылка регистрации" className={inputClassName} />
                </CompactEditorField>
                <CompactEditorField label="Описание">
                    <input value={service.instructionHint || ""} onChange={(event) => onChange({ ...service, instructionHint: event.target.value })} placeholder="Короткое описание / что сделать" className={inputClassName} />
                </CompactEditorField>
                <CompactEditorField label="Фото">
                    <label
                        htmlFor={fileInputId}
                        className="group relative flex h-[64px] w-[64px] cursor-pointer items-center justify-center overflow-hidden rounded-[0.9rem] border-2 border-stone-300 bg-white text-center transition hover:border-black"
                        title="Кликните, чтобы заменить изображение">
                        {service.instructionImage ? (
                            <img src={service.instructionImage} alt={service.name || "Инструкция"} className={`h-full w-full object-cover transition ${isUploading ? "opacity-40" : ""}`} />
                        ) : (
                            <span className="px-1 text-[10px] font-semibold leading-3 text-[#94a3b8]">{isUploading ? "..." : "Фото"}</span>
                        )}
                        {isUploading ? <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Загрузка</span> : null}
                        <input
                            id={fileInputId}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                setIsUploading(true);
                                try {
                                    await onUpload(file);
                                } finally {
                                    setIsUploading(false);
                                    event.target.value = "";
                                }
                            }}
                        />
                    </label>
                </CompactEditorField>
                <button type="button" className={dangerButtonClassName} onClick={onDelete}>
                    Удалить
                </button>
            </div>
        </div>
    );
}

export default function AdminMayakOnboardingPage() {
    const [isAuth, setIsAuth] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("dashboard");
    const [links, setLinks] = useState([]);
    const [config, setConfig] = useState(null);
    const [savedConfigJson, setSavedConfigJson] = useState("");
    const [constructorView, setConstructorView] = useState("participant");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [copiedLinkId, setCopiedLinkId] = useState("");
    const [form, setForm] = useState({ title: "", chatLink: "", startDate: "", endDate: "" });
    const [createAttempted, setCreateAttempted] = useState(false);

    const createLinkErrors = useMemo(() => {
        const nextErrors = {};

        if (!form.title.trim()) nextErrors.title = "Укажите название сессии.";
        if (!form.startDate) nextErrors.startDate = "Укажите дату начала.";
        if (form.startDate && form.endDate && form.endDate < form.startDate) nextErrors.endDate = "Дата окончания не может быть раньше даты начала.";
        if (form.chatLink.trim() && !/^https?:\/\//i.test(form.chatLink.trim())) nextErrors.chatLink = "Ссылка на чат должна начинаться с http:// или https://.";

        return nextErrors;
    }, [form]);

    const loadAll = useCallback(async () => {
        const [dashboardResponse, configResponse] = await Promise.all([getAdminDashboard(), getAdminChecklistConfig()]);
        setLinks(dashboardResponse.links || []);

        let nextConfig = configResponse.config;
        if (typeof window !== "undefined") {
            const draft = localStorage.getItem(DRAFT_KEY);
            if (draft) {
                try {
                    nextConfig = JSON.parse(draft);
                } catch {
                    localStorage.removeItem(DRAFT_KEY);
                }
            }
        }

        setConfig(nextConfig);
        setSavedConfigJson(JSON.stringify(configResponse.config));
    }, []);

    useEffect(() => {
        const saved = typeof window !== "undefined" ? sessionStorage.getItem(AUTH_KEY) : null;
        (async () => {
            try {
                const res = await fetch("/api/admin/mayak-auth");
                const json = await res.json();
                if (saved === "true" && json.authenticated) {
                    setIsAuth(true);
                    await loadAll();
                } else if (typeof window !== "undefined") {
                    sessionStorage.removeItem(AUTH_KEY);
                }
            } catch {}
            setLoading(false);
        })();
    }, [loadAll]);

    useEffect(() => {
        if (config && typeof window !== "undefined") {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(config));
        }
    }, [config]);

    useEffect(() => {
        if (!message || typeof window === "undefined") return undefined;
        const timeoutId = window.setTimeout(() => setMessage(""), 3200);
        return () => window.clearTimeout(timeoutId);
    }, [message]);

    useEffect(() => {
        if (!copiedLinkId || typeof window === "undefined") return undefined;
        const timeoutId = window.setTimeout(() => setCopiedLinkId(""), 1800);
        return () => window.clearTimeout(timeoutId);
    }, [copiedLinkId]);

    const isDirty = useMemo(() => Boolean(config) && JSON.stringify(config) !== savedConfigJson, [config, savedConfigJson]);

    const confirmLeaveConstructor = useCallback(() => {
        if (activeTab !== "constructor" || !isDirty || typeof window === "undefined") {
            return true;
        }

        return window.confirm("Есть несохранённые изменения в конструкторе. Сначала сохраните их кнопкой «Сохранить конструктор» или подтвердите переход без сохранения.");
    }, [activeTab, isDirty]);

    useEffect(() => {
        if (activeTab !== "constructor" || !isDirty || typeof window === "undefined") return undefined;

        const handleBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [activeTab, isDirty]);

    const handleProtectedLinkClick = useCallback(
        (event) => {
            if (!confirmLeaveConstructor()) {
                event.preventDefault();
            }
        },
        [confirmLeaveConstructor]
    );

    const handleTabChange = useCallback(
        (nextTab) => {
            if (nextTab === activeTab) return;
            if (activeTab === "constructor" && nextTab !== "constructor" && !confirmLeaveConstructor()) return;
            setActiveTab(nextTab);
        },
        [activeTab, confirmLeaveConstructor]
    );

    const uploadAsset = async (file, folder = "instructions") => {
        return uploadAdminInstructionAsset({ scope: "links", parentId: "config", folder, file });
    };

    const handleCreateLink = async () => {
        setCreateAttempted(true);
        if (Object.keys(createLinkErrors).length > 0) {
            setMessage("");
            setError("");
            return;
        }

        try {
            const response = await createOnboardingLink({ title: form.title, chatLink: form.chatLink, startDate: form.startDate, endDate: form.endDate || "" });
            setLinks(response.links || []);
            setForm({ title: "", chatLink: "", startDate: "", endDate: "" });
            setCreateAttempted(false);
            setMessage("Ссылка создана");
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось создать ссылку.");
            setMessage("");
        }
    };

    const handleCopyLink = async (slug, linkId) => {
        try {
            if (!navigator?.clipboard?.writeText) {
                throw new Error("Clipboard API is unavailable");
            }
            await navigator.clipboard.writeText(buildOnboardingUrl(slug, { encoded: true }));
            setCopiedLinkId(linkId);
            setError("");
        } catch {
            setError("Не удалось скопировать ссылку.");
        }
    };

    const handleDeleteLink = async (id) => {
        if (!window.confirm("Удалить ссылку и все связанные ответы?")) return;
        try {
            const response = await archiveOnboardingLink(id);
            setLinks(response.links || []);
            setCopiedLinkId((current) => (current === id ? "" : current));
            setMessage("Ссылка удалена");
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось удалить ссылку.");
            setMessage("");
        }
    };

    const handleSaveConstructor = async () => {
        try {
            const response = await updateAdminChecklistConfig(config);
            setConfig(response.config);
            setSavedConfigJson(JSON.stringify(response.config));
            if (typeof window !== "undefined") localStorage.removeItem(DRAFT_KEY);
            setMessage("Конструктор сохранён");
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось сохранить конструктор.");
            setMessage("");
        }
    };

    const handleExportConstructor = useCallback(() => {
        const payload = getConstructorExportPayload(constructorView, config);
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `mayak-onboarding-${constructorView}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        setMessage("JSON экспортирован");
        setError("");
    }, [config, constructorView]);

    const handleImportConstructor = useCallback(
        async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;

            try {
                const text = await file.text();
                const payload = JSON.parse(text);
                const nextConfig = applyImportedConstructorPayload(constructorView, payload, config);
                setConfig(nextConfig);
                setMessage("JSON импортирован в конструктор");
                setError("");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Не удалось импортировать JSON.");
                setMessage("");
            }
        },
        [config, constructorView]
    );

    if (!isAuth) {
        return (
            <>
                <Header />
                {!loading && (
                    <LoginForm
                        onLogin={async () => {
                            setIsAuth(true);
                            await loadAll();
                        }}
                    />
                )}
            </>
        );
    }

    if (loading || !config) {
        return (
            <>
                <Header />
                <div className="px-8 py-10 text-sm text-[#64748b]">Загрузка…</div>
            </>
        );
    }

    return (
        <>
            <Header>
                <Header.Heading>Онбординг MAYAK</Header.Heading>
            </Header>
            <div className="mx-auto flex w-full max-w-[1340px] flex-col gap-5 px-5 pb-12">
                <section className="rounded-[1.5rem] border border-(--color-gray-plus-50) bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-2xl">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">MAYAK admin</div>
                            <h1 className="mt-2 text-[2rem] font-black text-(--color-black)">Онбординг MAYAK</h1>
                            <p className="mt-2 text-sm leading-6 text-[#64748b]">Ссылки, прогресс и конструктор подготовки вынесены в отдельную панель MAYAK.</p>
                        </div>
                        <div className="flex flex-col gap-3 xl:min-w-[430px] xl:items-end">
                            <div className="flex flex-wrap gap-2 xl:justify-end">
                                <Link href="/admin/mayak-content" className={secondaryButtonClassName} onClick={handleProtectedLinkClick}>
                                    Контент
                                </Link>
                                <Link href="/admin/mayak-sessions" className={secondaryButtonClassName} onClick={handleProtectedLinkClick}>
                                    Сессии
                                </Link>
                                <Link href="/admin/mayak-tokens" className={secondaryButtonClassName} onClick={handleProtectedLinkClick}>
                                    Токены
                                </Link>
                            </div>
                            <div className="flex flex-wrap gap-2 xl:justify-end">
                                <button type="button" className={activeTab === "dashboard" ? primaryButtonClassName : secondaryButtonClassName} onClick={() => handleTabChange("dashboard")}>
                                    Ссылки и прогресс
                                </button>
                                <button type="button" className={activeTab === "constructor" ? primaryButtonClassName : secondaryButtonClassName} onClick={() => handleTabChange("constructor")}>
                                    Конструктор
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
                {message ? <div className="rounded-[1rem] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-medium text-[#166534]">{message}</div> : null}
                {error ? <div className="rounded-[1rem] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]">{error}</div> : null}
                {activeTab === "dashboard" ? (
                    <>
                        <section className="rounded-[1.5rem] border border-(--color-gray-plus-50) bg-white p-5 shadow-sm">
                            <div className="mb-4 text-lg font-black text-(--color-black)">Создать ссылку</div>
                            <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <EditorField label="Название сессии" required invalid={createAttempted && Boolean(createLinkErrors.title)} hint={createAttempted ? createLinkErrors.title : ""}>
                                    <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Название сессии" className={inputClassName} />
                                </EditorField>
                                <EditorField
                                    label="Ссылка на чат"
                                    invalid={createAttempted && Boolean(createLinkErrors.chatLink)}
                                    hint={createAttempted ? createLinkErrors.chatLink || "Необязательно. Если ссылка есть, начните с https://." : "Необязательно. Если ссылка есть, начните с https://."}>
                                    <input value={form.chatLink} onChange={(event) => setForm((current) => ({ ...current, chatLink: event.target.value }))} placeholder="https://..." className={inputClassName} />
                                </EditorField>
                                <EditorField label="Дата начала" required invalid={createAttempted && Boolean(createLinkErrors.startDate)} hint={createAttempted ? createLinkErrors.startDate : ""}>
                                    <input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} className={inputClassName} />
                                </EditorField>
                                <EditorField
                                    label="Дата окончания"
                                    invalid={createAttempted && Boolean(createLinkErrors.endDate)}
                                    hint={createAttempted ? createLinkErrors.endDate || "Необязательно. Оставьте пустым для однодневной ссылки." : "Необязательно. Оставьте пустым для однодневной ссылки."}>
                                    <input type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} className={inputClassName} />
                                </EditorField>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button type="button" className={primaryButtonClassName} onClick={handleCreateLink}>
                                    Создать ссылку
                                </button>
                            </div>
                        </section>

                        <div className="grid gap-4">
                            {links.length === 0 ? (
                                <section className="rounded-[1.5rem] border border-(--color-gray-plus-50) bg-white p-6 text-sm text-[#64748b] shadow-sm">Ссылок пока нет.</section>
                            ) : (
                                links.map((link) => {
                                    const participantItems = (link.submissions || []).filter((item) => item.kind === "participant");
                                    const techItems = (link.submissions || []).filter((item) => item.kind === "tech");
                                    const linkUrl = buildOnboardingUrl(link.slug);
                                    return (
                                        <section key={link.id} className="rounded-[1.5rem] border border-(--color-gray-plus-50) bg-white p-5 shadow-sm">
                                            <div className="flex flex-wrap items-start justify-between gap-4">
                                                <div className="max-w-3xl">
                                                    <div className="text-[1.55rem] font-black text-(--color-black)">{link.title}</div>
                                                    <div className="mt-2 text-sm text-[#64748b]">{formatDates(link.eventDate, link.endDate)}</div>
                                                    <code className="mt-4 block break-all rounded-[1rem] border border-(--color-gray-plus-50) bg-[#f8fafc] px-4 py-3 text-xs text-(--color-black)">{linkUrl}</code>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <button type="button" className={secondaryButtonClassName} onClick={() => handleCopyLink(link.slug, link.id)}>
                                                        {copiedLinkId === link.id ? "Скопировано" : "Скопировать"}
                                                    </button>
                                                    <button type="button" className={dangerButtonClassName} onClick={() => handleDeleteLink(link.id)}>
                                                        Удалить
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="mt-5 grid gap-4 xl:grid-cols-2">
                                                <div className="rounded-[1.25rem] border border-(--color-gray-plus-50) bg-[#f8fafc] p-4">
                                                    <div className="text-base font-black text-(--color-black)">Участники</div>
                                                    <div className="mt-3 grid gap-3">
                                                        {participantItems.length === 0 ? (
                                                            <div className="text-sm text-[#94a3b8]">Пусто</div>
                                                        ) : (
                                                            participantItems.map((item) => (
                                                                <div key={item.id} className="rounded-[1rem] border border-(--color-gray-plus-50) bg-white px-4 py-3">
                                                                    <div className="font-bold text-(--color-black)">{item.name}</div>
                                                                    <div className="mt-1 text-xs text-[#64748b]">{item.completed ? "Готово" : "В процессе"}</div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="rounded-[1.25rem] border border-(--color-gray-plus-50) bg-[#f8fafc] p-4">
                                                    <div className="text-base font-black text-(--color-black)">Технические специалисты</div>
                                                    <div className="mt-3 grid gap-3">
                                                        {techItems.length === 0 ? (
                                                            <div className="text-sm text-[#94a3b8]">Пусто</div>
                                                        ) : (
                                                            techItems.map((item) => (
                                                                <div key={item.id} className="rounded-[1rem] border border-(--color-gray-plus-50) bg-white px-4 py-3">
                                                                    <div className="font-bold text-(--color-black)">{item.name}</div>
                                                                    <div className="mt-1 text-xs text-[#64748b]">
                                                                        {item.contact || "Без контакта"} • {item.completed ? "Готово" : "В процессе"}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {techItems.map((item) => {
                                                const photos = getSubmissionPhotos(item);
                                                if (!photos.length) return null;
                                                return (
                                                    <div key={`${item.id}-photos`} className="mt-5">
                                                        <div className="mb-3 text-base font-black text-(--color-black)">Фото: {item.name}</div>
                                                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                                            {photos.map((photo) => (
                                                                <div key={photo.url} className="rounded-[1rem] border border-(--color-gray-plus-50) bg-[#f8fafc] p-3">
                                                                    <img src={photo.url} alt={photo.name} className="h-48 w-full rounded-[0.85rem] object-cover" />
                                                                    <div className="mt-2 text-xs leading-5 text-[#64748b] break-all">{photo.name}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </section>
                                    );
                                })
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <section className="rounded-[1.5rem] border border-(--color-gray-plus-50) bg-white p-5 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="text-lg font-black text-(--color-black)">Что редактируем</div>
                                    <div className="mt-1 text-sm text-[#64748b]">Конструктор разделён по ролям и общим сервисам.</div>
                                </div>
                                <div className="flex flex-col items-stretch gap-2">
                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" className={constructorView === "participant" ? primaryButtonClassName : secondaryButtonClassName} onClick={() => setConstructorView("participant")}>
                                            Участник
                                        </button>
                                        <button type="button" className={constructorView === "tech" ? primaryButtonClassName : secondaryButtonClassName} onClick={() => setConstructorView("tech")}>
                                            Техспециалист
                                        </button>
                                        <button type="button" className={constructorView === "services" ? primaryButtonClassName : secondaryButtonClassName} onClick={() => setConstructorView("services")}>
                                            Сервисы
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" className={secondaryButtonClassName} onClick={handleExportConstructor}>
                                            Скачать JSON
                                        </button>
                                        <label className={secondaryButtonClassName}>
                                            Загрузить JSON
                                            <input type="file" accept="application/json,.json" className="hidden" onChange={handleImportConstructor} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {constructorView === "participant" ? (
                            <section className="rounded-[1.5rem] border border-(--color-gray-plus-50) bg-white p-5 shadow-sm">
                                <div className="mb-4 text-lg font-black text-(--color-black)">Разделы участника</div>
                                <div className="space-y-4">
                                    {config.participantSections.map((section, index) => (
                                        <SectionEditor
                                            key={section.id}
                                            section={section}
                                            onChange={(next) => {
                                                const sections = [...config.participantSections];
                                                sections[index] = next;
                                                setConfig({ ...config, participantSections: sections });
                                            }}
                                            onDelete={() => setConfig({ ...config, participantSections: config.participantSections.filter((_, sectionIndex) => sectionIndex !== index) })}
                                            onUploadExamplePhoto={async (photoIndex, file) => {
                                                try {
                                                    const uploaded = await uploadAsset(file, "examples");
                                                    setConfig((current) => {
                                                        if (!current) return current;
                                                        const sections = [...current.participantSections];
                                                        const photos = [...(sections[index]?.examplePhotos || [])];
                                                        photos[photoIndex] = { ...(photos[photoIndex] || { caption: "" }), image: uploaded.url };
                                                        sections[index] = { ...sections[index], examplePhotos: photos };
                                                        return { ...current, participantSections: sections };
                                                    });
                                                    setError("");
                                                } catch (err) {
                                                    setError(err instanceof Error ? err.message : "Не удалось загрузить фото-инструкцию.");
                                                    setMessage("");
                                                }
                                            }}
                                        />
                                    ))}
                                    <button
                                        type="button"
                                        className={secondaryButtonClassName}
                                        onClick={() => setConfig({ ...config, participantSections: [...config.participantSections, createSection("participant", config.participantSections.length)] })}>
                                        Добавить раздел
                                    </button>
                                </div>
                            </section>
                        ) : null}
                        {constructorView === "tech" ? (
                            <section className="rounded-[1.5rem] border border-(--color-gray-plus-50) bg-white p-5 shadow-sm">
                                <div className="mb-4 text-lg font-black text-(--color-black)">Разделы техспециалиста</div>
                                <div className="space-y-4">
                                    {config.techSections.map((section, index) => (
                                        <SectionEditor
                                            key={section.id}
                                            section={section}
                                            onChange={(next) => {
                                                const sections = [...config.techSections];
                                                sections[index] = next;
                                                setConfig({ ...config, techSections: sections });
                                            }}
                                            onDelete={() => setConfig({ ...config, techSections: config.techSections.filter((_, sectionIndex) => sectionIndex !== index) })}
                                            onUploadExamplePhoto={async (photoIndex, file) => {
                                                try {
                                                    const uploaded = await uploadAsset(file, "examples");
                                                    setConfig((current) => {
                                                        if (!current) return current;
                                                        const sections = [...current.techSections];
                                                        const photos = [...(sections[index]?.examplePhotos || [])];
                                                        photos[photoIndex] = { ...(photos[photoIndex] || { caption: "" }), image: uploaded.url };
                                                        sections[index] = { ...sections[index], examplePhotos: photos };
                                                        return { ...current, techSections: sections };
                                                    });
                                                    setError("");
                                                } catch (err) {
                                                    setError(err instanceof Error ? err.message : "Не удалось загрузить фото-инструкцию.");
                                                    setMessage("");
                                                }
                                            }}
                                        />
                                    ))}
                                    <button type="button" className={secondaryButtonClassName} onClick={() => setConfig({ ...config, techSections: [...config.techSections, createSection("tech", config.techSections.length)] })}>
                                        Добавить раздел
                                    </button>
                                </div>
                            </section>
                        ) : null}
                        {constructorView === "services" ? (
                            <section className="rounded-[1.5rem] border border-(--color-gray-plus-50) bg-white p-5 shadow-sm">
                                <div className="mb-4 text-lg font-black text-(--color-black)">Организатор и сервисы</div>
                                <EditorBlock title="Организатор" hint="Контакты помощи на публичных страницах онбординга.">
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <EditorField label="Имя организатора">
                                            <input
                                                value={config.organizer?.name || ""}
                                                onChange={(event) => setConfig({ ...config, organizer: { ...(config.organizer || {}), name: event.target.value } })}
                                                placeholder="Имя организатора"
                                                className={inputClassName}
                                            />
                                        </EditorField>
                                        <EditorField label="Телефон организатора">
                                            <input
                                                value={config.organizer?.phone || ""}
                                                onChange={(event) => setConfig({ ...config, organizer: { ...(config.organizer || {}), phone: event.target.value } })}
                                                placeholder="Телефон организатора"
                                                className={inputClassName}
                                            />
                                        </EditorField>
                                    </div>
                                </EditorBlock>
                                <div className="mt-4 space-y-4">
                                    {config.services.map((service, index) => (
                                        <ServiceEditor
                                            key={service.id}
                                            service={service}
                                            onChange={(next) => {
                                                const services = [...config.services];
                                                services[index] = next;
                                                setConfig({ ...config, services });
                                            }}
                                            onDelete={() => setConfig({ ...config, services: config.services.filter((_, serviceIndex) => serviceIndex !== index) })}
                                            onUpload={async (file) => {
                                                try {
                                                    const uploaded = await uploadAsset(file, "service-guides");
                                                    setConfig((current) => {
                                                        if (!current) return current;
                                                        const services = [...current.services];
                                                        services[index] = { ...services[index], instructionImage: uploaded.url };
                                                        return { ...current, services };
                                                    });
                                                    setError("");
                                                } catch (err) {
                                                    setError(err instanceof Error ? err.message : "Не удалось загрузить изображение сервиса.");
                                                    setMessage("");
                                                }
                                            }}
                                        />
                                    ))}
                                    <button type="button" className={secondaryButtonClassName} onClick={() => setConfig({ ...config, services: [...config.services, createService(config.services.length)] })}>
                                        Добавить сервис
                                    </button>
                                </div>
                            </section>
                        ) : null}
                        <section className="sticky bottom-4 rounded-[1.25rem] border border-(--color-gray-plus-50) bg-white/95 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className={`text-sm font-semibold ${isDirty ? "text-[#92400e]" : "text-[#166534]"}`}>{isDirty ? "Есть несохранённые изменения" : "Все изменения сохранены"}</div>
                                <button type="button" className={primaryButtonClassName} onClick={handleSaveConstructor}>
                                    Сохранить конструктор
                                </button>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </>
    );
}
