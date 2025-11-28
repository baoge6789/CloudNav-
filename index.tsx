// index.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
// Use the specific client import from importmap
import { createRoot } from 'react-dom/client';
import { Cloud, Home, LayoutDashboard, Settings, Info, Sun, Moon, Monitor, Edit, Trash2, Share2 } from 'lucide-react';

// Define theme mode types
type ThemeMode = 'light' | 'dark' | 'system';

// Long press duration (milliseconds)
const LONG_PRESS_DURATION = 700;

// Main App Component
const App: React.FC = () => {
  // --- 1. Theme Mode Management ---
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    // Check localStorage only if window is defined (client-side)
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('themeMode');
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        return savedMode as ThemeMode;
      }
    }
    return 'system'; // Default to system if no preference or server-side rendering
  });

  // Effect to apply dark mode class to documentElement and save preference
  useEffect(() => {
    const applyTheme = (mode: ThemeMode) => {
      if (mode === 'system') {
        // Check system preference
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else if (mode === 'dark') {
        document.documentElement.classList.add('dark');
      } else { // mode === 'light'
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme(themeMode); // Apply theme on initial load and themeMode change

    // Listen for system theme changes if in 'system' mode
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

    // Save user preference to localStorage
    localStorage.setItem('themeMode', themeMode);

    return () => {
      // Clean up event listener when component unmounts or themeMode changes
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [themeMode]); // Re-run effect when themeMode changes

  // --- 2. Action Buttons Display Logic ---
  const [showActionButtons, setShowActionButtons] = useState(false);
  const [actionButtonPosition, setActionButtonPosition] = useState({ x: 0, y: 0 });
  // Use number | null for setTimeout return value in browser environments
  const longPressTimer = useRef<number | null>(null);
  const interactiveCardRef = useRef<HTMLDivElement>(null); // Reference to the interactive card

  // Function to hide action buttons and clear any pending long press timer
  const hideActionButtons = useCallback(() => {
    setShowActionButtons(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Handle mouse down or touch start event
  const handleInteractionStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    hideActionButtons(); // Hide any previously shown buttons

    // Start a timer for long press
    longPressTimer.current = setTimeout(() => {
      setShowActionButtons(true);
      // Determine position based on event type
      if ('touches' in e && e.touches.length > 0) { // Touch event
        setActionButtonPosition({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      } else if ('clientX' in e) { // Mouse event
        setActionButtonPosition({ x: e.clientX, y: e.clientY });
      }
      longPressTimer.current = null; // Timer has fired, clear reference
    }, LONG_PRESS_DURATION);

    // Prevent default browser behavior for touch events (e.g., text selection, context menu)
    if ('touches' in e) {
      e.preventDefault();
    }
  }, [hideActionButtons]);

  // Handle mouse up or touch end event
  const handleInteractionEnd = useCallback(() => {
    // If timer is still running, it means it was a short press, so clear it
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Handle right-click (context menu) event for PC
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default browser context menu
    hideActionButtons(); // Hide any potential long-press buttons
    setShowActionButtons(true);
    setActionButtonPosition({ x: e.clientX, y: e.clientY });
  }, [hideActionButtons]);

  // Global click/touch event listener to hide action buttons when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      // Check if the click/touch was outside the interactive card and buttons are shown
      if (
        interactiveCardRef.current &&
        !interactiveCardRef.current.contains(event.target as Node) &&
        showActionButtons
      ) {
        // Also check if the click was on the action buttons themselves
        const actionButtonsElement = document.querySelector('.action-buttons-overlay');
        if (actionButtonsElement && actionButtonsElement.contains(event.target as Node)) {
            return; // Don't hide if clicking on the action buttons
        }
        hideActionButtons();
      }
    };

    // Add listeners for both mouse and touch events
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      // Clean up listeners
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showActionButtons, hideActionButtons]); // Re-run effect if showActionButtons or hideActionButtons changes

  // Navigation items for the sidebar
  const navItems = [
    { name: '首页', icon: Home, link: '#' },
    { name: '仪表盘', icon: LayoutDashboard, link: '#' },
    { name: '设置', icon: Settings, link: '#' },
    { name: '关于', icon: Info, link: '#' },
  ];

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
              <li key={item.name}>
                <a
                  href={item.link}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-primary hover:text-white transition-all duration-200 group"
                >
                  <item.icon className="w-5 h-5 text-secondary group-hover:text-white" />
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
            {/* Icon indicating current theme mode */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-slate-200">
              {themeMode === 'light' && <Sun className="h-5 w-5" />}
              {themeMode === 'dark' && <Moon className="h-5 w-5" />}
              {themeMode === 'system' && <Monitor className="h-5 w-5" />}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 bg-gray-50 dark:bg-slate-900 transition-colors duration-300 relative">
        <h2 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-50">欢迎来到云航 CloudNav</h2>

        {/* Interactive Example Card */}
        <div
          ref={interactiveCardRef}
          className="relative bg-white dark:bg-card p-6 rounded-lg shadow-md transition-colors duration-300 cursor-pointer select-none"
          onMouseDown={handleInteractionStart}
          onMouseUp={handleInteractionEnd}
          onMouseLeave={handleInteractionEnd} // Clear timer if mouse leaves before long press
          onTouchStart={handleInteractionStart}
          onTouchEnd={handleInteractionEnd}
          onTouchCancel={handleInteractionEnd} // Handle touch cancellation
          onContextMenu={handleContextMenu} // Handle right-click for PC
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

        {/* Action Buttons Overlay */}
        {showActionButtons && (
          <div
            className="action-buttons-overlay absolute z-50 flex space-x-2 bg-slate-100 dark:bg-slate-700 p-2 rounded-lg shadow-xl"
            style={{ top: actionButtonPosition.y, left: actionButtonPosition.x }}
            // Prevent event propagation to avoid global click listener from immediately hiding buttons
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
