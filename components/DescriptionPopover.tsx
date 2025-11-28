// src/components/DescriptionPopover.tsx
import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface DescriptionPopoverProps {
  description: string;
  x: number;
  y: number;
  onClose: () => void;
}

const DescriptionPopover: React.FC<DescriptionPopoverProps> = ({ description, x, y, onClose }) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    // 针对移动设备，也监听 touchstart
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  // 计算 popover 的样式，确保它出现在正确的位置
  const popoverStyle: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 1000,
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-default)',
    borderRadius: '0.5rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    padding: '1rem',
    maxWidth: '300px', // 限制最大宽度
    maxHeight: '200px', // 限制最大高度
    overflowY: 'auto', // 允许内容滚动
    transform: 'translate(-50%, 0)', // 尝试居中对齐 x 轴
  };

  return (
    <div ref={popoverRef} style={popoverStyle} className="text-sm text-text-default">
      <p className="whitespace-pre-wrap">{description}</p>
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 rounded-full text-text-secondary hover:bg-bg-secondary hover:text-primary"
        aria-label="关闭"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default DescriptionPopover;
