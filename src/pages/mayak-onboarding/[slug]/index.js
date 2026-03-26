import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import OrganizerHelp from "@/components/mayak-onboarding/OrganizerHelp";
import { ActionButton, OnboardingShell } from "@/components/mayak-onboarding/MayakOnboardingLayout";
import { createOnboardingSurveyResponse, getChecklistConfig, getOnboardingLink, getOnboardingSurveyResponse, getSurveyResponseStorageKey, updateOnboardingSurveyResponse } from "@/lib/mayakOnboardingClient";
import { getSurveyQuestions, validateSurveyAnswers } from "@/lib/mayakOnboardingSurvey";

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

function SurveySingleChoiceQuestion({ question, value, onChange, error }) {
    return (
        <div className={`rounded-[1.5rem] border p-5 ${error ? "border-red-300 bg-red-50/70" : "border-stone-200 bg-white"}`}>
            <div className="text-lg font-bold text-stone-950">{question.title}</div>
            {question.description ? <div className="mt-2 text-sm leading-6 text-stone-500">{question.description}</div> : null}
            <div className="mt-4 space-y-3">
                {(question.options || []).map((option) => {
                    const checked = value === option.id;
                    return (
                        <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-[1.2rem] border px-4 py-4 transition ${checked ? "border-stone-950 bg-stone-50" : "border-stone-200 hover:border-stone-300"}`}>
                            <input type="radio" className="mt-1 h-4 w-4 accent-stone-950" checked={checked} onChange={() => onChange(option.id)} />
                            <span className="text-sm leading-6 text-stone-700">{option.label}</span>
                        </label>
                    );
                })}
            </div>
            {error ? <div className="mt-3 text-sm font-medium text-red-600">{error}</div> : null}
        </div>
    );
}

function SurveyMatrixQuestion({ question, value, onChange, error }) {
    return (
        <div className={`rounded-[1.5rem] border p-5 ${error ? "border-red-300 bg-red-50/70" : "border-stone-200 bg-white"}`}>
            <div className="text-lg font-bold text-stone-950">{question.title}</div>
            {question.description ? <div className="mt-2 text-sm leading-6 text-stone-500">{question.description}</div> : null}
            <div className="mt-4 overflow-x-auto">
                <div className="min-w-[720px] rounded-[1.2rem] border border-stone-200">
                    <div className="grid grid-cols-[minmax(260px,1fr)_repeat(5,72px)] border-b border-stone-200 bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                        <div>Утверждение</div>
                        {[1, 2, 3, 4, 5].map((column) => (
                            <div key={column} className="text-center">
                                {column}
                            </div>
                        ))}
                    </div>
                    {(question.rows || []).map((row, rowIndex) => (
                        <div key={row.id} className={`grid grid-cols-[minmax(260px,1fr)_repeat(5,72px)] items-center px-4 py-4 ${rowIndex !== (question.rows || []).length - 1 ? "border-b border-stone-200" : ""}`}>
                            <div className="pr-4 text-sm leading-6 text-stone-700">{row.label}</div>
                            {[1, 2, 3, 4, 5].map((column) => (
                                <label key={column} className="flex justify-center">
                                    <input type="radio" className="h-4 w-4 accent-stone-950" checked={Number(value?.[row.id]) === column} onChange={() => onChange(row.id, column)} />
                                </label>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-stone-500">
                {question.minLabel ? <span>{question.minLabel}</span> : null}
                {question.maxLabel ? <span>{question.maxLabel}</span> : null}
            </div>
            {error ? <div className="mt-3 text-sm font-medium text-red-600">{error}</div> : null}
        </div>
    );
}

function SurveySummaryTable({ title, items, emptyText, showPhotos = false }) {
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

function scrollToSurveyQuestion(questionId) {
    if (typeof window === "undefined" || !questionId) return;
    window.requestAnimationFrame(() => {
        const element = document.getElementById(`survey-question-${questionId}`);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });
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
    const [surveyResponseId, setSurveyResponseId] = useState("");
    const [surveyAnswers, setSurveyAnswers] = useState({});
    const [surveyErrors, setSurveyErrors] = useState({});
    const [surveyCompleted, setSurveyCompleted] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const slug = typeof router.query.slug === "string" ? router.query.slug : "";
    const survey = config?.survey || null;
    const surveyStorageKey = slug ? getSurveyResponseStorageKey(slug) : "";

    useEffect(() => {
        if (!router.isReady || !slug) return;

        (async () => {
            try {
                const [linkResponse, configResponse] = await Promise.all([getOnboardingLink(slug), getChecklistConfig()]);
                setLink(linkResponse.link);
                setSummary(linkResponse.summary || null);
                setConfig(configResponse.config);
                setError("");

                if (typeof window === "undefined") return;
                const storedResponseId = localStorage.getItem(surveyStorageKey);
                if (!storedResponseId) return;

                try {
                    const responseData = await getOnboardingSurveyResponse(storedResponseId);
                    const response = responseData.response;
                    if (!response) {
                        localStorage.removeItem(surveyStorageKey);
                        return;
                    }

                    setSurveyResponseId(response.id || "");
                    setSurveyAnswers(response.answers || {});
                    setSurveyCompleted(Boolean(response.completedAt));
                } catch {
                    localStorage.removeItem(surveyStorageKey);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Ссылка недоступна.");
            }
        })();
    }, [router.isReady, slug, surveyStorageKey]);

    const validation = useMemo(() => (survey ? validateSurveyAnswers(survey, surveyAnswers) : { valid: false, errors: {} }), [survey, surveyAnswers]);
    const dateLabel = link?.eventDate ? (link.endDate && link.endDate !== link.eventDate ? `${link.eventDate} - ${link.endDate}` : link.eventDate) : "";
    const heroMeta = [link?.title, dateLabel].filter(Boolean).join(" • ");
    const visibleQuestions = useMemo(() => getSurveyQuestions(survey || {}), [survey]);

    const handleSingleChoiceAnswer = (questionId, value) => {
        setSurveyAnswers((current) => ({ ...current, [questionId]: value }));
        setSurveyErrors((current) => ({ ...current, [questionId]: null }));
    };

    const handleMatrixAnswer = (questionId, rowId, value) => {
        setSurveyAnswers((current) => ({
            ...current,
            [questionId]: {
                ...(current?.[questionId] && typeof current[questionId] === "object" ? current[questionId] : {}),
                [rowId]: value,
            },
        }));
        setSurveyErrors((current) => ({ ...current, [questionId]: null }));
    };

    const handleSubmitSurvey = async () => {
        if (!survey || !slug) return;
        const nextValidation = validateSurveyAnswers(survey, surveyAnswers);
        if (!nextValidation.valid) {
            setSurveyErrors(nextValidation.errors);
            const firstInvalidQuestion = visibleQuestions.find((question) => nextValidation.errors?.[question.id]);
            scrollToSurveyQuestion(firstInvalidQuestion?.id);
            return;
        }

        setSubmitting(true);
        try {
            const payload = { answers: nextValidation.answers, completed: true };
            const responseData = surveyResponseId ? await updateOnboardingSurveyResponse(surveyResponseId, payload) : await createOnboardingSurveyResponse({ slug, ...payload });
            const response = responseData.response;

            setSurveyResponseId(response.id);
            setSurveyAnswers(response.answers || nextValidation.answers);
            setSurveyCompleted(Boolean(response.completedAt));
            setSurveyErrors({});
            setError("");
            if (typeof window !== "undefined") {
                localStorage.setItem(surveyStorageKey, response.id);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось сохранить анкету.");
        } finally {
            setSubmitting(false);
        }
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

    if (!link || !config) return null;

    return (
        <>
            <OnboardingShell
                badge="Подготовка к сессии"
                title={surveyCompleted ? link.title : survey?.title || link.title}
                subtitle={surveyCompleted ? "Выберите нужный поток подготовки. Ниже видна текущая сводка по участникам и технической подготовке." : survey?.description || "Сначала заполните обязательную анкету."}
                meta={heroMeta}>
                {error ? <div className="rounded-[1rem] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]">{error}</div> : null}

                {!surveyCompleted ? (
                    <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_12px_30px_rgba(28,25,23,0.05)] md:p-7">
                        <div className="space-y-8">
                            {(survey?.sections || []).map((section) => (
                                <div key={section.id} className="space-y-4">
                                    <div>
                                        <div className="text-[1.4rem] font-black text-stone-950">{section.title}</div>
                                        {section.description ? <div className="mt-2 text-sm leading-7 text-stone-500">{section.description}</div> : null}
                                    </div>
                                    {(section.questions || []).map((question) => (
                                        <div key={question.id} id={`survey-question-${question.id}`}>
                                            {question.type === "matrix_1_5" ? (
                                                <SurveyMatrixQuestion
                                                    question={question}
                                                    value={surveyAnswers?.[question.id]}
                                                    error={surveyErrors?.[question.id]?.message}
                                                    onChange={(rowId, value) => handleMatrixAnswer(question.id, rowId, value)}
                                                />
                                            ) : (
                                                <SurveySingleChoiceQuestion
                                                    question={question}
                                                    value={surveyAnswers?.[question.id] || ""}
                                                    error={surveyErrors?.[question.id]?.message}
                                                    onChange={(value) => handleSingleChoiceAnswer(question.id, value)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-stone-200 bg-stone-50 px-5 py-4">
                            <div className="text-sm text-stone-600">{`Заполнено вопросов: ${
                                Object.keys(validation.answers || {}).filter((questionId) => {
                                    const question = visibleQuestions.find((item) => item.id === questionId);
                                    if (!question) return false;
                                    if (question.type === "matrix_1_5") {
                                        return Object.keys(validation.answers?.[questionId] || {}).length === (question.rows || []).length;
                                    }
                                    return Boolean(validation.answers?.[questionId]);
                                }).length
                            } из ${visibleQuestions.length}`}</div>
                            <ActionButton onClick={handleSubmitSurvey} disabled={submitting}>
                                {submitting ? "Сохраняем..." : survey?.submitLabel || "Отправить анкету"}
                            </ActionButton>
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
                                <SurveySummaryTable title="Участники" items={summary?.participants || []} emptyText="Пока никто не начал или не завершил подготовку участника." />
                                <SurveySummaryTable title={(summary?.techCount || 0) === 1 ? "Техспециалист" : "Техспециалисты"} items={summary?.tech || []} emptyText="Пока техспециалист не начал или не завершил техническую подготовку." showPhotos />
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
