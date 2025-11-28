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
    // State for the click-triggered popover (primarily for mobile)
    const [showClickDescriptionPopover, setShowClickDescriptionPopover] = useState(false);
    const clickButtonRef = useRef<HTMLButtonElement>(null); // Ref for the Info button
    const clickPopoverRef = useRef<HTMLDivElement>(null); // Ref for the click popover

    // State for the hover-triggered popover (primarily for desktop)
    const [showHoverDescriptionPopover, setShowHoverDescriptionPopover] = useState(false);
    const cardRef = useRef<HTMLAnchorElement>(null); // Ref for the entire LinkCard (<a> tag)
    const hoverPopoverRef = useRef<HTMLDivElement>(null); // Ref for the hover popover
    const hoverTimeoutRef = useRef<number | null>(null); // Timeout for hover delay

    // State for popover position (shared for both, calculated based on which is active)
    const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    const longPressTimerRef = useRef<number | null>(null);
    const isLongPressActivatedRef = useRef(false);

    // --- 上下文菜单逻辑 (保持不变) ---
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onShowContextMenu(link, e.clientX, e.clientY);
        setShowClickDescriptionPopover(false); // 关闭点击描述弹窗
        setShowHoverDescriptionPopover(false); // 关闭悬浮描述弹窗
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) { // 仅处理左键点击
            longPressTimerRef.current = setTimeout(() => {
                isLongPressActivatedRef.current = true;
                onShowContextMenu(link, e.clientX, e.clientY);
                setShowClickDescriptionPopover(false);
                setShowHoverDescriptionPopover(false);
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

    const handleMouseLeaveCard = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }
        isLongPressActivatedRef.current = false;

        // For hover popover:
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        setShowHoverDescriptionPopover(false);
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isLongPressActivatedRef.current) {
            e.preventDefault();
            isLongPressActivatedRef.current = false;
        }
        // If it's a normal click on the card itself, close any open popovers
        setShowClickDescriptionPopover(false);
        setShowHoverDescriptionPopover(false);
    };
    // --- 结束上下文菜单逻辑 ---


    // --- Click-triggered Popover Logic (for mobile) ---
    const toggleClickDescriptionPopover = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Stop propagation to prevent card's default click behavior
        setShowClickDescriptionPopover(prev => !prev);
        setShowHoverDescriptionPopover(false); // Ensure hover popover is closed
        closeContextMenu(); // 关闭全局上下文菜单
    };

    // --- Hover-triggered Popover Logic (for desktop) ---
    const handleMouseEnterCard = () => {
        // Only show hover popover on larger screens (desktop)
        if (window.innerWidth >= 640 && link.description) { // 640px is Tailwind's 'sm' breakpoint
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
            hoverTimeoutRef.current = setTimeout(() => {
                setShowHoverDescriptionPopover(true);
                setShowClickDescriptionPopover(false); // Ensure click popover is closed
            }, 300); // 300ms delay for hover
        }
    };

    // --- Shared Popover Positioning Logic ---
    const calculatePopoverPosition = useCallback(() => {
        let triggerRect: DOMRect | null = null;
        let popoverElem: HTMLDivElement | null = null;

        if (showClickDescriptionPopover && clickButtonRef.current && clickPopoverRef.current) {
            triggerRect = clickButtonRef.current.getBoundingClientRect();
            popoverElem = clickPopoverRef.current;
        } else if (showHoverDescriptionPopover && cardRef.current && hoverPopoverRef.current) {
            triggerRect = cardRef.current.getBoundingClientRect();
            popoverElem = hoverPopoverRef.current;
        }

        if (!triggerRect || !popoverElem) return;

        // Force a reflow to get accurate popover dimensions if it's just been rendered
        // (though fixed elements usually yield correct dimensions even if not fully visible yet)
        const popoverRect = popoverElem.getBoundingClientRect();

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 10; // Margin from viewport edges and between elements

        let finalTop = 0;
        let finalLeft = 0;

        // --- Horizontal positioning preference: Right -> Left ---
        let potentialLeftRight = triggerRect.right + margin;
        let potentialLeftLeft = triggerRect.left - popoverRect.width - margin;

        let fitsOnRight = (potentialLeftRight + popoverRect.width) < (viewportWidth - margin);
        let fitsOnLeft = potentialLeftLeft > margin;

        if (fitsOnRight) {
            finalLeft = potentialLeftRight;
        } else if (fitsOnLeft) {
            finalLeft = potentialLeftLeft;
        } else {
            // Not enough space on either side. Try to center or align with trigger, then adjust.
            // Fallback: align with trigger's left, then ensure it's within viewport.
            finalLeft = triggerRect.left;
            if ((finalLeft + popoverRect.width) > (viewportWidth - margin)) {
                finalLeft = viewportWidth - popoverRect.width - margin;
            }
            if (finalLeft < margin) { // Still off-screen or too close to left edge
                finalLeft = margin; // Align with left viewport edge
            }
        }

        // --- Vertical positioning preference: Vertically center with trigger, then adjust to fit viewport ---
        let potentialTopCentered = triggerRect.top + (triggerRect.height / 2) - (popoverRect.height / 2);

        // Adjust if it goes off-screen top
        if (potentialTopCentered < margin) {
            potentialTopCentered = margin;
        }
        // Adjust if it goes off-screen bottom
        if ((potentialTopCentered + popoverRect.height) > (viewportHeight - margin)) {
            potentialTopCentered = viewportHeight - popoverRect.height - margin;
        }
        // If after bottom adjustment, it's still less than margin (e.g., popover is taller than viewport)
        if (potentialTopCentered < margin) {
            potentialTopCentered = margin;
        }

        finalTop = potentialTopCentered;

        setPopoverPosition({ top: finalTop, left: finalLeft });
    }, [showClickDescriptionPopover, showHoverDescriptionPopover, link.description]); // Recalculate if visibility or description changes

    useEffect(() => {
        const isPopoverActive = showClickDescriptionPopover || showHoverDescriptionPopover;
        if (isPopoverActive) {
            const timeoutId = setTimeout(() => {
                calculatePopoverPosition();
            }, 0); // Use setTimeout for next tick to ensure popover is rendered before calculating dimensions

            const handleResizeAndScroll = () => calculatePopoverPosition();
            window.addEventListener('resize', handleResizeAndScroll);
            document.addEventListener('scroll', handleResizeAndScroll, true); // Listen on document for general scroll

            return () => {
                clearTimeout(timeoutId);
                window.removeEventListener('resize', handleResizeAndScroll);
                document.removeEventListener('scroll', handleResizeAndScroll, true);
            };
        }
    }, [showClickDescriptionPopover, showHoverDescriptionPopover, calculatePopoverPosition]);

    // Effect to close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isClickPopoverOpen = showClickDescriptionPopover && clickPopoverRef.current && !clickPopoverRef.current.contains(target) && clickButtonRef.current && !clickButtonRef.current.contains(target);
            const isHoverPopoverOpen = showHoverDescriptionPopover && hoverPopoverRef.current && !hoverPopoverRef.current.contains(target) && cardRef.current && !cardRef.current.contains(target);

            if (isClickPopoverOpen || isHoverPopoverOpen) {
                setShowClickDescriptionPopover(false);
                setShowHoverDescriptionPopover(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showClickDescriptionPopover, showHoverDescriptionPopover]);


    return (
        <a
            ref={cardRef} // Assign ref to the entire card for hover detection
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex items-center gap-3 p-3 bg-card-bg rounded-xl border border-border-default shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            title={link.description || link.url} // 保持原生 title 悬浮提示，与自定义弹窗互不干扰
            onContextMenu={handleContextMenu}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeaveCard} // Combined mouse leave handler
            onMouseEnter={handleMouseEnterCard} // Handle mouse enter for hover popover
            onClick={handleClick} // General click handler for the card
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

            {/* Description Button (visible only on small screens, hidden on desktop) */}
            {link.description && (
                <button
                    ref={clickButtonRef}
                    onClick={toggleClickDescriptionPopover}
                    className="ml-2 p-1 rounded-full text-secondary hover:bg-primary/10 hover:text-primary transition-colors z-10 shrink-0 block sm:hidden" // `block sm:hidden` for mobile only
                    title="查看描述"
                >
                    <Info size={16} />
                </button>
            )}

            {/* Click-triggered Description Popover (for mobile) */}
            {showClickDescriptionPopover && link.description && (
                <div
                    ref={clickPopoverRef}
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

            {/* Hover-triggered Description Popover (for desktop, hidden on mobile) */}
            {showHoverDescriptionPopover && link.description && (
                <div
                    ref={hoverPopoverRef}
                    className="fixed z-[999] bg-card-bg border border-border-default rounded-lg shadow-xl p-3 text-xs text-text-default max-w-xs sm:max-w-sm hidden sm:block" // `hidden sm:block` for desktop only
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
