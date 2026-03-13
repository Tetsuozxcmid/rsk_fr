import { useState, useEffect, useRef, memo, useCallback } from "react";
import Header from "@/components/layout/Header";
import Buffer from "./addons/popup";
import RankingTestPopup from "./addons/RankingTestPopup";
import MayakServicesPanel from "./MayakServicesPanel";
import InstructionImageModal from "./InstructionImageModal";
import { MayakField, TrainerControls } from "./TrainerUiSections";
import { RoleSelectionPopup, ConfirmationPopup, FirstQuestionnairePopup, SecondQuestionnairePopup, ThirdQuestionnairePopup, SessionCompletionPopup, TaskCompletionPopup } from "./TrainerPopups";

import InfoIcon from "@/assets/general/info.svg";
import CopyIcon from "@/assets/general/copy.svg";
import TimeIcon from "@/assets/general/time.svg";
import Plusicon from "@/assets/general/plus.svg";
import SettsIcon from "@/assets/general/setts.svg";
import RandomIcon from "@/assets/general/random.svg";
import ResetIcon from "@/assets/general/ResetIcon.svg";
import CloseIcon from "@/assets/general/close.svg";

// Добавляем getUserFromCookies
import { removeKeyCookie } from "./actions";
// Добавляем эти две строки для работы сертификата
import { useMediaQuery } from "@/hooks/useMediaQuery";
import CourseIcon from "@/assets/nav/course.svg";
import Button from "@/components/ui/Button";
import Switcher from "@/components/ui/Switcher";

import Block from "@/components/features/public/Block";

import { saveMayakTaskAttempt } from "./utils/saveMayakTaskAttempt";
import { loadMayakBuffer, saveMayakBuffer, appendMayakBufferValue, ensureMayakBufferOptions } from "./utils/mayakBufferStorage";
import { buildMayakPromptDraft, cleanupMayakPrompt } from "./utils/buildMayakPromptDraft";
import { saveMayakPromptHistory } from "./utils/saveMayakPromptHistory";
import { saveMayakRankingTest } from "./utils/saveMayakRankingTest";
import { createEmptyMayakFields } from "./utils/mayakPromptState";
import { clearMayakSessionCompletionState } from "./utils/mayakSessionCompletion";
import { useMayakConfirmationActions } from "./hooks/useMayakConfirmationActions";
import { useMayakCompletionUiState } from "./hooks/useMayakCompletionUiState";
import { useMayakQwenEvaluation } from "./hooks/useMayakQwenEvaluation";
import { useMayakQuestionnaireActions } from "./hooks/useMayakQuestionnaireActions";
import { useMayakPopupActions } from "./hooks/useMayakPopupActions";
import { useMayakSessionActions } from "./hooks/useMayakSessionActions";
import { useMayakBufferActions } from "./hooks/useMayakBufferActions";
import { useMayakTrainerControlActions } from "./hooks/useMayakTrainerControlActions";
import { useMayakTypeSwitcherActions } from "./hooks/useMayakTypeSwitcherActions";
import { useMayakPageActions } from "./hooks/useMayakPageActions";
import { useMayakModalActions } from "./hooks/useMayakModalActions";
import { useMayakTaskManager } from "./hooks/useMayakTaskManager";
import { useMayakAccessGate } from "./hooks/useMayakAccessGate";
import { useMayakRuntimeData } from "./hooks/useMayakRuntimeData";
import { useMayakPromptActions } from "./hooks/useMayakPromptActions";
import { useMayakCompletionActions } from "./hooks/useMayakCompletionActions";
import { useMayakTaskExecutionActions } from "./hooks/useMayakTaskExecutionActions";
import { useMayakPopupState } from "./hooks/useMayakPopupState";
import { useMayakTypeUiState } from "./hooks/useMayakTypeUiState";

const TRAINER_PREFIX = "trainer_v2"; // Уникальный префикс для этого тренажера

const QWEN_EVALUATION_LIMIT = 20;
const getStorageKey = (key) => `${TRAINER_PREFIX}_${key}`;
const isIntroTask = (index) => index % 100 < 3;
const isRoleSelectionTask = (task) => {
    const taskNumber = parseInt(task?.number, 10);
    const sectionStart = Number.isFinite(task?._sectionStart) ? task._sectionStart : null;
    return Number.isFinite(taskNumber) && Number.isFinite(sectionStart) && taskNumber === sectionStart;
};
const formatTaskTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};
const QWEN_ZONE_META = {
    green: {
        blockClass: "!bg-green-50 border border-green-200",
    },
    yellow: {
        blockClass: "!bg-yellow-50 border border-yellow-200",
    },
    red: {
        blockClass: "!bg-red-50 border border-red-300",
    },
    default: {
        blockClass: "!bg-blue-50 border border-blue-200",
    },
};

const getQwenZoneMeta = (zone) => QWEN_ZONE_META[zone] || QWEN_ZONE_META.default;
const QWEN_MASCOT_POOLS = {
    green: [{ animatedSrc: "/mascot-good-transparent-anim-smooth.webp" }, { animatedSrc: "/mascot-good-2-transparent-anim.webp" }, { animatedSrc: "/mascot-good-3-transparent-anim.webp" }],
    yellow: [{ animatedSrc: "/mascot-neutral-1-transparent-anim.webp" }, { animatedSrc: "/mascot-neutral-2-transparent-anim.webp" }, { animatedSrc: "/mascot-neutral-3-transparent-anim.webp" }],
    red: [{ animatedSrc: "/mascot-bad-transparent-anim.webp" }, { animatedSrc: "/mascot-bad-2-transparent-anim.webp" }, { animatedSrc: "/mascot-bad-3-transparent-anim.webp", hideAfterMs: 5980 }],
};
const getRandomQwenMascotAsset = (zone) => {
    const pool = QWEN_MASCOT_POOLS[zone];
    if (!Array.isArray(pool) || pool.length === 0) {
        return null;
    }

    const selectedAsset = pool[Math.floor(Math.random() * pool.length)];
    return selectedAsset ? { ...selectedAsset } : null;
};
const QWEN_UNAVAILABLE_MASCOT_ASSET = { animatedSrc: "/mascot-bad-3-transparent-anim.webp", hideAfterMs: 5980 };
const QWEN_MASCOT_ASSET_PRELOAD_LIST = Array.from(
    new Set([
        QWEN_UNAVAILABLE_MASCOT_ASSET.animatedSrc,
        ...Object.values(QWEN_MASCOT_POOLS)
            .flat()
            .map((asset) => asset.animatedSrc)
            .filter(Boolean),
    ])
);
const formatFieldList = (labels) => (Array.isArray(labels) ? labels.filter(Boolean).join(", ") : "");
const getQwenScoreMeta = (greenCount, totalFields = 7) => {
    const safeGreenCount = Number.isFinite(greenCount) ? greenCount : 0;
    const safeTotalFields = Number.isFinite(totalFields) && totalFields > 0 ? totalFields : 7;

    if (safeGreenCount >= 6) {
        return {
            text: `${safeGreenCount}/${safeTotalFields}`,
            textClass: "text-[var(--color-green-peace)]",
        };
    }

    if (safeGreenCount >= 3) {
        return {
            text: `${safeGreenCount}/${safeTotalFields}`,
            textClass: "text-yellow-700",
        };
    }

    return {
        text: `${safeGreenCount}/${safeTotalFields}`,
        textClass: "text-[var(--color-red)]",
    };
};
const buildQwenTaskContext = ({ taskTextData }) => ({
    description: taskTextData?.description || "",
    task: taskTextData?.task || "",
});

const AdminIconComponent = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        <path d="M12 11.13a3 3 0 1 0-3.87 3.87"></path>
    </svg>
);

const AdminIcon = memo(AdminIconComponent);

export default function TrainerPage({ goTo }) {
    const [savedField, setSavedField] = useState(null);

    const isMobile = useMediaQuery("(max-width: 1023px)");

    const [taskInputValue, setTaskInputValue] = useState("");
    const debounceTimeoutRef = useRef(null);

    const [hasCompletedSecondQuestionnaire, setHasCompletedSecondQuestionnaire] = useState(localStorage.getItem(getStorageKey("hasCompletedSecondQuestionnaire")) === "true");
    const [selectedRole, setSelectedRole] = useState(localStorage.getItem(getStorageKey("userRole")) || null);
    const [taskVersion, setTaskVersion] = useState(localStorage.getItem(getStorageKey("taskVersion")) || "v2");
    const [questionnaireSettings, setQuestionnaireSettings] = useState({ introQuestionnaireUrl: "", completionSurveyUrl: "" });

    const [rankingDelta5, setRankingDelta5] = useState(() => {
        try {
            const raw = localStorage.getItem("trainer_v2_rankingTestResults");
            if (raw) {
                const data = JSON.parse(raw);
                return data?.level5?.delta ?? null;
            }
        } catch {}
        return null;
    });

    useEffect(() => {
        localStorage.setItem(getStorageKey("taskVersion"), taskVersion);
    }, [taskVersion]);
    useEffect(() => {
        let isMounted = true;
        const loadQuestionnaireSettings = async () => {
            try {
                const res = await fetch("/api/mayak/settings", { cache: "no-store" });
                const json = await res.json();
                if (!isMounted || !json.success) return;
                setQuestionnaireSettings({
                    introQuestionnaireUrl: json.data?.questionnaires?.introQuestionnaireUrl || "",
                    completionSurveyUrl: json.data?.questionnaires?.completionSurveyUrl || "",
                });
            } catch (error) {
                console.error("Failed to load MAYAK questionnaire settings:", error);
            }
        };
        loadQuestionnaireSettings();
        return () => {
            isMounted = false;
        };
    }, []);
    const {
        confirmationConfig,
        currentTaskData,
        setConfirmationConfig,
        setCurrentTaskData,
        setShowCompletionPopup,
        setShowConfirmation,
        setShowRolePopup,
        showCompletionPopup,
        showConfirmation,
        showRolePopup,
    } = useMayakPopupState();

    const {
        showFirstQuestionnaire,
        setShowFirstQuestionnaire,
        showSecondQuestionnaire,
        setShowSecondQuestionnaire,
        showThirdQuestionnaire,
        setShowThirdQuestionnaire,
        hasCompletedQuestionnaire,
        setHasCompletedQuestionnaire,
        telegramLink,
        setTelegramLink,
        telegramLoading,
        setTelegramLoading,
        completionTestingDone,
        setCompletionTestingDone,
        completionSurveyDone,
        setCompletionSurveyDone,
        showSessionCompletionPopup,
        setShowSessionCompletionPopup,
        showRankingTestPopup,
        setShowRankingTestPopup,
        rankingForceRetake,
        setRankingForceRetake,
    } = useMayakCompletionUiState();

    const [levels, setLevels] = useState({
        level1: "",
        level2: "",
        level3: "",
        level4: "",
        level5: "",
    });

    const [showLevelsInput, setShowLevelsInput] = useState(false);

    const [completedTasks, setCompletedTasks] = useState({});


    const [type, setType] = useState("text");
    const [userType, setUserType] = useState("teacher");
    const [who, setWho] = useState("im");
    const [instructionModal, setInstructionModal] = useState(null);

    const {
        isAdmin,
        isTokenValid,
        tokenTaskRange,
        tokenSectionId,
        sessionStartTime,
    } = useMayakAccessGate({
        getStorageKey,
        goTo,
    });

    const {
        tasks,
        currentTask,
        currentTaskIndex,
        isLoading,
        error,
        setError,
        timerState,
        startTimer,
        stopTimer,
        goToTask,
        nextTask,
        prevTask,
        instructionFileUrl,
        taskFileUrl,
        sourceUrl,
        tasksTexts,
        isCurrentTaskAllowed,
        allowedMinIndex,
        allowedMaxIndex,
    } = useMayakTaskManager({
        userType,
        who,
        taskVersion,
        isTokenValid,
        tokenTaskRange, // Передаем в хук
        tokenSectionId, // Slug папки раздела
        getStorageKey,
    });

    // Автозавершение вводного задания (без таймера, без попапа завершения)
    const autoCompleteIntroTask = useCallback(async () => {
        const taskNumber = currentTask?.number?.toString();
        const taskName = currentTask?.name || `Задание ${currentTaskIndex + 1}`;
        const taskTextData = taskNumber ? tasksTexts.find((t) => t.number === taskNumber) : null;

        // Записываем в лог с нулевым временем
        const logEntry = {
            number: taskNumber || String(currentTaskIndex + 1),
            title: taskName,
            taskTitle: currentTask?.title || "",
            contentType: currentTask?.contentType || "",
            description: taskTextData?.description || "",
            taskText: taskTextData?.task || "",
            time: "00:00",
            mayak: { m: "", a: "", y: "", k: "", o1: "", k2: "", o2: "" },
            finalPrompt: "(вводное задание)",
        };
        const currentLog = JSON.parse(localStorage.getItem(getStorageKey("session_tasks_log")) || "[]");
        const filteredLog = currentLog.filter((item) => item.number && String(item.number) !== String(logEntry.number));
        localStorage.setItem(getStorageKey("session_tasks_log"), JSON.stringify([...filteredLog, logEntry]));

        // Сохраняем на сервер
        try {
            await saveMayakTaskAttempt({
                taskName,
                minutes: 0,
                currentTaskIndex,
                type,
                userType,
                who,
                taskElapsedTime: 0,
                sectionId: tokenSectionId,
            });
        } catch (err) {
            console.error("Error saving intro task:", err);
        }

        // Останавливаем таймер если был запущен
        if (timerState.isRunning) {
            stopTimer();
        }
    }, [currentTask, currentTaskIndex, tasksTexts, type, userType, who, timerState.isRunning, stopTimer]);


    useEffect(() => {
        if (currentTask) {
            setShowLevelsInput(currentTask.toolName1 === "Пройти Тестирование");
        } else {
            setShowLevelsInput(false);
        }
    }, [currentTask]);

    useEffect(() => {
        // Синхронизируем поле ввода: с токеном — номер задания, без — порядковый номер
        if (tasks.length > 0 && tasks[currentTaskIndex]) {
            if (tokenTaskRange) {
                setTaskInputValue(tasks[currentTaskIndex].number?.toString() || (currentTaskIndex + 1).toString());
            } else {
                setTaskInputValue((currentTaskIndex + 1).toString());
            }
        }
    }, [currentTaskIndex, tasks, tokenTaskRange]);

    const [fields, setFields] = useState(createEmptyMayakFields);
    const [prompt, setPrompt] = useState("");
    const [isCopied, setIsCopied] = useState(false);
    const [buffer, setBuffer] = useState({});
    const [showBuffer, setShowBuffer] = useState(false);
    const [currentField, setCurrentField] = useState(null);
    const {
        qwenResponse,
        qwenLoading,
        qwenZone,
        qwenStrongFields,
        qwenWeakFields,
        qwenGreenCount,
        qwenTotalFields,
        qwenChecksRemaining,
        showMascotVideo,
        activeQwenMascotAsset,
        isPromptCopyAwaitingEvaluation,
        mascotPlaybackKey,
        evaluationLimit,
        syncQwenEvaluationQuota,
        clearQwenState,
        resetQwenSessionState,
        createPromptWithEvaluation,
    } = useMayakQwenEvaluation({
        getStorageKey,
        buildPromptDraft: () => buildPromptDraftRef.current?.(),
        currentTaskIndex,
        isIntroTask,
    });

    const buildPromptDraftRef = useRef(null);

    const savePromptToHistory = useCallback(
        (promptValue) => {
            const nextHistory = saveMayakPromptHistory({
                promptValue,
                type,
                storageKey: getStorageKey("history"),
            });
        },
        [type]
    );

    const buildPromptDraft = useCallback(() => {
        const builtDraft = buildMayakPromptDraft(fields);
        if (!builtDraft) {
            clearQwenState();
            setPrompt('Пожалуйста, заполните все поля (или используйте "кубики").');
            return null;
        }

        const { values, finalPrompt } = builtDraft;
        const taskNumber = currentTask?.number?.toString();
        const taskTextData = taskNumber ? tasksTexts.find((t) => t.number === taskNumber) : null;
        const taskContext = buildQwenTaskContext({
            taskTextData,
        });

        setPrompt(finalPrompt);
        savePromptToHistory(finalPrompt);

        return {
            values,
            finalPrompt,
            taskContext,
        };
    }, [clearQwenState, currentTask?.number, fields, savePromptToHistory, tasksTexts]);

    buildPromptDraftRef.current = buildPromptDraft;

    useEffect(() => {
        if (sessionStartTime) {
            syncQwenEvaluationQuota(sessionStartTime);
        }
    }, [sessionStartTime, syncQwenEvaluationQuota]);

    useEffect(() => {
        const loadedBuffer = loadMayakBuffer(getStorageKey("buffer"));
        setBuffer(loadedBuffer);
    }, []);

    useEffect(() => {
        // Проверяем, есть ли наш одноразовый флаг
        const isCompletionPending = localStorage.getItem(getStorageKey("sessionCompletionPending")) === "true";

        if (isCompletionPending) {
            // Если да, значит пользователь вернулся с Яндекс.Формы
            // 1. Сразу удаляем флаг, чтобы это не повторилось при перезагрузке
            localStorage.removeItem(getStorageKey("sessionCompletionPending"));
            // 2. Перенаправляем на главную страницу
            goTo("index");
        }
    }, [goTo]);

    const { activeUser, mayakData } = useMayakRuntimeData();

    const {
        activeTypeKey,
        handleTypeSwitch,
        isMiscAccordionOpen,
        miscCategory,
        openSubAccordionKey,
        setOpenSubAccordionKey,
    } = useMayakTypeUiState({
        mayakData,
        setType,
        type,
    });

    const { toggleTaskTimer } = useMayakTaskExecutionActions({
        activeUser,
        autoCompleteIntroTask,
        completedTasks,
        currentTask,
        currentTaskIndex,
        fields,
        formatTaskTime,
        getStorageKey,
        isIntroTask,
        prompt,
        setCompletedTasks,
        setCurrentTaskData,
        setShowCompletionPopup,
        startTimer,
        stopTimer,
        tasksTexts,
        timerState,
        tokenSectionId,
        type,
        userType,
        who,
    });

    const {
        handleDownloadCertificate,
        handleDownloadLogs,
        handleSaveSessionCompletion,
        handleSendToTelegram,
    } = useMayakCompletionActions({
        elapsedTime: timerState.elapsedTime,
        getStorageKey,
        levels,
        removeKeyCookie,
        resetQwenSessionState,
        selectedRole,
        setSelectedRole,
        setShowSessionCompletionPopup,
        setShowThirdQuestionnaire,
        setTelegramLink,
        setTelegramLoading,
        tokenSectionId,
    });

    const { showSwitchToWeConfirmation, showCompleteSessionConfirmation, handleSwitchToWe } = useMayakConfirmationActions({
        hasCompletedSecondQuestionnaire,
        setConfirmationConfig,
        setHasCompletedQuestionnaire,
        setShowConfirmation,
        setShowSecondQuestionnaire,
        setShowThirdQuestionnaire,
        setWho,
    });

    const { handleLevelChange, saveMeasurements, saveQuestionnaire } = useMayakQuestionnaireActions({
        getStorageKey,
        setHasCompletedSecondQuestionnaire,
        setLevels,
        timerElapsedTime: timerState.elapsedTime,
    });

    const {
        handleCloseSecondQuestionnaire,
        handleCloseThirdQuestionnaire,
        handleGetCompletionCertificate,
        handleOpenCompletionSurvey,
        handleOpenCompletionTesting,
        handleSubmitSecondQuestionnaire,
    } = useMayakPopupActions({
        completionSurveyUrl: questionnaireSettings.completionSurveyUrl,
        handleSaveSessionCompletion,
        saveQuestionnaire,
        setCompletionSurveyDone,
        setShowSecondQuestionnaire,
        setShowThirdQuestionnaire,
        setWho,
    });

    const { handleAdminResetSession, handleRoleConfirm } = useMayakSessionActions({
        autoCompleteIntroTask,
        currentTaskIndex,
        getStorageKey,
        isAdmin,
        isIntroTask,
        removeKeyCookie,
        resetQwenSessionState,
        setCompletionSurveyDone,
        setCompletionTestingDone,
        setFields,
        setHasCompletedSecondQuestionnaire,
        setPrompt,
        setRankingDelta5,
        setSelectedRole,
        setShowRolePopup,
        stopTimer,
        timerIsRunning: timerState.isRunning,
    });

    const { handleCompleteSession, handleShowRolePopup, handleToolLink1Click } = useMayakTrainerControlActions({
        autoCompleteIntroTask,
        introQuestionnaireUrl: questionnaireSettings.introQuestionnaireUrl,
        currentTask,
        currentTaskIndex,
        isIntroTask,
        setShowFirstQuestionnaire,
        setShowRankingTestPopup,
        setShowRolePopup,
        setShowThirdQuestionnaire,
    });

    const { handleCloseRolePopup, handleOpenHistory, handleSubmitSecondQuestionnaireWithFeedback } = useMayakPageActions({
        goTo,
        handleSubmitSecondQuestionnaire,
        setShowRolePopup,
    });

    const {
        handleCloseInstructionModal,
        handleCloseRankingTestPopup,
        handleCloseSessionCompletionPopup,
        handleSaveRankingTest,
        handleShowInstruction,
    } = useMayakModalActions({
        autoCompleteIntroTask,
        currentTaskIndex,
        isIntroTask,
        rankingForceRetake,
        saveRankingTest: (results) => saveMayakRankingTest({ results, setRankingDelta5 }),
        setCompletionTestingDone,
        setInstructionModal,
        setRankingForceRetake,
        setShowRankingTestPopup,
        setShowSessionCompletionPopup,
        setShowThirdQuestionnaire,
    });

    const handleChange = useCallback(
        (code, value) => {
            setFields((prev) => ({ ...prev, [code]: value }));
        },
        [setFields]
    );

    const { createPrompt, handleCopy, handleRandom, handleResetFields } = useMayakPromptActions({
        buildPromptDraft,
        clearQwenState,
        mayakData,
        setFields,
        setIsCopied,
        setPrompt,
        type,
        handleChange,
    });

    const {
        handleAddToBuffer,
        handleCloseBuffer,
        handleInsertFromBuffer,
        handleShowBufferForField,
        handleUpdateBuffer,
    } = useMayakBufferActions({
        buffer,
        contentTypeOptions: mayakData.contentTypeOptions,
        currentField,
        fields,
        getStorageKey,
        handleChange,
        setBuffer,
        setCurrentField,
        setSavedField,
        setShowBuffer,
        type,
    });

    const cleanupPrompt = cleanupMayakPrompt;

    const isCreateDisabled = Object.values(fields).some((v) => !v);
    const isEvaluationBlockedForIntroTask = isIntroTask(currentTaskIndex);
    const isCopyDisabled = !prompt || isCopied || prompt.includes("Пожалуйста, заполните") || isPromptCopyAwaitingEvaluation;
    const copyDisabledReason = isPromptCopyAwaitingEvaluation ? "Дождитесь ответа нейросети" : !prompt ? "Сначала создайте промт" : prompt.includes("Пожалуйста, заполните") ? "Сначала заполните все поля" : "";
    const createWithEvaluationDisabledReason = isEvaluationBlockedForIntroTask
        ? "Оценка недоступна на первых трех заданиях каждой колоды"
        : isCreateDisabled
          ? "Сначала заполните все поля"
          : qwenChecksRemaining <= 0
            ? "Лимит оценок для этой сессии исчерпан"
            : "";
    const isCreateWithEvaluationDisabled = isCreateDisabled || isEvaluationBlockedForIntroTask || qwenLoading || qwenChecksRemaining <= 0;
    const qwenZoneMeta = getQwenZoneMeta(qwenZone);
    const qwenScoreMeta = qwenGreenCount === null ? null : getQwenScoreMeta(qwenGreenCount, qwenTotalFields);
    const shouldShowQwenMascot = !qwenLoading && activeQwenMascotAsset && showMascotVideo;

    const trainerControlsProps = {
        who,
        taskVersion,
        currentTaskIndex,
        tasks,
        isTaskRunning: timerState.isRunning,
        taskElapsedTime: timerState.elapsedTime,
        instructionFileUrl,
        taskFileUrl,
        sourceUrl,
        currentTask,
        isCurrentTaskAllowed,
        allowedMinIndex,
        allowedMaxIndex,
        selectedRole,
        rankingDelta5,
        onWhoChange: (value) => {
            // Сначала обновляем состояние, чтобы UI отреагировал
            setWho(value);
            // Затем, если выбрали "Мы" и анкета не пройдена, показываем попап
            if (value === "we" && !hasCompletedSecondQuestionnaire) {
                showSwitchToWeConfirmation();
            }
        },
        onPrevTask: prevTask,
        onNextTask: nextTask,
        taskInputValue,
        onTaskInputChange: (e) => {
            const value = e.target.value;

            // Немедленно обновляем поле ввода, чтобы ввод был плавным
            if (!/^\d*$/.test(value)) return; // Разрешаем вводить только цифры
            setTaskInputValue(value);

            // Сбрасываем предыдущий таймер
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }

            // Если поле пустое, ничего не делаем
            if (value.trim() === "") {
                return;
            }

            // Устанавливаем новый таймер
            debounceTimeoutRef.current = setTimeout(() => {
                const inputNum = parseInt(value, 10);
                let newIndex;

                if (tokenTaskRange) {
                    // С токеном: ищем по номеру задания (task.number)
                    newIndex = tasks.findIndex((t) => parseInt(t.number, 10) === inputNum);
                } else {
                    // Без токена: ввод = порядковый номер (1, 2, 3...)
                    newIndex = inputNum - 1;
                }

                // Если задание найдено и в пределах допустимого диапазона — переключаем
                if (newIndex >= 0 && newIndex >= allowedMinIndex && newIndex <= allowedMaxIndex && newIndex < tasks.length) {
                    goToTask(newIndex);
                }
                // Если не найдено — просто не переключаем, даём пользователю исправить
            }, 600);
        },
        onToggleTaskTimer: toggleTaskTimer,
        onCompleteSession: handleCompleteSession,
        onShowRolePopup: handleShowRolePopup,
        onToolLink1Click: handleToolLink1Click,
        mayakData,
        onShowInstruction: handleShowInstruction,
        isCurrentTaskIntro: isIntroTask(currentTaskIndex),
        isCurrentTaskRoleSelection: isRoleSelectionTask(currentTask),
    };

    return (
        <>
            <Header>
                <Header.Heading>МАЯК ОКО</Header.Heading>
                <Button
                    icon
                    disabled={timerState.isRunning}
                    className={timerState.isRunning ? "!opacity-40 !cursor-not-allowed !pointer-events-none" : ""}
                    onClick={handleOpenHistory}
                    title={timerState.isRunning ? "Недоступно во время выполнения задания" : "История запросов"}>
                    <TimeIcon />
                </Button>
                {isAdmin && (
                    <Button
                        icon
                        disabled={timerState.isRunning}
                        className={timerState.isRunning ? "!opacity-40 !cursor-not-allowed !pointer-events-none" : ""}
                        onClick={handleAdminResetSession}
                        title={timerState.isRunning ? "Недоступно во время выполнения задания" : "Сбросить сессию (админ)"}>
                        <ResetIcon />
                    </Button>
                )}
            </Header>

            {showSecondQuestionnaire && (
                <SecondQuestionnairePopup
                    onClose={handleCloseSecondQuestionnaire}
                    onSubmit={handleSubmitSecondQuestionnaireWithFeedback}
                />
            )}

            {showThirdQuestionnaire && (
                <ThirdQuestionnairePopup
                    onClose={handleCloseThirdQuestionnaire}
                    testingDone={completionTestingDone}
                    surveyDone={completionSurveyDone}
                    certificateLoading={telegramLoading}
                    onOpenTesting={handleOpenCompletionTesting}
                    onOpenSurvey={handleOpenCompletionSurvey}
                    onGetCertificate={handleGetCompletionCertificate}
                />
            )}

            <div className="hero relative">
                {isMobile && (
                    <div className="col-span-12 mb-4">
                        <TrainerControls {...trainerControlsProps} />
                    </div>
                )}
                <Block className="col-span-12 lg:col-span-6 !h-full">
                    <form className="flex flex-col h-full justify-between">
                        <div className="flex flex-col gap-[1.25rem]">
                            <div className="flex flex-col gap-[1rem]">
                                <Switcher
                                    value={activeTypeKey} // Используем activeTypeKey для правильного выделения
                                    onChange={handleTypeSwitch}
                                    className="!w-full !flex-wrap">
                                    {mayakData.defaultTypes.map((t) => (
                                        <Switcher.Option key={t.key} value={t.key}>
                                            {t.label}
                                        </Switcher.Option>
                                    ))}
                                </Switcher>
                            </div>
                            <div className="flex flex-col gap-[0.5rem]">
                                <div className="flex justify-between items-center">
                                    <span className="big">Цели и целевая направленность</span>
                                    <Button icon type="button" onClick={handleResetFields} className="!w-auto !h-auto !p-1 !bg-transparent" title="Сбросить все поля">
                                        <ResetIcon className="!text-black" />
                                    </Button>
                                </div>
                                {(mayakData.fieldsList || []).slice(0, 4).map((f) => (
                                    <MayakField
                                        key={f.code}
                                        field={f}
                                        value={fields[f.code]}
                                        isMobile={isMobile}
                                        onChange={handleChange}
                                        onShowBuffer={handleShowBufferForField}
                                        onAddToBuffer={handleAddToBuffer}
                                        onRandom={handleRandom}
                                        savedField={savedField}
                                    />
                                ))}
                            </div>
                            <div className="flex flex-col gap-[0.5rem]">
                                <span className="big">Условия реализации и параметры оформления</span>
                                {(mayakData.fieldsList || []).slice(4).map((f) => (
                                    <MayakField
                                        key={f.code}
                                        field={f}
                                        value={fields[f.code]}
                                        isMobile={isMobile}
                                        onChange={handleChange}
                                        onShowBuffer={handleShowBufferForField}
                                        onAddToBuffer={handleAddToBuffer}
                                        onRandom={handleRandom}
                                        savedField={savedField}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="mt-4 flex w-full flex-col gap-2">
                            <div className="flex w-full flex-col gap-2 sm:flex-row">
                                <span className="block w-full" title={isCreateDisabled ? "Сначала заполните все поля" : ""}>
                                    <Button className="blue w-full" type="button" onClick={createPrompt} disabled={isCreateDisabled || qwenLoading}>
                                        Создать&nbsp;промт
                                    </Button>
                                </span>
                                <span className="block w-full" title={createWithEvaluationDisabledReason}>
                                    <Button className="w-full" type="button" onClick={createPromptWithEvaluation} disabled={isCreateWithEvaluationDisabled}>
                                        Создать&nbsp;промт&nbsp;с&nbsp;оценкой&nbsp;({qwenChecksRemaining}/{evaluationLimit})
                                    </Button>
                                </span>
                            </div>
                        </div>
                    </form>
                </Block>

                <div className="col-span-12 lg:col-span-6 h-full flex flex-col gap-4">
                    {!isMobile && <TrainerControls {...trainerControlsProps} />}

                    <Block className="flex-grow !bg-slate-50 flex flex-col">
                        <h6 className="text-black mb-2">Ваш промт</h6>
                        <div className="flex-grow overflow-y-auto">
                            <p className="text-gray-600">{prompt || 'Заполните поля и нажмите "Создать промт"'}</p>
                        </div>
                    </Block>

                    {(qwenLoading || qwenResponse) && (
                        <Block className={`${qwenLoading ? QWEN_ZONE_META.default.blockClass : qwenZoneMeta.blockClass} relative flex flex-col`}>
                            {!qwenLoading && qwenScoreMeta && (
                                <div className={`absolute right-4 top-4 text-lg font-bold sm:text-xl ${qwenScoreMeta.textClass}`}>
                                    {qwenScoreMeta.text}
                                </div>
                            )}
                            <h6 className="mb-2 text-black">Оценка от нейросети</h6>
                            <div className={`flex ${shouldShowQwenMascot ? "flex-col gap-3 sm:flex-row sm:items-start sm:justify-between" : "flex-col"}`}>
                                <div className="flex-1">
                                    {qwenLoading ? (
                                        <p className="text-gray-500 animate-pulse">Анализирую промпт...</p>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <p className="text-gray-700">{qwenResponse}</p>
                                            {qwenStrongFields.length > 0 && (
                                                <p className="text-sm text-gray-700">
                                                    <span className="font-semibold text-black">Сильные поля:</span> {formatFieldList(qwenStrongFields)}
                                                </p>
                                            )}
                                            {qwenWeakFields.length > 0 && (
                                                <p className="text-sm text-gray-700">
                                                    <span className="font-semibold text-black">Слабые поля:</span> {formatFieldList(qwenWeakFields)}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {shouldShowQwenMascot && (
                                    <div className="flex shrink-0 flex-col items-center self-center">
                                        <div className="h-[96px] w-[96px] sm:h-[112px] sm:w-[112px]">
                                            <img key={mascotPlaybackKey} src={activeQwenMascotAsset.animatedSrc} alt="" aria-hidden="true" decoding="sync" fetchPriority="high" className="h-full w-full object-contain" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Block>
                    )}
                    <div className="flex flex-col gap-[1rem]">
                        <div className="flex flex-col gap-[0.5rem]">
                            <Button onClick={() => handleCopy(prompt)} disabled={isCopyDisabled} title={copyDisabledReason}>
                                {isCopied ? "Скопировано!" : "Скопировать"}
                            </Button>
                            <MayakServicesPanel
                                defaultLinks={mayakData.defaultLinks}
                                isMiscAccordionOpen={isMiscAccordionOpen}
                                miscCategory={miscCategory}
                                onOpenInstruction={handleShowInstruction}
                                openSubAccordionKey={openSubAccordionKey}
                                setOpenSubAccordionKey={setOpenSubAccordionKey}
                                type={type}
                            />
                        </div>
                    </div>
                </div>

                {showBuffer && <Buffer onClose={handleCloseBuffer} onInsert={handleInsertFromBuffer} onUpdate={handleUpdateBuffer} buffer={buffer} currentField={currentField} />}
                <InstructionImageModal instructionModal={instructionModal} onClose={handleCloseInstructionModal} />
            </div>
            {showCompletionPopup && (
                <TaskCompletionPopup
                    taskData={currentTaskData}
                    elapsedTime={timerState.readyElapsedTime}
                    onClose={() => {
                        setShowCompletionPopup(false);
                    }}
                />
            )}
            {showSessionCompletionPopup && <SessionCompletionPopup onClose={handleCloseSessionCompletionPopup} onSave={handleSaveSessionCompletion} />}
            {showRolePopup && <RoleSelectionPopup onClose={handleCloseRolePopup} onConfirm={handleRoleConfirm} />}
            {showRankingTestPopup && (
                <RankingTestPopup
                    onClose={handleCloseRankingTestPopup}
                    forceRetake={rankingForceRetake}
                    onSave={handleSaveRankingTest}
                />
            )}
        </>
    );
}


