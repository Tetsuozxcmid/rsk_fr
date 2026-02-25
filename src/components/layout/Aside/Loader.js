export default function AsideLoader() {
    return (
        <aside 
            className="overflow-hidden bg-white max-[640px]:fixed max-[640px]:z-[100] max-[640px]:h-full max-[640px]:left-0 max-[640px]:top-0 max-[640px]:-translate-x-full sm:relative"
            style={{ width: "var(--aside-collapsed)" }} 
        >
        </aside>
    );
}
