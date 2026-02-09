import React, { useState } from "react";
import { useRouter } from "next/router";

import Layout from "@/components/layout/Layout";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Notify from "@/assets/general/notify.svg";
import Settings from "@/assets/general/setts.svg";

const SubmitTaskPage = () => {
    const router = useRouter();
    const { id_task, id_project, category } = router.query;
    const [textDescription, setTextDescription] = useState("");
    const [link, setLink] = useState("");
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!textDescription.trim() || !link.trim()) {
            alert("Заполните все поля");
            return;
        }

        if (!category || !id_project || !id_task) return;

        try {
            const res = await fetch(`/api/projects/task/end/${id_task}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    accept: "application/json",
                },
                body: JSON.stringify({
                    text_description: textDescription,
                    result_url: link,
                }),
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(err);
            }

            await res.json();

            router.push(`/projects/${category}/${id_project}/${id_task}/submitted`);
        } catch (e) {
            console.error("Ошибка отправки:", e);
            alert("Не удалось отправить задачу");
        }
    };

    return (
        <Layout>
            <Header>
                <Header.Heading>Проекты / Знания и навыки / Курсы для студентов...</Header.Heading>
                <div className="flex items-center gap-2">
                    <Button icon>
                        <Settings />
                    </Button>
                    <Button icon>
                        <Notify />
                    </Button>
                </div>
            </Header>

            <div className="flex flex-col justify-center items-center p-6 gap-3 w-full flex-1">
                <div className="flex flex-col items-center gap-6 w-1/4">
                    <div className="flex flex-col items-stretch gap-2 w-full">
                        <h3 className="text-center text-(--color-black)">Завершение дела</h3>
                        <p className="text-center text text-(--color-gray-black)">Загрузите результат работы. Это может быть ссылка или текстовое описание того, что изменилось и где это найти</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col items-start gap-3 w-full">
                        <div className="input-wrapper rounded-xl w-full">
                            <textarea required value={textDescription} onChange={(e) => setTextDescription(e.target.value)} className="w-full bg-transparent border-none outline-none resize-none" rows={1} placeholder="Текстовое описание" />
                        </div>

                        <div className="input-wrapper rounded-xl w-full">
                            <input required type="url" value={link} onChange={(e) => setLink(e.target.value)} className="w-full bg-transparent border-none outline-none" placeholder="Ссылка" />
                        </div>

                        <Button type="submit" disabled={!textDescription.trim() || !link.trim()} className="w-full">
                            Завершить
                        </Button>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

export default SubmitTaskPage;
