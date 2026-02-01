import { useRouter } from "next/router";
import { useState, useEffect } from "react";

import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import OrganNotFound from "./not-found";

import Notify from "@/assets/general/notify.svg";
import DelIcon from "@/assets/general/masterBig.svg";
import PersonIcon from "@/assets/general/personsBig.svg";

export default function OrganIndexPage({ goTo, organ }) {
    const router = useRouter();
    const [organInfo, setOrganInfo] = useState(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!organ) return;
        const getOrganInfo = async () => {
            try {

                const res = await fetch(`/api/org/${organ}`, {
                     headers: {
                        Accept: "application/json",
                     },
                     credentials: "include",
                });
                
                const data = await res.json();

                console.log(data)

                if (!data.success || !data.data) {
                    setNotFound(true);
                    return;
                }

                setOrganInfo(data.data);
            } catch (err) {
                console.error("Ошибка получения информации об организации:", err);
                setNotFound(true);
            }
        };

        getOrganInfo();
    }, [organ]);

    if (notFound) return <OrganNotFound goTo={goTo} />;
    if (!organInfo) return <div className="loading">Загрузка...</div>;

    const index = { 
        'automatization': organInfo.automation_a,
        'vzaim': organInfo.knowledge_skills_v,
        'sreda': organInfo.knowledge_skills_z,
        'zashita':organInfo.data_protection_z,
        'dannie': organInfo.data_analytics_d,
        'znaniya':organInfo.digital_env_e,
    }

    const renderStat = (label, key) => (
        <div className="w-full flex items-center gap-[1.25rem]">
            <span className="w-[25%] link big text-(--color-gray-black)">{label}</span>
            <div className="w-full flex items-center gap-[.625rem]">
                <div className="w-full h-[1.375rem] rounded-[.5rem] bg-(--color-gray-plus-50)">
                    <div className="h-[1.375rem] rounded-[.5rem] bg-(--color-gray-plus)" style={{ width: `${index[key] ? (index[key] / 6) * 100 : 0}%` }} />
                </div>
                <div
                    className="flex items-center justify-center link
                    w-[5rem] px-[.875rem] py-[.5rem] rounded-[.625rem]
                    bg-(--color-gray-plus-50) text-(--color-black) small">
                    {index[key]}
                </div>
            </div>
        </div>
    );

    return (
        <>
            <Header>
                <Header.Heading>
                    Организации <span className="text-(--color-gray-black)">/</span> {organInfo.short_name}
                </Header.Heading>
            </Header>

            <div className="hero">
                <div className="flex flex-col gap-[1.25rem] col-span-12">
                    <div className="gap-[1rem] bg-(--color-white-gray) col-span-12 h-fit flex items-center justify-center rounded-[1rem] px-[1rem] py-[.75rem]">
                        {/* Убираем аватарку - кружочек */}
                        {/* <div className="h-[2rem] aspect-square rounded-full bg-(--color-blue-noise)" /> */}
                        <h6>{organInfo.full_name}</h6>
                    </div>

                    <div className="flex gap-[1.25rem]">
                        <div className="w-1/3 gap-[1rem] bg-(--color-white-gray) h-fit flex items-center justify-center rounded-[1rem] px-[1rem] py-[.75rem]">
                            <PersonIcon className="w-[1.375rem] h-[1.375rem] text-(--color-gray-black)" />
                            <h6>{organInfo.members_count} участников</h6>
                        </div>

                        {/* <div className="w-1/3 gap-[1rem] bg-(--color-white-gray) h-fit flex items-center justify-center rounded-[1rem] px-[1rem] py-[.75rem]">
                            <DelIcon className="w-[1.375rem] h-[1.375rem] text-(--color-gray-black)" />
                            <h6 className="text-(--color-gray-white)">Мастерская (скоро)</h6>
                        </div> */}

                        <div className="w-1/3 gap-[1rem] bg-(--color-white-gray) h-fit flex items-center justify-center rounded-[1rem] px-[1rem] py-[.75rem]">
                            <PersonIcon className="w-[1.375rem] h-[1.375rem] text-(--color-gray-black)" />
                            <h6>{organInfo.teams_count} команд</h6>
                        </div>

                         <div className="w-1/3 gap-[1rem] bg-(--color-white-gray) h-fit flex items-center justify-center rounded-[1rem] px-[1rem] py-[.75rem]">
                            <PersonIcon className="w-[1.375rem] h-[1.375rem] text-(--color-gray-black)" />
                            <h6>ИНН:{organInfo.inn}</h6>
                        </div>

                         <div className="w-1/3 gap-[1rem] bg-(--color-white-gray) h-fit flex items-center justify-center rounded-[1rem] px-[1rem] py-[.75rem]">
                            <PersonIcon className="w-[1.375rem] h-[1.375rem] text-(--color-gray-black)" />
                            <h6>Регион: {organInfo.region}</h6>
                        </div>

                         <div className="w-1/3 gap-[1rem] bg-(--color-blue-noise) h-fit flex items-center justify-center rounded-[1rem] px-[1rem] py-[.75rem]">
                            <h6 className="text-(--color-blue)">Индекс {organInfo.star}</h6>
                        </div>
                    </div>
                </div>

                <div className="col-span-12 h-full flex items-end">
                    <div className="gap-[1rem] border-(--color-gray-plus-50) border-[1.5px] w-full flex flex-col rounded-[1rem] p-[1.25rem]">
                        <h6>Звезда организации</h6>
                        <div className="flex flex-col gap-[.5rem]">
                            {renderStat("Знания", "znaniya")}
                            {renderStat("Взаимодействие", "vzaim")}
                            {renderStat("Среда", "sreda")}
                            {renderStat("Защита", "zashita")}
                            {renderStat("Данные", "dannie")}
                            {renderStat("Автоматизация", "automatization")}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
