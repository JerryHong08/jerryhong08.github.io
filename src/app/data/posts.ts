export interface BlogPost {
  id: string;
  date: string;
  content: string;
  description?: string;
  author?: string;
  tags?: string[];
  categories?: string[];
  isPinned?: boolean;
  category?: 'project' | 'blog';
  languages?: string[]; // Available languages for this post (e.g., ['en', 'zh'])
  defaultLanguage?: string; // Default language code (e.g., 'en')
  hidden?: boolean; // If true, post is not shown in the sidebar (default: false)
}

// Helper function to parse frontmatter from markdown
export function parseFrontmatter(content: string): {
  frontmatter: Record<string, any>;
  content: string;
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: {}, content };
  }
  
  const frontmatterStr = match[1];
  const markdownContent = match[2];
  const frontmatter: Record<string, any> = {};
  
  // Simple YAML parser for common cases
  const lines = frontmatterStr.split('\n');
  let currentKey = '';
  let currentArray: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Array item
    if (trimmed.startsWith('-')) {
      const value = trimmed.substring(1).trim();
      currentArray.push(value);
    }
    // Key-value pair
    else if (trimmed.includes(':')) {
      // Save previous array if exists
      if (currentKey && currentArray.length > 0) {
        frontmatter[currentKey] = currentArray;
        currentArray = [];
      }
      
      const [key, ...valueParts] = trimmed.split(':');
      const value = valueParts.join(':').trim();
      currentKey = key.trim();
      
      if (value) {
        // Handle inline array syntax: [item1, item2, item3]
        if (value.startsWith('[') && value.endsWith(']')) {
          const arrayContent = value.slice(1, -1);
          frontmatter[currentKey] = arrayContent.split(',').map((item: string) => item.trim());
        } else {
          frontmatter[currentKey] = value;
        }
        currentKey = '';
      }
    }
  }
  
  // Save last array if exists
  if (currentKey && currentArray.length > 0) {
    frontmatter[currentKey] = currentArray;
  }
  
  return { frontmatter, content: markdownContent };
}

// Helper function to extract title from markdown content
export function extractTitle(content: string): string {
  // First parse frontmatter to get clean content
  const { content: cleanContent } = parseFrontmatter(content);
  const match = cleanContent.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

// Helper function to get content without title
export function getContentWithoutTitle(content: string): string {
  const { content: cleanContent } = parseFrontmatter(content);
  // Remove the first # Title line
  return cleanContent.replace(/^#\s+.+$/m, '').trim();
}

// Helper function to process a post and extract metadata from frontmatter
export function processPost(post: BlogPost): BlogPost {
  const { frontmatter } = parseFrontmatter(post.content);

  // Extract isPinned (default: false)
  const isPinned = post.isPinned ??
    (frontmatter.isPinned === true ||
     frontmatter.isPinned === 'true' ||
     frontmatter.isPinned === 'True');

  // Extract category (default: 'blog')
  const category: 'project' | 'blog' =
    (frontmatter.category === 'project' || frontmatter.category === 'blog')
      ? frontmatter.category
      : 'blog';

  // Extract hidden (default: false)
  const hidden = post.hidden ??
    (frontmatter.hidden === true ||
     frontmatter.hidden === 'true' ||
     frontmatter.hidden === 'True');

  return {
    ...post,
    isPinned,
    category,
    hidden
  };
}