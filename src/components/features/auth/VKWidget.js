import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Button from "@/components/ui/Button";
import VK from "@/assets/general/vk.svg";

export default function VKWidget() {
    const router = useRouter();
    const containerRef = useRef(null);
    const initialized = useRef(false);

    // Листенер для сообщений от нашего локального callback-окна
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data && event.data.type === "VK_AUTH_SUCCESS") {
                const { code, deviceId, payload } = event.data;
                // Используем полученные данные
                vkidOnSuccess({ code, device_id: deviceId, payload });
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [router]);

    useEffect(() => {
        if (initialized.current) return;

        const loadScript = () => {
            const script = document.createElement("script");
            script.src = "https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js";
            script.async = true;
            script.onload = initializeVK;
            document.body.appendChild(script);
        };

        const initializeVK = () => {
            if ("VKIDSDK" in window) {
                const VKID = window.VKIDSDK;

                VKID.Config.init({
                    app: 54409000,
                    // Используем текущий ориджин + наш callback
                    // ВАЖНО: Этот URL должен быть добавлен в разрешенные в настройках приложения VK
                    redirectUrl: window.location.origin + "/vk-callback",
                    responseMode: VKID.ConfigResponseMode.Callback,
                    source: VKID.ConfigSource.LOWCODE,
                    scope: "",
                    mode: VKID.ConfigAuthMode.InNewWindow,
                });
            }
        };

        loadScript();
        initialized.current = true;
    }, [router]);

    const handleVKLogin = () => {
        if ("VKIDSDK" in window) {
            const VKID = window.VKIDSDK;

            if (VKID.Auth && VKID.Auth.login) {
                // Хак для форсирования открытия в попапе с размерами
                const originalOpen = window.open;

                window.open = (url, target, features) => {
                    const width = 620;
                    const height = 700;
                    const left = (window.screen.width - width) / 2;
                    const top = (window.screen.height - height) / 2;
                    const popupFeatures = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`;
                    return originalOpen.call(window, url, target, popupFeatures);
                };

                // Мы не ждем промис, так как он может не зарезолвиться, если SDK не поймает редирект (т.к. мы его перехватываем своей страницей)
                // Или если он таки поймает - отлично. Но мы полагаемся на наш event listener.
                VKID.Auth.login()
                    .catch(err => console.log("SDK login flow interrupted or error:", err))
                    .finally(() => {
                        window.open = originalOpen;
                    });
            } else {
                alert("Ошибка: SDK не готов");
            }
        } else {
            console.error("VK SDK not loaded yet");
        }
    };

    const vkidOnSuccess = async (data) => {
        // data structure from Auth.login might be different or same (payload)
        // Usually it returns { code, device_id } or similar
        console.log("VK ID Success:", data);

        try {
            // Проверяем структуру: если это объект с code, вызываем exchangeCode
            // Но Auth.login может сразу возвращать результат обмена?
            // Обычно Auth.login вызывает code flow.

            let code = data.code;
            let deviceId = data.device_id;

            // Если данные лежат в payload (как в OneTap событии)
            if (!code && data.payload) {
                code = data.payload.code;
                deviceId = data.payload.device_id;
            }

            if (code && deviceId) {
                const exchangeResult = await window.VKIDSDK.Auth.exchangeCode(code, deviceId);
                // Теперь отправляем на бэк
                await sendToBackend(exchangeResult);
            } else {
                // Если exchangeCode не нужен или уже сделан (маловероятно для Callback режима)
                // Пробуем отправить data как есть, если это уже результат
                await sendToBackend(data);
            }
        } catch (error) {
            console.error("VK Auth Flow Error:", error);
        }
    };

    const sendToBackend = async (data) => {
        try {
            const response = await fetch("/api/auth/vk/callback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });

            if (response.ok) {
                const result = await response.json();
                console.log("Backend auth success:", result);
                if (popupWindow && !popupWindow.closed) popupWindow.close(); // Страховка
                router.push("/"); // Пользователь просил кидать на главную
            } else {
                console.error("Backend auth failed:", response.status);
                alert("Ошибка авторизации VK");
            }
        } catch (error) {
            console.error("VK Callback Error:", error);
        }
    }

    const vkidOnError = (error) => {
        console.error("VK ID Error:", error);
    };

    return (
        <div className="w-full h-full">
            <Button
                inverted
                className="w-full h-full !p-0 gap-[6px] justify-center"
                onClick={handleVKLogin}
            >
                VK ID <VK />
            </Button>
        </div>
    );
}
