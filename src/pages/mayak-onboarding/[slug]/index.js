import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import OrganizerHelp from "@/components/mayak-onboarding/OrganizerHelp";
import { ActionButton, OnboardingShell } from "@/components/mayak-onboarding/MayakOnboardingLayout";
import QuestionnaireQrCode from "@/components/mayak-onboarding/QuestionnaireQrCode";
import { formatOnboardingDate, getChecklistConfig, getLegacySurveyResponseStorageKey, getOnboardingLink, getQuestionnaireCompletionStorageKey } from "@/lib/mayakOnboardingClient";
import { isMayakOnboardingQuestionnaireUrlConfigured } from "@/lib/mayakOnboardingQuestionnaire";

function RoleCard({ href, badge, title, text, cta, tone = "participant" }) {
    const pillClassName = tone === "tech" ? "border-sky-200 bg-sky-50 text-sky-800" : "border-amber-200 bg-amber-50 text-amber-800";

    return (
        <Link
            href={href}
            className="group flex h-full min-h-[280px] flex-col rounded-[2rem] border border-stone-200 bg-white p-7 text-stone-950 shadow-[0_14px_40px_rgba(28,25,23,0.06)] transition duration-300 hover:-translate-y-1 hover:border-stone-300 hover:shadow-[0_20px_48px_rgba(28,25,23,0.08)]">
            <span className={`inline-flex w-fit rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] ${pillClassName}`}>{badge}</span>
            <div className="mt-8 max-w-[12ch] text-[2.5rem] font-black leading-[0.92] tracking-[-0.03em] text-stone-950 md:text-[3rem]">{title}</div>
            <p className="mt-auto pt-8 text-base leading-8 text-stone-500">{text}</p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-stone-950">
                <span>{cta}</span>
                <span aria-hidden="true" className="transition group-hover:translate-x-1">
                    →
                </span>
            </div>
        </Link>
    );
}

function OnboardingSummaryTable({ title, items, emptyText, showPhotos = false }) {
    return (
        <div className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-[0_12px_30px_rgba(28,25,23,0.05)]">
            <div className="text-lg font-black text-stone-950">{title}</div>
            <div className="mt-4 overflow-hidden rounded-[1rem] border border-stone-200">
                <div className="grid grid-cols-[minmax(0,1fr)_120px_100px] gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                    <div>ФИО</div>
                    <div>Статус</div>
                    <div>Прогресс</div>
                </div>
                {items.length === 0 ? (
                    <div className="px-4 py-5 text-sm text-stone-500">{emptyText}</div>
                ) : (
                    items.map((item, index) => (
                        <div key={item.id} className={`grid grid-cols-[minmax(0,1fr)_120px_100px] gap-3 px-4 py-4 text-sm ${index !== items.length - 1 ? "border-b border-stone-200" : ""}`}>
                            <div>
                                <div className="font-semibold text-stone-950">{item.name || "Без имени"}</div>
                                {showPhotos && Array.isArray(item.photos) && item.photos.length > 0 ? <div className="mt-1 text-xs text-stone-500">{`Фото: ${item.photos.length}`}</div> : null}
                            </div>
                            <div className="text-stone-600">{item.statusLabel}</div>
                            <div className="font-semibold text-stone-950">{`${item.progressPercent}%`}</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function pluralizeRu(count, one, few, many) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
}

export default function MayakOnboardingIndexPage() {
    const router = useRouter();
    const [link, setLink] = useState(null);
    const [summary, setSummary] = useState(null);
    const [config, setConfig] = useState(null);
    const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false);
    const [error, setError] = useState("");
    const [showHelp, setShowHelp] = useState(false);
    const slug = typeof router.query.slug === "string" ? router.query.slug : "";
    const questionnaire = config?.questionnaire || null;
    const questionnaireStorageKey = slug ? getQuestionnaireCompletionStorageKey(slug) : "";
    const legacySurveyStorageKey = slug ? getLegacySurveyResponseStorageKey(slug) : "";
    const questionnaireUrl = questionnaire?.formUrl || "";
    const hasQuestionnaireUrl = isMayakOnboardingQuestionnaireUrlConfigured(questionnaireUrl);
    const dateLabel = link?.eventDate ? (link.endDate && link.endDate !== link.eventDate ? `${formatOnboardingDate(link.eventDate)} - ${formatOnboardingDate(link.endDate)}` : formatOnboardingDate(link.eventDate)) : "";
    const heroMeta = [link?.title, dateLabel].filter(Boolean).join(" • ");

    useEffect(() => {
        if (!router.isReady || !slug) return;

        let cancelled = false;

        (async () => {
            try {
                const [linkResponse, configResponse] = await Promise.all([getOnboardingLink(slug), getChecklistConfig()]);
                if (cancelled) return;

                setLink(linkResponse.link);
                setSummary(linkResponse.summary || null);
                setConfig(configResponse.config);
                setError("");

                if (typeof window !== "undefined") {
                    const hasCompletionMarker = Boolean(localStorage.getItem(questionnaireStorageKey) || localStorage.getItem(legacySurveyStorageKey));
                    setQuestionnaireCompleted(hasCompletionMarker);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Ссылка недоступна.");
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [legacySurveyStorageKey, questionnaireStorageKey, router.isReady, slug]);

    const handleStartQuestionnaire = () => {
        if (!hasQuestionnaireUrl || typeof window === "undefined") return;

        window.open(questionnaireUrl, "_blank", "noopener,noreferrer");
        localStorage.setItem(questionnaireStorageKey, "done");
        setQuestionnaireCompleted(true);
        setError("");
    };

    const baseClassName = "flex min-h-screen items-center justify-center bg-[#f8f8f6] px-4";

    if (!slug) {
        return (
            <div className={baseClassName}>
                <div className="w-full max-w-xl rounded-[2rem] border border-stone-200 bg-white p-8 text-center text-stone-500 shadow-[0_18px_48px_rgba(28,25,23,0.06)]">Используйте персональную ссылку, которую отправил администратор.</div>
            </div>
        );
    }

    if (error && !link) {
        return (
            <div className={baseClassName}>
                <div className="w-full max-w-xl rounded-[2rem] border border-stone-200 bg-white p-8 text-center text-stone-500 shadow-[0_18px_48px_rgba(28,25,23,0.06)]">{error}</div>
            </div>
        );
    }

    if (!link || !config || !questionnaire) return null;

    return (
        <>
            <OnboardingShell
                badge="Подготовка к сессии"
                title={questionnaireCompleted ? link.title : questionnaire.title || link.title}
                subtitle={
                    questionnaireCompleted
                        ? "Выберите нужный поток подготовки. Ниже видна текущая сводка по участникам и технической подготовке."
                        : questionnaire.description || "Перед онбордингом пройдите анкету диагностики цифровой трансформации."
                }
                meta={heroMeta}>
                {error ? <div className="rounded-[1rem] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]">{error}</div> : null}

                {!questionnaireCompleted ? (
                    <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_12px_30px_rgba(28,25,23,0.05)] md:p-7">
                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_220px] lg:items-center">
                            <div className="space-y-5">
                                <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5">
                                    <div className="text-sm leading-7 text-stone-600">
                                        Перед онбордингом пройдите анкету диагностики цифровой трансформации.
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4">
                                    <ActionButton onClick={handleStartQuestionnaire} disabled={!hasQuestionnaireUrl}>
                                        {questionnaire.buttonLabel || "Пройти анкетирование"}
                                    </ActionButton>
                                    <span className="text-sm leading-6 text-stone-500">{questionnaire.returnText}</span>
                                </div>

                                {!hasQuestionnaireUrl ? <div className="text-sm font-medium text-[#b91c1c]">Ссылка на анкетирование пока не настроена. Обратитесь к администратору.</div> : null}
                            </div>

                            <QuestionnaireQrCode value={questionnaireUrl} size={200} emptyText="QR-код появится после настройки ссылки." />
                        </div>
                    </section>
                ) : (
                    <>
                        <div className="grid gap-6 lg:grid-cols-2">
                            <RoleCard
                                href={`/mayak-onboarding/${encodeURIComponent(slug)}/participant`}
                                badge="Участник"
                                title="Подготовить ноутбук и сервисы"
                                text="Проверка ноутбука участника, подтверждение характеристик, входы в сервисы и фиксация готовности к старту."
                                cta="Перейти к подготовке"
                            />
                            <RoleCard
                                href={`/mayak-onboarding/${encodeURIComponent(slug)}/tech`}
                                badge="Техспециалист"
                                title="Подтвердить готовность площадки"
                                text="Проверка пространства, сети и оборудования."
                                cta="Перейти к подготовке"
                                tone="tech"
                            />
                        </div>

                        <section className="space-y-5 rounded-[2rem] border border-stone-200 bg-[#f8f8f6] p-6 shadow-[0_12px_30px_rgba(28,25,23,0.05)]">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <div className="text-[1.8rem] font-black leading-tight text-stone-950">Кто уже заполнил онбординг</div>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                                    <span className="rounded-full border border-stone-200 bg-white px-3 py-2">{`Участники: ${summary?.participantCount || 0}`}</span>
                                    <span className="rounded-full border border-stone-200 bg-white px-3 py-2">{`${pluralizeRu(summary?.techCount || 0, "Техспециалист", "Техспециалиста", "Техспециалистов")}: ${summary?.techCount || 0}`}</span>
                                </div>
                            </div>

                            <div className="grid gap-4 xl:grid-cols-2">
                                <OnboardingSummaryTable title="Участники" items={summary?.participants || []} emptyText="Пока никто не начал или не завершил подготовку участника." />
                                <OnboardingSummaryTable
                                    title={(summary?.techCount || 0) === 1 ? "Техспециалист" : "Техспециалисты"}
                                    items={summary?.tech || []}
                                    emptyText="Пока техспециалист не начал или не завершил техническую подготовку."
                                    showPhotos
                                />
                            </div>

                            {(summary?.tech || []).some((item) => Array.isArray(item.photos) && item.photos.length > 0) ? (
                                <div className="space-y-4">
                                    {(summary?.tech || []).map((item) =>
                                        Array.isArray(item.photos) && item.photos.length > 0 ? (
                                            <div key={`${item.id}-photos`}>
                                                <div className="mb-3 text-base font-black text-stone-950">{`Фото техспециалиста: ${item.name}`}</div>
                                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                                    {item.photos.map((photo) => (
                                                        <div key={photo.url} className="rounded-[1rem] border border-stone-200 bg-white p-3">
                                                            <img src={photo.url} alt={photo.name} className="h-48 w-full rounded-[0.85rem] object-cover" />
                                                            <div className="mt-2 text-xs leading-5 text-stone-500 break-all">{photo.name}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null
                                    )}
                                </div>
                            ) : null}
                        </section>
                    </>
                )}
            </OnboardingShell>

            <OrganizerHelp organizer={config?.organizer} open={showHelp} onToggle={() => setShowHelp((value) => !value)} />
        </>
    );
}
