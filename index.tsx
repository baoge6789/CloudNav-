// src/index.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Sun, Moon, Monitor, Edit, Trash2, Share2 } from 'lucide-react';

// Define theme mode types
type ThemeMode = 'light' | 'dark' | 'system';

// Long press duration (milliseconds)
const LONG_PRESS_DURATION = 700;

// --- Theme Switcher Component ---
const ThemeSwitcher: React.FC = () => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    // Initialize theme from localStorage or system preference
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('themeMode');
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        return savedMode as ThemeMode;
      }
    }
    return 'system'; // Default to system if nothing saved
  });

  useEffect(() => {
    const applyTheme = (mode: ThemeMode) => {
      if (mode === 'system') {
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else if (mode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme(themeMode); // Apply theme on initial load and themeMode change

    // Listen for system theme changes if current mode is 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (themeMode === 'system') {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    localStorage.setItem('themeMode', themeMode); // Save current theme mode to localStorage

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange); // Clean up listener
    };
  }, [themeMode]); // Re-run effect when themeMode changes

  return (
    <div className="relative">
      <label htmlFor="theme-select" className="sr-only">选择主题模式</label>
      <select
        id="theme-select"
        value={themeMode}
        onChange={(e) => setThemeMode(e.target.value as ThemeMode)}
        className="appearance-none w-full p-3 pr-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
      >
        <option value="light">亮色模式</option>
        <option value="dark">暗色模式</option>
        <option value="system">跟随系统</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-slate-200">
        {themeMode === 'light' && <Sun className="h-5 w-5" />}
        {themeMode === 'dark' && <Moon className="h-5 w-5" />}
        {themeMode === 'system' && <Monitor className="h-5 w-5" />}
      </div>
    </div>
  );
};

// --- Interactive Card Component ---
const InteractiveCard: React.FC = () => {
  const [showActionButtons, setShowActionButtons] = useState(false);
  const [actionButtonPosition, setActionButtonPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const hideActionButtons = useCallback(() => {
    setShowActionButtons(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleInteractionStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    hideActionButtons(); // Hide any existing buttons before starting new interaction

    longPressTimer.current = setTimeout(() => {
      setShowActionButtons(true);
      if ('touches' in e && e.touches.length > 0) {
        // For touch events, use the touch coordinates
        setActionButtonPosition({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      } else if ('clientX' in e) {
        // For mouse events, use mouse coordinates
        setActionButtonPosition({ x: e.clientX, y: e.clientY });
      }
      longPressTimer.current = null;
    }, LONG_PRESS_DURATION);

    if ('touches' in e) {
      e.preventDefault(); // Prevent default browser behavior like scrolling on long press
    }
  }, [hideActionButtons]);

  const handleInteractionEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default browser context menu
    hideActionButtons();
    setShowActionButtons(true);
    setActionButtonPosition({ x: e.clientX, y: e.clientY });
  }, [hideActionButtons]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      // Check if the click/touch was outside the interactive card AND the action buttons themselves
      if (showActionButtons) {
        const actionButtonsElement = document.querySelector('.action-buttons-overlay');
        if (actionButtonsElement && actionButtonsElement.contains(event.target as Node)) {
          return; // Clicked on the action buttons, do not hide
        }
        if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
            hideActionButtons();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showActionButtons, hideActionButtons]);

  return (
    <div
      ref={cardRef}
      className="relative bg-white dark:bg-card p-6 rounded-lg shadow-md transition-colors duration-300 cursor-pointer select-none"
      onMouseDown={handleInteractionStart}
      onMouseUp={handleInteractionEnd}
      onMouseLeave={handleInteractionEnd}
      onTouchStart={handleInteractionStart}
      onTouchEnd={handleInteractionEnd}
      onTouchCancel={handleInteractionEnd}
      onContextMenu={handleContextMenu}
    >
      <p className="text-slate-700 dark:text-slate-200">
        这个卡片是之前讨论的具有长按/右键点击功能的交互式组件。
      </p>
      <p className="mt-4 text-slate-700 dark:text-slate-200">
        **尝试对这个卡片进行：**
        <ul className="list-disc list-inside ml-4 mt-2">
          <li>**电脑端：** 左键长按 (约 0.7 秒) 或 右键点击</li>
          <li>**手机端：** 长按 (约 0.7 秒)</li>
        </ul>
        来显示功能按键。
      </p>

      {/* Action Buttons Overlay */}
      {showActionButtons && (
        <div
          className="action-buttons-overlay absolute z-50 flex space-x-2 bg-slate-100 dark:bg-slate-700 p-2 rounded-lg shadow-xl"
          style={{ top: actionButtonPosition.y, left: actionButtonPosition.x }}
          onMouseDown={(e) => e.stopPropagation()} // Prevent card's onMouseDown from triggering again
          onTouchStart={(e) => e.stopPropagation()} // Prevent card's onTouchStart from triggering again
        >
          <button
            className="p-2 rounded-md hover:bg-primary hover:text-white transition-colors duration-200"
            onClick={() => { alert('编辑功能被点击！'); hideActionButtons(); }}
          >
            <Edit className="w-5 h-5 text-slate-700 dark:text-slate-200 hover:text-white" />
          </button>
          <button
            className="p-2 rounded-md hover:bg-red-500 hover:text-white transition-colors duration-200"
            onClick={() => { alert('删除功能被点击！'); hideActionButtons(); }}
          >
            <Trash2 className="w-5 h-5 text-slate-700 dark:text-slate-200 hover:text-white" />
          </button>
          <button
            className="p-2 rounded-md hover:bg-green-500 hover:text-white transition-colors duration-200"
            onClick={() => { alert('分享功能被点击！'); hideActionButtons(); }}
          >
            <Share2 className="w-5 h-5 text-slate-700 dark:text-slate-200 hover:text-white" />
          </button>
        </div>
      )}
    </div>
  );
};


// --- Render React Components into their respective roots ---

// Render ThemeSwitcher if its mount point exists
const themeSwitcherContainer = document.getElementById('theme-switcher-root');
if (themeSwitcherContainer) {
  const themeSwitcherRoot = createRoot(themeSwitcherContainer);
  themeSwitcherRoot.render(
    <React.StrictMode>
      <ThemeSwitcher />
    </React.StrictMode>
  );
}

// Render InteractiveCard if its mount point exists (e.g., on index.html)
const interactiveCardContainer = document.getElementById('interactive-card-root');
if (interactiveCardContainer) {
  const interactiveCardRoot = createRoot(interactiveCardContainer);
  interactiveCardRoot.render(
    <React.StrictMode>
      <InteractiveCard />
    </React.StrictMode>
  );
}
