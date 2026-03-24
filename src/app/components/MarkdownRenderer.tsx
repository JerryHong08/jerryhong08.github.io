import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useMemo } from "react";

interface MarkdownRendererProps {
  content: string;
  postId: string;
}

// Strip HTML comments from content
function stripComments(content: string): string {
  return content.replace(/<!--[\s\S]*?-->/g, '');
}

// Transform relative image paths to work with the build
// This handles paths like ./assets/images/file.jpg -> /blogs/[post-id]/assets/images/file.jpg
function transformImagePaths(content: string, postId: string): string {
  // Replace markdown image syntax: ![alt](./assets/images/...)
  let processed = content.replace(
    /!\[([^\]]*)\]\((\.?\/)?assets\/images\/([^)]+)\)/g,
    (match, alt, _dotSlash, imagePath) => {
      return `![${alt}](/blogs/${postId}/assets/images/${imagePath})`;
    }
  );

  // Replace HTML img tags: <img src="./assets/images/..." ...>
  processed = processed.replace(
    /<img([^>]*?)src="(\.?\/)?assets\/images\/([^"]+)"([^>]*?)>/g,
    (match, beforeSrc, _dotSlash, imagePath, afterSrc) => {
      return `<img${beforeSrc}src="/blogs/${postId}/assets/images/${imagePath}"${afterSrc}>`;
    }
  );

  // Also handle single-quoted src attributes
  processed = processed.replace(
    /<img([^>]*?)src='(\.?\/)?assets\/images\/([^']+)'([^>]*?)>/g,
    (match, beforeSrc, _dotSlash, imagePath, afterSrc) => {
      return `<img${beforeSrc}src='/blogs/${postId}/assets/images/${imagePath}'${afterSrc}>`;
    }
  );

  return processed;
}

export function MarkdownRenderer({ content, postId }: MarkdownRendererProps) {
  // Process content: strip comments and transform image paths
  const processedContent = useMemo(() => {
    let processed = stripComments(content);
    // Transform relative image paths to absolute paths based on postId
    processed = transformImagePaths(processed, postId);
    return processed;
  }, [content, postId]);

  // Memoize components to prevent recreation on every render
  const components = useMemo(() => ({
    h1: ({ children }: { children: React.ReactNode }) => (
      <h1 className="text-4xl mb-6 mt-8 text-gray-900 dark:text-gray-100">
        {children}
      </h1>
    ),
    h2: ({ children }: { children: React.ReactNode }) => (
      <h2 className="text-3xl mb-4 mt-8 text-gray-900 dark:text-gray-100">
        {children}
      </h2>
    ),
    h3: ({ children }: { children: React.ReactNode }) => (
      <h3 className="text-2xl mb-3 mt-6 text-gray-900 dark:text-gray-100">
        {children}
      </h3>
    ),
    p: ({ children, node, ...props }: { children: React.ReactNode; node?: { properties?: { align?: string } } }) => {
      // Handle align attribute from HTML (e.g., <p align="center">)
      const align = node?.properties?.align;
      const isCenter = align === 'center';
      return (
        <p
          {...props}
          className={`mb-4 leading-relaxed text-gray-700 dark:text-gray-300 ${isCenter ? 'text-center flex justify-center' : ''}`}
        >
          {children}
        </p>
      );
    },
    ul: ({ children }: { children: React.ReactNode }) => (
      <ul className="mb-4 space-y-2 list-disc list-outside pl-5 text-gray-700 dark:text-gray-300">
        {children}
      </ul>
    ),
    ol: ({ children }: { children: React.ReactNode }) => (
      <ol className="mb-4 space-y-2 list-decimal list-outside pl-5 text-gray-700 dark:text-gray-300">
        {children}
      </ol>
    ),
    li: ({ children }: { children: React.ReactNode }) => (
      <li className="pl-1">{children}</li>
    ),
    blockquote: ({ children }: { children: React.ReactNode }) => (
      <blockquote className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 py-2 my-4 italic text-gray-600 dark:text-gray-400">
        {children}
      </blockquote>
    ),
    code: ({ className, children }: { className?: string; children: React.ReactNode }) => {
      const isInline = !className;
      
      if (isInline) {
        return (
          <code className="bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 rounded text-sm text-gray-800 dark:text-gray-200 font-mono">
            {children}
          </code>
        );
      }
      return (
        <code className="block bg-gray-100 dark:bg-gray-900 p-4 rounded my-4 overflow-x-auto text-sm text-gray-800 dark:text-gray-200 font-mono">
          {children}
        </code>
      );
    },
    pre: ({ children }: { children: React.ReactNode }) => (
      <pre className="my-4 overflow-x-auto">{children}</pre>
    ),
    strong: ({ children }: { children: React.ReactNode }) => (
      <strong className="text-gray-900 dark:text-gray-100">
        {children}
      </strong>
    ),
    em: ({ children }: { children: React.ReactNode }) => (
      <em className="text-gray-700 dark:text-gray-300">{children}</em>
    ),
    table: ({ children }: { children: React.ReactNode }) => (
      <div className="my-6 overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: { children: React.ReactNode }) => (
      <thead className="bg-gray-100 dark:bg-gray-900">{children}</thead>
    ),
    tbody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
    tr: ({ children }: { children: React.ReactNode }) => (
      <tr className="border-b border-gray-300 dark:border-gray-700">
        {children}
      </tr>
    ),
    th: ({ children }: { children: React.ReactNode }) => (
      <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-100">
        {children}
      </th>
    ),
    td: ({ children }: { children: React.ReactNode }) => (
      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
        {children}
      </td>
    ),
    hr: () => (
      <hr className="my-8 border-gray-300 dark:border-gray-700" />
    ),
    a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
      <a
        href={href}
        className="text-gray-900 dark:text-gray-100 underline hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
      // If width is specified, treat as inline-block (for side-by-side images)
      // Otherwise use block display with margins (for standalone images)
      const hasWidth = props.width || (props.style && typeof props.style === 'object' && 'width' in props.style);
      return (
        <img
          {...props}
          className={hasWidth
            ? `h-auto rounded-lg inline-block ${props.className || ''}`
            : `max-w-full h-auto rounded-lg my-4 ${props.className || ''}`
          }
          loading="lazy"
        />
      );
    },
  }), []);

  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={components}
    >
      {processedContent}
    </Markdown>
  );
}