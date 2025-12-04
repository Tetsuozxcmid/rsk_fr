"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Layout from "@/components/layout/Layout";
import Button from "@/components/ui/Button";
import Zapret from "@/assets/general/zapret.svg";
import NeZapret from "@/assets/general/neZapret.svg";
import Notify from "@/assets/general/notify.svg";
import RejectReasonPopup from "@/components/ui/RejectReasonPopup";
import { useRouter } from "next/navigation";

export default function AdminProjects() {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [removingId, setRemovingId] = useState(null);

    const [showRejectPopup, setShowRejectPopup] = useState(false);
    const [rejectingProjectId, setRejectingProjectId] = useState(null);
    const [time, setTime] = useState(0);

    const router = useRouter();

    const handleRejectClick = (projectId) => {
        setRejectingProjectId(projectId);
        setShowRejectPopup(true);
    };

    const handleRejectConfirm = (projectId, reason) => {
        handleReview(projectId, false, reason);
        setShowRejectPopup(false);
    };

    useEffect(() => {
        async function fetchSubmissions() {
            try {
                const res = await fetch("/api/admin/cours", {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                });

                if (!res.ok) throw new Error("Ошибка загрузки данных");

                const data = await res.json();
                setSubmissions(data.data.data || []);
                setTime(data.data.time);
            } catch (err) {
                console.error("Ошибка:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchSubmissions();
    }, []);

    const handleReview = async (submissionId, isApproved, reason = "Все хорошо") => {
        const status = isApproved ? "одобрен" : "отклонен";
        const actionText = isApproved ? "одобрить" : "отклонить";

        if (!window.confirm(`Вы уверены, что хотите ${actionText} эту заявку по причине ${reason}?`)) {
            return;
        }

        try {
            // Устанавливаем ID удаляемого элемента для анимации
            setRemovingId(submissionId);

            const res = await fetch(`/api/admin/cours/review/${submissionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    status: status,
                    description: reason,
                }),
            });

            if (!res.ok) throw new Error(`Ошибка при ${actionText}и заявки`);

            // Ждем завершения анимации перед удалением из состояния
            setTimeout(() => {
                setSubmissions((prev) => prev.filter((sub) => sub.id !== submissionId));
                setRemovingId(null);
            }, 500);
        } catch (err) {
            console.error(`Ошибка ${actionText}и:`, err);
            alert(`Произошла ошибка при ${actionText} заявки`);
            setRemovingId(null);
        }
    };

    useEffect(() => {
        const timer = document.getElementById("timer");
        if (!time || !timer) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const target = time * 1000;
            const diff = target - now;

            if (diff <= 0) {
                router.replace(window.location.pathname);
                clearInterval(interval);
                return;
            }

            const totalSeconds = Math.floor(diff / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            timer.innerText = `Оставшееся время сессии: ${minutes} мин ${seconds} сек`;
        }, 1000);

        return () => clearInterval(interval);
    }, [time]);

    if (loading) {
        return (
            <Layout>
                <Header>
                    <Header.Heading>Проекты</Header.Heading>
                    <Button icon>
                        <Notify />
                    </Button>
                </Header>
                <div className="flex h-full items-center justify-center">
                    <p>Загрузка...</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <Header>
                <Header.Heading>Проекты</Header.Heading>
                <Button icon>
                    <Notify />
                </Button>
            </Header>
            <div className="hero">
                <div className="col-start-4 col-end-10 h-full gap-[.75rem]">
                    <div className="gap-[0.625rem] bg-(--color-white-gray) flex items-center justify-center rounded-[.625rem] px-[.875rem] py-[.5rem] mb-[1rem]">
                        <div className="h-[1.25rem] aspect-square rounded-full bg-(--color-gray-plus-50)"></div>
                        <span id="timer" className="link">
                            Оставшееся время сессии:
                        </span>
                    </div>

                    {submissions.map((submission) => (
                        <div
                            key={submission.id}
                            className={`
                                flex flex-col border-[1.5px] border-(--color-gray-plus-50) rounded-[1rem] gap-[1rem] p-[1.25rem] mb-[1rem]
                                transition-all duration-500 ease-in-out overflow-hidden
                                ${removingId === submission.id ? "opacity-0 transform translate-x-full scale-80 max-h-0 py-0 mb-0" : "opacity-100 transform translate-x-0 scale-100 max-h-[500px]"}
                            `}>
                            <h5>Заявка #{submission.id}</h5>
                            <div className="flex items-center justify-start gap-[1.5rem]">
                                <div className="flex gap-[0.5rem]">
                                    <span className="link small">Курс #{submission.course_id}</span>
                                </div>
                                <div className="flex gap-[0.5rem]">
                                    <span className="link small">Пользователь #{submission.user_id}</span>
                                </div>
                                <div className="flex gap-[0.5rem]">
                                    <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="link small text-(--color-blue)">
                                        {submission.file_url}
                                    </a>
                                </div>
                            </div>
                            <div className="flex justify-end gap-[0.5rem]">
                                <Button
                                    inverted
                                    roundeful
                                    className="!w-fit reject-button"
                                    onClick={() => {
                                        handleRejectClick(submission.id);
                                    }}
                                    disabled={removingId === submission.id}>
                                    Отклонить <Zapret />
                                </Button>
                                <Button inverted roundeful className="!w-fit approve-button" onClick={() => handleReview(submission.id, true)} disabled={removingId === submission.id}>
                                    Подтвердить <NeZapret />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
                {showRejectPopup && <RejectReasonPopup onClose={() => setShowRejectPopup(false)} onConfirm={handleRejectConfirm} projectId={rejectingProjectId} />}
            </div>
        </Layout>
    );
}
