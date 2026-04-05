import { useState, useEffect, useRef, useCallback } from "react";
import { extractTitle, BlogPost, parseFrontmatter, getContentWithoutTitle, processPost } from "../data/posts";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";

// Import all blog markdown files at build time
const blogFiles = import.meta.glob('/blogs/**/*.md', { query: '?raw', import: 'default', eager: true });

// Store variants in a module-level map for lookup
const postVariantsMap = new Map<string, string>(); // key: "postId:lang" -> content

// Parse URL path to extract post ID
// Supports: /folder/post.md, /folder/post, /post.md, /post
function parseUrlPath(path: string): string | null {
  // Remove leading slash and any trailing slashes
  const cleanPath = path.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!cleanPath) return null;

  // Try to extract post ID from path
  // Pattern: /folder/post.md or /folder/post
  const parts = cleanPath.split('/');
  const lastPart = parts[parts.length - 1];

  // Remove .md extension if present
  const postId = lastPart.replace(/\.md$/, '');

  return postId || null;
}

// Build URL path for a post
function buildPostUrl(postId: string): string {
  return `/${postId}.md`;
}

export function MainPage() {
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [activeSection, setActiveSection] = useState("");
  const [sidebarState, setSidebarState] = useState<'closed' | 'half'>('half');
  const [showButton, setShowButton] = useState(true);
  const [showMobileButton, setShowMobileButton] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'project' | 'blog'>('blog');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [globalLanguage, setGlobalLanguage] = useState<string>('zh'); // Global language setting
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]); // All available languages

  const lastScrollY = useRef(0);
  const scrollTimeoutRef = useRef<number | null>(null);
  const isScrolling = useRef(false);
  const isNavigatingRef = useRef(false);
  const navigationTimeoutRef = useRef<number | null>(null);
  const initialUrlProcessed = useRef(false);

  // Load posts from blogs/* directory
  useEffect(() => {
    const loadPosts = () => {
      try {
        setIsLoading(true);

        // Group files by folder
        const filesByFolder = new Map<string, Array<{ filename: string; content: string }>>();

        for (const [path, content] of Object.entries(blogFiles)) {
          const markdownContent = content as string;
          if (!markdownContent.trim()) continue;

          const pathParts = path.split('/');
          const filename = pathParts[pathParts.length - 1];
          const folderName = pathParts[pathParts.length - 2] || '';

          if (!filesByFolder.has(folderName)) {
            filesByFolder.set(folderName, []);
          }
          filesByFolder.get(folderName)!.push({ filename, content: markdownContent });
        }

        const loadedPosts: BlogPost[] = [];

        // Process each folder
        for (const [folderName, files] of filesByFolder) {
          // Find the base .md file (not .xx.md) - must match pattern "name.md" not "name.xx.md"
          const baseFile = files.find(f => /^[^.]+\.md$/.test(f.filename));
          if (!baseFile) continue;

          const { frontmatter } = parseFrontmatter(baseFile.content);

          // Find all variant files (.xx.md) and extract language codes from filename
          const variantFiles: Array<{ filename: string; langCode: string; content: string }> = [];
          for (const f of files) {
            const match = f.filename.match(/^[^.]+\.([a-z]{2})\.md$/i);
            if (match) {
              variantFiles.push({ filename: f.filename, langCode: match[1].toLowerCase(), content: f.content });
            }
          }

          // Determine languages from files
          // Base file is always the system default language (zh)
          // Variant files have their language from filename (.en.md -> en)
          const systemDefaultLang = 'zh';
          const baseLanguage = systemDefaultLang;
          const languages: string[] = [baseLanguage];
          const variantContentMap = new Map<string, string>();

          // Store variant contents and build languages list
          for (const v of variantFiles) {
            variantContentMap.set(v.langCode, v.content);
            if (!languages.includes(v.langCode)) {
              languages.push(v.langCode);
            }
          }

          // Store variants in the global map
          for (const [lang, content] of variantContentMap) {
            postVariantsMap.set(`${folderName}:${lang}`, content);
          }

          const post: BlogPost = {
            id: folderName,
            date: frontmatter.date || new Date().toISOString().split('T')[0],
            content: baseFile.content,
            description: frontmatter.description || '',
            author: frontmatter.author || 'Anonymous',
            tags: frontmatter.tags || [],
            categories: frontmatter.categories || [],
            isPinned: frontmatter.isPinned === true || frontmatter.isPinned === 'true',
            category: frontmatter.category === 'project' ? 'project' : 'blog',
            languages: languages,
            defaultLanguage: baseLanguage,
            hidden: frontmatter.hidden === true || frontmatter.hidden === 'true',
          };

          loadedPosts.push(processPost(post));
        }

        // Filter out hidden posts
        const visiblePosts = loadedPosts.filter(post => !post.hidden);

        // Sort: pinned first, then by date
        visiblePosts.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        // Collect all available languages across all posts
        const allLanguages = new Set<string>();
        visiblePosts.forEach(post => {
          post.languages?.forEach(lang => allLanguages.add(lang));
        });

        setAllPosts(visiblePosts);
        setAvailableLanguages(Array.from(allLanguages));

        // Check for redirect from 404.html (GitHub Pages)
        const redirectPath = sessionStorage.getItem('spa-redirect-path');
        if (redirectPath) {
          sessionStorage.removeItem('spa-redirect-path');
          // Update URL without reload
          window.history.replaceState({}, '', redirectPath);
        }

        // Check URL for initial post selection
        const urlPostId = parseUrlPath(window.location.pathname);
        if (urlPostId) {
          // Check if the post exists (match by id or folder name)
          const targetPost = visiblePosts.find(p =>
            p.id === urlPostId ||
            p.id.toLowerCase() === urlPostId.toLowerCase()
          );
          if (targetPost) {
            setSelectedPostId(targetPost.id);
            setActiveSection(targetPost.id);
            // Will scroll after render
            setTimeout(() => scrollToSection(targetPost.id), 100);
          } else if (visiblePosts.length > 0) {
            setSelectedPostId(visiblePosts[0].id);
            setActiveSection(visiblePosts[0].id);
          }
        } else if (visiblePosts.length > 0) {
          setSelectedPostId(visiblePosts[0].id);
          setActiveSection(visiblePosts[0].id);
        }

        initialUrlProcessed.current = true;
      } catch (error) {
        console.error("Error loading posts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, []);

  // Keyboard shortcut for sidebar toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys when not in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft') {
        setSidebarState('closed');
      } else if (e.key === 'ArrowRight') {
        setSidebarState('half');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Scroll handling
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      isScrolling.current = true;

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Button show/hide and auto-close based on scroll direction
      // This should work even during navigation
      if (window.innerWidth >= 1024) {
        if (currentScrollY < lastScrollY.current) {
          setShowButton(true);
        } else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
          setShowButton(false);
          // Auto-collapse sidebar when scrolling down
          if (sidebarState !== 'closed') {
            setSidebarState('closed');
          }
        }
      }

      // Mobile button
      if (window.innerWidth < 1024) {
        if (currentScrollY < lastScrollY.current) {
          setShowMobileButton(true);
        } else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
          setShowMobileButton(false);
        }
      } else {
        setShowMobileButton(true);
      }

      lastScrollY.current = currentScrollY;

      scrollTimeoutRef.current = window.setTimeout(() => {
        isScrolling.current = false;
      }, 150);

      // Update active section - skip this during programmatic navigation
      if (!isNavigatingRef.current) {
        const sections = [selectedPostId];
        for (const sectionId of sections) {
          const element = document.getElementById(sectionId);
          if (element) {
            const rect = element.getBoundingClientRect();
            if (rect.top <= window.innerHeight / 3 && rect.bottom >= window.innerHeight / 3) {
              setActiveSection(sectionId);
              break;
            }
          }
        }
      }

      // Calculate scroll progress
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const currentProgress = (currentScrollY / totalHeight) * 100;
      setScrollProgress(currentProgress);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [sidebarState, selectedPostId]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    console.log('Scrolling to section:', sectionId, 'Element found:', !!element);

    if (element) {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }

      isNavigatingRef.current = true;

      // Update active section immediately
      setActiveSection(sectionId);

      // Scroll to the section with offset for better positioning
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });

      navigationTimeoutRef.current = window.setTimeout(() => {
        isNavigatingRef.current = false;
        navigationTimeoutRef.current = null;
      }, 3000);
    }
  };

  const handleToggleSidebar = (newState: 'closed' | 'half') => {
    setSidebarState(newState);
  };

  const handleSelectionChange = (postId: string) => {
    setSelectedPostId(postId);
    // Update URL when selecting via sidebar
    const newUrl = buildPostUrl(postId);
    if (window.location.pathname !== newUrl) {
      window.history.pushState({ postId }, '', newUrl);
    }
  };

  // Navigate to a post and update URL without page reload
  const navigateToPost = useCallback((postId: string) => {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    // Update URL
    const newUrl = buildPostUrl(postId);
    if (window.location.pathname !== newUrl) {
      window.history.pushState({ postId }, '', newUrl);
    }

    // Select and scroll to post
    setSelectedPostId(postId);
    setActiveSection(postId);
    // Wait for DOM to update before scrolling
    setTimeout(() => scrollToSection(postId), 50);
  }, [allPosts]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const urlPostId = parseUrlPath(window.location.pathname);
      if (urlPostId) {
        const targetPost = allPosts.find(p =>
          p.id === urlPostId || p.id.toLowerCase() === urlPostId.toLowerCase()
        );
        if (targetPost) {
          setSelectedPostId(targetPost.id);
          setActiveSection(targetPost.id);
          scrollToSection(targetPost.id);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [allPosts]);

  // Handle clicks on internal markdown links
  const handleMarkdownLinkClick = useCallback((href: string) => {
    // Check if it's an internal link (ends with .md or doesn't start with http)
    if (href.endsWith('.md') || (!href.startsWith('http') && !href.startsWith('#'))) {
      const postId = parseUrlPath(href);
      if (postId) {
        const targetPost = allPosts.find(p =>
          p.id === postId || p.id.toLowerCase() === postId.toLowerCase()
        );
        if (targetPost) {
          navigateToPost(targetPost.id);
          return true; // handled
        }
      }
    }
    return false; // not handled, use default behavior
  }, [allPosts, navigateToPost]);

  // Get selected posts for rendering
  const selectedPost = allPosts.find(post => post.id === selectedPostId);

  // Get content for the current language of a post
  const getPostContent = (post: BlogPost): string => {
    const defaultLang = post.defaultLanguage || 'zh';
    // Use global language, fallback to default if post doesn't have that language
    const currentLang = post.languages?.includes(globalLanguage) ? globalLanguage : defaultLang;

    // If we're on the default language, return the base content
    if (currentLang === defaultLang) {
      return post.content;
    }

    // Look up variant in the map
    const variantContent = postVariantsMap.get(`${post.id}:${currentLang}`);
    if (variantContent) {
      return variantContent;
    }

    // Fallback to base content if variant not found
    return post.content;
  };

  // Handle global language change
  const handleLanguageChange = (lang: string) => {
    setGlobalLanguage(lang);
  };

  // Get title for a post in the current language
  const getPostTitle = (post: BlogPost): string => {
    const content = getPostContent(post);
    return extractTitle(content);
  };

  // Get title for a post in a specific language
  const getPostTitleInLanguage = (post: BlogPost, lang: string): string => {
    const defaultLang = post.defaultLanguage || 'en';
    let content: string;

    if (lang === defaultLang) {
      content = post.content;
    } else {
      const variantContent = postVariantsMap.get(`${post.id}:${lang}`);
      content = variantContent || post.content;
    }

    return extractTitle(content);
  };

  // Calculate sidebar margin
  const getSidebarMargin = () => {
    if (sidebarState === 'closed') return 'lg:ml-0';
    return 'lg:ml-80';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-800 z-[70]">
        <div
          className="h-full bg-gray-900 dark:bg-gray-100 transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <Sidebar
        allPosts={allPosts}
        selectedPostId={selectedPostId}
        onSelectionChange={handleSelectionChange}
        activeSection={activeSection}
        onNavigate={scrollToSection}
        sidebarState={sidebarState}
        onToggleSidebar={handleToggleSidebar}
        showButton={showButton}
        showMobileButton={showMobileButton}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        getPostTitle={getPostTitle}
        showThemeToggle={true}
        globalLanguage={globalLanguage}
        availableLanguages={availableLanguages}
        onLanguageChange={handleLanguageChange}
      />

      <div className={`transition-all duration-300 ${getSidebarMargin()}`}>
        {/* Loading State */}
        {isLoading && (
          <section className="min-h-screen flex items-center justify-center px-6">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-800 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-500">Loading posts...</p>
            </div>
          </section>
        )}

        {/* Selected Blog Post */}
        {!isLoading && selectedPost && (() => {
          const currentContent = getPostContent(selectedPost);
          const { frontmatter } = parseFrontmatter(currentContent);
          const contentWithoutTitle = getContentWithoutTitle(currentContent);
          const currentLang = selectedPost.languages?.includes(globalLanguage) ? globalLanguage : (selectedPost.defaultLanguage || 'zh');

          return (
            <section
              key={`${selectedPost.id}-${currentLang}`}
              id={selectedPost.id}
              className="min-h-screen px-6 py-20 border-t border-gray-200 dark:border-gray-800"
            >
              <article className="max-w-3xl mx-auto">
                <header className="mb-12">
                  <h2 className="text-4xl md:text-5xl mb-4 text-gray-900 dark:text-gray-100 tracking-tight">
                    {extractTitle(currentContent)}
                  </h2>
                  <div className="text-sm text-gray-500 dark:text-gray-500 mb-2">
                    {selectedPost.date}
                  </div>
                  {(frontmatter.description || selectedPost.description) && (
                    <p className="text-base text-gray-600 dark:text-gray-400 italic mb-4">
                      {frontmatter.description || selectedPost.description}
                    </p>
                  )}
                  <div className="w-16 h-0.5 bg-gray-900 dark:bg-gray-100 mt-6"></div>
                </header>

                <div className="prose prose-gray dark:prose-invert prose-lg max-w-none">
                  <MarkdownRenderer content={contentWithoutTitle} postId={selectedPost.id} onLinkClick={handleMarkdownLinkClick} />
                </div>
              </article>
            </section>
          );
        })()}

        {/* Empty Selection State */}
        {!isLoading && !selectedPost && (
          <section className="min-h-screen flex items-center justify-center px-6">
            <div className="text-center max-w-md">
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                No articles selected
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Open the sidebar to explore and select articles to read
              </p>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="px-6 py-12 border-t border-gray-200 dark:border-gray-800">
          {(() => {
            const pinnedPosts = allPosts.filter(p => p.isPinned);
            if (pinnedPosts.length === 0) return null;

            return (
              <div className="max-w-3xl mx-auto text-center text-sm text-gray-500 dark:text-gray-500">
                {pinnedPosts.map((post, index) => {
                  // Use global language if pinned post has that language, otherwise fallback to default
                  const pinnedDefaultLang = post.defaultLanguage || 'zh';
                  const displayLang = post.languages?.includes(globalLanguage)
                    ? globalLanguage
                    : pinnedDefaultLang;

                  return (
                    <span key={post.id}>
                      <button
                        onClick={() => navigateToPost(post.id)}
                        className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
                      >
                        {getPostTitleInLanguage(post, displayLang)}
                      </button>
                      {index < pinnedPosts.length - 1 && <span className="mx-2">|</span>}
                    </span>
                  );
                })}
              </div>
            );
          })()}
        </footer>
      </div>
    </div>
  );
}
