# Group-Level Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Group Admins to set a custom logo and default workspace theme for their entire group.

**Architecture:** We will add `logoUrl` and `defaultTheme` to the `groups` table, expose them via `locals.group` in `hooks.server.ts`, render the custom logo in `+layout.svelte`, and create a new `settings/workspace` route for Admins to manage these fields.

**Tech Stack:** SvelteKit, Drizzle ORM, Postgres, Tailwind CSS, Lucia Auth

## Global Constraints

- Mobile-first design for the Settings UI.
- No direct schema migrations in server startup; use `drizzle-kit push`.
- Proper error handling using native `use:enhance`.

---

### Task 1: Database Schema Extension

**Files:**
- Modify: `src/lib/server/db/schema.ts`
- Modify: `package.json` (just running script)

**Interfaces:**
- Produces: Updated `groups` table schema.

- [ ] **Step 1: Update Drizzle Schema**

Modify `src/lib/server/db/schema.ts` to add two columns to the `groups` table:
```typescript
export const groups = pgTable('groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  logoUrl: text('logo_url'),
  defaultTheme: varchar('default_theme', { length: 50 }).default('stratos').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 2: Generate and push migrations**

```bash
npm run db:push
npx drizzle-kit generate
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/db/schema.ts drizzle/
git commit -m "db: add logo_url and default_theme to groups table"
```

---

### Task 2: Inject Group Settings into Context

**Files:**
- Modify: `src/hooks.server.ts`
- Modify: `src/app.d.ts`

**Interfaces:**
- Consumes: `groups` schema.
- Produces: `event.locals.group` contains `logoUrl` and `defaultTheme`.

- [ ] **Step 1: Update `app.d.ts`**

Update the `Locals` interface:
```typescript
interface Locals {
	user: import('lucia').User | null;
	session: import('lucia').Session | null;
	group: {
		id: string;
		name: string;
		logoUrl: string | null;
		defaultTheme: string;
	} | null;
}
```

- [ ] **Step 2: Update `hooks.server.ts`**

In `hooks.server.ts`, modify the DB query that fetches the user's group to select the new fields:
```typescript
// Replace the existing group fetch with:
const groupData = await db.select({
	id: groups.id,
	name: groups.name,
	logoUrl: groups.logoUrl,
	defaultTheme: groups.defaultTheme
}).from(groups).where(eq(groups.id, user.groupId)).limit(1).then(res => res[0]);

event.locals.group = groupData || null;
```

- [ ] **Step 3: Commit**

```bash
git add src/app.d.ts src/hooks.server.ts
git commit -m "feat(core): inject group branding config into locals"
```

---

### Task 3: Workspace Settings UI

**Files:**
- Create: `src/routes/(app)/settings/workspace/+page.server.ts`
- Create: `src/routes/(app)/settings/workspace/+page.svelte`
- Modify: `src/routes/(app)/settings/_layout.svelte`

**Interfaces:**
- Consumes: `event.locals.group`

- [ ] **Step 1: Add Workspace Tab**

In `src/routes/(app)/settings/_layout.svelte`, add a new navigation link for Admins:
```html
<a href="/settings/workspace" class="nav-link">Workspace</a>
```
*(Ensure it checks if `data.user.role === 'Admin'` if such logic is in place).*

- [ ] **Step 2: Create Server Action**

Create `src/routes/(app)/settings/workspace/+page.server.ts`:
```typescript
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/db';
import { groups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'Admin') {
		throw redirect(302, '/dashboard');
	}
	return {
		group: locals.group
	};
};

export const actions = {
	updateBranding: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'Admin') return fail(403);
		const data = await request.formData();
		const defaultTheme = data.get('defaultTheme')?.toString();
		const logoUrl = data.get('logoUrl')?.toString() || null;
		
		await db.update(groups)
			.set({ defaultTheme, logoUrl })
			.where(eq(groups.id, locals.group!.id));
			
		return { success: true };
	}
};
```

- [ ] **Step 3: Create UI**

Create `src/routes/(app)/settings/workspace/+page.svelte`. Build a form with an input for `logoUrl` and a radio selection for `defaultTheme`. Use `use:enhance` to submit to `?/updateBranding`. Use the existing `Toast` component on success.

- [ ] **Step 4: Commit**

```bash
git add src/routes/\(app\)/settings/
git commit -m "feat(settings): add workspace branding configuration panel"
```

---

### Task 4: Apply Branding to App Shell

**Files:**
- Modify: `src/routes/(app)/+layout.svelte`

**Interfaces:**
- Consumes: `data.group` from layout load.

- [ ] **Step 1: Sidebar Logo Replacement**

In `src/routes/(app)/+layout.svelte`, find where the Stratos Logo is rendered (usually `<BrandLogoType>`).
Update it to conditionally render the group logo:
```html
{#if data.group?.logoUrl}
	<img src={data.group.logoUrl} alt={data.group.name} class="h-8 max-w-full object-contain" />
{:else}
	<BrandLogoType class="w-8 h-8 text-brand-primary" />
{/if}
```

- [ ] **Step 2: Fallback Theme Injection**

Add an `onMount` or `$effect` in `+layout.svelte` to apply the default theme if the user hasn't explicitly set one:
```javascript
import { onMount } from 'svelte';

onMount(() => {
	if (!localStorage.getItem('stratos-theme') && data.group?.defaultTheme) {
		document.documentElement.setAttribute('data-theme', data.group.defaultTheme);
	}
});
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/\(app\)/+layout.svelte
git commit -m "feat(ui): render workspace logo and inject group fallback theme"
```
