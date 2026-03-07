"use client";

import { useState } from "react";

import Layout from "@/components/layout/Layout";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input/Input";
import Switcher from "@/components/ui/Switcher";

import Notify from "@/assets/general/notify.svg";

export default function AdminRolePage() {
    const [username, setUsername] = useState("");
    const [role, setRole] = useState("student");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleSubmit = async () => {
        if (!username) {
            setMessage({ type: "error", text: "Введите username пользователя" });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch("/api/admin/change-role", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    username,
                    role,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Ошибка изменения роли");
            }

            setMessage({
                type: "success",
                text: `Роль пользователя ${username} успешно изменена на ${role}`,
            });

            setUsername("");
        } catch (err) {
            setMessage({
                type: "error",
                text: err.message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <Header>
                <Header.Heading>Изменение роли</Header.Heading>
                <Button icon>
                    <Notify />
                </Button>
            </Header>

            <div className="hero">
                <div className="col-start-4 col-end-10 flex flex-col gap-[1rem]">
                    <div className="flex flex-col gap-[.5rem]">
                        <h6>Username пользователя</h6>
                        <Input type="text" placeholder="Введите username" value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>

                    <div className="flex flex-col gap-[.5rem]">
                        <h6>Роль</h6>

                        <Switcher value={role} onChange={setRole}>
                            <Switcher.Option value="student">Student</Switcher.Option>
                            <Switcher.Option value="teacher">Teacher</Switcher.Option>
                            <Switcher.Option value="moder">Moder</Switcher.Option>
                            <Switcher.Option value="admin">Admin</Switcher.Option>
                        </Switcher>
                    </div>

                    <Button onClick={handleSubmit} disabled={loading}>
                        Изменить
                    </Button>

                    {message && <div className={`rounded-[.5rem] px-[1rem] py-[.75rem] text-sm ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{message.text}</div>}
                </div>
            </div>
        </Layout>
    );
}
