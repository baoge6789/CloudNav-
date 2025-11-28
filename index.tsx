// index.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Cloud, Home, LayoutDashboard, Settings, Info, Sun, Moon, Monitor, Edit, Trash2, Share2 } from 'lucide-react';

// Define theme mode types
type ThemeMode = 'light' | 'dark' | 'system';

// Define page keys for navigation
type PageKey = 'home' | 'dashboard' | 'settings' | 'about';

// Long press duration (milliseconds)
const LONG_PRESS_DURATION = 700;

// Main App Component
const App: React.FC = () => {
  // --- 1. Theme Mode Management ---
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('themeMode');
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        return savedMode as ThemeMode;
      }
    }
    return 'system';
  });

  // Effect to apply dark mode class to documentElement and save preference
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

    applyTheme(themeMode);

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
    localStorage.setItem('themeMode', themeMode);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [themeMode]);

  // --- 2. Navigation Management ---
  const [currentPage, setCurrentPage] = useState<PageKey>('home'); // Default to 'home' page

  // Navigation items for the sidebar
  const navItems = [
    { name: '首页', icon: Home, pageKey: 'home' as PageKey },
    { name: '仪表盘', icon: LayoutDashboard, pageKey: 'dashboard' as PageKey },
    { name: '设置', icon: Settings, pageKey: 'settings' as PageKey },
    { name: '关于', icon: Info, pageKey: 'about' as PageKey },
  ];

  // --- 3. Action Buttons Display Logic ---
  const [showActionButtons, setShowActionButtons] = useState(false);
  const [actionButtonPosition, setActionButtonPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<number | null>(null);
  const interactiveCardRef = useRef<HTMLDivElement>(null);

  const hideActionButtons = useCallback(() => {
    setShowActionButtons(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleInteractionStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    hideActionButtons();

    longPressTimer.current = setTimeout(() => {
      setShowActionButtons(true);
      if ('touches' in e && e.touches.length > 0) {
        setActionButtonPosition({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      } else if ('clientX' in e) {
        setActionButtonPosition({ x: e.clientX, y: e.clientY });
      }
      longPressTimer.current = null;
    }, LONG_PRESS_DURATION);

    if ('touches' in e) {
      e.preventDefault();
    }
  }, [hideActionButtons]);

  const handleInteractionEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
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
        if (interactiveCardRef.current && !interactiveCardRef.current.contains(event.target as Node)) {
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
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-card text-slate-700 dark:text-slate-200 shadow-lg flex flex-col p-4 transition-colors duration-300">
        {/* Logo and Title */}
        <div className="flex items-center space-x-2 mb-8 mt-2">
          <Cloud className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-50">云航 CloudNav</h1>
        </div>

        {/* Navigation Links */}
        <nav className="flex-grow">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.pageKey}>
                <a
                  href="#" // Keep href="#" to prevent full page reload, handle navigation via onClick
                  onClick={(e) => {
                    e.preventDefault(); // Prevent default anchor behavior
                    setCurrentPage(item.pageKey);
                    hideActionButtons(); // Hide action buttons if visible when navigating
                  }}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 group ${
                    currentPage === item.pageKey ? 'bg-primary text-white' : 'hover:bg-primary hover:text-white'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${currentPage === item.pageKey ? 'text-white' : 'text-secondary group-hover:text-white'}`} />
                  <span className="text-lg">{item.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Theme Mode Selector (Dropdown) */}
        <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
          <label htmlFor="theme-select" className="sr-only">选择主题模式</label>
          <div className="relative">
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
        </div>
      </aside>

      {/* Main Content Area - Conditionally rendered based on currentPage */}
      <main className="flex-1 p-8 bg-gray-50 dark:bg-slate-900 transition-colors duration-300 relative overflow-visible">
        {currentPage === 'home' && (
          <>
            <h2 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-50">欢迎来到云航 CloudNav</h2>
            {/* Interactive Example Card - Only on Home Page */}
            <div
              ref={interactiveCardRef}
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
                这是一个基于 React 和 Tailwind CSS 构建的导航应用示例。
                您可以点击左侧的导航链接，或者切换亮色/暗色模式。
              </p>
              <p className="mt-4 text-slate-700 dark:text-slate-200">
                **尝试对这个卡片进行：**
                <ul className="list-disc list-inside ml-4 mt-2">
                  <li>**电脑端：** 左键长按 (约 0.7 秒) 或 右键点击</li>
                  <li>**手机端：** 长按 (约 0.7 秒)</li>
                </ul>
                来显示功能按键。
              </p>
            </div>
          </>
        )}

        {currentPage === 'dashboard' && (
          <>
            <h2 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-50">仪表盘</h2>
            <p className="text-slate-700 dark:text-slate-200">这里是仪表盘的详细内容。</p>
            <p className="mt-4 text-slate-700 dark:text-slate-200">你可以在这里放置图表、数据概览等。</p>
          </>
        )}

        {currentPage === 'settings' && (
          <>
            <h2 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-50">设置</h2>
            <p className="text-slate-700 dark:text-slate-200">这里是设置页面的选项，例如用户偏好、通知设置等。</p>
            <p className="mt-4 text-slate-700 dark:text-slate-200">你可以添加各种表单元素来管理应用设置。</p>
          </>
        )}

        {currentPage === 'about' && (
          <>
            <h2 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-50">关于云航</h2>
            <p className="text-slate-700 dark:text-slate-200">云航 CloudNav 是一个旨在提供高效、便捷导航体验的应用。</p>
            <p className="mt-4 text-slate-700 dark:text-slate-200">版本：1.0.0</p>
          </>
        )}

        {/* Action Buttons Overlay - Only show if on 'home' page and triggered */}
        {showActionButtons && currentPage === 'home' && (
          <div
            className="action-buttons-overlay absolute z-50 flex space-x-2 bg-slate-100 dark:bg-slate-700 p-2 rounded-lg shadow-xl"
            style={{ top: actionButtonPosition.y, left: actionButtonPosition.x }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
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
      </main>
    </div>
  );
};

// Render the App component into the root div
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
