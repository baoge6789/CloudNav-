// src/components/LinkCard.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Info } from 'lucide-react'; // 导入 Info 图标
import { LinkItem } from '../types'; // 确保路径正确

interface LinkCardProps {
    link: LinkItem;
    // 从 App 组件传递下来的上下文菜单相关操作
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
    const buttonRef = useRef<HTMLButtonElement>(null); // 用于定位弹窗

    const longPressTimerRef = useRef<number | null>(null);
    const isLongPressActivatedRef = useRef(false);

    // --- 上下文菜单逻辑 ---
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
            e.preventDefault(); // 如果是长按激活的，阻止默认的点击行为（如跳转链接）
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
            isLongPressActivatedRef.current = false; // 重置
        }
    };
    // --- 结束上下文菜单逻辑 ---

    // --- 描述弹窗逻辑 ---
    const toggleDescriptionPopover = (e: React.MouseEvent) => {
        e.preventDefault(); // 阻止链接跳转
        e.stopPropagation(); // 阻止事件冒泡到卡片，避免触发长按/右键菜单
        setShowDescriptionPopover(prev => !prev);
        closeContextMenu(); // 关闭全局上下文菜单
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // 如果点击发生在弹窗外部或按钮外部，则关闭弹窗
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
            title={link.description || link.url} // 仍然保留原生 title 作为备用或可访问性
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
                    // 定位在按钮右侧，并稍微向下偏移
                    className="absolute z-20 bg-card-bg border border-border-default rounded-lg shadow-lg p-3 text-xs text-text-default max-w-[200px] right-0 top-full mt-1 transform translate-x-1/4"
                    onClick={(e) => e.stopPropagation()} // 防止点击弹窗内部导致关闭
                    style={{
                        // 动态调整位置，使其尽可能在屏幕内显示
                        left: buttonRef.current ? buttonRef.current.offsetLeft : 'auto',
                        top: buttonRef.current ? buttonRef.current.offsetTop + buttonRef.current.offsetHeight + 5 : 'auto',
                        // 简单的右侧定位，如果需要更复杂的屏幕边缘检测和翻转，需要更多逻辑
                        right: 'auto', // 优先使用 left 定位
                        transform: 'none', // 移除默认 transform
                    }}
                >
                    {link.description}
                </div>
            )}
        </a>
    );
};

export default LinkCard;
