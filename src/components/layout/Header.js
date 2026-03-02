import { useContext } from "react";
import { LayoutContext } from "./Layout"; // Импортируем нашу "рацию"
import dynamic from "next/dynamic";

const Burger = dynamic(() => import("@/assets/nav/burger.svg"));

export default function Header({ children, ...props }) {
    const { setIsMobileOpen } = useContext(LayoutContext);

    return (
        <header {...props} className={`flex items-center gap-[0.625rem] p-[1.125rem] ${props.className}`}>
            <div 
                onClick={() => setIsMobileOpen(true)}
                className="hidden max-[640px]:flex p-2 bg-(--color-gray-light) rounded-xl cursor-pointer items-center justify-center mr-2"
            >
                <Burger className="w-[1.25rem] h-[1.25rem]" />
            </div>
            
            {children}
        </header>
    );
}

// Heading оставляем как есть
Header.Heading = function Heading({ children, ...props }) {
    return (
        <h5 className={`flex gap-[0.25rem] items-center ${props.className}`} {...props}>
            {children}
        </h5>
    );
};