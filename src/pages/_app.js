import "@/styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { isAuthorized, saveUserData } from "@/utils/auth";

export default function App({ Component, pageProps }) {
    const router = useRouter();

    useEffect(() => {
        // Проверяем, есть ли сессия с бэкенда после OAuth авторизации
        const syncOAuthSession = async () => {
            // Если уже авторизованы в localStorage, ничего не делаем
            if (isAuthorized()) return;

            try {
                // Пытаемся получить профиль с бэкенда (если есть session cookie)
                const response = await fetch("/api/profile/info", {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                });

                if (response.ok) {
                    const data = await response.json();

                    // Бэкенд вернул профиль = сессия есть!
                    // Сохраняем данные в localStorage
                    const userInfo = {
                        email: data.data.email,
                        username: data.data.NameIRL,
                    };
                    await saveUserData(userInfo);

                    console.log("OAuth session synced:", userInfo);

                    // Редиректим на профиль
                    if (router.pathname === "/auth") {
                        router.push("/profile");
                    }
                }
            } catch (err) {
                // Нет сессии, всё нормально
                console.log("No active session to sync");
            }
        };

        syncOAuthSession();
    }, [router]);

    return (
        <>
            <Component {...pageProps} />
        </>
    );
}
