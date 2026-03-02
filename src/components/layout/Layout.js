import { useState, createContext, useContext } from "react";
import dynamic from "next/dynamic";
import AsideLoader from "./Aside/Loader";

// 1. Создаем контекст ("рацию"), чтобы Header и Aside могли общаться
export const LayoutContext = createContext();

const Aside = dynamic(() => import("./Aside/Aside"), { ssr: false, loading: () => <AsideLoader /> });

export default function Layout({ children, ...props }) {
    // 2. Стейт для мобильного меню
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <LayoutContext.Provider value={{ isMobileOpen, setIsMobileOpen }}>
            <div className="root-layout overflow-x-clip">
                {/* 3. Передаем управление в Aside */}
                <Aside isMobileOpen={isMobileOpen} closeMobile={() => setIsMobileOpen(false)} />
                <main {...props}>{children}</main>
            </div>
        </LayoutContext.Provider>
    );
}