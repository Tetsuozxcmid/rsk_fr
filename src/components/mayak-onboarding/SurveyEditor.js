import { createSurveyQuestion, createSurveySection } from "@/lib/mayakOnboardingSurvey";

function createOption(questionId, index) {
    return { id: `${questionId}-option-${index + 1}`, label: "" };
}

function createRow(questionId, index) {
    return { id: `${questionId}-row-${index + 1}`, label: "" };
}

function EditorField({ label, hint, children, inputClassName, invalid = false }) {
    return (
        <label className={`flex h-full flex-col rounded-[1rem] border-2 p-3 ${invalid ? "border-[#fca5a5] bg-[#fff1f2]" : "border-stone-300 bg-white"}`}>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">{label}</div>
            {hint ? <div className="mt-2 text-sm leading-6 text-[#64748b]">{hint}</div> : null}
            <div className={`${hint ? "mt-3" : "mt-2"} mt-auto`}>{children}</div>
        </label>
    );
}

function QuestionEditor({ question, sectionId, questionIndex, onChange, onDelete, inputClassName, secondaryButtonClassName, dangerButtonClassName }) {
    return (
        <div className="space-y-4 rounded-[1.35rem] border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Вопрос {questionIndex + 1}</div>
                    <div className="mt-1 text-lg font-black text-stone-950">{question.title || "Новый вопрос"}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <select
                        value={question.type}
                        onChange={(event) => onChange({ ...createSurveyQuestion(event.target.value, sectionId, questionIndex), id: question.id, title: question.title, description: question.description })}
                        className={inputClassName}>
                        <option value="single_choice">Один выбор</option>
                        <option value="matrix_1_5">Матрица 1-5</option>
                    </select>
                    <button type="button" className={dangerButtonClassName} onClick={onDelete}>
                        Удалить вопрос
                    </button>
                </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
                <EditorField label="Текст вопроса" inputClassName={inputClassName}>
                    <input value={question.title} onChange={(event) => onChange({ ...question, title: event.target.value })} placeholder="Текст вопроса" className={inputClassName} />
                </EditorField>
                <EditorField label="Описание" hint="Подсказка под вопросом" inputClassName={inputClassName}>
                    <textarea value={question.description || ""} onChange={(event) => onChange({ ...question, description: event.target.value })} placeholder="Короткое пояснение" className={`${inputClassName} min-h-[100px] resize-y`} />
                </EditorField>
            </div>

            {question.type === "single_choice" ? (
                <div className="space-y-3">
                    <div className="text-sm font-semibold text-stone-700">Варианты ответа</div>
                    {(question.options || []).map((option, optionIndex) => (
                        <div key={option.id} className="grid gap-3 rounded-[1rem] border border-stone-200 bg-[#f8fafc] p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                            <input
                                value={option.label}
                                onChange={(event) => {
                                    const nextOptions = [...(question.options || [])];
                                    nextOptions[optionIndex] = { ...option, label: event.target.value };
                                    onChange({ ...question, options: nextOptions });
                                }}
                                placeholder="Текст варианта"
                                className={inputClassName}
                            />
                            <button type="button" className={secondaryButtonClassName} onClick={() => onChange({ ...question, options: (question.options || []).filter((_, index) => index !== optionIndex) })}>
                                Удалить
                            </button>
                        </div>
                    ))}
                    <button type="button" className={secondaryButtonClassName} onClick={() => onChange({ ...question, options: [...(question.options || []), createOption(question.id, (question.options || []).length)] })}>
                        Добавить вариант
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid gap-3 lg:grid-cols-2">
                        <EditorField label="Подпись шкалы слева" inputClassName={inputClassName}>
                            <input value={question.minLabel || ""} onChange={(event) => onChange({ ...question, minLabel: event.target.value })} placeholder="1 — ..." className={inputClassName} />
                        </EditorField>
                        <EditorField label="Подпись шкалы справа" inputClassName={inputClassName}>
                            <input value={question.maxLabel || ""} onChange={(event) => onChange({ ...question, maxLabel: event.target.value })} placeholder="5 — ..." className={inputClassName} />
                        </EditorField>
                    </div>
                    <div className="space-y-3">
                        <div className="text-sm font-semibold text-stone-700">Строки матрицы</div>
                        {(question.rows || []).map((row, rowIndex) => (
                            <div key={row.id} className="grid gap-3 rounded-[1rem] border border-stone-200 bg-[#f8fafc] p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                                <input
                                    value={row.label}
                                    onChange={(event) => {
                                        const nextRows = [...(question.rows || [])];
                                        nextRows[rowIndex] = { ...row, label: event.target.value };
                                        onChange({ ...question, rows: nextRows });
                                    }}
                                    placeholder="Текст строки"
                                    className={inputClassName}
                                />
                                <button type="button" className={secondaryButtonClassName} onClick={() => onChange({ ...question, rows: (question.rows || []).filter((_, index) => index !== rowIndex) })}>
                                    Удалить
                                </button>
                            </div>
                        ))}
                        <button type="button" className={secondaryButtonClassName} onClick={() => onChange({ ...question, rows: [...(question.rows || []), createRow(question.id, (question.rows || []).length)] })}>
                            Добавить строку
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function SurveyEditor({ survey, onChange, inputClassName, secondaryButtonClassName, dangerButtonClassName }) {
    return (
        <section className="rounded-[1.5rem] border border-(--color-gray-plus-50) bg-white p-5 shadow-sm">
            <div className="mb-4 text-lg font-black text-(--color-black)">Анкета перед выбором роли</div>

            <div className="grid gap-3 lg:grid-cols-2">
                <EditorField label="Заголовок анкеты" inputClassName={inputClassName}>
                    <input value={survey.title || ""} onChange={(event) => onChange({ ...survey, title: event.target.value })} placeholder="Название анкеты" className={inputClassName} />
                </EditorField>
                <EditorField label="Оценка длительности" inputClassName={inputClassName}>
                    <input value={survey.durationLabel || ""} onChange={(event) => onChange({ ...survey, durationLabel: event.target.value })} placeholder="Например: 12-15 минут" className={inputClassName} />
                </EditorField>
                <EditorField label="Кнопка отправки" inputClassName={inputClassName}>
                    <input value={survey.submitLabel || ""} onChange={(event) => onChange({ ...survey, submitLabel: event.target.value })} placeholder="Текст кнопки" className={inputClassName} />
                </EditorField>
                <EditorField label="Описание анкеты" inputClassName={inputClassName}>
                    <textarea value={survey.description || ""} onChange={(event) => onChange({ ...survey, description: event.target.value })} placeholder="Описание анкеты" className={`${inputClassName} min-h-[110px] resize-y`} />
                </EditorField>
            </div>

            <div className="mt-6 space-y-5">
                {(survey.sections || []).map((section, sectionIndex) => (
                    <div key={section.id} className="rounded-[1.4rem] border border-stone-200 bg-[#f8fafc] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Раздел {sectionIndex + 1}</div>
                                <div className="mt-1 text-xl font-black text-stone-950">{section.title || "Новый раздел"}</div>
                            </div>
                            <button type="button" className={dangerButtonClassName} onClick={() => onChange({ ...survey, sections: (survey.sections || []).filter((_, index) => index !== sectionIndex) })}>
                                Удалить раздел
                            </button>
                        </div>

                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            <EditorField label="Название раздела" inputClassName={inputClassName}>
                                <input
                                    value={section.title || ""}
                                    onChange={(event) => {
                                        const nextSections = [...(survey.sections || [])];
                                        nextSections[sectionIndex] = { ...section, title: event.target.value };
                                        onChange({ ...survey, sections: nextSections });
                                    }}
                                    placeholder="Название раздела"
                                    className={inputClassName}
                                />
                            </EditorField>
                            <EditorField label="Описание раздела" inputClassName={inputClassName}>
                                <textarea
                                    value={section.description || ""}
                                    onChange={(event) => {
                                        const nextSections = [...(survey.sections || [])];
                                        nextSections[sectionIndex] = { ...section, description: event.target.value };
                                        onChange({ ...survey, sections: nextSections });
                                    }}
                                    placeholder="Описание раздела"
                                    className={`${inputClassName} min-h-[110px] resize-y`}
                                />
                            </EditorField>
                        </div>

                        <div className="mt-5 space-y-4">
                            {(section.questions || []).map((question, questionIndex) => (
                                <QuestionEditor
                                    key={question.id}
                                    question={question}
                                    sectionId={section.id}
                                    questionIndex={questionIndex}
                                    inputClassName={inputClassName}
                                    secondaryButtonClassName={secondaryButtonClassName}
                                    dangerButtonClassName={dangerButtonClassName}
                                    onChange={(nextQuestion) => {
                                        const nextSections = [...(survey.sections || [])];
                                        const nextQuestions = [...(section.questions || [])];
                                        nextQuestions[questionIndex] = nextQuestion;
                                        nextSections[sectionIndex] = { ...section, questions: nextQuestions };
                                        onChange({ ...survey, sections: nextSections });
                                    }}
                                    onDelete={() => {
                                        const nextSections = [...(survey.sections || [])];
                                        nextSections[sectionIndex] = { ...section, questions: (section.questions || []).filter((_, index) => index !== questionIndex) };
                                        onChange({ ...survey, sections: nextSections });
                                    }}
                                />
                            ))}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    className={secondaryButtonClassName}
                                    onClick={() => {
                                        const nextSections = [...(survey.sections || [])];
                                        nextSections[sectionIndex] = {
                                            ...section,
                                            questions: [...(section.questions || []), createSurveyQuestion("single_choice", section.id, (section.questions || []).length)],
                                        };
                                        onChange({ ...survey, sections: nextSections });
                                    }}>
                                    Добавить вопрос с выбором
                                </button>
                                <button
                                    type="button"
                                    className={secondaryButtonClassName}
                                    onClick={() => {
                                        const nextSections = [...(survey.sections || [])];
                                        nextSections[sectionIndex] = {
                                            ...section,
                                            questions: [...(section.questions || []), createSurveyQuestion("matrix_1_5", section.id, (section.questions || []).length)],
                                        };
                                        onChange({ ...survey, sections: nextSections });
                                    }}>
                                    Добавить матрицу 1-5
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-5">
                <button type="button" className={secondaryButtonClassName} onClick={() => onChange({ ...survey, sections: [...(survey.sections || []), createSurveySection((survey.sections || []).length)] })}>
                    Добавить раздел
                </button>
            </div>
        </section>
    );
}
