import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search, Plus, Upload, Moon, Sun, Menu,
  Trash2, Edit2, Loader2, Cloud, CheckCircle2, AlertCircle,
  Pin, Settings, Lock, CloudCog, Github, GitFork, Info // <-- 确保 Info 图标已导入
} from 'lucide-react';
import { LinkItem, Category, DEFAULT_CATEGORIES, INITIAL_LINKS, WebDavConfig, AIConfig } from './types';
import { parseBookmarks } from './services/bookmarkParser';
import Icon from './components/Icon'; // 确保 Icon 组件存在
import LinkModal from './components/LinkModal'; // 确保 LinkModal 组件存在
import AuthModal from './components/AuthModal'; // 确保 AuthModal 组件存在
import CategoryManagerModal from './components/CategoryManagerModal'; // 确保 CategoryManagerModal 组件存在
import BackupModal from './components/BackupModal'; // 确保 BackupModal 组件存在
import CategoryAuthModal from './components/CategoryAuthModal'; // 确保 CategoryAuthModal 组件存在
import ImportModal from './components/ImportModal'; // 确保 ImportModal 组件存在
import SettingsModal from './components/SettingsModal'; // 确保 SettingsModal 组件存在
import DescriptionModal from './components/DescriptionModal'; // <-- 确保 DescriptionModal 组件存在

// --- 导入设备检测工具 ---
import { isMobileDevice } from './utils/deviceDetection';

// 主题配置，保持不变
const allThemes = {
  light: {
    '--bg-default': '#ffffff',
    '--bg-secondary': '#f0f2f5',
    '--card-bg': '#ffffff',
    '--border-default': '#e0e0e0',
    '--text-default': '#333333',
    '--text-secondary': '#666666',
    '--primary': '#007bff',
    '--secondary': '#6c757d',
    '--danger': '#dc3545',
    '--success': '#28a745',
    '--warning': '#ffc107',
    '--info': '#17a2b8',
  },
  dark: {
    '--bg-default': '#1a1a1a',
    '--bg-secondary': '#2c2c2c',
    '--card-bg': '#2c2c2c',
    '--border-default': '#444444',
    '--text-default': '#e0e0e0',
    '--text-secondary': '#aaaaaa',
    '--primary': '#007bff',
    '--secondary': '#6c757d',
    '--danger': '#dc3545',
    '--success': '#28a745',
    '--warning': '#ffc107',
    '--info': '#17a2b8',
  },
  // 可以添加更多主题
};

// LinkActionsMenu 组件，保持不变
interface LinkActionsMenuProps {
  link: LinkItem;
  x: number;
  y: number;
  onClose: () => void;
  onTogglePin: (id: string, e: React.MouseEvent | React.TouchEvent) => void;
  onEdit: (link: LinkItem, e: React.MouseEvent | React.TouchEvent) => void;
  onDelete: (id: string, e: React.MouseEvent | React.TouchEvent) => void;
}

const LinkActionsMenu: React.FC<LinkActionsMenuProps> = ({ link, x, y, onClose, onTogglePin, onEdit, onDelete }) => {
  const menuRef = useRef<HTMLDivElement>(null);

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

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 1000,
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-default)',
    borderRadius: '0.5rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    padding: '0.5rem 0',
  };

  return (
    <div ref={menuRef} style={menuStyle} className="text-sm">
      <button
        className="flex items-center gap-2 w-full px-4 py-2 hover:bg-bg-secondary text-text-default"
        onClick={(e) => { onTogglePin(link.id, e); onClose(); }}
      >
        <Pin size={16} className={link.pinned ? "fill-current text-primary" : ""} /> {link.pinned ? '取消置顶' : '置顶'}
      </button>
      <button
        className="flex items-center gap-2 w-full px-4 py-2 hover:bg-bg-secondary text-text-default"
        onClick={(e) => { onEdit(link, e); onClose(); }}
      >
        <Edit2 size={16} /> 编辑
      </button>
      <button
        className="flex items-center gap-2 w-full px-4 py-2 hover:bg-danger/10 text-danger"
        onClick={(e) => { onDelete(link.id, e); onClose(); }}
      >
        <Trash2 size={16} /> 删除
      </button>
    </div>
  );
};


function App() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | undefined>(undefined);
  const [prefillLink, setPrefillLink] = useState<Partial<LinkItem> | undefined>(undefined);
  const [contextMenu, setContextMenu] = useState<{ link: LinkItem; x: number; y: number } | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showCategoryAuthModal, setShowCategoryAuthModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [webDavConfig, setWebDavConfig] = useState<WebDavConfig | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 新增：描述模态框状态
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [currentDescription, setCurrentDescription] = useState<{ title: string; description: string }>({ title: '', description: '' });

  // --- 新增：设备类型判断 ---
  const isMobile = useMemo(() => isMobileDevice(), []);

  // 加载数据
  useEffect(() => {
    const storedLinks = localStorage.getItem('links');
    if (storedLinks) {
      setLinks(JSON.parse(storedLinks));
    } else {
      setLinks(INITIAL_LINKS);
    }

    const storedCategories = localStorage.getItem('categories');
    if (storedCategories) {
      setCategories(JSON.parse(storedCategories));
    }

    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (storedTheme) {
      setCurrentTheme(storedTheme);
    }

    const storedWebDavConfig = localStorage.getItem('webDavConfig');
    if (storedWebDavConfig) {
      setWebDavConfig(JSON.parse(storedWebDavConfig));
    }

    const storedAiConfig = localStorage.getItem('aiConfig');
    if (storedAiConfig) {
      setAiConfig(JSON.parse(storedAiConfig));
    }

  }, []);

  // 保存数据
  useEffect(() => {
    localStorage.setItem('links', JSON.stringify(links));
  }, [links]);

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  // 应用主题
  useEffect(() => {
    const themeVars = allThemes[currentTheme];
    for (const [key, value] of Object.entries(themeVars)) {
      document.documentElement.style.setProperty(key, value);
    }
    localStorage.setItem('theme', currentTheme);
  }, [currentTheme]);

  const toggleTheme = () => {
    setCurrentTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleAddLink = (newLink: LinkItem) => {
    setLinks((prev) => [...prev, newLink]);
    setIsModalOpen(false);
  };

  const handleEditLinkForModal = (updatedLink: LinkItem) => {
    setLinks((prev) => prev.map((link) => (link.id === updatedLink.id ? updatedLink : link)));
    setEditingLink(undefined);
    setIsModalOpen(false);
  };

  const handleEditLinkFromMenu = (link: LinkItem, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingLink(link);
    setIsModalOpen(true);
    closeContextMenu();
  };

  const handleDeleteLink = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('确定要删除此书签吗？')) {
      setLinks((prev) => prev.filter((link) => link.id !== id));
    }
    closeContextMenu();
  };

  const togglePin = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLinks((prev) =>
      prev.map((link) =>
        link.id === id ? { ...link, pinned: !link.pinned } : link
      )
    );
    closeContextMenu();
  };

  const handleAddCategory = (newCategory: Category) => {
    setCategories((prev) => [...prev, newCategory]);
  };

  const handleEditCategory = (updatedCategory: Category) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === updatedCategory.id ? updatedCategory : cat))
    );
  };

  const handleDeleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
    setLinks((prev) => prev.map(link => link.categoryId === id ? { ...link, categoryId: 'uncategorized' } : link));
    if (activeCategory === id) {
      setActiveCategory(null);
    }
  };

  const handleImportBookmarks = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const parsedLinks = parseBookmarks(content);
        setLinks((prev) => {
          const existingUrls = new Set(prev.map(link => link.url));
          const newLinks = parsedLinks.filter(link => !existingUrls.has(link.url));
          return [...prev, ...newLinks];
        });
        alert(`成功导入 ${parsedLinks.length} 个书签，其中 ${newLinks.length} 个是新增的。`);
      } catch (error) {
        console.error('书签导入失败:', error);
        alert('书签导入失败，请检查文件格式。');
      }
    };
    reader.readAsText(file);
  };

  const handleExportBookmarks = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(links, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "bookmarks.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleSaveWebDavConfig = (config: WebDavConfig) => {
    setWebDavConfig(config);
    localStorage.setItem('webDavConfig', JSON.stringify(config));
  };

  const handleSaveAIConfig = (config: AIConfig) => {
    setAiConfig(config);
    localStorage.setItem('aiConfig', JSON.stringify(config));
  };

  const handleBackupToWebDav = useCallback(async () => {
    if (!webDavConfig || !webDavConfig.url || !webDavConfig.username || !webDavConfig.password) {
      alert('请先配置 WebDAV 账户信息。');
      return;
    }
    setBackupStatus('loading');
    try {
      const dataToBackup = {
        links: links,
        categories: categories,
        theme: currentTheme,
        webDavConfig: webDavConfig,
        aiConfig: aiConfig,
      };
      const response = await fetch(`${webDavConfig.url}/bookmarks_backup.json`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Basic ' + btoa(`${webDavConfig.username}:${webDavConfig.password}`),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToBackup, null, 2),
      });

      if (response.ok) {
        setBackupStatus('success');
        setTimeout(() => setBackupStatus('idle'), 3000);
      } else {
        throw new Error(`WebDAV backup failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('WebDAV 备份失败:', error);
      setBackupStatus('error');
      setTimeout(() => setBackupStatus('idle'), 3000);
      alert('WebDAV 备份失败，请检查配置或网络。');
    }
  }, [links, categories, currentTheme, webDavConfig, aiConfig]);

  const handleRestoreFromWebDav = useCallback(async () => {
    if (!webDavConfig || !webDavConfig.url || !webDavConfig.username || !webDavConfig.password) {
      alert('请先配置 WebDAV 账户信息。');
      return;
    }
    setBackupStatus('loading');
    try {
      const response = await fetch(`${webDavConfig.url}/bookmarks_backup.json`, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(`${webDavConfig.username}:${webDavConfig.password}`),
        },
      });

      if (response.ok) {
        const restoredData = await response.json();
        setLinks(restoredData.links || []);
        setCategories(restoredData.categories || DEFAULT_CATEGORIES);
        setCurrentTheme(restoredData.theme || 'light');
        setWebDavConfig(restoredData.webDavConfig || null);
        setAiConfig(restoredData.aiConfig || null);
        setBackupStatus('success');
        setTimeout(() => setBackupStatus('idle'), 3000);
        alert('WebDAV 恢复成功！');
      } else if (response.status === 404) {
        throw new Error('WebDAV 备份文件未找到。');
      } else {
        throw new Error(`WebDAV restore failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('WebDAV 恢复失败:', error);
      setBackupStatus('error');
      setTimeout(() => setBackupStatus('idle'), 3000);
      alert(`WebDAV 恢复失败：${(error as Error).message}`);
    }
  }, [webDavConfig]);


  const filteredLinks = useMemo(() => {
    let currentLinks = links;

    // 1. 过滤分类
    if (activeCategory) {
      currentLinks = currentLinks.filter(
        (link) => link.categoryId === activeCategory
      );
    }

    // 2. 搜索
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      currentLinks = currentLinks.filter(
        (link) =>
          link.title.toLowerCase().includes(lowerCaseSearchTerm) ||
          link.url.toLowerCase().includes(lowerCaseSearchTerm) ||
          (link.description && link.description.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    // 3. 置顶排序
    return currentLinks.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }, [links, activeCategory, searchTerm]);

  const renderLinkCard = (link: LinkItem) => {
    // --- 桌面端右键菜单处理 (保持不变) ---
    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ link, x: e.clientX, y: e.clientY });
    };

    // --- 移动端长按处理 (仅用于显示操作菜单) ---
    const longPressTouchTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPressTouchActivatedRef = useRef(false); // 标记是否长按已激活，用于阻止默认点击

    const handleTouchStart = (e: React.TouchEvent) => {
      isLongPressTouchActivatedRef.current = false; // 重置长按状态
      longPressTouchTimerRef.current = setTimeout(() => {
        // 触发长按：显示操作菜单
        const touch = e.touches[0];
        setContextMenu({ link, x: touch.clientX, y: touch.clientY });
        isLongPressTouchActivatedRef.current = true; // 标记长按已激活
        // 阻止浏览器默认长按行为 (如文本选择、上下文菜单)
        e.preventDefault();
        e.stopPropagation();
      }, 500); // 500ms 长按阈值
    };

    const handleTouchMove = () => {
      // 如果手指移动，取消长按计时，避免误触
      clearTimeout(longPressTouchTimerRef.current!);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
      clearTimeout(longPressTouchTimerRef.current!);
      // 如果长按被激活了，就阻止默认的点击行为，否则就让 <a> 标签正常跳转
      if (isLongPressTouchActivatedRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
      isLongPressTouchActivatedRef.current = false; // 重置状态
    };

    const handleTouchCancel = (e: React.TouchEvent) => {
      clearTimeout(longPressTouchTimerRef.current!);
      isLongPressTouchActivatedRef.current = false;
    };


    // --- 桌面端长按/短按处理 (保持不变，但现在只在 !isMobile 时使用) ---
    const longPressMouseTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPressMouseActivatedRef = useRef(false); // 标记是否长按已激活，用于阻止点击事件

    const handleMouseDown = (e: React.MouseEvent) => {
      if (isMobile) return;
      if (e.button === 0) { // 左键
        longPressMouseTimerRef.current = setTimeout(() => {
          isLongPressMouseActivatedRef.current = true;
          setContextMenu({ link, x: e.clientX, y: e.clientY });
        }, 500);
      }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
      if (isMobile) return;
      clearTimeout(longPressMouseTimerRef.current!);
      if (isLongPressMouseActivatedRef.current) {
        e.preventDefault(); // 如果是长按激活的，阻止默认的点击行为（如跳转链接）
        isLongPressMouseActivatedRef.current = false;
      }
    };

    const handleMouseLeave = (e: React.MouseEvent) => {
      if (isMobile) return;
      clearTimeout(longPressMouseTimerRef.current!);
      isLongPressMouseActivatedRef.current = false;
    };

    // 阻止长按后的点击事件触发链接跳转 (桌面端)
    const handleClick = (e: React.MouseEvent) => {
        if (isMobile) return;
        if (isLongPressMouseActivatedRef.current) {
            e.preventDefault();
            isLongPressMouseActivatedRef.current = false; // 重置
        }
    };

    // --- 新增：处理点击 "i" 按钮显示描述的函数 ---
    const handleDescriptionButtonClick = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault(); // 阻止 <a> 标签的默认跳转行为
        e.stopPropagation(); // 阻止事件冒泡到 <a> 标签的父级

        if (link.description) {
            setCurrentDescription({ title: link.title, description: link.description });
            setShowDescriptionModal(true);
        }
    };

    return (
      <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-center gap-3 p-3 bg-card-bg rounded-xl border border-border-default shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          title={!isMobile ? (link.description || link.url) : undefined} // 桌面端保留 title 属性
          onContextMenu={!isMobile ? handleContextMenu : undefined} // 桌面端右键
          onMouseDown={!isMobile ? handleMouseDown : undefined}     // 桌面端左键长按开始
          onMouseUp={!isMobile ? handleMouseUp : undefined}         // 桌面端左键长按结束或短按
          onMouseLeave={!isMobile ? handleMouseLeave : undefined}   // 桌面端鼠标离开
          onClick={!isMobile ? handleClick : undefined}             // 桌面端阻止长按后的默认点击

          onTouchStart={isMobile ? handleTouchStart : undefined}    // 移动端触摸开始
          onTouchMove={isMobile ? handleTouchMove : undefined}      // 移动端触摸移动
          onTouchEnd={isMobile ? handleTouchEnd : undefined}        // 移动端触摸结束
          onTouchCancel={isMobile ? handleTouchCancel : undefined}  // 移动端触摸取消
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
              {/* 桌面端保留悬浮显示描述 (使用 Tailwind CSS 的响应式工具类) */}
              {link.description && !isMobile && (
                 <div className="absolute left-0 -top-8 w-max max-w-[200px] bg-black text-white text-xs p-2 rounded opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all z-20 pointer-events-none truncate">
                    {link.description}
                 </div>
              )}
          </div>

          {/* 移动端 "i" 按钮显示描述 */}
          {isMobile && link.description && (
              <button
                  onClick={handleDescriptionButtonClick}
                  // onTouchStart 可以在移动端提供更快的响应，避免点击延迟
                  onTouchStart={handleDescriptionButtonClick}
                  className="ml-auto p-1 rounded-full text-secondary hover:bg-primary/5 hover:text-primary shrink-0"
                  aria-label="显示描述"
              >
                  <Info size={18} />
              </button>
          )}

          {/* 桌面端悬浮操作按钮 */}
          {!isMobile && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-card-bg/90 pl-2">
                  <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePin(link.id, e); }}
                      className="p-1 rounded-full text-secondary hover:bg-primary/5 hover:text-primary"
                      title={link.pinned ? '取消置顶' : '置顶'}
                  >
                      <Pin size={16} className={link.pinned ? "fill-current text-primary" : ""} />
                  </button>
                  <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditLinkFromMenu(link, e); }}
                      className="p-1 rounded-full text-secondary hover:bg-primary/5 hover:text-primary"
                      title="编辑"
                  >
                      <Edit2 size={16} />
                  </button>
                  <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteLink(link.id, e); }}
                      className="p-1 rounded-full text-secondary hover:bg-danger/5 hover:text-danger"
                      title="删除"
                  >
                      <Trash2 size={16} />
                  </button>
              </div>
          )}
      </a>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg-default text-text-default transition-colors duration-300">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-bg-secondary border-r border-border-default p-4 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:static md:flex-shrink-0 md:w-64`}
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary">书签管理</h1>
          <button
            className="md:hidden text-text-default hover:text-primary"
            onClick={() => setSidebarOpen(false)}
            aria-label="关闭侧边栏"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
          <input
            type="text"
            placeholder="搜索书签..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-card-bg border border-border-default focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-default"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto mb-4">
          <h2 className="text-lg font-semibold mb-2 text-text-default">分类</h2>
          <ul>
            <li className="mb-1">
              <button
                className={`w-full text-left px-3 py-2 rounded-md transition-colors duration-200 ${
                  activeCategory === null
                    ? 'bg-primary text-white'
                    : 'hover:bg-bg-default text-text-default'
                }`}
                onClick={() => setActiveCategory(null)}
              >
                所有书签
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat.id} className="mb-1">
                <button
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors duration-200 ${
                    activeCategory === cat.id
                      ? 'bg-primary text-white'
                      : 'hover:bg-bg-default text-text-default'
                  }`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="border-t border-border-default pt-4">
          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-2 mb-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            onClick={() => { setIsModalOpen(true); setEditingLink(undefined); setPrefillLink(undefined); setSidebarOpen(false); }}
          >
            <Plus size={20} /> 添加书签
          </button>
          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-2 mb-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
            onClick={() => { setShowCategoryManager(true); setSidebarOpen(false); }}
          >
            <Menu size={20} /> 管理分类
          </button>
          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-2 mb-2 bg-info text-white rounded-lg hover:bg-info/90 transition-colors"
            onClick={() => { setShowSettingsModal(true); setSidebarOpen(false); }}
          >
            <Settings size={20} /> 设置
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-border-default bg-card-bg flex-shrink-0">
          <button
            className="md:hidden text-text-default hover:text-primary"
            onClick={() => setSidebarOpen(true)}
            aria-label="打开侧边栏"
          >
            <Menu size={24} />
          </button>
          <h2 className="text-xl font-semibold text-text-default hidden md:block">
            {activeCategory ? categories.find(c => c.id === activeCategory)?.name : '所有书签'}
            <span className="ml-2 text-text-secondary text-sm font-normal">({filteredLinks.length})</span>
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-text-default hover:bg-bg-secondary transition-colors"
              aria-label="切换主题"
            >
              {currentTheme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <a
              href="https://github.com/your-github/your-repo" // 替换为你的 GitHub 仓库地址
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full text-text-default hover:bg-bg-secondary transition-colors"
              title="GitHub"
            >
              <Github size={20} />
            </a>
            <a
              href="https://github.com/your-github/your-repo/fork" // 替换为你的 GitHub 仓库地址
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full text-text-default hover:bg-bg-secondary transition-colors"
              title="Fork Me"
            >
              <GitFork size={20} />
            </a>
          </div>
        </header>

        {/* Link Grid */}
        <div className="flex-1 p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLinks.length > 0 ? (
            filteredLinks.map(renderLinkCard)
          ) : (
            <p className="text-text-secondary col-span-full text-center py-8">
              {searchTerm ? '没有找到匹配的书签。' : '当前分类下没有书签。'}
            </p>
          )}
        </div>
      </main>

      {/* Modals */}
      {contextMenu && (
        <LinkActionsMenu
          link={contextMenu.link}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onTogglePin={togglePin}
          onEdit={handleEditLinkFromMenu}
          onDelete={handleDeleteLink}
        />
      )}

      <LinkModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingLink(undefined); setPrefillLink(undefined); }}
        onSave={editingLink ? handleEditLinkForModal : handleAddLink}
        categories={categories}
        initialData={editingLink || (prefillLink as LinkItem)}
        aiConfig={aiConfig}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={() => setShowAuthModal(false)}
      />

      <CategoryManagerModal
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        categories={categories}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      <BackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        onImport={handleImportBookmarks}
        onExport={handleExportBookmarks}
        onBackupToWebDav={handleBackupToWebDav}
        onRestoreFromWebDav={handleRestoreFromWebDav}
        backupStatus={backupStatus}
        webDavConfig={webDavConfig}
      />

      <CategoryAuthModal
        isOpen={showCategoryAuthModal}
        onClose={() => setShowCategoryAuthModal(false)}
        onAuthenticate={(categoryId) => {
          // 实际的认证逻辑，这里只是模拟
          console.log(`Authenticated for category: ${categoryId}`);
          setShowCategoryAuthModal(false);
          // 认证成功后可以设置 activeCategory
          setActiveCategory(categoryId);
        }}
        categories={categories}
      />

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportBookmarks}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        webDavConfig={webDavConfig}
        onSaveWebDavConfig={handleSaveWebDavConfig}
        aiConfig={aiConfig}
        onSaveAIConfig={handleSaveAIConfig}
        onImportBookmarks={() => { setShowImportModal(true); setShowSettingsModal(false); }}
        onExportBookmarks={handleExportBookmarks}
        onOpenBackupModal={() => { setShowBackupModal(true); setShowSettingsModal(false); }}
      />

      {/* 描述模态框 */}
      <DescriptionModal
        isOpen={showDescriptionModal}
        onClose={() => setShowDescriptionModal(false)}
        title={currentDescription.title}
        description={currentDescription.description}
      />
    </div>
  );
}

export default App;
