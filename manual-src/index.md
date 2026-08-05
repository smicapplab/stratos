---
layout: home

hero:
  name: "Stratos Manual"
  text: "AI Context Engine & Task Platform"
  tagline: Modern multi-group productivity, real-time Kanban, and native AI integration.
  actions:
    - theme: brand
      text: Get Started
      link: /01-getting-started.md
    - theme: alt
      text: View on GitHub
      link: https://github.com/smicapplab/stratos

features:
  - title: AI & MCP Agent Integration
    details: Native Model Context Protocol (MCP) server enabling AI assistants to manage tasks, query context, and automate workflows via natural language.
  - title: Instant Full-Text Search
    details: Powered by PostgreSQL tsvector indexing for lightning-fast search across tasks, descriptions, comments, and project boards.
  - title: Real-time Kanban Engine
    details: Fluid drag-and-drop board execution with fractional indexing and customizable multi-stage workflows.
  - title: Enterprise Security & Auth
    details: Zero-dependency Web Crypto session authentication engine with SHA-256 token hashing and multi-tenant RBAC isolation.
  - title: Analytics & Calendar
    details: Built-in project velocity tracking, workload distribution charts, team reports, and interactive calendar scheduling.
  - title: Keyboard-First Design
    details: Full keyboard navigation, global quick action palette, and rich Markdown editor for maximum productivity.
---

## Project & Author Information

- **Project Name**: Stratos - AI Context Engine & Workspace Platform
- **Project Type**: Personal Project
- **Author**: Steve
- **Development Started**: June 2026
- **Repository**: [github.com/smicapplab/stratos](https://github.com/smicapplab/stratos)

### Tech Stack
- **Frontend & Full-Stack**: SvelteKit 2, Svelte 5 (Runes), TypeScript, Tailwind CSS
- **Database & ORM**: PostgreSQL, Drizzle ORM, Full-Text Search (`tsvector`)
- **Session Auth**: Native Web Crypto Engine (`crypto.subtle` / `crypto.getRandomValues`), SHA-256 Hashing
- **Caching & Rate Limiting**: Redis, Rate-Limiter-Flexible
- **AI Integration**: Model Context Protocol (MCP) SDK (`@stratos/mcp-server`)
