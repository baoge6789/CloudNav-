import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search, Plus, Upload, Moon, Sun, Menu,
  Trash2, Edit2, Loader2, Cloud, CheckCircle2, AlertCircle,
  Pin, Settings, Lock, CloudCog, Github, GitFork
} from 'lucide-react';
import { LinkItem, Category, DEFAULT_CATEGORIES, INITIAL_LINKS, WebDavConfig, AIConfig } from './types';
import { parseBookmarks } from './services/bookmarkParser';
import Icon from './components/Icon';
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

const allThemes = [
  { class: 'light-theme-default', name: '默认光线模式', isDark: false },
  { class: 'light-theme-warm', name: '暖色光线模式', isDark: false },
  { class: 'light-theme-cool', name: '冷色光线模式', isDark: false },
  { class: 'light-theme-minimal', name: '极简光线模式', isDark: false },
  { class: 'light-theme-soft', name: '柔和光线模式', isDark: false },
  { class: 'dark', name: '深色模式', isDark: true },
];

// --- 新增：上下文菜单组件 ---
interface LinkActionsMenuProps {
    link: LinkItem;
    x: number;
    y: number;
    onClose: () => void;
    onTogglePin: (id: string, e: React.MouseEvent) => void;
    onEdit: (link: LinkItem, e: React.MouseEvent) => void; // 传递完整的 LinkItem
    onDelete: (id: string, e: React.MouseEvent) => void;
}

const LinkActionsMenu: React.FC<LinkActionsMenuProps> = ({
    link, x, y, onClose, onTogglePin, onEdit, onDelete
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    // 防止菜单内部点击事件冒泡到 document 导致菜单立即关闭
    const handleMenuClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    return (
        <div
            ref={menuRef}
            className="absolute z-50 bg-card-bg border border-border-default rounded-lg shadow-lg py-1 text-sm whitespace-nowrap"
            style={{ left: x, top: y }}
            onClick={handleMenuClick}
            onContextMenu={(e) => e.preventDefault()} // 防止菜单的右键再次触发浏览器菜单
        >
            <button
                onClick={(e) => { onTogglePin(link.id, e); onClose(); }}
                className="flex items-center gap-2 px-4 py-2 w-full text-left text-text-default hover:bg-primary/5 hover:text-primary"
            >
                <Pin size={16} className={link.pinned ? "fill-current text-primary" : "text-secondary"} />
                {link.pinned ? '取消置顶' : '置顶'}
            </button>
            <button
                onClick={(e) => { onEdit(link, e); onClose(); }} // 传递完整的 link 对象
                className="flex items-center gap-2 px-4 py-2 w-full text-left text-text-default hover:bg-primary/5 hover:text-primary"
            >
                <Edit2 size={16} className="text-secondary" />
                编辑
            </button>
            <button
                onClick={(e) => { onDelete(link.id, e); onClose(); }}
                className="flex items-center gap-2 px-4 py-2 w-full text-left text-text-default hover:bg-danger/5 hover:text-danger"
            >
                <Trash2 size={16} className="text-danger" />
                删除
            </button>
        </div>
    );
};


function App() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentThemeClass, setCurrentThemeClass] = useState(() => {
    const htmlClasses = document.documentElement.className.split(' ');
    const activeTheme = allThemes.find(theme => htmlClasses.includes(theme.class));
    return activeTheme ? activeTheme.class : allThemes[0].class;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unlockedCategoryIds, setUnlockedCategoryIds] = useState<Set<string>>(new Set());
  const [webDavConfig, setWebDavConfig] = useState<WebDavConfig>(() => {
      const saved = localStorage.getItem(WEBDAV_CONFIG_KEY);
      if (saved) { try { return JSON.parse(saved); } catch (e) { console.error("Failed to parse WebDAV config from localStorage", e); } }
      return { url: '', username: '', password: '', enabled: false };
  });
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
      const saved = localStorage.getItem(AI_CONFIG_KEY);
      if (saved) { try { return JSON.parse(saved); } catch (e) { console.error("Failed to parse AI config from localStorage", e); } }
      return { provider: 'gemini', apiKey: process.env.API_KEY || '', baseUrl: '', model: 'gemini-2.5-flash' };
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [catAuthModalData, setCatAuthModalData] = useState<Category | null>(null);

  const [editingLink, setEditingLink] = useState<LinkItem | undefined>(undefined);
  const [prefillLink, setPrefillLink] = useState<Partial<LinkItem> | undefined>(undefined);

  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [authToken, setAuthToken] = useState<string>('');

  // --- 新增状态：控制自定义上下文菜单 ---
  const [contextMenu, setContextMenu] = useState<{ link: LinkItem; x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActivatedRef = useRef(false); // 标记是否长按已激活，用于阻止点击事件

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
            headers: { 'Content-Type': 'application/json', 'x-auth-password': token },
            body: JSON.stringify({ links: newLinks, categories: newCategories })
        });

        if (response.status === 401) {
            setAuthToken('');
            localStorage.removeItem(AUTH_KEY);
            setIsAuthOpen(true);
            setSyncStatus('error');
            alert('认证失败，请重新登录。');
            return false;
        }

        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);

        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 2000);
        return true;
    } catch (error) {
        console.error("Sync failed", error);
        setSyncStatus('error');
        alert(`数据同步失败: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
  };

  const updateData = useCallback((newLinks: LinkItem[], newCategories: Category[]) => {
      setLinks(newLinks);
      setCategories(newCategories);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ links: newLinks, categories: newCategories }));
      if (authToken) {
          syncToCloud(newLinks, newCategories, authToken);
      }
  }, [authToken, syncToCloud]);

  useEffect(() => {
    const savedToken = localStorage.getItem(AUTH_KEY);
    if (savedToken) setAuthToken(savedToken);

    const urlParams = new URLSearchParams(window.location.search);
    const addUrl = urlParams.get('add_url');
    if (addUrl) {
        const addTitle = urlParams.get('add_title') || '';
        window.history.replaceState({}, '', window.location.pathname);
        setPrefillLink({ title: addTitle, url: addUrl, categoryId: 'common' });
        setEditingLink(undefined);
        setIsModalOpen(true);
    }

    const initData = async () => {
        try {
            const res = await fetch('/api/storage');
            if (res.ok) {
                const data = await res.json();
                if (data.links && data.links.length > 0) {
                    setLinks(data.links);
                    setCategories(data.categories || DEFAULT_CATEGORIES);
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
                    return;
                }
            }
        } catch (e) {
            console.warn("Failed to fetch from cloud, falling back to local storage.", e);
        }
        loadFromLocal();
    };
    initData();
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', currentThemeClass);
    allThemes.forEach(theme => document.documentElement.classList.remove(theme.class));
    document.documentElement.classList.add(currentThemeClass);
  }, [currentThemeClass]);

  const toggleTheme = useCallback(() => {
    const currentIndex = allThemes.findIndex(theme => theme.class === currentThemeClass);
    const nextIndex = (currentIndex + 1) % allThemes.length;
    setCurrentThemeClass(allThemes[nextIndex].class);
  }, [currentThemeClass]);

  const isDarkMode = useMemo(() => allThemes.find(theme => theme.class === currentThemeClass)?.isDark || false, [currentThemeClass]);

  // --- 新增：关闭上下文菜单的函数 ---
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleLogin = async (password: string): Promise<boolean> => {
      try {
        const response = await fetch('/api/storage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-password': password },
            body: JSON.stringify({ links, categories })
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

  const handleAddLink = useCallback((data: Omit<LinkItem, 'id' | 'createdAt'>) => {
    if (!authToken) { setIsAuthOpen(true); return; }
    const newLink: LinkItem = { ...data, id: Date.now().toString(), createdAt: Date.now() };
    updateData([newLink, ...links], categories);
    setPrefillLink(undefined);
  }, [authToken, links, categories, updateData]);

  // --- 修改：用于 LinkModal 的编辑函数 ---
  const handleEditLinkForModal = useCallback((data: Omit<LinkItem, 'id' | 'createdAt'>) => {
    if (!authToken) { setIsAuthOpen(true); return; }
    if (!editingLink) return;
    const updated = links.map(l => l.id === editingLink.id ? { ...l, ...data } : l);
    updateData(updated, categories);
    setEditingLink(undefined);
  }, [authToken, editingLink, links, categories, updateData]);

  // --- 新增：用于 LinkActionsMenu 的编辑函数 ---
  const handleEditLinkFromMenu = useCallback((linkToEdit: LinkItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!authToken) { setIsAuthOpen(true); return; }
    setEditingLink(linkToEdit); // 设置正在编辑的完整链接对象
    setIsModalOpen(true);
    closeContextMenu();
  }, [authToken, closeContextMenu]);

  // --- 修改：handleDeleteLink 以便从菜单调用 ---
  const handleDeleteLink = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!authToken) { setIsAuthOpen(true); return; }
    if (confirm('确定删除此链接吗?')) {
      updateData(links.filter(l => l.id !== id), categories);
      closeContextMenu(); // 删除后关闭菜单
    }
  }, [authToken, links, categories, updateData, closeContextMenu]);

  // --- 修改：togglePin 以便从菜单调用 ---
  const togglePin = useCallback((id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!authToken) { setIsAuthOpen(true); return; }
      const updated = links.map(l => l.id === id ? { ...l, pinned: !l.pinned } : l);
      updateData(updated, categories);
      closeContextMenu(); // 置顶后关闭菜单
  }, [authToken, links, categories, updateData, closeContextMenu]);

  const handleSaveAIConfig = (config: AIConfig) => {
      setAiConfig(config);
      localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
      alert('AI 配置已保存！');
  };

  const handleCategoryClick = (cat: Category) => {
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
      setCatAuthModalData(null);
  };

  const handleUpdateCategories = useCallback((newCats: Category[]) => {
      if (!authToken) { setIsAuthOpen(true); return; }
      updateData(links, newCats);
      alert('分类已更新！');
  }, [authToken, links, updateData]);

  const handleDeleteCategory = useCallback((catId: string) => {
      if (!authToken) { setIsAuthOpen(true); return; }
      if (!confirm('确定删除此分类吗？该分类下的链接将被移动到“常用”分类。')) return;

      const newCats = categories.filter(c => c.id !== catId);
      const targetId = 'common';
      const newLinks = links.map(l => l.categoryId === catId ? { ...l, categoryId: targetId } : l);

      if (newCats.length === 0) {
          newCats.push(DEFAULT_CATEGORIES[0]);
      }
      updateData(newLinks, newCats);
      alert('分类已删除！');
  }, [authToken, links, categories, updateData]);

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

  const isCategoryLocked = useCallback((catId: string) => {
      const cat = categories.find(c => c.id === catId);
      if (!cat || !cat.password) return false;
      return !unlockedCategoryIds.has(catId);
  }, [categories, unlockedCategoryIds]);

  const pinnedLinks = useMemo(() => {
      return links.filter(l => l.pinned && !isCategoryLocked(l.categoryId));
  }, [links, isCategoryLocked]);

  const displayedLinks = useMemo(() => {
    let result = links;
    result = result.filter(l => !isCategoryLocked(l.categoryId));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return result.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q) ||
        (l.description && l.description.toLowerCase().includes(q))
      );
    }
    if (selectedCategory !== 'all') {
      result = result.filter(l => l.categoryId === selectedCategory);
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  }, [links, selectedCategory, searchQuery, isCategoryLocked]);


  const renderLinkCard = (link: LinkItem) => {
    // --- 新增：长按和右键点击事件处理 ---
    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault(); // 阻止浏览器默认右键菜单
      e.stopPropagation(); // 阻止事件冒泡
      setContextMenu({ link, x: e.clientX, y: e.clientY });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      // 仅处理左键点击的长按
      if (e.button === 0) {
        longPressTimerRef.current = setTimeout(() => {
          isLongPressActivatedRef.current = true;
          setContextMenu({ link, x: e.clientX, y: e.clientY });
        }, 500); // 500ms 长按
      }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
      clearTimeout(longPressTimerRef.current!);
      if (isLongPressActivatedRef.current) {
        e.preventDefault(); // 如果是长按激活的，阻止默认的点击行为（如跳转链接）
        isLongPressActivatedRef.current = false;
      }
    };

    const handleMouseLeave = (e: React.MouseEvent) => {
      // 鼠标离开卡片时，如果正在计时，则取消长按
      clearTimeout(longPressTimerRef.current!);
      isLongPressActivatedRef.current = false;
    };

    // 阻止长按后的点击事件触发链接跳转
    const handleClick = (e: React.MouseEvent) => {
        if (isLongPressActivatedRef.current) {
            e.preventDefault();
            isLongPressActivatedRef.current = false; // 重置
        }
    };

    return (
      <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex items-center gap-3 p-3 bg-card-bg rounded-xl border border-border-default shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          title={link.description || link.url}
          onContextMenu={handleContextMenu} // 右键点击
          onMouseDown={handleMouseDown}     // 左键长按开始
          onMouseUp={handleMouseUp}         // 左键长按结束或短按
          onMouseLeave={handleMouseLeave}   // 鼠标离开
          onClick={handleClick}             // 阻止长按后的默认点击
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
              {link.description && (
                 <div className="tooltip-custom absolute left-0 -top-8 w-max max-w-[200px] bg-black text-white text-xs p-2 rounded opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all z-20 pointer-events-none truncate">
                    {link.description}
                 </div>
              )}
          </div>

          {/* 原有的悬停操作按钮 div 已移除 */}
      </a>
    );
  };


  return (
    <div className="flex h-screen overflow-hidden bg-bg-default text-text-default transition-colors duration-300">

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

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out
          bg-card-bg border-r border-border-default flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-16 flex items-center px-6 border-b border-border-default shrink-0">
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              云航 CloudNav
            </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
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

      <main className="flex-1 flex flex-col h-full bg-bg-default overflow-hidden relative">
        <header className="h-16 px-4 lg:px-8 flex items-center justify-between bg-card-bg/80 backdrop-blur-md border-b border-border-default sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-secondary">
              <Menu size={24} />
            </button>

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

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-full text-secondary hover:bg-primary/5">
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {!authToken && (
                <button onClick={() => setIsAuthOpen(true)} className="hidden sm:flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full text-xs font-medium text-primary">
                    <Cloud size={14} /> 登录
                </button>
            )}

            <button
              onClick={() => { if(!authToken) setIsAuthOpen(true); else { setEditingLink(undefined); setIsModalOpen(true); }}}
              className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-3 py-2 rounded-full text-sm font-medium shadow-lg shadow-primary/30"
            >
              <Plus size={16} /> <span className="hidden sm:inline">添加</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8">
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

            <section>
                 {(!pinnedLinks.length && !searchQuery && selectedCategory === 'all') && (
                    <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white shadow-lg flex items-center justify-between">
                         <div>
                            <h1 className="text-xl font-bold">早安 👋</h1>
                            <p className="text-sm opacity-90 mt-1">
                                {links.length} 个链接 · {categories.length} 个分类
                            </p>
                         </div>
                         <Icon name="Compass" size={48} className="opacity-20" />
                    </div>
                 )}

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

      {/* 在 App 组件的根部渲染 LinkActionsMenu */}
      {contextMenu && (
        <LinkActionsMenu
          link={contextMenu.link}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onTogglePin={togglePin}
          onEdit={handleEditLinkFromMenu} // 传递给菜单
          onDelete={handleDeleteLink}
        />
      )}

      <LinkModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingLink(undefined); setPrefillLink(undefined); }}
        onSave={editingLink ? handleEditLinkForModal : handleAddLink} // 传递给模态框
        categories={categories}
        initialData={editingLink || (prefillLink as LinkItem)}
        aiConfig={aiConfig}
      />
    </div>
  );
}

export default App;
