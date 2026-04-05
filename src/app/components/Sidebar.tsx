import { useState } from "react";
import { extractTitle, BlogPost } from "../data/posts";
import { ChevronRight, Pin, X, Globe, Sun, Moon, Disc3 } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface LanguageSwitcherIconProps {
  languages: string[];
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
}

function LanguageSwitcherIcon({ languages, currentLanguage, onLanguageChange }: LanguageSwitcherIconProps) {
  if (languages.length <= 1) return null;

  const otherLanguage = languages.find(lang => lang !== currentLanguage) || languages[0];

  const getLanguageCode = (code: string) => code.toUpperCase();

  return (
    <button
      onClick={() => onLanguageChange(otherLanguage)}
      className="p-2 rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      aria-label={`Switch to ${getLanguageCode(otherLanguage)}`}
      title={`Switch to ${getLanguageCode(otherLanguage)}`}
    >
      <Globe className="w-4 h-4" />
    </button>
  );
}

interface SidebarProps {
  allPosts: BlogPost[];
  selectedPostId: string;
  onSelectionChange: (postId: string) => void;
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  sidebarState: 'closed' | 'half';
  onToggleSidebar: (state: 'closed' | 'half') => void;
  showButton: boolean;
  showMobileButton: boolean;
  categoryFilter?: 'project' | 'blog';
  onCategoryChange?: (category: 'project' | 'blog') => void;
  getPostTitle?: (post: BlogPost) => string;
  showThemeToggle?: boolean;
  globalLanguage?: string;
  availableLanguages?: string[];
  onLanguageChange?: (lang: string) => void;
}

export function Sidebar({
  allPosts,
  selectedPostId,
  onSelectionChange,
  activeSection,
  onNavigate,
  sidebarState,
  onToggleSidebar,
  showButton,
  showMobileButton,
  categoryFilter = 'blog',
  onCategoryChange,
  getPostTitle,
  showThemeToggle,
  globalLanguage = 'zh',
  availableLanguages = [],
  onLanguageChange
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  const handlePostClick = (postId: string) => {
    console.log('Article clicked:', postId);
    onSelectionChange(postId);
    // Navigate to the article
    setTimeout(() => {
      onNavigate(postId);
    }, 100);
  };

  // Filter posts by category and hidden status
  // 'blog' shows all non-hidden posts (acts as 'all')
  // 'project' shows only project posts
  // Pinned posts always show regardless of filter (unless hidden)
  const filteredPosts = allPosts.filter(post => {
    if (post.hidden) return false; // Never show hidden posts
    if (post.isPinned) return true;
    if (categoryFilter === 'blog') return true; // Show all in blog view
    return post.category === 'project'; // Only show projects in project view
  });

  // Sort posts: pinned first, then by date (newest first)
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    // Pinned posts always come first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    
    // Within same pinned status, sort by date (newest first)
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const getSidebarWidth = () => {
    if (sidebarState === 'closed') return 'lg:w-0';
    return 'lg:w-80';
  };

  const getButtonPosition = () => {
    if (sidebarState === 'closed') return 'left-6';
    return 'left-[21rem]';
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          lg:hidden fixed top-6 left-6 z-50 p-2 bg-white/80 dark:bg-sidebar/80 text-gray-900 dark:text-sidebar-foreground 
          backdrop-blur-sm border border-gray-200 dark:border-sidebar-border rounded-full shadow-lg transition-all duration-300
          ${showMobileButton && !isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}
        `}
        aria-label="Toggle menu"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Desktop Sidebar Toggle Button */}
      <div className="hidden lg:block">
        <button
          onClick={() => {
            onToggleSidebar(sidebarState === 'closed' ? 'half' : 'closed');
          }}
          className={`
            fixed top-6 z-[60] p-2 bg-white/80 dark:bg-sidebar/80 text-gray-900 dark:text-sidebar-foreground 
            backdrop-blur-sm border border-gray-200 dark:border-sidebar-border rounded-full shadow-lg
            transition-all duration-300 hover:bg-gray-100 dark:hover:bg-muted
            ${getButtonPosition()}
            ${showButton ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}
          `}
          aria-label={sidebarState === 'closed' ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${sidebarState === 'closed' ? "" : "rotate-180"}`} />
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-white dark:bg-sidebar border-r border-gray-200 dark:border-sidebar-border
          transition-all duration-300 z-40 overflow-hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isOpen ? "w-full sm:w-80" : ""}
          ${getSidebarWidth()}
          ${sidebarState === 'closed' ? "lg:border-r-0" : ""}
        `}
      >
        <div className={`h-full flex flex-col p-6 overflow-y-auto w-full sm:w-80 transition-opacity duration-300 ${sidebarState === 'closed' ? 'lg:opacity-0 lg:pointer-events-none' : 'opacity-100'} scrollbar-hide`}>
          {/* Desktop Top Options: Theme & Language */}
          <div className="hidden lg:flex items-center justify-end gap-2 mb-4">
            {availableLanguages.length > 1 && onLanguageChange && (
              <LanguageSwitcherIcon
                languages={availableLanguages}
                currentLanguage={globalLanguage}
                onLanguageChange={onLanguageChange}
              />
            )}
            {showThemeToggle && <ThemeToggle />}
          </div>

          {/* Mobile Header with Close Button */}
          <div className="lg:hidden flex items-center justify-between mb-6 pt-2">
            <span className="text-lg font-semibold text-gray-900 dark:text-sidebar-foreground">Menu</span>
            <div className="flex items-center gap-2">
              {availableLanguages.length > 1 && onLanguageChange && (
                <LanguageSwitcherIcon
                  languages={availableLanguages}
                  currentLanguage={globalLanguage}
                  onLanguageChange={onLanguageChange}
                />
              )}
              {showThemeToggle && <ThemeToggle />}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 bg-gray-100 dark:bg-muted text-gray-900 dark:text-sidebar-foreground rounded-full hover:bg-gray-200 dark:hover:bg-sidebar-accent transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* <div className="space-y-6"> */}
            {/* Music Player */}
            {/* {showPlayer && (
              <iframe
                className="mb-6 rounded-lg"
                src="https://untitled.stream/embed/yFOzp7Z5FrEE"
                width="100%"
                scrolling="no"
                // height="180"
                // allowFullScreen
                // allow="autoplay; picture-in-picture"
                frameBorder="0"
                // loading="lazy"
              />
            )} */}
          {/* </div> */}

          {/* Category Toggle */}
          {onCategoryChange && (
            <div className="mb-6">
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-muted rounded-lg">
                <button
                  onClick={() => onCategoryChange('blog')}
                  className={`
                    flex-1 px-3 py-1.5 text-sm rounded-md transition-colors font-medium
                    ${categoryFilter === 'blog'
                      ? 'bg-white dark:bg-sidebar text-gray-900 dark:text-sidebar-foreground shadow-sm'
                      : 'text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-gray-100'
                    }
                  `}
                >
                  Blog
                </button>
                <button
                  onClick={() => onCategoryChange('project')}
                  className={`
                    flex-1 px-3 py-1.5 text-sm rounded-md transition-colors font-medium
                    ${categoryFilter === 'project'
                      ? 'bg-white dark:bg-sidebar text-gray-900 dark:text-sidebar-foreground shadow-sm'
                      : 'text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-gray-100'
                    }
                  `}
                >
                  Project
                </button>
              </div>
            </div>
          )}

          {/* Articles List */}
          <nav className="flex-1">
            <ul className="space-y-1">
              {sortedPosts.map((post, index) => {
                const isActive = selectedPostId === post.id;
                return (
                  <li key={post.id}>
                    <button
                      onClick={() => handlePostClick(post.id)}
                      className={`
                        w-full text-left px-3 py-2 text-sm transition-colors rounded-lg
                        ${
                          isActive
                            ? "bg-gray-100 dark:bg-muted text-gray-900 dark:text-sidebar-foreground"
                            : "text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-muted/50"
                        }
                      `}
                    >
                      <div className="flex items-baseline gap-3">
                        {post.isPinned ? (
                          <Pin className="w-3 h-3 text-gray-400 dark:text-muted-foreground min-w-[1.5rem]" />
                        ) : (
                          <span className="text-xs font-mono text-gray-400 dark:text-muted-foreground min-w-[1.5rem]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        )}
                        <span className="flex-1 truncate">{
                          getPostTitle ? getPostTitle(post) : extractTitle(post.content)
                        }</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="mt-auto pt-4 flex flex-col items-center gap-2">
            <div className="text-xs text-gray-500 dark:text-muted-foreground">
              {filteredPosts.length} articles
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}