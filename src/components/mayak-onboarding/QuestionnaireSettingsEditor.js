import QuestionnaireQrCode from "@/components/mayak-onboarding/QuestionnaireQrCode";
import { isMayakOnboardingQuestionnaireUrlConfigured } from "@/lib/mayakOnboardingQuestionnaire";

export default function QuestionnaireSettingsEditor({ questionnaire, onChange, inputClassName }) {
    const formUrl = questionnaire?.formUrl || "";
    const hasUrl = Boolean(formUrl.trim());
    const hasValidUrl = isMayakOnboardingQuestionnaireUrlConfigured(formUrl);

    return (
        <section className="rounded-[1.5rem] border border-(--color-gray-plus-50) bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1.35fr)_280px] xl:items-start">
                <div className="space-y-4">
                    <div>
                        <div className="text-lg font-black text-(--color-black)">Яндекс-форма</div>
                        <div className="mt-1 text-sm leading-6 text-[#64748b]">
                            Вставьте ссылку на форму. На публичной странице останется заголовок анкеты, а QR-код будет обновляться автоматически при каждом изменении ссылки.
                        </div>
                    </div>

                    <label className={`block rounded-[1rem] border-2 p-3 ${hasUrl && !hasValidUrl ? "border-[#fca5a5] bg-[#fff1f2]" : "border-stone-300 bg-white"}`}>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Ссылка на Яндекс Форму</div>
                        <div className="mt-2">
                            <input
                                value={formUrl}
                                onChange={(event) => onChange({ ...questionnaire, formUrl: event.target.value })}
                                placeholder="https://forms.yandex.ru/..."
                                className={inputClassName}
                            />
                        </div>
                        <div className={`mt-3 text-sm leading-6 ${hasUrl && !hasValidUrl ? "text-[#b91c1c]" : "text-[#64748b]"}`}>
                            {hasUrl && !hasValidUrl
                                ? "Ссылка должна начинаться с http:// или https://."
                                : "После клика по кнопке анкета откроется в новой вкладке, а текущая страница сразу пропустит пользователя дальше на этом устройстве."}
                        </div>
                    </label>

                    <div className="rounded-[1rem] border border-(--color-gray-plus-50) bg-[#f8fafc] p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Что увидит пользователь</div>
                        <div className="mt-3 text-base font-black text-(--color-black)">{questionnaire?.buttonLabel || "Пройти анкетирование"}</div>
                        <div className="mt-2 text-sm leading-6 text-[#64748b]">{questionnaire?.returnText}</div>
                    </div>
                </div>

                <div>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">QR-код</div>
                    <QuestionnaireQrCode value={formUrl} size={240} emptyText="Укажите ссылку на форму, чтобы увидеть QR-код." />
                </div>
            </div>
        </section>
    );
}
