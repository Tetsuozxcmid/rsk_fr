import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import Layout from "@/components/layout/Layout";

import TeamIndexPage from "@/components/pages/teams";
import TeamWorkfolderPage from "@/components/pages/teams/folder";
import TeamSettsPage from "@/components/pages/teams/settings";

import TransitionWrapper from "@/components/layout/TransitionWrapper";
import NotFound from "@/components/pages/teams/not-found";

export default function TeamPage() {
    const router = useRouter();
    let { team } = router.query;
    const [teamData, setTeamData] = useState(null);
    const [notFound, setNotFound] = useState(false);

    const [pageKey, setPageKey] = useState("index");

    useEffect(() => {
        if (!team) return;

        const loadTeam = async () => {
            let teamId = team;

            if (team === "my") {
                try {
                    const response = await fetch("/api/teams/myteam", {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                    });

                    const data = await response.json();
                    if (data.success && data.data.length > 0) {
                        teamId = data.data[0].team.id; // тут уже число
                    } else {
                        console.error("Invalid orgList data:", data);
                        return;
                    }
                } catch (err) {
                    console.error("Request error:", err);
                    return;
                }
            }

            try {
                const response = await fetch(`/api/teams/info/${teamId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                });

                const data = await response.json();
                if (data.success === true) {
                    setTeamData(data.data);
                } else {
                    setNotFound(true);
                }
            } catch (err) {
                console.error("Ошибка при загрузке команды:", err);
                setNotFound(true);
            }
        };

        loadTeam();
    }, [team]);

    const goTo = (pageName) => {
        setPageKey(pageName);
    };

    if (notFound) {
        return (
            <Layout>
                <NotFound />
            </Layout>
        );
    }

    return (
        <Layout>
            <TransitionWrapper currentKey={pageKey}>
                {pageKey === "index" && <TeamIndexPage goTo={goTo} teamData={teamData} />}
                {pageKey === "workfolder" && <TeamWorkfolderPage goTo={goTo} teamData={teamData} />}
                {pageKey === "settings" && <TeamSettsPage goTo={goTo} teamData={teamData} />}
            </TransitionWrapper>
        </Layout>
    );
}
