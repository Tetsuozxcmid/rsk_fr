// helpers.js
import { useState, useEffect } from "react";

export function useDropdownFilter(controlledValue, onChange, src, name, options) {
    const [inputValue, setInputValue] = useState("");
    const [items, setItems] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);

    // 1. Загрузка и нормализация списка (API или текстовый файл)
    useEffect(() => {
        if (options && Array.isArray(options)) {
            const mapped = options.map((opt) => ({
                value: opt.id ?? opt.organization_id ?? opt.value ?? opt,
                label: opt.short_name ?? opt.label ?? opt,
            }));
            setItems(mapped);
        } else if (src) {
            fetch(src)
                .then((res) => res.text())
                .then((text) => {
                    const lines = text
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean);
                    setItems(lines.map((l) => ({ value: l, label: l })));
                });
        }
    }, [options, src]);

    // 2. Синхронизация: установка текстового значения в инпут при получении ID извне
    useEffect(() => {
        if (controlledValue && items.length > 0) {
            const match = items.find((i) => String(i.value) === String(controlledValue));
            if (match) {
                setInputValue(match.label);
            }
        } else if (!controlledValue) {
            setInputValue("");
        }
    }, [controlledValue, items]);

    // 3. Обработка ручного ввода и фильтрация
    const handleInput = (val) => {
        setInputValue(val);
        if (!val) {
            onChange?.({ target: { name, value: "" } });
            setFiltered([]);
            setShowDropdown(false);
            return;
        }
        const matches = items.filter((i) => String(i.label).toLowerCase().includes(val.toLowerCase()));
        setFiltered(matches);
        setShowDropdown(true);
    };

    // 4. Выбор элемента из списка
    const handleSelect = (item) => {
        setInputValue(item.label);
        setShowDropdown(false);
        onChange?.({ target: { name, value: item.value } });
    };

    return {
        inputValue,
        filtered,
        showDropdown,
        setShowDropdown,
        handleInput,
        handleSelect,
    };
}
