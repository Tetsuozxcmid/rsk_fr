import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input/Input";

export default function LoginStage1({ onBack, pageVariants, custom = 1 }) {
    const [email, setEmail] = useState("");
    const [isDisabled, setIsDisabled] = useState(false);
    const [timer, setTimer] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        if (timer > 0) {
            timerRef.current = setTimeout(() => setTimer(timer - 1), 1000);
        } else {
            setIsDisabled(false);
            clearTimeout(timerRef.current);
        }
        return () => clearTimeout(timerRef.current);
    }, [timer]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isDisabled) return;

        setIsDisabled(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email_or_login: email }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Не удалось отправить письмо");

            alert("Письмо для восстановления отправлено. Проверьте почту.");
            setTimer(300); // 5 минут до повторной отправки
        } catch (err) {
            alert("Ошибка: " + err.message);
            setIsDisabled(false);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <motion.div key="login-stage1" custom={custom} initial="initial" animate="in" exit="out" variants={pageVariants} className="auth_cntr col-span-4 absolute w-full h-full justify-center">
            <div className="flex flex-col items-center gap-[0.5rem]">
                <h3>Восстановление пароля</h3>
                <p className="text-(--color-gray-black) text-center">Мы направим вам письмо с ссылкой для восстановление доступа к аккаунту. Письмо можно отправить раз в 5 минут</p>
            </div>
            <form id="recovery" onSubmit={handleSubmit} className="w-full grid grid-cols-1 gap-[0.75rem]">
                <Input type="email" placeholder="Почта или логин" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Button type="submit" className="w-full justify-center" disabled={isDisabled}>
                    Восстановить пароль{isDisabled && ` (${formatTime(timer)})`}
                </Button>
                <Button type="button" inverted className="w-full justify-center" onClick={onBack}>
                    Назад
                </Button>
            </form>
        </motion.div>
    );
}
