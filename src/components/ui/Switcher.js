import React, { Children, cloneElement } from "react";

export default function Switcher({ big, small, className = "", children, value, onChange }) {
    const classes = `switcher ${big ? "big" : small ? "small" : ""} ${className}`;

    const modifiedChildren = Children.map(children, (child) =>
        React.isValidElement(child)
            ? cloneElement(child, {
                  className: `${value === (child.props.value ?? child.key) ? "active" : ""} ${child.props.className ?? ""}`,
                  onClick: child.props.disabled ? (e) => e.preventDefault() : child.props.onClick ? child.props.onClick : () => onChange?.(child.props.value ?? child.key),
              })
            : child
    );

    return <div className={classes}>{modifiedChildren}</div>;
}

Switcher.Option = function Option({ children, value, className = "", disabled, onClick, ...props }) {
    return (
        <span 
            value={value} 
            className={`link option ${className} ${disabled ? "disabled" : ""}`} 
            onClick={disabled ? (e) => { e.preventDefault(); e.stopPropagation(); } : onClick} 
            aria-disabled={disabled}
            style={disabled ? { pointerEvents: 'none', opacity: 0.5, cursor: 'not-allowed' } : {}}
            {...props}
        >
            {children}
        </span>
    );
};

{
    /*
    Пример использования:
    
    import Switcher from '@/components/ui/Switcher';
    
    const [activeTab, setActiveTab] = useState('works');

    <Switcher value={activeTab} onChange={setActiveTab}>
        <Switcher.Option value="works">Работы</Switcher.Option>
        <Switcher.Option value="projects">Проекты</Switcher.Option>
        <Switcher.Option value="tasks">Задачи</Switcher.Option>
    </Switcher>
*/
}
