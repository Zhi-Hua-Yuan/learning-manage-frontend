# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Vue 3 + TypeScript frontend application for a learning management system (similar to TickTick). The project uses Vite as the build tool and includes features like task management, dashboard analytics, AI planning, weekly reviews, and settings.

## Technology Stack

- **Framework**: Vue 3.5.30 with Composition API
- **Language**: TypeScript 5.9.3
- **Build Tool**: Vite 7.3.1
- **State Management**: Pinia 3.0.4
- **Routing**: Vue Router 4.6.4
- **Styling**: Tailwind CSS 4.2.2
- **HTTP Client**: Axios 1.13.6
- **Linting**: ESLint 10.0.3 + Oxlint 1.51.0
- **Formatting**: Prettier 3.8.1

## Project Structure

```
src/
├── api/           # API request modules (task, project, user, review, ai, stats, milestone)
├── assets/        # Static assets and styles
├── layout/        # Layout components (BasicLayout)
├── router/        # Vue Router configuration
├── stores/        # Pinia state management
├── utils/         # Utility functions (request.ts for axios wrapper)
└── views/         # Page components
    ├── task/      # Task list view
    ├── dashboard/ # Data dashboard
    ├── review/    # Weekly review
    ├── ai/        # AI planner
    └── setting/   # Settings page
```

## Key Architectural Decisions

1. **Component Organization**: Views are organized by feature modules (task, dashboard, review, ai, setting)
2. **Layout System**: Single `BasicLayout` component with sidebar navigation and router-view for content
3. **API Layer**: Centralized API modules with consistent error handling and authentication
4. **Authentication**: JWT-based auth with token stored in localStorage and automatic redirect to login
5. **Styling**: Utility-first Tailwind CSS approach with consistent design tokens
6. **State Management**: Pinia for reactive state with project-based data scoping

## Development Commands

```bash
# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Code formatting
npm run format

# Production build
npm run build

# Preview production build
npm run preview
```

## Environment Requirements

- Node.js: ^20.19.0 || >=22.12.0
- Development backend: Expected at http://localhost:8123 (configured in vite.config.ts proxy)

## Key Configuration Files

- `vite.config.ts`: Vite configuration with Tailwind CSS and proxy settings
- `tsconfig.json`: TypeScript base configuration
- `eslint.config.ts`: ESLint configuration
- `.oxlintrc.json`: Oxlint configuration
- `.prettierrc.json`: Prettier configuration

## Authentication Flow

1. Login page (`/login`) - no auth required
2. All other routes require valid JWT token in localStorage
3. Router guard (`router/index.ts`) handles auth redirection
4. Axios interceptor adds token to requests and handles 401 errors
5. Token format: JWT stored as `token` in localStorage

## API Structure

All API modules follow consistent pattern:
- Export functions for each endpoint
- Use `request` utility (axios wrapper) with baseURL `/api`
- Automatic token injection via request interceptor
- Centralized error handling with business code checking (code !== 0)

## Common Development Tasks

### Adding a new page
1. Create `.vue` file in `src/views/`
2. Add route in `src/router/index.ts`
3. Add navigation link in `BasicLayout.vue` sidebar if needed

### Adding API endpoints
1. Create/update file in `src/api/` module
2. Use `request.get/post()` with proper TypeScript types

### Modifying styles
- Use Tailwind CSS utility classes in templates
- Custom styles go in `src/assets/main.css`

## IDE Setup Requirements

- VS Code with Vue.volar extension (disable Vetur)
- TypeScript Vue Plugin (Volar) for `.vue` file type support
- Tailwind CSS IntelliSense for class autocompletion