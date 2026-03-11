import { useCallback } from "react";

import { saveMayakTaskAttempt } from "../utils/saveMayakTaskAttempt";

export const useMayakTaskExecutionActions = ({
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
}) => {
    const toggleTaskTimer = useCallback(async () => {
        if (isIntroTask(currentTaskIndex)) {
            if (timerState.isRunning) {
                stopTimer();
                autoCompleteIntroTask();
            } else {
                startTimer();
            }
            return;
        }
        if (timerState.isRunning) {
            const timeWhenStopped = timerState.elapsedTime;
            stopTimer();

            const taskNumber = currentTask?.number?.toString();
            const taskTextData = taskNumber ? tasksTexts.find((t) => t.number === taskNumber) : null;

            if (taskTextData) {
                setCurrentTaskData({
                    ...taskTextData,
                    title: currentTask?.title || "",
                    contentType: currentTask?.contentType || "",
                });
            } else {
                console.warn(`Текст для задания ${currentTaskIndex + 1} не найден.`);
                setCurrentTaskData({
                    number: currentTask?.number || currentTaskIndex + 1,
                    title: currentTask?.title || "",
                    contentType: currentTask?.contentType || "",
                    description: currentTask?.description || "Описание задания недоступно",
                    task: currentTask?.name || "Текст задания недоступен",
                });
            }

            setShowCompletionPopup(true);

            const minutes = Math.round(timeWhenStopped / 60);
            const taskName = currentTask?.name || `Задание ${currentTaskIndex + 1}`;

            const logEntry = {
                number: taskNumber || String(currentTaskIndex + 1),
                title: taskName,
                taskTitle: currentTask?.title || "",
                contentType: currentTask?.contentType || "",
                description: taskTextData?.description || "",
                taskText: taskTextData?.task || "",
                time: formatTaskTime(timeWhenStopped),
                mayak: {
                    m: fields.m,
                    a: fields.a,
                    y: fields.y,
                    k: fields.k,
                    o1: fields.o1,
                    k2: fields.k2,
                    o2: fields.o2,
                },
                finalPrompt: prompt,
            };

            const currentLog = JSON.parse(localStorage.getItem(getStorageKey("session_tasks_log")) || "[]");
            const filteredLog = currentLog.filter((item) => item.number && String(item.number) !== String(logEntry.number));
            localStorage.setItem(getStorageKey("session_tasks_log"), JSON.stringify([...filteredLog, logEntry]));

            try {
                const result = await saveMayakTaskAttempt({
                    taskName,
                    minutes,
                    currentTaskIndex,
                    type,
                    userType,
                    who,
                    taskElapsedTime: timeWhenStopped,
                    sectionId: tokenSectionId,
                });

                if (!result.success) {
                    console.warn("Failed to save to server, using localStorage fallback");
                    const newTasks = {
                        ...completedTasks,
                        [activeUser]: {
                            ...(completedTasks[activeUser] || {}),
                            [taskName]: {
                                attempts: [
                                    ...(completedTasks[activeUser]?.[taskName]?.attempts || []),
                                    {
                                        timestamp: new Date().toISOString(),
                                        timeSpent: minutes,
                                        taskDetails: { type, userType, who },
                                    },
                                ],
                            },
                        },
                    };
                    setCompletedTasks(newTasks);
                    localStorage.setItem(getStorageKey("completedTasks"), JSON.stringify(newTasks));
                }
            } catch (err) {
                console.error("Error saving task data:", err);
            }
        } else {
            startTimer();
        }
    }, [
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
        timerState.elapsedTime,
        timerState.isRunning,
        tokenSectionId,
        type,
        userType,
        who,
    ]);

    return {
        toggleTaskTimer,
    };
};
