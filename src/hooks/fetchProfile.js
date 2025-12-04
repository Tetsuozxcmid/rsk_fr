import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clearCookies } from "@/utils/cookies";

export function useProfile() {
    const [data, setData] = useState("");
    const router = useRouter();

    const fetchProfile = useCallback(async () => {
        try {
            const response = await fetch("/api/profile/info", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    clearCookies();
                    router.push("/auth");
                    return;
                }
                throw new Error("Failed to fetch profile");
            }

            const dataRes = await response.json();
            setData(dataRes.data);
            console.log("dataRes", dataRes);
        } catch (err) {
            console.error("Request error:", err);
        }
    }, [router]);

    return { data, fetchProfile };
}
