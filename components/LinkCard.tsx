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
    // 只有一个状态，用于移动端点击触发的描述弹窗
    const [showDescriptionPopover, setShowDescriptionPopover] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null); // Info 按钮的引用
    const popoverRef = useRef<HTMLDivElement>(null); // 描述弹窗的引用

    // 弹窗位置的状态
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
                setShowDescriptionPopover(false);
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

    const handleMouseLeaveCard = () => { // 仅用于长按清理
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
        // 如果是点击卡片本身，关闭任何打开的弹窗
        setShowDescriptionPopover(false);
    };
    // --- 结束上下文菜单逻辑 ---

    // --- 移动端点击触发弹窗逻辑 ---
    const toggleDescriptionPopover = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // 阻止事件冒泡，避免触发卡片的默认点击行为
        setShowDescriptionPopover(prev => !prev);
        closeContextMenu(); // 关闭全局上下文菜单
    };

    // --- 弹窗定位逻辑 ---
    const calculatePopoverPosition = useCallback(() => {
        if (!buttonRef.current || !popoverRef.current) return;

        const triggerRect = buttonRef.current.getBoundingClientRect(); // Info 按钮的位置和尺寸
        const popoverElem = popoverRef.current;
        const popoverRect = popoverElem.getBoundingClientRect(); // 弹窗的尺寸

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 16; // 弹窗与视口边缘及触发元素之间的最小间距

        let finalTop = 0;
        let finalLeft = 0;

        // --- 横向定位：优先右侧，其次左侧，最后在视口内居中或对齐 ---
        // 尝试放置在按钮右侧
        let potentialLeftRight = triggerRect.right + margin;
        if (potentialLeftRight + popoverRect.width <= viewportWidth - margin) {
            finalLeft = potentialLeftRight;
        } else {
            // 右侧空间不足，尝试放置在按钮左侧
            let potentialLeftLeft = triggerRect.left - popoverRect.width - margin;
            if (potentialLeftLeft >= margin) {
                finalLeft = potentialLeftLeft;
            } else {
                // 左右两侧空间都不足，或者都太紧凑。
                // 默认与按钮左侧对齐，然后强制限制在视口内。
                finalLeft = triggerRect.left;
                // 确保不超出视口右侧
                if (finalLeft + popoverRect.width > viewportWidth - margin) {
                    finalLeft = viewportWidth - popoverRect.width - margin;
                }
                // 确保不超出视口左侧
                if (finalLeft < margin) {
                    finalLeft = margin;
                }
            }
        }

        // --- 垂直定位：与按钮垂直居中，然后强制限制在视口内 ---
        finalTop = triggerRect.top + (triggerRect.height / 2) - (popoverRect.height / 2);

        // 确保不超出视口底部
        if (finalTop + popoverRect.height > viewportHeight - margin) {
            finalTop = viewportHeight - popoverRect.height - margin;
        }
        // 确保不超出视口顶部
        if (finalTop < margin) {
            finalTop = margin;
        }

        setPopoverPosition({ top: finalTop, left: finalLeft });
    }, [showDescriptionPopover]); // 仅当弹窗显示/隐藏状态改变时才重新计算

    useEffect(() => {
        if (showDescriptionPopover) {
            // 确保在弹窗内容渲染完毕后，其尺寸准确时再进行位置计算
            const timeoutId = setTimeout(() => {
                calculatePopoverPosition();
            }, 0);

            // 监听窗口大小调整和页面滚动，以便动态更新弹窗位置
            const handleResizeAndScroll = () => calculatePopoverPosition();
            window.addEventListener('resize', handleResizeAndScroll);
            document.addEventListener('scroll', handleResizeAndScroll, true); // 监听 document 的滚动事件

            return () => {
                clearTimeout(timeoutId);
                window.removeEventListener('resize', handleResizeAndScroll);
                document.removeEventListener('scroll', handleResizeAndScroll, true);
            };
        }
    }, [showDescriptionPopover, calculatePopoverPosition]);

    // 监听点击外部事件，关闭弹窗
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                showDescriptionPopover &&
                popoverRef.current && !popoverRef.current.contains(target) && // 点击不在弹窗内部
                buttonRef.current && !buttonRef.current.contains(target) // 点击不在 Info 按钮内部
            ) {
                setShowDescriptionPopover(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDescriptionPopover]);


    return (
        <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex items-center gap-3 p-3 bg-card-bg rounded-xl border border-border-default shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            title={link.description || link.url} // **关键：完全依赖原生 title 属性进行桌面端悬浮提示**
            onContextMenu={handleContextMenu}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeaveCard} // 仅用于长按清理，不影响桌面悬浮
            onClick={handleClick} // 卡片通用点击处理器
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

            {/* Description Button (仅在小屏幕显示，桌面端隐藏) */}
            {link.description && (
                <button
                    ref={buttonRef}
                    onClick={toggleDescriptionPopover}
                    className="ml-2 p-1 rounded-full text-secondary hover:bg-primary/10 hover:text-primary transition-colors z-10 shrink-0 block sm:hidden" // `block sm:hidden` 确保仅在移动端显示
                    title="查看描述" // 这个 title 仅用于移动端 Info 按钮自身的悬浮提示（如果存在）
                >
                    <Info size={16} />
                </button>
            )}

            {/* 移动端点击触发的描述弹窗 */}
            {showDescriptionPopover && link.description && (
                <div
                    ref={popoverRef}
                    className="fixed z-[999] bg-card-bg border border-border-default rounded-lg shadow-xl p-3 text-xs text-text-default max-w-[calc(100vw-32px)]" // **关键：调整最大宽度，确保横向展示**
                    onClick={(e) => e.stopPropagation()} // 阻止点击弹窗内部时关闭弹窗
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
