import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import OrganizerHelp from "@/components/mayak-onboarding/OrganizerHelp";
import { ActionButton, HeroProgress, OnboardingModal, OnboardingShell } from "@/components/mayak-onboarding/MayakOnboardingLayout";
import { formatOnboardingDate, getChecklistConfig, getOnboardingLink, getOnboardingSubmission, getSubmissionStorageKey, startOnboarding, updateOnboardingSubmission, uploadOnboardingPhoto } from "@/lib/mayakOnboardingClient";
import { getTechProgressState, normalizeChecklistItemState } from "@/lib/mayakOnboardingProgress";

function normalizePhoneInput(value) {
    const digits = String(value || "").replace(/\D/g, "");
    const normalized = digits.startsWith("7") ? digits : `7${digits.replace(/^8/, "")}`;
    return `+${normalized.slice(0, 11)}`;
}

function getFieldClassName(invalid = false) {
    return `!block !w-full !appearance-none !rounded-[1rem] !border-2 !px-4 !py-3 !text-base !text-stone-950 !shadow-[inset_0_1px_2px_rgba(28,25,23,0.08)] outline-none transition placeholder:!text-stone-400 ${
        invalid ? "!border-red-400 !bg-red-50 focus:!border-red-500" : "!border-stone-700/80 !bg-stone-50 focus:!border-stone-950 focus:!bg-white"
    }`;
}

function FieldBlock({ label, invalid = false, hint, children }) {
    return (
        <label className={`block rounded-[1.3rem] border p-4 ${invalid ? "border-red-300 bg-red-50/80" : "border-stone-200 bg-white"}`}>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">{label}</div>
            {hint ? <div className="mt-2 text-sm leading-6 text-stone-500">{hint}</div> : null}
            <div className="mt-3">{children}</div>
        </label>
    );
}

function OptionCard({ active, title, text, onClick }) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onClick();
                }
            }}
            className={`cursor-pointer rounded-[1.6rem] border px-5 py-5 transition ${
                active ? "border-[#0f766e]/30 bg-[#ecfdf7] text-stone-950 shadow-[0_14px_34px_rgba(15,118,110,0.08)]" : "border-stone-300/80 bg-white text-stone-950 hover:border-stone-500 hover:bg-stone-50"
            }`}>
            <div className="text-lg font-bold">{title}</div>
            {text ? <div className={`mt-2 text-sm leading-6 ${active ? "text-stone-600" : "text-stone-500"}`}>{text}</div> : null}
        </div>
    );
}

function ChecklistRow({ checked, onChange, children, invalid = false, id }) {
    return (
        <label id={id} className={`flex items-start gap-3 rounded-[1.45rem] border px-4 py-4 text-stone-800 transition ${invalid ? "border-red-300 bg-red-50/70" : "border-stone-200 bg-white hover:border-stone-300"}`}>
            <input type="checkbox" className="mt-1 h-4 w-4 accent-stone-950" checked={checked} onChange={(event) => onChange(event.target.checked)} />
            <span className="leading-6">{children}</span>
        </label>
    );
}

function StatusChip({ completed, open }) {
    const className = completed ? "bg-emerald-100 text-emerald-700" : open ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600";
    const label = completed ? "Готово" : "В процессе";
    return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>{label}</span>;
}

export default function MayakOnboardingTechPage() {
    const router = useRouter();
    const { slug } = router.query;
    const [link, setLink] = useState(null);
    const [config, setConfig] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [name, setName] = useState("");
    const [contact, setContact] = useState("+7");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [showHelp, setShowHelp] = useState(false);
    const [openSection, setOpenSection] = useState("");
    const [initialSectionResolved, setInitialSectionResolved] = useState(false);
    const [uploadingKey, setUploadingKey] = useState("");
    const [instructionServiceId, setInstructionServiceId] = useState("");
    const [completionDialogOpen, setCompletionDialogOpen] = useState(true);
    const [startAttempted, setStartAttempted] = useState(false);

    const resolvedSlug = typeof slug === "string" ? slug : "";
    const storageKey = resolvedSlug ? getSubmissionStorageKey(resolvedSlug, "tech") : "";

    const refreshConfig = useCallback(async () => {
        if (!resolvedSlug) return;
        const [linkResponse, configResponse] = await Promise.all([getOnboardingLink(resolvedSlug), getChecklistConfig()]);
        setLink(linkResponse.link);
        setConfig(configResponse.config);
    }, [resolvedSlug]);

    useEffect(() => {
        if (!resolvedSlug) return;

        (async () => {
            try {
                await refreshConfig();

                const submissionId = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
                if (submissionId) {
                    const submissionResponse = await getOnboardingSubmission(submissionId);
                    setSubmission(submissionResponse.submission);
                }

                setError("");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Не удалось открыть подготовку.");
            } finally {
                setLoading(false);
            }
        })();
    }, [refreshConfig, resolvedSlug, storageKey]);

    useEffect(() => {
        if (!resolvedSlug) return undefined;

        const sync = () => {
            refreshConfig().catch(() => {});
        };

        if (typeof window !== "undefined") {
            window.addEventListener("focus", sync);
        }
        const intervalId = setInterval(sync, 30000);

        return () => {
            if (typeof window !== "undefined") {
                window.removeEventListener("focus", sync);
            }
            clearInterval(intervalId);
        };
    }, [refreshConfig, resolvedSlug]);

    useEffect(() => {
        setCompletionDialogOpen(Boolean(submission?.completed));
    }, [submission?.completed]);

    const sections = config?.techSections || [];
    const techProgress = useMemo(() => getTechProgressState(config || {}, submission || {}), [config, submission]);
    const checklistItems = techProgress.checklistItems;
    const corporateLaptops = techProgress.corporateLaptops;
    const services = config?.services || [];
    const activeInstruction = services.find((service) => service.id === instructionServiceId) || null;
    const dateLabel = link?.endDate && link.endDate !== link.eventDate ? `${formatOnboardingDate(link.eventDate)} - ${formatOnboardingDate(link.endDate)}` : formatOnboardingDate(link?.eventDate);
    const meta = [link?.title, dateLabel].filter(Boolean).join(" • ");
    const isPhoneValid = /^\+7\d{10}$/.test(contact.replace(/\s+/g, ""));
    const allDoneSections = techProgress.completedSectionIds;
    const completion = techProgress.progressPercent;
    const allSectionsReady = techProgress.completed;

    useEffect(() => {
        if (!submission || !sections.length || initialSectionResolved) return;
        const nextSection = sections.find((section) => !allDoneSections.includes(section.id));
        setOpenSection(nextSection?.id || sections[0]?.id || "");
        setInitialSectionResolved(true);
    }, [allDoneSections, initialSectionResolved, sections, submission]);

    const buildProgressForDraft = useCallback(
        (items = checklistItems, laptopsMode = corporateLaptops) =>
            getTechProgressState(config || {}, {
                checklist: {
                    items,
                    meta: {
                        ...(submission?.checklist?.meta || {}),
                        corporateLaptops: laptopsMode,
                    },
                },
            }),
        [checklistItems, config, corporateLaptops, submission?.checklist?.meta]
    );

    const saveChecklist = useCallback(
        async ({ items = checklistItems, laptopsMode = corporateLaptops } = {}) => {
            if (!submission) return null;

            const nextProgress = buildProgressForDraft(items, laptopsMode);
            const response = await updateOnboardingSubmission(submission.id, {
                checklist: {
                    items,
                    meta: {
                        ...(submission?.checklist?.meta || {}),
                        corporateLaptops: laptopsMode,
                        completedSections: nextProgress.completedSectionIds,
                    },
                },
                completed: nextProgress.completed,
            });

            setSubmission(response.submission);
            return response.submission;
        },
        [buildProgressForDraft, checklistItems, corporateLaptops, submission]
    );

    const handleStart = async () => {
        if (!resolvedSlug) return;
        setStartAttempted(true);
        if (!name.trim() || !isPhoneValid) return;

        try {
            const response = await startOnboarding({ slug: resolvedSlug, kind: "tech", name, contact });
            setSubmission(response.submission);
            setInitialSectionResolved(false);
            if (typeof window !== "undefined") localStorage.setItem(storageKey, response.submission.id);
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось начать подготовку.");
        }
    };

    const handleToggleItem = async (itemId, checked) => {
        const nextItems = {
            ...checklistItems,
            [itemId]: { ...normalizeChecklistItemState(checklistItems[itemId]), done: checked },
        };
        await saveChecklist({ items: nextItems });
    };

    const handleCorporateAnswer = async (value) => {
        await saveChecklist({ items: checklistItems, laptopsMode: value });
    };

    const uploadFiles = async (storageId, files) => {
        if (!submission || !files.length) return;

        setUploadingKey(storageId);

        try {
            const uploadedPhotos = [];

            for (const file of files) {
                const uploaded = await uploadOnboardingPhoto({
                    submissionId: submission.id,
                    itemId: storageId,
                    file,
                });

                uploadedPhotos.push({ url: uploaded.url, name: uploaded.fileName });
            }

            const current = normalizeChecklistItemState(checklistItems[storageId]);
            const nextItems = {
                ...checklistItems,
                [storageId]: {
                    ...current,
                    photos: [...current.photos, ...uploadedPhotos],
                },
            };

            await saveChecklist({ items: nextItems });
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось загрузить фото.");
        } finally {
            setUploadingKey("");
        }
    };

    const removePhoto = async (storageId, url) => {
        const current = normalizeChecklistItemState(checklistItems[storageId]);
        const nextItems = {
            ...checklistItems,
            [storageId]: {
                ...current,
                photos: current.photos.filter((photo) => photo.url !== url),
            },
        };

        await saveChecklist({ items: nextItems });
    };

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center bg-white text-stone-500">Загрузка...</div>;
    }

    if (error && !link) {
        return <div className="flex min-h-screen items-center justify-center bg-white px-4 text-stone-500">{error}</div>;
    }

    return (
        <>
            <OnboardingShell
                backHref={resolvedSlug ? `/mayak-onboarding/${encodeURIComponent(resolvedSlug)}` : undefined}
                badge="Техспециалист"
                title="Техническая подготовка площадки"
                subtitle={submission ? "" : "Перед стартом укажите ответственного и пройдите технический чек-лист площадки."}
                meta={meta}
                heroPanel={submission ? <HeroProgress value={completion} caption={allSectionsReady ? "Все обязательные действия выполнены." : "Прогресс меняется сразу после каждой галочки и фото."} /> : null}>
                {error ? <div className="rounded-[1rem] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]">{error}</div> : null}

                {!submission ? (
                    <section className="mx-auto w-full max-w-3xl rounded-[2rem] border border-stone-200 bg-[#f8fafc] p-6 shadow-[0_12px_30px_rgba(28,25,23,0.05)] md:p-7">
                        <div className="text-center">
                            <div className="text-sm font-bold uppercase tracking-[0.18em] text-stone-500">Старт техспециалиста</div>
                            <div className="mt-3 text-[2rem] font-black leading-[1.02] text-stone-950">Зафиксируйте ответственного за площадку</div>
                        </div>
                        <div className="mx-auto mt-6 max-w-2xl space-y-3">
                            <FieldBlock label="ФИО техспециалиста" invalid={startAttempted && !name.trim()} hint="Обязательное поле.">
                                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Например: Иван Иванов" className={getFieldClassName(startAttempted && !name.trim())} />
                            </FieldBlock>
                            <FieldBlock label="Телефон" invalid={startAttempted && !isPhoneValid} hint="Формат: +7XXXXXXXXXX.">
                                <input value={contact} onChange={(event) => setContact(normalizePhoneInput(event.target.value))} placeholder="+79991234567" className={getFieldClassName(startAttempted && !isPhoneValid)} />
                            </FieldBlock>
                            {startAttempted && (!name.trim() || !isPhoneValid) ? <div className="text-sm font-medium text-red-600">Заполните ФИО и телефон в формате +7XXXXXXXXXX.</div> : null}
                        </div>
                        <div className="mt-6 flex justify-center">
                            <ActionButton onClick={handleStart}>Начать подготовку</ActionButton>
                        </div>
                    </section>
                ) : (
                    <div className="space-y-4">
                        {sections.map((section) => {
                            const expanded = openSection === section.id;
                            const sectionStatus = techProgress.sectionStatuses[section.id];
                            const completed = sectionStatus?.completed;
                            const validation = sectionStatus?.validation;
                            const photoState = sectionStatus?.photoState;
                            const showCorporateDecision = section.id === "laptops";
                            const showChecklistItems = section.id !== "laptops" || corporateLaptops === "yes";
                            const showServices = section.id === "laptops" && corporateLaptops === "yes";

                            return (
                                <section key={section.id} className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-[0_12px_30px_rgba(28,25,23,0.05)]">
                                    <button
                                        type="button"
                                        onClick={() => setOpenSection(expanded ? "" : section.id)}
                                        className={`!flex !w-full !items-start !justify-between !gap-4 !rounded-none !border-0 !px-6 !py-5 !text-left transition ${
                                            completed ? "!bg-emerald-100/90" : expanded ? "!bg-stone-50" : "!bg-white"
                                        }`}>
                                        <div>
                                            <div className="text-[1.8rem] font-black leading-tight text-stone-950">{section.title}</div>
                                            <div className="mt-2 text-sm leading-6 text-stone-500">{section.description}</div>
                                            {sectionStatus?.totalParts > 0 ? (
                                                <div className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                                                    Выполнено {sectionStatus.completedParts} из {sectionStatus.totalParts}
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {sectionStatus?.totalParts > 0 ? (
                                                <div className="text-sm font-semibold text-stone-500">
                                                    {sectionStatus.completedParts}/{sectionStatus.totalParts}
                                                </div>
                                            ) : null}
                                            <StatusChip completed={Boolean(completed)} open={expanded} />
                                        </div>
                                    </button>

                                    {expanded ? (
                                        <div className="space-y-5 px-6 pb-6 pt-2">
                                            {showCorporateDecision ? (
                                                <div id={`tech-section-${section.id}-decision`} className={`grid gap-3 rounded-[1.6rem] p-1 md:grid-cols-2 ${validation?.missingCorporateAnswer ? "bg-amber-50/80" : "bg-transparent"}`}>
                                                    <OptionCard
                                                        active={corporateLaptops === "yes"}
                                                        onClick={() => handleCorporateAnswer("yes")}
                                                        title="Да, будут использоваться корпоративные ноутбуки"
                                                        text="Откроется дополнительный блок регистрации сервисов."
                                                    />
                                                    <OptionCard active={corporateLaptops === "no"} onClick={() => handleCorporateAnswer("no")} title="Нет, только личные ноутбуки" text="Блок сервисов для ноутбуков можно пропустить." />
                                                </div>
                                            ) : null}

                                            {validation?.missingCorporateAnswer ? <div className="text-sm font-medium text-amber-700">Выберите, нужны ли корпоративные ноутбуки для этой сессии.</div> : null}

                                            {showChecklistItems ? (
                                                <div className="space-y-3">
                                                    {(section.items || []).map((item) => (
                                                        <ChecklistRow
                                                            key={item.id}
                                                            id={`tech-section-${section.id}-item-${item.id}`}
                                                            checked={Boolean(checklistItems[item.id]?.done)}
                                                            onChange={(checked) => handleToggleItem(item.id, checked)}>
                                                            {item.title}
                                                        </ChecklistRow>
                                                    ))}
                                                </div>
                                            ) : null}

                                            {showServices ? (
                                                <div className="space-y-3 rounded-[1.6rem] bg-stone-50/90 p-4">
                                                    <div className="text-[1.5rem] font-black leading-tight text-stone-950">Регистрация в сервисах на ноутбуках</div>
                                                    {services.map((service) => (
                                                        <div
                                                            id={`tech-section-${section.id}-service-${service.id}`}
                                                            key={service.id}
                                                            className="grid gap-3 rounded-[1.4rem] border border-stone-200 bg-white px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center">
                                                            <div>
                                                                <div className="text-lg font-bold text-stone-950">{service.name}</div>
                                                                {service.instructionHint ? <div className="mt-1 text-sm leading-6 text-stone-500">{service.instructionHint}</div> : null}
                                                            </div>
                                                            <ActionButton href={service.url} tone="secondary">
                                                                Регистрация
                                                            </ActionButton>
                                                            <ActionButton tone="secondary" onClick={() => setInstructionServiceId(service.id)}>
                                                                Инструкция
                                                            </ActionButton>
                                                            <label className="inline-flex items-center justify-end gap-2 text-sm font-semibold text-stone-600">
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-4 w-4 accent-stone-950"
                                                                    checked={Boolean(checklistItems[`tech-service:${service.id}`]?.done)}
                                                                    onChange={(event) => handleToggleItem(`tech-service:${service.id}`, event.target.checked)}
                                                                />
                                                                Готово
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}

                                            {Array.isArray(section.examplePhotos) && section.examplePhotos.length > 0 ? (
                                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                    {section.examplePhotos.map((photo, index) => (
                                                        <div key={`${section.id}-example-${index}`} className="rounded-[1.4rem] border border-stone-200 bg-stone-50/80 p-3">
                                                            <img src={photo.image} alt={photo.caption || section.title} className="h-48 w-full rounded-[1rem] bg-white object-contain" />
                                                            {photo.caption ? <div className="mt-3 text-sm leading-6 text-stone-500">{photo.caption}</div> : null}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : section.examplePhotoHint ? (
                                                <div className="rounded-[1.4rem] border border-dashed border-stone-300 bg-stone-50/80 px-4 py-4 text-sm leading-6 text-stone-500">{section.examplePhotoHint}</div>
                                            ) : null}

                                            {section.requirePhoto ? (
                                                <div className="space-y-4" id={`tech-section-${section.id}-photos`}>
                                                    <label
                                                        className={`block cursor-pointer rounded-[1.5rem] border border-dashed px-5 py-6 text-center ${
                                                            validation?.missingPhotoCount > 0 ? "border-amber-300 bg-amber-50/70" : "border-emerald-300 bg-emerald-50/70"
                                                        }`}>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            multiple
                                                            className="hidden"
                                                            onChange={(event) => {
                                                                const files = Array.from(event.target.files || []);
                                                                uploadFiles(validation.photoKey, files);
                                                                event.target.value = "";
                                                            }}
                                                        />
                                                        <div className="text-lg font-bold text-stone-950">{section.photoLabel || "Загрузить фото"}</div>
                                                        <div className="mt-2 text-sm leading-6 text-stone-500">
                                                            {validation?.minPhotos > 1 ? `Нужно загрузить минимум ${validation.minPhotos} фото.` : "Загрузите обязательную фотофиксацию раздела."}
                                                        </div>
                                                        <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                                                            Загружено {photoState?.photos.length || 0} из {validation?.minPhotos || 0}
                                                        </div>
                                                    </label>

                                                    {uploadingKey === validation?.photoKey ? <div className="text-sm text-stone-500">Загрузка...</div> : null}

                                                    {photoState?.photos.length > 0 ? (
                                                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                            {photoState.photos.map((photo) => (
                                                                <div key={photo.url} className="rounded-[1.4rem] border border-stone-200 bg-white p-3">
                                                                    <img src={photo.url} alt={photo.name} className="h-56 w-full rounded-[1rem] object-cover" />
                                                                    <div className="mt-3 flex items-start justify-between gap-3">
                                                                        <div className="text-xs leading-5 text-stone-500">{photo.name}</div>
                                                                        <ActionButton tone="secondary" onClick={() => removePhoto(validation.photoKey, photo.url)}>
                                                                            Удалить
                                                                        </ActionButton>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </section>
                            );
                        })}
                    </div>
                )}
            </OnboardingShell>

            <OnboardingModal open={Boolean(activeInstruction)} title={activeInstruction?.name || ""} text={activeInstruction?.instructionHint || ""} onClose={() => setInstructionServiceId("")}>
                {activeInstruction?.instructionImage ? (
                    <img src={activeInstruction.instructionImage} alt={activeInstruction.name} className="max-h-[70vh] w-full rounded-[1.25rem] object-contain" />
                ) : (
                    <div className="rounded-[1.25rem] border border-dashed border-stone-300 px-5 py-12 text-center text-sm text-stone-500">Инструкция пока не добавлена.</div>
                )}
            </OnboardingModal>

            <OnboardingModal
                open={Boolean(submission?.completed && completionDialogOpen)}
                title="Подготовка подтверждена"
                text={link?.chatLink ? "Все обязательные разделы завершены. Можно переходить в общий чат." : "Все обязательные разделы завершены."}
                onClose={() => setCompletionDialogOpen(false)}
                maxWidth="max-w-2xl"
                align="center">
                {link?.chatLink ? (
                    <ActionButton href={link.chatLink} tone="secondary">
                        Перейти в чат
                    </ActionButton>
                ) : null}
            </OnboardingModal>

            <OrganizerHelp organizer={config?.organizer} open={showHelp} onToggle={() => setShowHelp((value) => !value)} />
        </>
    );
}
