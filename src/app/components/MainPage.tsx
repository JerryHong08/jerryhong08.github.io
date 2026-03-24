import { useState, useEffect, useRef } from "react";
import { extractTitle, BlogPost, parseFrontmatter, getContentWithoutTitle, processPost } from "../data/posts";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";

// Import all blog markdown files at build time
const blogFiles = import.meta.glob('/blogs/**/*.md', { query: '?raw', import: 'default', eager: true });

// Store variants in a module-level map for lookup
const postVariantsMap = new Map<string, string>(); // key: "postId:lang" -> content

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
  const [postLanguages, setPostLanguages] = useState<Record<string, string>>({}); // postId -> selected language

  const lastScrollY = useRef(0);
  const scrollTimeoutRef = useRef<number | null>(null);
  const isScrolling = useRef(false);
  const isNavigatingRef = useRef(false);
  const navigationTimeoutRef = useRef<number | null>(null);

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
        const initialLanguages: Record<string, string> = {};

        // Process each folder
        for (const [folderName, files] of filesByFolder) {
          // Find the base .md file (not .xx.md) - must match pattern "name.md" not "name.xx.md"
          const baseFile = files.find(f => /^[^.]+\.md$/.test(f.filename));
          if (!baseFile) continue;

          const { frontmatter } = parseFrontmatter(baseFile.content);

          // Get declared languages from frontmatter (e.g., Language: [zh, en])
          // The FIRST language is what the base .md file contains
          const declaredLangs = frontmatter.Language || frontmatter.language || [];
          const languageList: string[] = Array.isArray(declaredLangs)
            ? declaredLangs
            : typeof declaredLangs === 'string'
              ? declaredLangs.split(',').map((l: string) => l.trim())
              : [];

          if (languageList.length < 2) {
            // No multilingual support, add post as-is
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
            };
            loadedPosts.push(processPost(post));
            continue;
          }

          // Multilingual post detected
          const baseLanguage = languageList[0]; // The base file's language
          const otherLanguages = languageList.slice(1); // Languages that should have variant files

          // Find all variant files (.xx.md) in the folder
          const variantFiles: Array<{ filename: string; langCode: string; content: string }> = [];
          for (const f of files) {
            const match = f.filename.match(/^[^.]+\.([a-z]{2})\.md$/i);
            if (match) {
              variantFiles.push({ filename: f.filename, langCode: match[1].toLowerCase(), content: f.content });
            }
          }

          // Map variant files to languages from frontmatter
          // Try to match by exact language code first, then assign remaining files to remaining languages
          const variantContentMap = new Map<string, string>(); // lang -> content
          const usedVariants = new Set<string>();

          // First pass: exact match between variant file suffix and language code
          for (const lang of otherLanguages) {
            const matchingVariant = variantFiles.find(v => v.langCode === lang.toLowerCase() && !usedVariants.has(v.filename));
            if (matchingVariant) {
              variantContentMap.set(lang, matchingVariant.content);
              usedVariants.add(matchingVariant.filename);
            }
          }

          // Second pass: assign remaining variants to remaining languages (in order)
          const remainingLanguages = otherLanguages.filter(lang => !variantContentMap.has(lang));
          const remainingVariants = variantFiles.filter(v => !usedVariants.has(v.filename));
          for (let i = 0; i < remainingLanguages.length && i < remainingVariants.length; i++) {
            variantContentMap.set(remainingLanguages[i], remainingVariants[i].content);
          }

          // Build complete language list: base + found variants
          const languages = [baseLanguage];
          for (const [lang] of variantContentMap) {
            if (!languages.includes(lang)) {
              languages.push(lang);
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
          };

          loadedPosts.push(processPost(post));
          initialLanguages[folderName] = baseLanguage;
        }

        // Sort: pinned first, then by date
        loadedPosts.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        setAllPosts(loadedPosts);
        setPostLanguages(initialLanguages);

        if (loadedPosts.length > 0) {
          setSelectedPostId(loadedPosts[0].id);
          setActiveSection(loadedPosts[0].id);
        }
      } catch (error) {
        console.error("Error loading posts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
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
  };

  // Get selected posts for rendering
  const selectedPost = allPosts.find(post => post.id === selectedPostId);

  // Get content for the current language of a post
  const getPostContent = (post: BlogPost): string => {
    const defaultLang = post.defaultLanguage || 'en';
    const currentLang = postLanguages[post.id] || defaultLang;

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

  // Handle language change for current post
  const handleLanguageChange = (lang: string) => {
    if (selectedPostId) {
      setPostLanguages(prev => ({ ...prev, [selectedPostId]: lang }));
    }
  };

  // Get title for a post in the current language
  const getPostTitle = (post: BlogPost): string => {
    const content = getPostContent(post);
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

      {/* Theme Toggle and Language Switcher - Top Right - Only visible when sidebar is open */}
      <div className="hidden lg:block">
        <div
          className={`
            fixed top-6 right-6 z-[60] transition-all duration-300 flex items-center gap-2
            ${sidebarState !== 'closed' ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}
          `}
        >
          {selectedPost?.languages && selectedPost.languages.length > 1 && (
            <LanguageSwitcher
              languages={selectedPost.languages}
              currentLanguage={postLanguages[selectedPost.id] || selectedPost.defaultLanguage || 'en'}
              onLanguageChange={handleLanguageChange}
            />
          )}
          <ThemeToggle />
        </div>
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
        postLanguages={postLanguages}
        getPostTitle={getPostTitle}
        showThemeToggle={true}
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
          const currentLang = postLanguages[selectedPost.id] || selectedPost.defaultLanguage || 'en';

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
                  <MarkdownRenderer content={contentWithoutTitle} postId={selectedPost.id} />
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
          <div className="max-w-3xl mx-auto text-center text-sm text-gray-500 dark:text-gray-500">
            <p>{selectedPost ? 1 : 0} selected works · March 2026</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
