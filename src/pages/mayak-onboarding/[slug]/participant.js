import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import OrganizerHelp from "@/components/mayak-onboarding/OrganizerHelp";
import { ActionButton, HeroProgress, OnboardingModal, OnboardingShell, SectionBadge } from "@/components/mayak-onboarding/MayakOnboardingLayout";
import { formatOnboardingDate, getChecklistConfig, getOnboardingLink, getOnboardingSubmission, getStructuredChecklistItems, getSubmissionStorageKey, startOnboarding, updateOnboardingSubmission } from "@/lib/mayakOnboardingClient";

function normalizeProgress(item) {
    return {
        done: Boolean(item?.done),
        photos: Array.isArray(item?.photos) ? item.photos : item?.photoUrl ? [{ url: item.photoUrl, name: item.photoName || "photo" }] : [],
    };
}

function getChecklistState(submission) {
    const items = getStructuredChecklistItems(submission?.checklist || {});
    return {
        items: Object.fromEntries(Object.entries(items).map(([id, value]) => [id, normalizeProgress(value)])),
        meta: submission?.checklist && typeof submission.checklist === "object" && "items" in submission.checklist ? submission.checklist.meta : undefined,
    };
}

function getFieldClassName(invalid = false) {
    return `!block !w-full !appearance-none !rounded-[1rem] !border-2 !px-4 !py-3 !text-base !text-stone-950 !shadow-[inset_0_1px_2px_rgba(28,25,23,0.08)] outline-none transition placeholder:!text-stone-400 ${
        invalid ? "!border-red-400 !bg-red-50 focus:!border-red-500" : "!border-stone-700/80 !bg-stone-50 focus:!border-stone-950 focus:!bg-white"
    }`;
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
            <div className={`mt-2 text-sm leading-6 ${active ? "text-stone-600" : "text-stone-500"}`}>{text}</div>
        </div>
    );
}

function ChecklistRow({ checked, onChange, children }) {
    return (
        <label className="flex items-start gap-3 rounded-[1.45rem] border border-stone-200 bg-white px-4 py-4 text-stone-800 transition hover:border-stone-300">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-stone-950" checked={checked} onChange={(event) => onChange(event.target.checked)} />
            <span className="leading-6">{children}</span>
        </label>
    );
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

export default function MayakOnboardingParticipantPage() {
    const router = useRouter();
    const { slug } = router.query;
    const [link, setLink] = useState(null);
    const [config, setConfig] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [showHelp, setShowHelp] = useState(false);
    const [instructionServiceId, setInstructionServiceId] = useState("");
    const [completionDialogOpen, setCompletionDialogOpen] = useState(true);
    const [startAttempted, setStartAttempted] = useState(false);

    const resolvedSlug = typeof slug === "string" ? slug : "";
    const storageKey = resolvedSlug ? getSubmissionStorageKey(resolvedSlug, "participant") : "";

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

    const structuredChecklist = useMemo(() => getChecklistState(submission), [submission]);
    const checklistItems = structuredChecklist.items;
    const services = config?.services || [];
    const participantLaptopType = structuredChecklist.meta?.participantLaptopType === "work" ? "corporate" : structuredChecklist.meta?.participantLaptopType || "";
    const laptopSection = (config?.participantSections || []).find((section) => section.id === "laptop") || null;
    const servicesSection = (config?.participantSections || []).find((section) => section.id === "services") || null;
    const personalLaptopItems = laptopSection?.items || [];
    const activeInstruction = services.find((service) => service.id === instructionServiceId) || null;
    const dateLabel = link?.endDate ? `${formatOnboardingDate(link.eventDate)} - ${formatOnboardingDate(link.endDate)}` : formatOnboardingDate(link?.eventDate);
    const meta = [link?.title, dateLabel].filter(Boolean).join(" • ");

    const isLaptopSectionReady = useCallback(
        (items = checklistItems, currentLaptopType = participantLaptopType) => {
            if (!currentLaptopType) return false;
            if (currentLaptopType === "corporate") return true;
            return personalLaptopItems.every((item) => items[item.id]?.done);
        },
        [checklistItems, participantLaptopType, personalLaptopItems]
    );

    const isServicesSectionReady = useCallback(
        (items = checklistItems, currentLaptopType = participantLaptopType) => currentLaptopType !== "personal" || services.every((service) => items[`participant-service:${service.id}`]?.done),
        [checklistItems, participantLaptopType, services]
    );

    const getCompletedSectionIds = useCallback(
        (items = checklistItems, currentLaptopType = participantLaptopType) => {
            const completed = [];
            if (isLaptopSectionReady(items, currentLaptopType)) completed.push("laptop");
            if (currentLaptopType === "personal" && isServicesSectionReady(items, currentLaptopType)) completed.push("services");
            return completed;
        },
        [checklistItems, isLaptopSectionReady, isServicesSectionReady, participantLaptopType]
    );

    const completion = useMemo(() => {
        const totalParts = 1 + (participantLaptopType === "personal" ? personalLaptopItems.length + services.length : 0);
        if (totalParts === 0) return 0;

        const completedParts = [
            Boolean(participantLaptopType),
            ...(participantLaptopType === "personal" ? personalLaptopItems.map((item) => Boolean(checklistItems[item.id]?.done)) : []),
            ...(participantLaptopType === "personal" ? services.map((service) => Boolean(checklistItems[`participant-service:${service.id}`]?.done)) : []),
        ].filter(Boolean).length;

        return Math.round((completedParts / totalParts) * 100);
    }, [checklistItems, participantLaptopType, personalLaptopItems, services]);

    const allSectionsReady = isLaptopSectionReady() && isServicesSectionReady();

    const saveChecklist = useCallback(
        async ({ items = checklistItems, laptopType = participantLaptopType } = {}) => {
            if (!submission) return null;

            const completedSections = getCompletedSectionIds(items, laptopType);
            const completed = isLaptopSectionReady(items, laptopType) && isServicesSectionReady(items, laptopType);

            const response = await updateOnboardingSubmission(submission.id, {
                checklist: {
                    items,
                    meta: {
                        ...structuredChecklist.meta,
                        participantLaptopType: laptopType,
                        completedSections,
                    },
                },
                completed,
            });

            setSubmission(response.submission);
            return response.submission;
        },
        [checklistItems, getCompletedSectionIds, isLaptopSectionReady, isServicesSectionReady, participantLaptopType, structuredChecklist.meta, submission]
    );

    const handleStart = async () => {
        if (!resolvedSlug) return;
        setStartAttempted(true);
        if (!name.trim()) return;

        try {
            const response = await startOnboarding({ slug: resolvedSlug, kind: "participant", name });
            setSubmission(response.submission);
            if (typeof window !== "undefined") localStorage.setItem(storageKey, response.submission.id);
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось начать подготовку.");
        }
    };

    const handleLaptopType = async (value) => {
        await saveChecklist({ items: checklistItems, laptopType: value });
    };

    const handleToggleLaptopItem = async (itemId, checked) => {
        const nextItems = {
            ...checklistItems,
            [itemId]: { ...normalizeProgress(checklistItems[itemId]), done: checked },
        };

        await saveChecklist({ items: nextItems });
    };

    const handleToggleService = async (serviceId, checked) => {
        const nextItems = {
            ...checklistItems,
            [`participant-service:${serviceId}`]: { ...normalizeProgress(checklistItems[`participant-service:${serviceId}`]), done: checked },
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
                badge="Участник"
                title="Подготовьте ноутбук и сервисы"
                subtitle={submission ? "Проверяйте ноутбук и сервисы по шагам. Завершение произойдёт автоматически на последнем действии." : "Сначала укажите участника, затем пройдите подготовку ноутбука и сервисов."}
                meta={meta}
                heroPanel={submission ? <HeroProgress value={completion} /> : null}>
                {error ? <div className="rounded-[1rem] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]">{error}</div> : null}

                {!submission ? (
                    <section className="mx-auto w-full max-w-3xl rounded-[2rem] border border-stone-200 bg-[#f8fafc] p-6 shadow-[0_12px_30px_rgba(28,25,23,0.05)] md:p-7">
                        <div className="text-center">
                            <div className="text-sm font-bold uppercase tracking-[0.18em] text-stone-500">Старт участника</div>
                            <div className="mt-3 text-[2rem] font-black leading-[1.02] text-stone-950">Зафиксируйте, кто проходит подготовку</div>
                        </div>

                        <div className="mx-auto mt-6 max-w-2xl">
                            <FieldBlock label="ФИО участника" invalid={startAttempted && !name.trim()} hint="Обязательное поле.">
                                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Например: Иван Иванов" className={getFieldClassName(startAttempted && !name.trim())} />
                            </FieldBlock>
                            {startAttempted && !name.trim() ? <div className="mt-3 text-sm font-medium text-red-600">Заполните ФИО участника.</div> : null}
                        </div>

                        <div className="mt-6 flex justify-center">
                            <ActionButton onClick={handleStart}>Начать подготовку</ActionButton>
                        </div>
                    </section>
                ) : (
                    <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_12px_30px_rgba(28,25,23,0.05)] md:p-7">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="text-[2rem] font-black leading-tight text-stone-950">{laptopSection?.title || "Ноутбук участника"}</div>
                                {laptopSection?.description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-500">{laptopSection.description}</p> : null}
                            </div>
                            <SectionBadge done={allSectionsReady} />
                        </div>

                        <div className="mt-6 grid gap-3 md:grid-cols-2">
                            <OptionCard
                                active={participantLaptopType === "personal"}
                                onClick={() => handleLaptopType("personal")}
                                title="Личный ноутбук"
                                text="Нужно подтвердить характеристики ноутбука, проверить его и пройти регистрацию в сервисах."
                            />
                            <OptionCard active={participantLaptopType === "corporate"} onClick={() => handleLaptopType("corporate")} title="Ноутбук предоставит организация" text="Сервисы и доступы подготовит организация." />
                        </div>

                        {participantLaptopType === "personal" ? (
                            <div className="mt-5 rounded-[1.35rem] border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm leading-7 text-stone-700">
                                Для личного ноутбука сначала подтвердите характеристики и базовую готовность, затем пройдите шаги ниже.
                            </div>
                        ) : null}

                        {participantLaptopType === "personal" && personalLaptopItems.length > 0 ? (
                            <div className="mt-6 space-y-3">
                                {personalLaptopItems.map((item) => (
                                    <ChecklistRow key={item.id} checked={Boolean(checklistItems[item.id]?.done)} onChange={(checked) => handleToggleLaptopItem(item.id, checked)}>
                                        {item.title}
                                    </ChecklistRow>
                                ))}
                            </div>
                        ) : null}

                        {participantLaptopType === "personal" ? (
                            <div className="mt-8 border-t border-stone-200 pt-8">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="text-[1.7rem] font-black leading-tight text-stone-950">{servicesSection?.title || "Регистрация в сервисах"}</div>
                                        {servicesSection?.description ? <p className="mt-3 text-sm leading-7 text-stone-500">{servicesSection.description}</p> : null}
                                    </div>
                                    <SectionBadge done={isServicesSectionReady()} />
                                </div>

                                <div className="mt-5 space-y-3">
                                    {services.map((service) => (
                                        <div key={service.id} className="grid gap-3 rounded-[1.5rem] border border-stone-200 bg-white px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center">
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
                                                    checked={Boolean(checklistItems[`participant-service:${service.id}`]?.done)}
                                                    onChange={(event) => handleToggleService(service.id, event.target.checked)}
                                                />
                                                Готово
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </section>
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
                text={link?.chatLink ? "Все обязательные шаги выполнены. Можно переходить в общий чат." : "Все обязательные шаги выполнены."}
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
