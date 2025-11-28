// src/components/LinkCard.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Info } from 'lucide-react'; // 确保你安装了 lucide-react，如果没有，可以替换为其他图标或SVG
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
    // 仅用于移动端点击触发的描述弹窗
    const [showDescriptionPopover, setShowDescriptionPopover] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null); // Info 按钮的引用
    const popoverRef = useRef<HTMLDivElement>(null); // 描述弹窗的引用

    // 弹窗位置的状态
    const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    // 新增：判断是否为移动设备的状态
    const [isMobile, setIsMobile] = useState(false);

    // --- 上下文菜单逻辑 (保持不变) ---
    // 用于处理长按和右键菜单
    const longPressTimerRef = useRef<number | null>(null);
    const isLongPressActivatedRef = useRef(false);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onShowContextMenu(link, e.clientX, e.clientY);
        setShowDescriptionPopover(false); // 关闭描述弹窗
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) { // 仅处理左键点击 (或触摸开始)
            longPressTimerRef.current = window.setTimeout(() => {
                isLongPressActivatedRef.current = true;
                onShowContextMenu(link, e.clientX, e.clientY);
                setShowDescriptionPopover(false);
            }, 500); // 500ms 长按
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
        }
        if (isLongPressActivatedRef.current) {
            e.preventDefault(); // 阻止长按后的默认点击行为
            isLongPressActivatedRef.current = false;
        }
    };

    const handleMouseLeaveCard = () => { // 仅用于长按清理
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
        }
        isLongPressActivatedRef.current = false;
    };

    const handleClick = (e: React.MouseEvent) => {
        // 如果是长按激活的点击，则阻止默认行为
        if (isLongPressActivatedRef.current) {
            e.preventDefault();
            isLongPressActivatedRef.current = false;
        }
        // 如果不是长按，且不是点击 Info 按钮，则关闭描述弹窗
        // Info 按钮的点击事件已经通过 e.stopPropagation() 阻止了冒泡
        // 所以这里不需要额外检查 e.target 是否是 Info 按钮
        setShowDescriptionPopover(false);
    };
    // --- 结束上下文菜单逻辑 ---

    // --- 移动端点击触发弹窗逻辑 ---
    const toggleDescriptionPopover = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // 阻止事件冒泡，避免触发卡片的默认点击行为或长按
        setShowDescriptionPopover(prev => !prev);
        closeContextMenu(); // 关闭全局上下文菜单
    };

    // --- 弹窗定位逻辑：确保宽度和位置正确 ---
    const calculatePopoverPosition = useCallback(() => {
        if (!buttonRef.current || !popoverRef.current) return;

        const triggerRect = buttonRef.current.getBoundingClientRect(); // Info 按钮的位置和尺寸
        const popoverElem = popoverRef.current;
        
        // 确保 popoverElem 已经渲染并应用了所有样式后获取其尺寸
        // 这一步非常关键，因为弹窗的宽度可能依赖于内容
        const popoverRect = popoverElem.getBoundingClientRect();

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 16; // 弹窗与视口边缘及触发元素之间的最小间距

        let finalTop = 0;
        let finalLeft = 0;

        // --- 横向定位：优先右侧，其次左侧，最后在视口内居中或对齐 ---
        // 1. 尝试放置在按钮右侧
        let potentialLeftRight = triggerRect.right + margin;
        // 2. 尝试放置在按钮左侧
        let potentialLeftLeft = triggerRect.left - popoverRect.width - margin;

        // 检查是否适合放在右侧
        if (potentialLeftRight + popoverRect.width <= viewportWidth - margin) {
            finalLeft = potentialLeftRight;
        }
        // 如果右侧不适合，检查是否适合放在左侧
        else if (potentialLeftLeft >= margin) {
            finalLeft = potentialLeftLeft;
        }
        // 如果左右两侧都不适合（例如，空间太小或弹窗太宽），则与触发元素左侧对齐，并强制限制在视口内
        else {
            finalLeft = triggerRect.left; // 初始与触发元素左侧对齐
            // 确保不超出视口右侧
            if (finalLeft + popoverRect.width > viewportWidth - margin) {
                finalLeft = viewportWidth - popoverRect.width - margin;
            }
            // 确保不超出视口左侧 (处理弹窗比视口宽的情况)
            if (finalLeft < margin) {
                finalLeft = margin;
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
    }, []); // 依赖项为空，因为内部只使用了 DOM 元素和 window 属性

    // 新增：监听窗口大小变化，判断是否为移动设备
    useEffect(() => {
        const checkMobile = () => {
            // 假设 768px 是移动端断点，与 Tailwind CSS 的 'md' 断点一致
            // 也可以根据实际情况调整这个值
            setIsMobile(window.innerWidth <= 768); 
        };
        checkMobile(); // 首次加载时检查
        window.addEventListener('resize', checkMobile); // 监听窗口大小变化
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // 弹窗显示时，计算其位置
    useEffect(() => {
        if (showDescriptionPopover && isMobile) { // 只有在移动端且弹窗显示时才计算位置
            // 使用一个更长的延迟，确保弹窗内容完全渲染并计算出准确的尺寸
            // 关键：增加延迟到 100ms，以等待浏览器完成布局计算
            const timeoutId = setTimeout(() => {
                calculatePopoverPosition();
            }, 100); 

            // 监听窗口大小调整和页面滚动，以便动态更新弹窗位置
            const handleResizeAndScroll = () => calculatePopoverPosition();
            window.addEventListener('resize', handleResizeAndScroll);
            // 注意：这里监听的是 document 的滚动事件，可以捕获任何可滚动元素的滚动
            document.addEventListener('scroll', handleResizeAndScroll, true); 

            return () => {
                clearTimeout(timeoutId);
                window.removeEventListener('resize', handleResizeAndScroll);
                document.removeEventListener('scroll', handleResizeAndScroll, true);
            };
        }
    }, [showDescriptionPopover, isMobile, calculatePopoverPosition]);

    // 监听点击外部事件，关闭弹窗
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                isMobile && // 仅在移动端处理外部点击关闭弹窗
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
    }, [showDescriptionPopover, isMobile]);


    return (
        <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex items-center gap-3 p-3 bg-card-bg rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
            onContextMenu={handleContextMenu}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeaveCard}
            onClick={handleClick}
            // 如果希望电脑端有默认的 hover 描述，可以在这里添加 title 属性
            // title={!isMobile && link.description ? link.description : undefined}
        >
            {link.iconUrl ? (
                <img src={link.iconUrl} alt="Favicon" className="w-6 h-6 rounded-full flex-shrink-0" />
            ) : (
                <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300 flex-shrink-0">
                    {link.title ? link.title[0].toUpperCase() : 'L'}
                </div>
            )}
            <div className="flex-grow overflow-hidden">
                <h3 className="text-base font-semibold text-text-primary truncate">{link.title}</h3>
                <p className="text-sm text-text-secondary truncate">{link.url}</p>
            </div>

            {/* Pin 按钮 (保持原位，在所有设备上都可见) */}
            <button
                className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-colors duration-200 ${
                    link.isPinned ? 'text-yellow-500 hover:bg-gray-200 dark:hover:bg-gray-700' : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onTogglePin(link.id, e);
                }}
                aria-label={link.isPinned ? "Unpin link" : "Pin link"}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                >
                    <path
                        fillRule="evenodd"
                        d="M12 2.25a.75.75 0 01.75.75v11.69l3.22 3.22a.75.75 0 11-1.06 1.06l-4.5-4.5a.75.75 0 01-1.06 0l-4.5 4.5a.75.75 0 11-1.06-1.06l3.22-3.22V3a.75.75 0 01.75-.75z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>

            {/* Info 按钮 - 仅在移动端显示 */}
            {isMobile && link.description && (
                <button
                    ref={buttonRef} // 绑定 ref
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                    onClick={toggleDescriptionPopover}
                    aria-label="Show description"
                >
                    <Info className="w-4 h-4" />
                </button>
            )}

            {/* 描述弹窗 - 仅在移动端显示 */}
            {isMobile && showDescriptionPopover && link.description && (
                <div
                    ref={popoverRef} // 绑定 ref
                    // 关键样式：max-w-[calc(100vw-32px)] 确保弹窗宽度不会超过视口减去边距，
                    // break-words 确保文本在达到最大宽度时自动换行，实现水平展示
                    className="absolute z-[999] p-3 text-sm bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-[calc(100vw-32px)] text-text-primary break-words"
                    style={{ top: popoverPosition.top, left: popoverPosition.left }}
                >
                    {link.description}
                </div>
            )}
        </a>
    );
};

export default LinkCard;
