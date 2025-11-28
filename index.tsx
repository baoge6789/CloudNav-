import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// 假设您已经安装了 lucide-react，如果没有，请安装：npm install lucide-react
import { Sun, Moon } from 'lucide-react'; 

// 定义所有主题，与 FOUC 脚本中的定义保持一致
const allThemes = [
    { class: 'light-theme-default', name: '默认光线模式', isDark: false },
    { class: 'light-theme-warm', name: '暖色光线模式', isDark: false },
    { class: 'light-theme-cool', name: '冷色光线模式', isDark: false },
    { class: 'light-theme-minimal', name: '极简光线模式', isDark: false },
    { class: 'light-theme-soft', name: '柔和光线模式', isDark: false },
    { class: 'dark', name: '深色模式', isDark: true },
];

// 辅助函数：获取当前主题的索引
const getCurrentThemeIndex = () => {
    const storedTheme = localStorage.getItem('theme');
    let initialThemeClass = allThemes[0].class;
    if (storedTheme) {
        const foundTheme = allThemes.find(theme => theme.class === storedTheme);
        if (foundTheme) {
            initialThemeClass = storedTheme;
        }
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        initialThemeClass = 'dark';
    }
    return allThemes.findIndex(theme => theme.class === initialThemeClass);
};

const App = () => {
    const [currentThemeIndex, setCurrentThemeIndex] = useState(getCurrentThemeIndex());

    // 每次 currentThemeIndex 变化时，更新 <html> 元素上的类和 localStorage
    useEffect(() => {
        const currentTheme = allThemes[currentThemeIndex];
        // 移除所有主题类
        allThemes.forEach(theme => document.documentElement.classList.remove(theme.class));
        // 添加当前主题类
        document.documentElement.classList.add(currentTheme.class);
        localStorage.setItem('theme', currentTheme.class);
    }, [currentThemeIndex]);

    const toggleTheme = () => {
        setCurrentThemeIndex(prevIndex => (prevIndex + 1) % allThemes.length);
    };

    const currentTheme = allThemes[currentThemeIndex];

    return (
        <div className="min-h-screen p-8">
            {/* 模拟的导航栏或头部区域 */}
            <header className="flex justify-between items-center bg-card-bg p-4 rounded-lg shadow-md border border-border-default mb-8">
                <h1 className="text-2xl font-bold text-primary">云航 CloudNav</h1>
                {/* 您的 "光线模式/添加书签" 按钮 */}
                <button 
                    onClick={toggleTheme}
                    className="flex items-center px-4 py-2 rounded-md bg-primary text-white hover:bg-opacity-90 transition-colors shadow-md"
                >
                    {currentTheme.isDark ? (
                        <Sun className="w-5 h-5 mr-2" /> // 深色模式显示太阳图标
                    ) : (
                        <Moon className="w-5 h-5 mr-2" /> // 光线模式显示月亮图标
                    )}
                    添加书签 / 光线模式
                </button>
            </header>

            <main className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-primary mb-6">我的书签</h2>
                <p className="text-secondary mb-8">
                    当前主题：<span className="font-medium text-primary">{currentTheme.name}</span>。
                    点击“添加书签 / 光线模式”按钮查看不同主题效果。
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* 示例书签卡片 1 */}
                    <div className="bg-card-bg p-6 rounded-lg shadow-md border border-border-default">
                        <h3 className="text-xl font-semibold text-primary mb-2">Google 搜索</h3>
                        <p className="text-secondary mb-4">全球领先的搜索引擎，快速查找信息。</p>
                        <a href="https://google.com" target="_blank" className="inline-block px-4 py-2 bg-accent text-white rounded-md hover:opacity-90 transition-opacity">访问网站</a>
                    </div>

                    {/* 示例书签卡片 2 */}
                    <div className="bg-card-bg p-6 rounded-lg shadow-md border border-border-default">
                        <h3 className="text-xl font-semibold text-primary mb-2">GitHub 代码托管</h3>
                        <p className="text-secondary mb-4">开发者社区和代码协作平台。</p>
                        <a href="https://github.com" target="_blank" className="inline-block px-4 py-2 bg-accent text-white rounded-md hover:opacity-90 transition-opacity">访问网站</a>
                    </div>

                    {/* 示例书签卡片 3 */}
                    <div className="bg-card-bg p-6 rounded-lg shadow-md border border-border-default">
                        <h3 className="text-xl font-semibold text-primary mb-2">Tailwind CSS</h3>
                        <p className="text-secondary mb-4">一个实用至上的 CSS 框架，用于快速构建自定义 UI。</p>
                        <a href="https://tailwindcss.com" target="_blank" className="inline-block px-4 py-2 bg-accent text-white rounded-md hover:opacity-90 transition-opacity">访问网站</a>
                    </div>
                </div>

                {/* 其他面板内容示例 */}
                <div className="mt-8 p-6 bg-card-bg rounded-lg shadow-md border border-border-default">
                    <h3 className="text-xl font-semibold text-primary mb-3">设置面板</h3>
                    <p className="text-secondary mb-4">这是一个模拟的设置区域，其颜色也会随主题变化。</p>
                    <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                            <input type="checkbox" className="form-checkbox h-5 w-5 text-primary rounded" defaultChecked />
                            <span className="ml-2 text-text-default">启用通知</span>
                        </label>
                        <button className="px-4 py-2 rounded-md bg-primary text-white hover:opacity-90 transition-opacity">保存设置</button>
                        <button className="px-4 py-2 rounded-md bg-secondary text-white hover:opacity-90 transition-opacity">取消</button>
                    </div>
                </div>
            </main>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
