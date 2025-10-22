"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Layout from "@/components/layout/Layout";
import Warning from "@/assets/general/warning.svg";
import TimeBefore from "@/assets/general/timeBefore.svg";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input/Input";

export default function Task() {
    const params = useParams();
    const task = params?.task;
    const [lesson, setLesson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fileUrl, setFileUrl] = useState("");
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch("/api/cours", {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                });
                if (!res.ok) throw new Error("Ошибка загрузки");

                const json = await res.json();
                if (!json.success) throw new Error("API вернуло ошибку");

                const found = json.data.find((l) => Number(l.lesson_number) === Number(task));
                if (found.is_completed == "на рассмотрении" || found.is_completed == "одобрен") {
                    setSubmitted(true);
                }
                setLesson(found || null);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        if (task) fetchData();
    }, [task]);

    const handleSubmit = async () => {
        try {
            const res = await fetch("/api/cours/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: 0,
                    course_id: 1, // Можно заменить на lesson.course_id если есть в данных
                    file_url: fileUrl,
                }),
            });

            if (res.ok) {
                setSubmitted(true);
                window.location.reload(); // Перезагрузка страницы после успешной отправки
            }
        } catch (err) {
            console.error("Ошибка отправки:", err);
        }
    };

    if (loading) {
        return (
            <Layout>
                <Header>
                    <Header.Heading>Обучение</Header.Heading>
                </Header>
                <div className="flex h-full flex items-center justify-center">
                    <p>Загрузка...</p>
                </div>
            </Layout>
        );
    }

    if (!lesson) {
        return (
            <Layout>
                <Header>
                    <Header.Heading>Обучение</Header.Heading>
                </Header>
                <div className="flex h-full items-center justify-center">
                    <h1>Задание не найдено</h1>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <Header>
                <Header.Heading>Обучение</Header.Heading>
            </Header>
            <div className="hero overflow-hidden" style={{ placeItems: "center" }}>
                <div className="h-full w-full col-span-12 grid grid-cols-2 gap-[1.5rem]">
                    {/* Блок доступа */}
                    {!lesson.is_completed ? (
                        <div className="flex flex-col justify-center items-center gap-[0.75rem] p-[1rem] rounded-[1rem] bg-(--color-white-gray)" style={{ aspectRatio: "16/9", width: "100%" }}>
                            <span className="w-[2.25rem] h-[2.25rem]">
                                <Warning />
                            </span>
                            <h6>Нет доступа</h6>
                            <p className="w-[60%] text-center">Для начала пройдите задание</p>
                        </div>
                    ) : (
                        <div className="flex flex-col justify-center items-center gap-[0.75rem] p-[1rem] rounded-[1rem] bg-(--color-white-gray)" style={{ aspectRatio: "16/9", width: "100%" }}>
                            <h6>Задание доступно</h6>
                            <p className="w-[70%] text-center">Выполните задание и введите ссылку на файл</p>
                        </div>
                    )}

                    {/* Блок описания */}
                    <div className="flex flex-col justify-start items-start gap-[1rem]">
                        <h3>{lesson.lesson_name}</h3>
                        <p>{lesson.description}</p>

                        {submitted ? (
                            <a className="bg-(--color-gray-plus-50) gap-[0.75rem] p-[0.75rem] rounded-[0.75rem] text-(--color-gray-black) flex flex-row align-center">
                                <TimeBefore />
                                Ожидание проверки
                            </a>
                        ) : (
                            <>
                                <div className="flex flex-row gap-[0.75rem] w-full">
                                    <Input type="text" placeholder="Введите ссылку на файл" className="w-full" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
                                    <Button className="!w-fit" inverted disabled={!fileUrl} onClick={handleSubmit}>
                                        Отправить
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
