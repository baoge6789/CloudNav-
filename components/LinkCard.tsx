// src/components/LinkCard.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Info } from 'lucide-react';
import { LinkItem } from '../types';

interface LinkCardProps {
    link: LinkItem;
    onTogglePin: (id: string, e: React.MouseEvent) => void;
    onEdit: (link: LinkItem, e: React.MouseEvent) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
    onShowContextMenu: (link: LinkItem, x: number, y: number) => void;
    closeContextMenu: () => void;
}

const LinkCard: React.FC<LinkCardProps> = ({
    link,
    onTogglePin,
    onEdit,
    onDelete,
    onShowContextMenu,
    closeContextMenu,
}) => {
    const [showDescriptionPopover, setShowDescriptionPopover] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // State for popover position (top and left coordinates relative to viewport)
    const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    const longPressTimerRef = useRef<number | null>(null);
    const isLongPressActivatedRef = useRef(false);

    // --- 上下文菜单逻辑 (保持不变) ---
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onShowContextMenu(link, e.clientX, e.clientY);
        setShowDescriptionPopover(false); // 关闭描述弹窗
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) { // 仅处理左键点击
            longPressTimerRef.current = setTimeout(() => {
                isLongPressActivatedRef.current = true;
                onShowContextMenu(link, e.clientX, e.clientY);
                setShowDescriptionPopover(false); // 关闭描述弹窗
            }, 500); // 500ms 长按
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }
        if (isLongPressActivatedRef.current) {
            e.preventDefault();
            isLongPressActivatedRef.current = false;
        }
    };

    const handleMouseLeave = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }
        isLongPressActivatedRef.current = false;
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isLongPressActivatedRef.current) {
            e.preventDefault();
            isLongPressActivatedRef.current = false;
        }
    };
    // --- 结束上下文菜单逻辑 ---

    // --- 描述弹窗逻辑 ---
    const toggleDescriptionPopover = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowDescriptionPopover(prev => !prev);
        closeContextMenu(); // 关闭全局上下文菜单
    };

    // Calculate popover position dynamically
    const calculatePopoverPosition = useCallback(() => {
        if (buttonRef.current && popoverRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const popoverRect = popoverRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            const margin = 8; // Margin between button and popover, and from viewport edges

            let top = buttonRect.top; // Default: align with button's top
            let left = buttonRect.right + margin; // Default: to the right of the button

            // 1. Check if popover goes off-screen to the right
            if (left + popoverRect.width > viewportWidth - margin) {
                // If it does, try to position it to the left of the button
                left = buttonRect.left - popoverRect.width - margin;
                if (left < margin) { // If it still goes off-screen to the left (or not enough space)
                    // Fallback: position below the button, aligned left
                    left = buttonRect.left;
                    top = buttonRect.bottom + margin;
                    // If positioning below also goes off-screen to the right
                    if (left + popoverRect.width > viewportWidth - margin) {
                        left = viewportWidth - popoverRect.width - margin; // Align right with viewport
                        if (left < margin) left = margin; // Ensure it's not too far left
                    }
                }
            }

            // 2. Ensure popover doesn't go off-screen vertically
            if (top + popoverRect.height > viewportHeight - margin) {
                top = viewportHeight - popoverRect.height - margin;
            }
            if (top < margin) {
                top = margin;
            }

            setPopoverPosition({ top, left });
        }
    }, []);

    useEffect(() => {
        if (showDescriptionPopover) {
            calculatePopoverPosition(); // Calculate initial position

            // Recalculate position on window resize or scroll
            const handleResizeAndScroll = () => calculatePopoverPosition();
            window.addEventListener('resize', handleResizeAndScroll);
            // Use capture phase for scroll to catch events from elements other than window
            window.addEventListener('scroll', handleResizeAndScroll, true);

            return () => {
                window.removeEventListener('resize', handleResizeAndScroll);
                window.removeEventListener('scroll', handleResizeAndScroll, true);
            };
        }
    }, [showDescriptionPopover, calculatePopoverPosition]); // Recalculate when visibility changes or dependencies change

    // Effect to close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setShowDescriptionPopover(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    // --- 结束描述弹窗逻辑 ---

    return (
        <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex items-center gap-3 p-3 bg-card-bg rounded-xl border border-border-default shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            title={link.description || link.url}
            onContextMenu={handleContextMenu}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
        >
            {/* Compact Icon */}
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold uppercase shrink-0">
                {link.icon ? <img src={link.icon} alt={link.title.charAt(0)} className="w-5 h-5"/> : link.title.charAt(0)}
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-text-default truncate group-hover:text-primary transition-colors">
                    {link.title}
                </h3>
            </div>

            {/* Description Button */}
            {link.description && (
                <button
                    ref={buttonRef}
                    onClick={toggleDescriptionPopover}
                    className="ml-2 p-1 rounded-full text-secondary hover:bg-primary/10 hover:text-primary transition-colors z-10 shrink-0"
                    title="查看描述"
                >
                    <Info size={16} />
                </button>
            )}

            {/* Description Popover */}
            {showDescriptionPopover && link.description && (
                <div
                    ref={popoverRef}
                    // Fixed positioning relative to the viewport, high z-index to prevent overlap
                    className="fixed z-[999] bg-card-bg border border-border-default rounded-lg shadow-xl p-3 text-xs text-text-default max-w-xs sm:max-w-sm"
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside popover
                    style={{
                        top: popoverPosition.top,
                        left: popoverPosition.left,
                    }}
                >
                    {link.description}
                </div>
            )}
        </a>
    );
};

export default LinkCard;
