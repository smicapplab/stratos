# Group-Level Branding & Settings

## Goal
Implement a workspace-level (Group) branding engine that allows Group Admins to customize their organization's logo and default visual theme, without breaking multi-tenant isolation.

## User Flow
1. A Group Admin navigates to `Settings > Workspace` (a new settings page).
2. The Admin can upload a custom Workspace Logo (saved via the existing attachments/storage system).
3. The Admin can select a "Default Workspace Theme" (e.g. Emerald Oasis) from a dropdown.
4. When any user in that Group logs in, they see the custom Workspace Logo in the top-left sidebar instead of the default Stratos logo.
5. If a user has not explicitly set a personal `stratos-theme` preference in their `localStorage`, the app will automatically fall back to the Group's Default Workspace Theme.

## Architecture
- **Database (`groups` table)**:
  - Add `logoUrl` (text)
  - Add `defaultTheme` (varchar, length: 50, default: 'stratos')
- **Backend (`locals` / auth hook)**:
  - When the user's session is validated in `hooks.server.ts`, we already fetch their `groupId`. We should also join/fetch the `logoUrl` and `defaultTheme` from the `groups` table and inject it into `event.locals.group`.
- **Frontend App Shell (`+layout.svelte`)**:
  - The Sidebar component will read `data.group.logoUrl` and render it in place of the `<BrandLogoType>` SVG if present.
  - An inline script in `app.html` or a root Svelte `onMount` effect will check if the user lacks a personal theme, and if so, applies the `data.group.defaultTheme`.

## Technical Constraints
- The UI must follow the `stratos-ui` and Rule 14 Mobile-First responsive design guidelines.
- The database schema must be fully verified and migrated before feature completion.
- Form mutations must use native SvelteKit form actions and `use:enhance`.
