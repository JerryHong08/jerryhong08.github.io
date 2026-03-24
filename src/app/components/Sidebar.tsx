import { useState } from "react";
import { extractTitle, BlogPost } from "../data/posts";
import { ChevronRight, Pin } from "lucide-react";

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
  postLanguages?: Record<string, string>;
  getPostTitle?: (post: BlogPost) => string;
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
  postLanguages,
  getPostTitle
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePostClick = (postId: string) => {
    console.log('Article clicked:', postId);
    onSelectionChange(postId);
    // Navigate to the article
    setTimeout(() => {
      onNavigate(postId);
    }, 100);
  };

  // Filter posts by category
  // 'blog' shows all posts (acts as 'all')
  // 'project' shows only project posts
  // Pinned posts always show regardless of filter
  const filteredPosts = allPosts.filter(post => {
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
          lg:hidden fixed top-6 left-6 z-50 p-2 bg-white/80 dark:bg-gray-900/80 text-gray-900 dark:text-gray-100 
          backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-full shadow-lg transition-all duration-300
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
            fixed top-6 z-[60] p-2 bg-white/80 dark:bg-gray-900/80 text-gray-900 dark:text-gray-100 
            backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-full shadow-lg
            transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800
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
          fixed top-0 left-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 
          transition-all duration-300 z-40 overflow-hidden
          ${isOpen ? "translate-x-0 w-full" : "-translate-x-full lg:translate-x-0"}
          ${getSidebarWidth()}
          ${sidebarState === 'closed' ? "lg:border-r-0" : ""}
        `}
      >
        <div className={`h-full flex flex-col p-6 overflow-y-auto w-80 transition-opacity duration-300 ${sidebarState === 'closed' ? 'lg:opacity-0 lg:pointer-events-none' : 'opacity-100'} scrollbar-hide`}>
          {/* Category Toggle */}
          {onCategoryChange && (
            <div className="mb-6 pt-12">
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <button
                  onClick={() => onCategoryChange('blog')}
                  className={`
                    flex-1 px-3 py-1.5 text-sm rounded-md transition-colors font-medium
                    ${categoryFilter === 'blog'
                      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
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
                      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
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
                            ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        }
                      `}
                    >
                      <div className="flex items-baseline gap-3">
                        {post.isPinned ? (
                          <Pin className="w-3 h-3 text-gray-400 dark:text-gray-600 min-w-[1.5rem]" />
                        ) : (
                          <span className="text-xs font-mono text-gray-400 dark:text-gray-600 min-w-[1.5rem]">
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
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-500">
            {filteredPosts.length} articles
          </div>
        </div>
      </aside>
    </>
  );
}