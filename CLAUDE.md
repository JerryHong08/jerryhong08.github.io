# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A personal blog website with a book-like interface, deployed on GitHub Pages. The frontend is a React + Vite + Tailwind CSS application that fetches blog posts from a Supabase backend.

## Development Commands

All commands run from the `frontend/` directory:

```bash
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build
```

## Architecture

### Frontend Structure (`frontend/src/`)

**Entry Points:**
- `main.tsx` - Application entry point, renders App component
- `app/App.tsx` - Root component with ThemeProvider wrapper
- `app/routes.tsx` - React Router configuration (Note: Currently unused as MainPage handles all routing)

**Main Application (`app/components/`):**
- `MainPage.tsx` - Core application logic. Single-page layout with:
  - Collapsible sidebar for post selection
  - Main content area for reading posts
  - Scroll progress indicator
  - Fetches posts from Supabase backend (falls back to mock data)
- `Sidebar.tsx` - File-system style navigation with category filtering (blog/project)
- `MarkdownRenderer.tsx` - Custom react-markdown component with Tailwind styling
- `ThemeToggle.tsx` - Dark/light mode switch using next-themes
- `AddPost.tsx` - Button to add new posts via backend API

**Data Layer (`app/data/`):**
- `posts.ts` - BlogPost interface, mock posts data, frontmatter parsing utilities

**UI Components (`app/components/ui/`):**
- Extensive shadcn/ui component library (50+ components)
- Based on Radix UI primitives with Tailwind styling

### Content Management

Blog posts are stored as markdown with YAML frontmatter:

```yaml
---
author: Name
description: Brief description
tags: [tag1, tag2]
categories: [general]
category: blog | project
isPinned: true
---
```

**Post Sources:**
1. Supabase backend (primary) - Edge function at `make-server-99da9f88/posts`
2. Mock data fallback in `posts.ts` (used when backend unavailable)

### Styling

- **Tailwind CSS v4** with `@tailwindcss/vite` plugin
- **next-themes** for dark/light mode (uses `class` strategy)
- Custom color scheme: gray-50/950 backgrounds, minimal aesthetic
- Theme-aware transitions with `transition-colors duration-300`

### Key Technical Details

**Routing:**
- Uses `react-router` v7 with `createBrowserRouter`
- Three routes defined but MainPage component handles all content inline
- Routes: `/` (Cover), `/archive` (Catalog), `/post/:id` (BlogPost) - currently unused

**State Management:**
- React useState/useEffect for local state
- No global state library
- Posts fetched on mount, cached in component state

**Backend Integration:**
- Supabase Edge Functions for posts CRUD
- Supabase credentials in `utils/supabase/info.ts` (gitignored)
- Automatic fallback to mock data on connection failure

**Build Configuration:**
- Vite with React plugin
- Path alias `@/` maps to `src/`
- Supports raw imports for `.svg` and `.csv` files

## File Structure

```
frontend/
├── src/
│   ├── main.tsx              # Entry point
│   ├── app/
│   │   ├── App.tsx           # Root with theme provider
│   │   ├── routes.tsx        # Router config (unused)
│   │   ├── components/       # React components
│   │   │   ├── MainPage.tsx  # Main application
│   │   │   ├── Sidebar.tsx   # Navigation sidebar
│   │   │   ├── MarkdownRenderer.tsx
│   │   │   └── ui/           # shadcn components
│   │   └── data/
│   │       └── posts.ts      # Post types & mock data
│   └── styles/
│       └── index.css         # Global styles
├── index.html
├── package.json
├── vite.config.ts
└── postcss.config.mjs

blogs/                          # Markdown blog content
├── ayn-rand/
├── cybernectis/
├── fourier/
├── human-agent-interface/
├── machine-of-loving-grace/
└── midi-controller/

roadmap/                        # Task topology docs
└── login-system-design.md

ROADMAP.md                      # Project roadmap (topology format)
```

## Design Philosophy

- **Minimalism** - Clean, uncluttered interface
- **Book-like experience** - Cover page, catalog navigation, continuous reading flow
- **No page jumps** - Single-page app with smooth scroll navigation
- **Galaxy/river theme** - Dark mode with cosmic aesthetics (planned)

## Deployment Notes

- Target: GitHub Pages
- Build output: `frontend/dist/` (Vite default)
- Environment: Static export needed for GitHub Pages
