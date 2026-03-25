import { useEffect, useState } from "react";

import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Setts from "@/assets/general/setts.svg";
import PortalProfileEditor from "@/components/features/auth/PortalProfileEditor";

export default function SettingsPage({ goTo }) {
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const response = await fetch("/api/profile/info", {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                });
                const payload = await response.json().catch(() => ({}));
                if (response.ok) {
                    setUserData(payload);
                }
            } catch (error) {
                console.error("Failed to load profile settings:", error);
            }
        };

        loadProfile();
    }, []);

    if (!userData) {
        return null;
    }

    return (
        <>
            <Header>
                <Header.Heading>
                    {userData.data.NameIRL && userData.data.Surname ? `${userData.data.NameIRL} ${userData.data.Surname}` : "Незаполнено"}
                    <span className="text-(--color-gray-black)">/</span> Настройки
                </Header.Heading>
                <Button icon active onClick={() => goTo("profile")}>
                    <Setts />
                </Button>
            </Header>

            <PortalProfileEditor
                mode="full"
                profilePayload={userData}
                title="Профиль портала"
                description="Эти данные используются в личном кабинете, MAYAK и сертификатах."
                showDescription
                showRole
                submitLabel="Сохранить изменения"
                onSaved={(payload) => {
                    setUserData(payload);
                }}
            />
        </>
    );
}
