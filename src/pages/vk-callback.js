import { useEffect } from "react";

export default function VKCallback() {
    useEffect(() => {
        // Парсим код и device_id из параметров URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const deviceId = params.get("device_id");
        const payload = params.get("payload"); // Иногда бывает payload

        if (window.opener) {
            // Отправляем данные родительскому окну
            window.opener.postMessage(
                {
                    type: "VK_AUTH_SUCCESS",
                    code: code,
                    deviceId: deviceId,
                    payload: payload ? JSON.parse(payload) : null,
                },
                "*" // В идеале указывать точный origin, но для dev "*" ок
            );

            // Закрываем попап
            window.close();
        }
    }, []);

    return (
        <div className="flex items-center justify-center w-full h-screen">
            <p>Авторизация завершена. Закрытие окна...</p>
        </div>
    );
}
