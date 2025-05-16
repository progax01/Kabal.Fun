import { ChevronDown } from "lucide-react";
import React, { useEffect } from "react";

function DropDown({
    label,
    children,
    isArrow,
    containerClass,
    grow,
    left,
    top,
    disabled,
}: {
    label: React.ReactNode | string;
    children: (toggle: () => void) => React.ReactNode;
    isArrow?: boolean;
    containerClass?: string;
    grow?: boolean;
    left?: boolean;
    top?: boolean;
    disabled?: boolean;
}) {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const toggle = () => setIsOpen(!isOpen);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
        <div ref={dropdownRef} className={`relative flex items-center gap-x-3 shrink-0 ${grow ? "w-full" : "w-fit"}`}>
            <button
                className={
                    containerClass
                        ? containerClass
                        : `bg-white w-full bg-opacity-20 backdrop-blur-sm text-sm font-bold text-white h-[2.4987rem] px-5 py-2 flex items-center justify-end gap-2 rounded-lg disabled:cursor-not-allowed hover:bg-white/20 disabled:opacity-60`
                }
                onClick={(e) => {
                    e?.preventDefault();
                    toggle();
                }}
                type="button"
                disabled={disabled}
            >
                {label} {isArrow && <ChevronDown className={`size-4 -mr-2 transition-all ${isOpen ? "rotate-180" : ""}`} />}
            </button>
            {isOpen && (
                <div className={`absolute ${top ? "bottom-[calc(100%)] pb-2" : "top-[calc(100%)] pt-2"} transition-all duration-300 ${left ? "left-0" : "right-0"} z-40 sm:w-fit w-full`}>
                    <div className="sm:w-64 w-full h-fit bg-[#2F353A]/80 rounded-lg shadow-[0px_10px_24px_-5px_rgba(19,25,32,1.00)] backdrop-blur-xl flex-col justify-start items-start inline-flex">{children(toggle)}</div>
                </div>
            )}
        </div>
    );
}

function Item({ onClick, children, disabled }: any) {
    return (
        <button
            className="self-stretch px-3.5 sm:py-3 py-4 rounded-md justify-start items-center gap-2 inline-flex hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled}
            onClick={(e) => {
                e?.preventDefault();
                onClick();
            }}
            type="button"
        >
            {children}
        </button>
    );
}
DropDown.Item = Item;

export default DropDown;
