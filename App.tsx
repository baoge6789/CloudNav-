import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Plus, Upload, Moon, Sun, Menu,
  Trash2, Edit2, Loader2, Cloud, CheckCircle2, AlertCircle,
  Pin, Settings, Lock, CloudCog, Github, GitFork
} from 'lucide-react';
// 确保这些路径和类型定义是正确的
import { LinkItem, Category, DEFAULT_CATEGORIES, INITIAL_LINKS, WebDavConfig, AIConfig } from './types';
import { parseBookmarks } from './services/bookmarkParser'; // 确保这个服务存在
import Icon from './components/Icon'; // 确保这个组件存在
import LinkModal from './components/LinkModal';
import AuthModal from './components/AuthModal';
import CategoryManagerModal from './components/CategoryManagerModal';
import BackupModal from './components/BackupModal';
import CategoryAuthModal from './components/CategoryAuthModal';
import ImportModal from './components/ImportModal';
import SettingsModal from './components/SettingsModal';

// --- 配置项 ---
const GITHUB_REPO_URL = 'https://github.com/sese972010/CloudNav-';
const LOCAL_STORAGE_KEY = 'cloudnav_data_cache';
const AUTH_KEY = 'cloudnav_auth_token';
const WEBDAV_CONFIG_KEY = 'cloudnav_webdav_config';
const AI_CONFIG_KEY = 'cloudnav_ai_config';

// --- 关键：定义所有可用的主题 ---
// 这个数组必须与您的 `index.html` 中 FOUC 脚本里的 `allThemes` 定义完全一致！
// 任何不匹配都可能导致主题切换异常。
const allThemes = [
  { class: 'light-theme-default', name: '默认光线模式', isDark: false },
  { class: 'light-theme-warm', name: '暖色光线模式', isDark: false },
  { class: 'light-theme-cool', name: '冷色光线模式', isDark: false },
  { class: 'light-theme-minimal', name: '极简光线模式', isDark: false },
  { class: 'light-theme-soft', name: '柔和光线模式', isDark: false },
  { class: 'dark', name: '深色模式', isDark: true },
];

function App() {
  // --- State ---
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // --- 主题状态：存储当前激活的主题的 CSS 类名 ---
  const [currentThemeClass, setCurrentThemeClass] = useState(() => {
    // 页面初次加载时，FOUC 脚本已经在 `<html>` 元素上设置了正确的主题类。
    // 我们在这里读取它作为初始状态，确保 React 应用与页面初始主题同步。
    const htmlClasses = document.documentElement.className.split(' ');
    const activeTheme = allThemes.find(theme => htmlClasses.includes(theme.class));
    // 如果因某种原因没有找到匹配的主题（理论上不应该发生），则回退到第一个主题。
    return activeTheme ? activeTheme.class : allThemes[0].class;
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Category Security State
  const [unlockedCategoryIds, setUnlockedCategoryIds] = useState<Set<string>>(new Set());

  // WebDAV Config State
  const [webDavConfig, setWebDavConfig] = useState<WebDavConfig>(() => {
      const saved = localStorage.getItem(WEBDAV_CONFIG_KEY);
      if (saved) {
          try { return JSON.parse(saved); } catch (e) { console.error("Failed to parse WebDAV config from localStorage", e); }
      }
      return { url: '', username: '', password: '', enabled: false };
  });

  // AI Config State
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
      const saved = localStorage.getItem(AI_CONFIG_KEY);
      if (saved) {
          try { return JSON.parse(saved); } catch (e) { console.error("Failed to parse AI config from localStorage", e); }
      }
      return {
          provider: 'gemini',
          apiKey: process.env.API_KEY || '', // 确保您的构建环境正确注入了 API_KEY
          baseUrl: '',
          model: 'gemini-2.5-flash'
      };
  });

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [catAuthModalData, setCatAuthModalData] = useState<Category | null>(null);

  const [editingLink, setEditingLink] = useState<LinkItem | undefined>(undefined);
  const [prefillLink, setPrefillLink] = useState<Partial<LinkItem> | undefined>(undefined);

  // Sync State
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [authToken, setAuthToken] = useState<string>('');

  // --- Helpers & Sync Logic ---

  const loadFromLocal = () => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setLinks(parsed.links || INITIAL_LINKS);
        setCategories(parsed.categories || DEFAULT_CATEGORIES);
      } catch (e) {
        console.error("Failed to parse local storage data, falling back to defaults.", e);
        setLinks(INITIAL_LINKS);
        setCategories(DEFAULT_CATEGORIES);
      }
    } else {
      setLinks(INITIAL_LINKS);
      setCategories(DEFAULT_CATEGORIES);
    }
  };

  const syncToCloud = async (newLinks: LinkItem[], newCategories: Category[], token: string) => {
    setSyncStatus('saving');
    try {
        const response = await fetch('/api/storage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-password': token
            },
            body: JSON.stringify({ links: newLinks, categories: newCategories })
        });

        if (response.status === 401) {
            setAuthToken('');
            localStorage.removeItem(AUTH_KEY);
            setIsAuthOpen(true);
            setSyncStatus('error');
            alert('认证失败，请重新登录。'); // 用户友好提示
            return false;
        }

        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);

        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 2000);
        return true;
    } catch (error) {
        console.error("Sync failed", error);
        setSyncStatus('error');
        alert(`数据同步失败: ${error instanceof Error ? error.message : String(error)}`); // 用户友好提示
        return false;
    }
  };

  const updateData = (newLinks: LinkItem[], newCategories: Category[]) => {
      // 1. Optimistic UI Update
      setLinks(newLinks);
      setCategories(newCategories);

      // 2. Save to Local Cache
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ links: newLinks, categories: newCategories }));

      // 3. Sync to Cloud (if authenticated)
      if (authToken) {
          syncToCloud(newLinks, newCategories, authToken);
      }
  };

  // --- Effects ---

  useEffect(() => {
    // 加载认证 Token
    const savedToken = localStorage.getItem(AUTH_KEY);
    if (savedToken) setAuthToken(savedToken);

    // 处理书签小工具的 URL 参数
    const urlParams = new URLSearchParams(window.location.search);
    const addUrl = urlParams.get('add_url');
    if (addUrl) {
        const addTitle = urlParams.get('add_title') || '';
        // 清理 URL 参数，避免刷新时重复触发
        window.history.replaceState({}, '', window.location.pathname);

        setPrefillLink({
            title: addTitle,
            url: addUrl,
            categoryId: 'common' // 默认分类，弹窗会允许用户选择
        });
        setEditingLink(undefined);
        setIsModalOpen(true);
    }

    // 初始化数据获取：优先从云端，其次本地存储
    const initData = async () => {
        try {
            const res = await fetch('/api/storage');
            if (res.ok) {
                const data = await res.json();
                if (data.links && data.links.length > 0) {
                    setLinks(data.links);
                    setCategories(data.categories || DEFAULT_CATEGORIES);
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
                    return; // 数据已从云端加载
                }
            }
        } catch (e) {
            console.warn("Failed to fetch from cloud, falling back to local storage.", e);
        }
        // 如果云端失败或没有数据，则从本地加载
        loadFromLocal();
    };

    initData();
  }, []); // 依赖数组为空，只在组件挂载时运行一次

  // --- 关键 useEffect：监听 currentThemeClass 变化，更新 localStorage 和 <html> 上的类 ---
  useEffect(() => {
    // 1. 更新 localStorage，以便用户下次访问时能记住主题
    localStorage.setItem('theme', currentThemeClass);

    // 2. 更新 <html> 元素上的 CSS 类，实际改变主题样式
    // 遍历所有可能的主题类，先移除它们，确保 <html> 上只有一个主题类处于激活状态
    allThemes.forEach(theme => document.documentElement.classList.remove(theme.class));
    // 添加当前激活的主题类
    document.documentElement.classList.add(currentThemeClass);
  }, [currentThemeClass]); // 仅当 currentThemeClass 变化时运行

  // --- 主题切换函数 ---
  const toggleTheme = () => {
    const currentIndex = allThemes.findIndex(theme => theme.class === currentThemeClass);
    // 循环到下一个主题，如果到末尾则回到第一个
    const nextIndex = (currentIndex + 1) % allThemes.length;
    setCurrentThemeClass(allThemes[nextIndex].class);
  };

  // --- 派生状态：用于判断是否是深色模式，以显示正确的图标（月亮/太阳） ---
  const isDarkMode = allThemes.find(theme => theme.class === currentThemeClass)?.isDark || false;

  // --- Actions ---

  const handleLogin = async (password: string): Promise<boolean> => {
      try {
        const response = await fetch('/api/storage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-password': password
            },
            body: JSON.stringify({ links, categories }) // 登录时也尝试同步当前数据
        });

        if (response.ok) {
            setAuthToken(password);
            localStorage.setItem(AUTH_KEY, password);
            setIsAuthOpen(false);
            setSyncStatus('saved');
            alert('登录成功并已同步数据！');
            return true;
        }
        alert('登录失败，密码不正确或服务器错误。');
        return false;
      } catch (e) {
          console.error("Login failed", e);
          alert(`登录请求失败: ${e instanceof Error ? e.message : String(e)}`);
          return false;
      }
  };

  const handleImportConfirm = (newLinks: LinkItem[], newCategories: Category[]) => {
      // 合并分类：避免重复的名称/ID
      const mergedCategories = [...categories];
      newCategories.forEach(nc => {
          if (!mergedCategories.some(c => c.id === nc.id || c.name === nc.name)) {
              mergedCategories.push(nc);
          }
      });

      const mergedLinks = [...links, ...newLinks];
      updateData(mergedLinks, mergedCategories);
      setIsImportModalOpen(false);
      alert(`成功导入 ${newLinks.length} 个新书签!`);
  };

  const handleAddLink = (data: Omit<LinkItem, 'id' | 'createdAt'>) => {
    if (!authToken) { setIsAuthOpen(true); return; }
    const newLink: LinkItem = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now()
    };
    updateData([newLink, ...links], categories);
    setPrefillLink(undefined); // 清除预填充数据
  };

  const handleEditLink = (data: Omit<LinkItem, 'id' | 'createdAt'>) => {
    if (!authToken) { setIsAuthOpen(true); return; }
    if (!editingLink) return;
    const updated = links.map(l => l.id === editingLink.id ? { ...l, ...data } : l);
    updateData(updated, categories);
    setEditingLink(undefined);
  };

  const handleDeleteLink = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!authToken) { setIsAuthOpen(true); return; }
    if (confirm('确定删除此链接吗?')) {
      updateData(links.filter(l => l.id !== id), categories);
    }
  };

  const togglePin = (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!authToken) { setIsAuthOpen(true); return; }
      const updated = links.map(l => l.id === id ? { ...l, pinned: !l.pinned } : l);
      updateData(updated, categories);
  };

  const handleSaveAIConfig = (config: AIConfig) => {
      setAiConfig(config);
      localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
      alert('AI 配置已保存！');
  };

  // --- Category Management & Security ---

  const handleCategoryClick = (cat: Category) => {
      // 如果分类有密码且未解锁
      if (cat.password && !unlockedCategoryIds.has(cat.id)) {
          setCatAuthModalData(cat);
          setSidebarOpen(false);
          return;
      }
      setSelectedCategory(cat.id);
      setSidebarOpen(false);
  };

  const handleUnlockCategory = (catId: string) => {
      setUnlockedCategoryIds(prev => new Set(prev).add(catId));
      setSelectedCategory(catId);
      setCatAuthModalData(null); // 解锁后关闭弹窗
  };

  const handleUpdateCategories = (newCats: Category[]) => {
      if (!authToken) { setIsAuthOpen(true); return; }
      updateData(links, newCats);
      alert('分类已更新！');
  };

  const handleDeleteCategory = (catId: string) => {
      if (!authToken) { setIsAuthOpen(true); return; }
      if (!confirm('确定删除此分类吗？该分类下的链接将被移动到“常用”分类。')) return;

      const newCats = categories.filter(c => c.id !== catId);
      // 将被删除分类下的链接移动到 'common' 分类
      const targetId = 'common';
      const newLinks = links.map(l => l.categoryId === catId ? { ...l, categoryId: targetId } : l);

      // 确保 'common' 分类始终存在
      if (newCats.length === 0) {
          newCats.push(DEFAULT_CATEGORIES[0]);
      }

      updateData(newLinks, newCats);
      alert('分类已删除！');
  };

  // --- WebDAV Config ---
  const handleSaveWebDavConfig = (config: WebDavConfig) => {
      setWebDavConfig(config);
      localStorage.setItem(WEBDAV_CONFIG_KEY, JSON.stringify(config));
      alert('WebDAV 配置已保存！');
  };

  const handleRestoreBackup = (restoredLinks: LinkItem[], restoredCategories: Category[]) => {
      updateData(restoredLinks, restoredCategories);
      setIsBackupModalOpen(false);
      alert('数据已成功恢复！');
  };

  // --- Filtering & Memo ---

  // 辅助函数：检查分类是否“锁定”（有密码且未解锁）
  const isCategoryLocked = (catId: string) => {
      const cat = categories.find(c => c.id === catId);
      if (!cat || !cat.password) return false;
      return !unlockedCategoryIds.has(catId);
  };

  const pinnedLinks = useMemo(() => {
      // 不显示属于锁定分类的置顶链接
      return links.filter(l => l.pinned && !isCategoryLocked(l.categoryId));
  }, [links, categories, unlockedCategoryIds]);

  const displayedLinks = useMemo(() => {
    let result = links;

    // 安全过滤：始终隐藏来自锁定分类的链接
    result = result.filter(l => !isCategoryLocked(l.categoryId));

    // 搜索过滤
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return result.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q) ||
        (l.description && l.description.toLowerCase().includes(q))
      );
    }

    // 分类过滤
    if (selectedCategory !== 'all') {
      result = result.filter(l => l.categoryId === selectedCategory);
    }

    // 排序：按创建时间降序
    return result.sort((a, b) => b.createdAt - a.createdAt);
  }, [links, selectedCategory, searchQuery, categories, unlockedCategoryIds]);


  // --- Render Components ---

  const renderLinkCard = (link: LinkItem) => (
    <a
        key={link.id}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        // 使用 CSS 变量定义的 Tailwind 类
        className="group relative flex items-center gap-3 p-3 bg-card-bg rounded-xl border border-border-default shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
        title={link.description || link.url} // 原生工具提示
    >
        {/* 紧凑型图标 */}
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold uppercase shrink-0">
            {link.icon ? <img src={link.icon} alt={link.title.charAt(0)} className="w-5 h-5"/> : link.title.charAt(0)}
        </div>

        {/* 文本内容 */}
        <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm text-text-default truncate group-hover:text-primary transition-colors">
                {link.title}
            </h3>
            {/* 自定义工具提示，用于显示描述 */}
            {link.description && (
               <div className="tooltip-custom absolute left-0 -top-8 w-max max-w-[200px] bg-black text-white text-xs p-2 rounded opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all z-20 pointer-events-none truncate">
                  {link.description}
               </div>
            )}
        </div>

        {/* 悬停操作按钮 */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-card-bg/90 pl-2">
            <button
                onClick={(e) => togglePin(link.id, e)}
                className={`p-1 rounded-md transition-colors ${link.pinned ? 'text-primary bg-primary/10' : 'text-secondary hover:text-primary hover:bg-primary/5'}`}
                title="置顶"
            >
                <Pin size={13} className={link.pinned ? "fill-current" : ""} />
            </button>
            <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingLink(link); setIsModalOpen(true); }}
                className="p-1 text-secondary hover:text-primary hover:bg-primary/5 rounded-md"
                title="编辑"
            >
                <Edit2 size={13} />
            </button>
            <button
                onClick={(e) => handleDeleteLink(link.id, e)}
                className="p-1 text-secondary hover:text-danger hover:bg-danger/5 rounded-md"
                title="删除"
            >
                <Trash2 size={13} />
            </button>
        </div>
    </a>
  );


  return (
    // 整个应用的根容器，设置默认背景和文本颜色，以及过渡效果
    <div className="flex h-screen overflow-hidden bg-bg-default text-text-default transition-colors duration-300">

      {/* 模态框组件 */}
      <AuthModal isOpen={isAuthOpen} onLogin={handleLogin} />
      <CategoryAuthModal
        isOpen={!!catAuthModalData}
        category={catAuthModalData}
        onClose={() => setCatAuthModalData(null)}
        onUnlock={handleUnlockCategory}
      />
      <CategoryManagerModal
        isOpen={isCatManagerOpen}
        onClose={() => setIsCatManagerOpen(false)}
        categories={categories}
        onUpdateCategories={handleUpdateCategories}
        onDeleteCategory={handleDeleteCategory}
      />
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        links={links}
        categories={categories}
        onRestore={handleRestoreBackup}
        webDavConfig={webDavConfig}
        onSaveWebDavConfig={handleSaveWebDavConfig}
      />
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingLinks={links}
        categories={categories}
        onImport={handleImportConfirm}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={aiConfig}
        onSave={handleSaveAIConfig}
        links={links}
        onUpdateLinks={(newLinks) => updateData(newLinks, categories)}
      />

      {/* 侧边栏移动端覆盖层 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out
          bg-card-bg border-r border-border-default flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-border-default shrink-0">
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              云航 CloudNav
            </span>
        </div>

        {/* 分类列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
            {/* 全部链接按钮 */}
            <button
              onClick={() => { setSelectedCategory('all'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                selectedCategory === 'all'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-secondary hover:bg-primary/5'
              }`}
            >
              <div className="p-1"><Icon name="LayoutGrid" size={18} /></div>
              <span>全部链接</span>
            </button>

            {/* 分类目录标题和管理按钮 */}
            <div className="flex items-center justify-between pt-4 pb-2 px-4">
               <span className="text-xs font-semibold text-secondary uppercase tracking-wider">分类目录</span>
               <button
                  onClick={() => { if(!authToken) setIsAuthOpen(true); else setIsCatManagerOpen(true); }}
                  className="p-1 text-secondary hover:text-primary hover:bg-primary/5 rounded"
                  title="管理分类"
               >
                  <Settings size={14} />
               </button>
            </div>

            {/* 各个分类按钮 */}
            {categories.map(cat => {
                const isLocked = cat.password && !unlockedCategoryIds.has(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group ${
                      selectedCategory === cat.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-secondary hover:bg-primary/5'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${selectedCategory === cat.id ? 'bg-primary/20' : 'bg-primary/5'}`}>
                      {isLocked ? <Lock size={16} className="text-warning" /> : <Icon name={cat.icon} size={16} />}
                    </div>
                    <span className="truncate flex-1 text-left">{cat.name}</span>
                    {selectedCategory === cat.id && <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>}
                  </button>
                );
            })}
        </div>

        {/* 侧边栏底部操作区 */}
        <div className="p-4 border-t border-border-default bg-card-bg/50 shrink-0">

            <div className="grid grid-cols-3 gap-2 mb-2">
                <button
                    onClick={() => { if(!authToken) setIsAuthOpen(true); else setIsImportModalOpen(true); }}
                    className="flex flex-col items-center justify-center gap-1 p-2 text-xs text-secondary hover:bg-card-bg rounded-lg border border-border-default transition-all"
                    title="导入书签"
                >
                    <Upload size={14} />
                    <span>导入</span>
                </button>

                <button
                    onClick={() => { if(!authToken) setIsAuthOpen(true); else setIsBackupModalOpen(true); }}
                    className="flex flex-col items-center justify-center gap-1 p-2 text-xs text-secondary hover:bg-card-bg rounded-lg border border-border-default transition-all"
                    title="备份与恢复"
                >
                    <CloudCog size={14} />
                    <span>备份</span>
                </button>

                <button
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="flex flex-col items-center justify-center gap-1 p-2 text-xs text-secondary hover:bg-card-bg rounded-lg border border-border-default transition-all"
                    title="AI 设置"
                >
                    <Settings size={14} />
                    <span>设置</span>
                </button>
            </div>

            <div className="flex items-center justify-between text-xs px-2 mt-2">
               <div className="flex items-center gap-1 text-secondary">
                 {syncStatus === 'saving' && <Loader2 className="animate-spin w-3 h-3 text-primary" />}
                 {syncStatus === 'saved' && <CheckCircle2 className="w-3 h-3 text-success" />}
                 {syncStatus === 'error' && <AlertCircle className="w-3 h-3 text-danger" />}
                 {authToken ? <span className="text-success">已登录</span> : <span className="text-warning">离线</span>}
               </div>

               <a
                 href={GITHUB_REPO_URL}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="flex items-center gap-1 text-secondary hover:text-primary transition-colors"
                 title="Fork this project on GitHub"
               >
                 <GitFork size={14} />
                 <span>复刻 项目</span>
               </a>
            </div>
        </div>
      </aside>

      {/* 主要内容区域 */}
      <main className="flex-1 flex flex-col h-full bg-bg-default overflow-hidden relative">

        {/* 头部导航栏 */}
        <header className="h-16 px-4 lg:px-8 flex items-center justify-between bg-card-bg/80 backdrop-blur-md border-b border-border-default sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            {/* 移动端侧边栏切换按钮 */}
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-secondary">
              <Menu size={24} />
            </button>

            {/* 搜索框 */}
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={16} />
              <input
                type="text"
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-full bg-primary/5 border-none text-sm focus:ring-2 focus:ring-primary placeholder-secondary outline-none transition-all"
              />
            </div>
          </div>

          {/* 右侧操作按钮 */}
          <div className="flex items-center gap-2">
            {/* 主题切换按钮 */}
            <button onClick={toggleTheme} className="p-2 rounded-full text-secondary hover:bg-primary/5">
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* 登录按钮（未认证时显示） */}
            {!authToken && (
                <button onClick={() => setIsAuthOpen(true)} className="hidden sm:flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full text-xs font-medium text-primary">
                    <Cloud size={14} /> 登录
                </button>
            )}

            {/* 添加链接按钮 */}
            <button
              onClick={() => { if(!authToken) setIsAuthOpen(true); else { setEditingLink(undefined); setIsModalOpen(true); }}}
              className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-3 py-2 rounded-full text-sm font-medium shadow-lg shadow-primary/30"
            >
              <Plus size={16} /> <span className="hidden sm:inline">添加</span>
            </button>
          </div>
        </header>

        {/* 内容滚动区域 */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8">

            {/* 1. 置顶链接区域 */}
            {pinnedLinks.length > 0 && !searchQuery && (selectedCategory === 'all') && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Pin size={16} className="text-primary fill-primary" />
                        <h2 className="text-sm font-bold uppercase tracking-wider text-secondary">
                            置顶 / 常用
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                        {pinnedLinks.map(link => renderLinkCard(link))}
                    </div>
                </section>
            )}

            {/* 2. 主要链接网格区域 */}
            <section>
                 {/* 欢迎信息（仅在没有置顶、没有搜索且在“所有链接”分类时显示） */}
                 {(!pinnedLinks.length && !searchQuery && selectedCategory === 'all') && (
                    <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white shadow-lg flex items-center justify-between">
                         <div>
                            <h1 className="text-xl font-bold">欢迎您 👋</h1>
                            <p className="text-sm opacity-90 mt-1">
                                {links.length} 个链接 · {categories.length} 个分类
                            </p>
                         </div>
                         <Icon name="Compass" size={48} className="opacity-20" />
                    </div>
                 )}

                 {/* 当前分类/搜索结果标题 */}
                 <div className="flex items-center justify-between mb-4">
                     <h2 className="text-sm font-bold uppercase tracking-wider text-secondary flex items-center gap-2">
                         {selectedCategory === 'all'
                            ? (searchQuery ? '搜索结果' : '所有链接')
                            : (
                                <>
                                    {categories.find(c => c.id === selectedCategory)?.name}
                                    {isCategoryLocked(selectedCategory) && <Lock size={14} className="text-warning" />}
                                </>
                            )
                         }
                     </h2>
                 </div>

                 {/* 链接列表或空状态提示 */}
                 {displayedLinks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-secondary border-2 border-dashed border-border-default rounded-xl">
                        {isCategoryLocked(selectedCategory) ? (
                            <>
                                <Lock size={40} className="text-warning mb-4" />
                                <p>该目录已锁定</p>
                                <button onClick={() => setCatAuthModalData(categories.find(c => c.id === selectedCategory) || null)} className="mt-4 px-4 py-2 bg-warning text-white rounded-lg">输入密码解锁</button>
                            </>
                        ) : (
                            <>
                                <Search size={40} className="opacity-30 mb-4" />
                                <p>没有找到相关内容</p>
                                {selectedCategory !== 'all' && (
                                    <button onClick={() => setIsModalOpen(true)} className="mt-4 text-primary hover:underline">添加一个?</button>
                                )}
                            </>
                        )}
                    </div>
                 ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                        {displayedLinks.map(link => renderLinkCard(link))}
                    </div>
                 )}
            </section>
        </div>
      </main>

      {/* 链接编辑/添加模态框 */}
      <LinkModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingLink(undefined); setPrefillLink(undefined); }}
        onSave={editingLink ? handleEditLink : handleAddLink}
        categories={categories}
        initialData={editingLink || (prefillLink as LinkItem)}
        aiConfig={aiConfig}
      />
    </div>
  );
}

export default App;
