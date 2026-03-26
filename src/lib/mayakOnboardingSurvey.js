const SURVEY_SCALE = [1, 2, 3, 4, 5];

const REQUIRED_BY_DEFAULT = true;
const QUESTION_DESCRIPTION_PREFIXES = ["Шкала оценки.", "Матрица Ликерта.", "Единственный выбор."];

function buildSingleChoiceOptions(options = []) {
    return options.map((option, index) => ({
        id: String(option?.id || `option-${index + 1}`),
        label: String(option?.label || ""),
    }));
}

function buildMatrixRows(rows = []) {
    return rows.map((row, index) => ({
        id: String(row?.id || `row-${index + 1}`),
        label: String(row?.label || ""),
    }));
}

export const DEFAULT_MAYAK_ONBOARDING_SURVEY = {
    title: "Анкета диагностики цифровой трансформации",
    description: "Модель «Среда — Деятельность — Сознание». Анонимный опрос для диагностики цифровой трансформации организации.",
    durationLabel: "12-15 минут",
    introTitle: "",
    introText: "",
    submitLabel: "Отправить анкету",
    successTitle: "Анкета отправлена",
    successText: "Спасибо. Теперь можно перейти к выбору роли и просмотру текущего статуса подготовки.",
    sections: [
        {
            id: "environment",
            title: "Блок А: Среда",
            description: "Цифровая инфраструктура как условие трансформации",
            questions: [
                {
                    id: "q1",
                    type: "single_choice",
                    title: "Как лучше всего охарактеризовать состояние цифровой среды в вашей организации?",
                    description: "Шкала уровней. Выберите один вариант, который точнее всего описывает ситуацию.",
                    required: true,
                    options: buildSingleChoiceOptions([
                        { id: "level_0", label: "Уровень 0 — Фрагменты: отдельные инструменты есть, работают изолированно, данные не связаны" },
                        { id: "level_1", label: "Уровень 1 — Параллельная среда: цифровые системы есть, но дублируют бумажные процессы, а не замещают их" },
                        { id: "level_2", label: "Уровень 2 — Рабочая среда: большинство процессов идут в цифре, бумага — исключение" },
                        { id: "level_3", label: "Уровень 3 — Связная среда: системы интегрированы, данные передаются автоматически, единый контур управления" },
                    ]),
                },
                {
                    id: "q2",
                    type: "single_choice",
                    title: "Как часто в вашей практике одни и те же данные вносятся сначала в бумажный носитель, а затем дублируются в цифровую систему?",
                    description: "Шкала частоты. Выберите один вариант.",
                    required: true,
                    options: buildSingleChoiceOptions([
                        { id: "never", label: "Никогда — работаю только в цифровых системах" },
                        { id: "rarely", label: "Редко — несколько раз в месяц" },
                        { id: "sometimes", label: "Иногда — несколько раз в неделю" },
                        { id: "often", label: "Часто — почти каждый рабочий день" },
                        { id: "always", label: "Постоянно — это стандартная рабочая норма" },
                    ]),
                },
                {
                    id: "q3",
                    type: "matrix_1_5",
                    title: "Оцените согласие с утверждениями",
                    description: "Матрица Ликерта. 1 — полностью не согласен, 5 — полностью согласен.",
                    required: true,
                    minLabel: "1 — полностью не согласен",
                    maxLabel: "5 — полностью согласен",
                    rows: buildMatrixRows([
                        { id: "tools_fit", label: "Цифровые инструменты, доступные в нашей организации, подходят для специфики нашей работы" },
                        { id: "systems_linked", label: "Данные из разных систем (журнал, документооборот, СКУД и др.) связаны и доступны в одном месте" },
                        { id: "digital_ready", label: "Перейти к работе только в цифре технически возможно уже сейчас — инфраструктура готова" },
                    ]),
                },
                {
                    id: "q4",
                    type: "single_choice",
                    title: "Что в наибольшей степени ограничивает реальное использование имеющейся цифровой инфраструктуры?",
                    description: "Единственный выбор. Выберите один вариант.",
                    required: true,
                    options: buildSingleChoiceOptions([
                        { id: "technical", label: "Технические проблемы — системы работают нестабильно или неудобно" },
                        { id: "external_requirements", label: "Несовместимость с требованиями внешних организаций (ведомства, партнёры требуют бумагу)" },
                        { id: "skills", label: "Нехватка навыков у сотрудников для работы с доступными инструментами" },
                        { id: "no_tasks", label: "Отсутствие задач, для которых цифровые инструменты реально нужны" },
                        { id: "no_limits", label: "Нет явных ограничений — среда используется в полную силу" },
                    ]),
                },
            ],
        },
        {
            id: "activity",
            title: "Блок Б: Деятельность",
            description: "Задачи нового типа как движущий фактор",
            questions: [
                {
                    id: "q5",
                    type: "single_choice",
                    title: "Как лучше всего описывает, зачем в вашей организации используются цифровые инструменты?",
                    description: "Единственный выбор. Выберите один вариант.",
                    required: true,
                    options: buildSingleChoiceOptions([
                        { id: "because_required", label: "Потому что требуют — реальная необходимость не очевидна" },
                        { id: "faster_same", label: "Чтобы делать то же самое быстрее (те же задачи, другой инструмент)" },
                        { id: "new_tasks", label: "Чтобы решать задачи, которые раньше были принципиально невозможны" },
                        { id: "new_result", label: "Чтобы создавать качественно иной результат, недостижимый без цифры" },
                    ]),
                },
                {
                    id: "q6",
                    type: "matrix_1_5",
                    title: "Оцените согласие с утверждениями",
                    description: "Матрица Ликерта. 1 — полностью не согласен, 5 — полностью согласен.",
                    required: true,
                    minLabel: "1 — полностью не согласен",
                    maxLabel: "5 — полностью согласен",
                    rows: buildMatrixRows([
                        { id: "data_decisions", label: "Я принимаю профессиональные решения, опираясь на данные из цифровых систем" },
                        { id: "processes_changed", label: "Мои рабочие процессы реально изменились — я решаю задачи иначе, а не только быстрее" },
                        { id: "leadership_requires", label: "Руководство ставит задачи, которые требуют цифровых инструментов как необходимого условия" },
                        { id: "projects_new_level", label: "В организации есть конкретные проекты, где цифровые инструменты дали результат нового уровня" },
                    ]),
                },
                {
                    id: "q7",
                    type: "single_choice",
                    title: "Какую долю рабочего времени у вас занимает операционная нагрузка (отчёты, дублирование, обработка бумажных запросов), не оставляющая ресурса на развитие и новые задачи?",
                    description: "Шкала оценки. Выберите один вариант.",
                    required: true,
                    options: buildSingleChoiceOptions([
                        { id: "lt_20", label: "Менее 20% — основное время на содержательную работу" },
                        { id: "20_40", label: "20-40% — операционная нагрузка ощутима, но управляема" },
                        { id: "40_60", label: "40-60% — операционка отнимает половину рабочего времени" },
                        { id: "gt_60", label: "Более 60% — стратегической деятельности практически не остаётся" },
                    ]),
                },
                {
                    id: "q8",
                    type: "single_choice",
                    title: "Как руководитель организации лично участвует в цифровой трансформации?",
                    description: "Единственный выбор. Выберите один вариант.",
                    required: true,
                    options: buildSingleChoiceOptions([
                        { id: "translates_importance", label: "Транслирует важность цифровизации, но сам(а) инструменты не использует" },
                        { id: "uses_basic_tools", label: "Использует базовые инструменты по необходимости (почта, мессенджер)" },
                        { id: "solves_with_tools", label: "Лично решает профессиональные задачи с помощью цифровых инструментов" },
                        { id: "rebuilds_processes", label: "Принимает волевые решения о перестройке процессов и лично осваивает новые инструменты" },
                    ]),
                },
            ],
        },
        {
            id: "mindset",
            title: "Блок В: Сознание",
            description: "Профессиональное мышление как результат трансформации",
            questions: [
                {
                    id: "q9",
                    type: "single_choice",
                    title: "Как лучше всего описывает подход к освоению цифровых инструментов, принятый в вашей организации?",
                    description: "Единственный выбор. Выберите один вариант.",
                    required: true,
                    options: buildSingleChoiceOptions([
                        { id: "click_here", label: "«Нажмите сюда, перейдите туда» — инструктаж без понимания логики" },
                        { id: "functions_only", label: "Обучение отдельным функциям — что умеет инструмент, без связи с задачами" },
                        { id: "real_tasks", label: "Обучение через решение реальных профессиональных задач с помощью инструмента" },
                        { id: "logic_principles", label: "Освоение логики и принципов работы — чтобы самостоятельно применять в новых ситуациях" },
                    ]),
                },
                {
                    id: "q10",
                    type: "single_choice",
                    title: "Какая позиция точнее всего описывает вас лично в отношении освоения новых цифровых инструментов?",
                    description: "Единственный выбор. Выберите один вариант.",
                    required: true,
                    options: buildSingleChoiceOptions([
                        { id: "wait_for_training", label: "Жду, когда обучат — сам(а) не инициирую" },
                        { id: "learn_if_required", label: "Осваиваю, когда руководство требует и поддерживает" },
                        { id: "learn_for_task", label: "Осваиваю самостоятельно, когда вижу конкретную задачу, для которой нужен инструмент" },
                        { id: "actively_search", label: "Активно ищу новые инструменты и применяю по собственной инициативе" },
                    ]),
                },
                {
                    id: "q11",
                    type: "matrix_1_5",
                    title: "Оцените согласие с утверждениями",
                    description: "Матрица Ликерта. 1 — полностью не согласен, 5 — полностью согласен.",
                    required: true,
                    minLabel: "1 — полностью не согласен",
                    maxLabel: "5 — полностью согласен",
                    rows: buildMatrixRows([
                        { id: "understand_goal", label: "Я чётко понимаю, зачем нашей организации нужна цифровая трансформация, и могу объяснить это коллегам" },
                        { id: "meaning_changed", label: "Работа с цифровыми инструментами изменила смысл моей профессиональной деятельности, а не только её форму" },
                        { id: "data_resource", label: "Я воспринимаю цифровые данные как ключевой ресурс для профессиональных решений, а не как дополнительную отчётность" },
                    ]),
                },
                {
                    id: "q12",
                    type: "matrix_1_5",
                    title: "Оцените величину разрыва между тем, как есть, и как должно быть",
                    description: "Матрица диагностики разрывов. 1 — разрыва нет, всё согласовано; 5 — критический разрыв.",
                    required: true,
                    minLabel: "1 — разрыва нет",
                    maxLabel: "5 — критический разрыв",
                    rows: buildMatrixRows([
                        { id: "environment_activity_gap", label: "Среда → Деятельность: инфраструктура есть, но реальные практики работы не изменились" },
                        { id: "activity_mindset_gap", label: "Деятельность → Сознание: новые операции освоены, но профессиональное мышление осталось прежним" },
                        { id: "environment_goal_gap", label: "Среда — Цель: имеющиеся инструменты не соответствуют реальным задачам организации" },
                        { id: "mindset_team_gap", label: "Сознание — Команда: понимание целей трансформации у руководства и у педагогического состава расходится" },
                    ]),
                },
            ],
        },
    ],
};

function normalizeSurveyText(value = "") {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeSurveyRootDescription(value = "") {
    return normalizeSurveyText(value)
        .replace(/\s*перед началом MAYAK-сессии\.?$/i, "")
        .trim();
}

function normalizeSurveyQuestionDescription(value = "") {
    let result = normalizeSurveyText(value);
    QUESTION_DESCRIPTION_PREFIXES.forEach((prefix) => {
        if (result.startsWith(prefix)) {
            result = result.slice(prefix.length).trim();
        }
    });
    return result;
}

function clampSurveyScaleValue(value) {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return SURVEY_SCALE.includes(parsed) ? parsed : null;
}

export function createSurveySection(index = 0) {
    return {
        id: `survey-section-${index + 1}`,
        title: "",
        description: "",
        questions: [],
    };
}

export function createSurveyQuestion(type = "single_choice", sectionId = "survey-section", index = 0) {
    const baseId = `${sectionId}-question-${index + 1}`;
    if (type === "matrix_1_5") {
        return {
            id: baseId,
            type: "matrix_1_5",
            title: "",
            description: "",
            required: REQUIRED_BY_DEFAULT,
            minLabel: "1",
            maxLabel: "5",
            rows: buildMatrixRows([{ id: `${baseId}-row-1`, label: "" }]),
        };
    }

    return {
        id: baseId,
        type: "single_choice",
        title: "",
        description: "",
        required: REQUIRED_BY_DEFAULT,
        options: buildSingleChoiceOptions([{ id: `${baseId}-option-1`, label: "" }]),
    };
}

export function normalizeSurveyQuestion(rawQuestion = {}, sectionId = "survey-section", index = 0) {
    const type = rawQuestion?.type === "matrix_1_5" ? "matrix_1_5" : "single_choice";
    const question = createSurveyQuestion(type, sectionId, index);

    if (type === "matrix_1_5") {
        const rows = buildMatrixRows(Array.isArray(rawQuestion?.rows) ? rawQuestion.rows : question.rows).filter((row) => row.id || row.label);
        return {
            ...question,
            id: String(rawQuestion?.id || question.id).trim(),
            title: String(rawQuestion?.title || ""),
            description: normalizeSurveyQuestionDescription(rawQuestion?.description || ""),
            required: rawQuestion?.required ?? REQUIRED_BY_DEFAULT,
            minLabel: String(rawQuestion?.minLabel || question.minLabel),
            maxLabel: String(rawQuestion?.maxLabel || question.maxLabel),
            rows: rows.length > 0 ? rows : question.rows,
        };
    }

    const options = buildSingleChoiceOptions(Array.isArray(rawQuestion?.options) ? rawQuestion.options : question.options).filter((option) => option.id || option.label);
    return {
        ...question,
        id: String(rawQuestion?.id || question.id).trim(),
        title: String(rawQuestion?.title || ""),
        description: normalizeSurveyQuestionDescription(rawQuestion?.description || ""),
        required: rawQuestion?.required ?? REQUIRED_BY_DEFAULT,
        options: options.length > 0 ? options : question.options,
    };
}

export function normalizeSurveySection(rawSection = {}, index = 0) {
    const section = createSurveySection(index);
    const id = String(rawSection?.id || section.id).trim();
    const questions = Array.isArray(rawSection?.questions) ? rawSection.questions.map((question, questionIndex) => normalizeSurveyQuestion(question, id || section.id, questionIndex)) : [];

    return {
        id: id || section.id,
        title: String(rawSection?.title || ""),
        description: normalizeSurveyText(rawSection?.description || ""),
        questions,
    };
}

export function normalizeMayakOnboardingSurvey(rawSurvey = {}) {
    const base = DEFAULT_MAYAK_ONBOARDING_SURVEY;
    const sections = Array.isArray(rawSurvey?.sections) ? rawSurvey.sections.map((section, index) => normalizeSurveySection(section, index)) : base.sections.map((section, index) => normalizeSurveySection(section, index));

    return {
        title: String(rawSurvey?.title || base.title),
        description: normalizeSurveyRootDescription(rawSurvey?.description || base.description),
        durationLabel: normalizeSurveyText(rawSurvey?.durationLabel || base.durationLabel),
        introTitle: String(rawSurvey?.introTitle || base.introTitle),
        introText: normalizeSurveyText(rawSurvey?.introText || base.introText),
        submitLabel: String(rawSurvey?.submitLabel || base.submitLabel),
        successTitle: String(rawSurvey?.successTitle || base.successTitle),
        successText: normalizeSurveyText(rawSurvey?.successText || base.successText),
        sections,
    };
}

export function getSurveyQuestions(survey = {}) {
    return (survey?.sections || []).flatMap((section) =>
        (section?.questions || []).map((question) => ({
            ...question,
            sectionId: section.id,
            sectionTitle: section.title,
        }))
    );
}

export function getSurveyQuestionById(survey = {}, questionId = "") {
    return getSurveyQuestions(survey).find((question) => question.id === questionId) || null;
}

export function normalizeSurveyAnswers(survey = {}, rawAnswers = {}) {
    const questionEntries = getSurveyQuestions(survey);
    const answers = {};

    questionEntries.forEach((question) => {
        if (question.type === "matrix_1_5") {
            const source = rawAnswers?.[question.id];
            const rowAnswers = {};
            if (source && typeof source === "object") {
                question.rows.forEach((row) => {
                    const value = clampSurveyScaleValue(source[row.id]);
                    if (value !== null) {
                        rowAnswers[row.id] = value;
                    }
                });
            }
            answers[question.id] = rowAnswers;
            return;
        }

        const value = String(rawAnswers?.[question.id] || "").trim();
        answers[question.id] = value;
    });

    return answers;
}

export function validateSurveyAnswers(survey = {}, rawAnswers = {}) {
    const answers = normalizeSurveyAnswers(survey, rawAnswers);
    const errors = {};

    getSurveyQuestions(survey).forEach((question) => {
        if (question.type === "matrix_1_5") {
            const rowAnswers = answers[question.id] && typeof answers[question.id] === "object" ? answers[question.id] : {};
            const missingRowIds = question.required ? question.rows.filter((row) => !SURVEY_SCALE.includes(Number(rowAnswers[row.id]))).map((row) => row.id) : [];
            if (missingRowIds.length > 0) {
                errors[question.id] = {
                    message: "Заполните все строки вопроса.",
                    missingRowIds,
                };
            }
            return;
        }

        if (!question.required) return;
        const selectedValue = String(answers[question.id] || "");
        const optionIds = new Set((question.options || []).map((option) => option.id));
        if (!selectedValue || !optionIds.has(selectedValue)) {
            errors[question.id] = {
                message: "Выберите один вариант ответа.",
            };
        }
    });

    return {
        answers,
        errors,
        valid: Object.keys(errors).length === 0,
    };
}

export function formatSurveyAnswer(question = {}, rawAnswer) {
    if (question?.type === "matrix_1_5") {
        const rowAnswers = rawAnswer && typeof rawAnswer === "object" ? rawAnswer : {};
        return (question.rows || [])
            .map((row) => {
                const value = clampSurveyScaleValue(rowAnswers[row.id]);
                return `${row.label}: ${value === null ? "—" : value}`;
            })
            .join("; ");
    }

    const selectedOption = (question.options || []).find((option) => option.id === rawAnswer);
    return selectedOption?.label || "";
}

export function getSurveyResponseEntries(survey = {}, answers = {}) {
    return getSurveyQuestions(survey).map((question) => ({
        questionId: question.id,
        sectionId: question.sectionId,
        sectionTitle: question.sectionTitle,
        questionTitle: question.title,
        answerText: formatSurveyAnswer(question, answers?.[question.id]),
    }));
}
