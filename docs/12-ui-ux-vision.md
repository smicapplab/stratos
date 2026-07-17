# 12 - UI/UX Vision: Premium Traditional Web App

This document defines the complete UI/UX target state for Stratos. Every decision here is grounded in building a fast, intuitive, and premium web application. We draw inspiration from modern SaaS tools, optimizing for speed using persistent WebSockets and Node servers.

---

## 1. The Design Philosophy (Non-Negotiable)

- **Speed is a feature.** Since we deploy to persistent Node servers, we can leverage Server-Sent Events (SSE) and in-memory optimizations:
  1. **Intentional Tap-Preloading**: Use `data-sveltekit-preload-data="tap"` for standard links.
  2. **Skeleton Screens, Not Spinners**: Full-page loads use structural skeleton screens (gray boxes matching the Kanban layout) to provide psychological speed. Spinners are banned.
  3. **Seeded State Flow**: We strictly use SvelteKit Loaders to **seed** our global client `$state` store per board. We do not use full-page `invalidate()` for real-time sync, as this causes "thundering herds". Instead, real-time updates are received as targeted delta patches over WebSockets and merged directly into the client-side `$state` store.
  4. **Optimistic UI**: No spinners on mutations that resolve in <300ms.
- **Clean by default, powerful on hover.** The board must look minimal at rest. Complexity (delete buttons, drag handles, action menus) only appears when you hover.
- **Zero "modes."** Users should never think "am I in edit mode or view mode?". Everything is always editable. Click title → start typing. Click a property → dropdown opens. No Save/Cancel flows for inline edits. **Crucially, auto-save is paired with a robust Undo stack (`Cmd+Z`) and a visible Version History for large text fields to prevent data loss. (Note: The custom Undo stack applies only to local, uncommitted typing states for scalar fields. For the rich text description, Yjs handles undo/redo seamlessly across the collaborative session).**
- **Keyboard-first, mouse-friendly.** Power users must be able to operate the entire app without touching a mouse. Casual users must never *need* a keyboard.
- **Mobile Layout: Performance-First DOM.** Mobile views are strictly read-only or limited-input to prevent DOM bloat. We minimize the mobile footprint by lazy-loading heavy components (e.g., the full activity feed) only when scrolled into view.

---

## 2. Navigation Architecture

### 2.1 Left Sidebar (Permanent)
The sidebar is the app's skeleton. It must be fast to navigate and never feel cluttered.

**Current state**: Flat list of links (Dashboard, Projects, Boards, Admin).

**Target state**: Context-aware, hierarchical navigation.

```
[ST] Stratos

WORKSPACE
  📊 My Tasks         ← Cross-board personal task view
  🔔 Inbox            ← Notification center (replaces bell icon in header)
  📅 My Calendar      ← Calendar view of tasks due this week

PROJECTS
  ▾ Q3 Launch          [+ Add Board]   ← Collapsible project group
      └ Content Pipeline               ← Board link (active = highlighted)
      └ Design Sprints
  ▾ Infrastructure
      └ Infra Backlog
  + New Project                        ← Admin only

ADMINISTRATION (Admin only)
  👥 User Access
```

**Interaction rules:**
- Active board link highlights with a left-side accent bar.
- Project groups are collapsible. State persists in localStorage.
- Hovering a project row reveals `[+ Add Board]` (opacity-0 → opacity-100).
- Sidebar width is fixed at 240px. No resizing (adds complexity, not value at this scale).

### 2.2 Top Header (Per-Board)
Minimal. Contains breadcrumb context and view switcher.

```
[← Q3 Launch] Content Pipeline    [Board] [Table] [Calendar]    [Filter ▾] [Group by ▾]
```

- Breadcrumb links back to the project page.
- View switcher tabs (Board, Table, Calendar) — styled as a modern segmented control.
- Filter and Group by live in the header, not inside a hidden settings panel.
- The standalone search bar in the header is replaced by the Command Palette hint: `(⌘K to search)`.

### 2.3 Command Palette (Cmd+K)
The single most important power-user feature — everything is one keypress away.

**Trigger:** `Cmd+K` from anywhere (global keydown listener with activeElement guard).

**Behavior:**
- Centered overlay with a blurred backdrop.
- Single input, auto-focused.
- Results grouped into sections as you type:

```
TASKS
  ▸ STR-102 · Fix login page redirect    [In Progress]   → opens TaskDrawer
  ▸ STR-88  · Update privacy policy      [Done]          → opens TaskDrawer

BOARDS & PROJECTS
  ▸ Content Pipeline (Q3 Launch)                         → navigates to board

QUICK ACTIONS
  ▸ Create new task in current board                     → inline quick-add
  ▸ Invite teammate                                      → opens admin panel
```

- `↑ ↓` to navigate, `Enter` to select, `Esc` to close.
- Task search uses a **Hybrid Approach** for 0ms latency. The currently active board's tasks (already loaded into `$state`) are indexed entirely client-side (via native array filtering or `minisearch`). This provides instant 0ms results for the user's immediate context. For global, cross-board searches, we fall back to a debounced (200ms) `fetch` to our Postgres `tsvector` endpoint.
- Zero results: "Press Enter to create '[query]' as a new task."

---

## 3. Board View (Kanban)

### 3.1 Filter Bar
A filter strip below the board header (collapsed by default, expands when `[Filter]` is clicked):

```
[Assignee: All ▾]  [Priority: All ▾]  [Due: All ▾]  [Hide Done ○]     [Clear All]
```

- All filters apply client-side on the `columns` derived state. No extra DB roundtrip.
- `Hide Done` toggle collapses the Done column entirely.
- Active filters shown as removable chips: `Priority: Urgent [✕]`.

### 3.2 Enhanced Task Cards
Cards need more visual density without adding noise:

```
┌──────────────────────────────────────────────────┐
│▌  Design the onboarding flow                    │   ← Priority left-border stripe
│                                                  │
│  🔴 Jun 15  · [Avatar]  · [■■□] 2/3             │   ← Due date, assignee, checklist bar
│                                       [⋯]  [✕]  │   ← Hover-only actions
└──────────────────────────────────────────────────┘
```

**Changes from current:**
- Priority: colored left border stripe (red=Urgent, orange=High, blue=Medium, gray=Low). No text badge on the card.
- Due date: 🔴 if overdue, 🟡 if due within 48h, plain if far out.
- Checklist progress bar: only shown if task has checklists. Mini `[■■□□]` pill.
- Subtask count: `↳ 3` badge if child tasks exist.
- Hover reveals: `⋯` (quick actions menu) and `✕` (delete).

### 3.3 Empty States
- Empty column: faded dashed drop zone, "Drop tasks here" label.
- Zero tasks anywhere on board: centered illustration + "Add your first task →" CTA.

---

## 4. Table / List View

A flat, spreadsheet-style view of all tasks. This is the #1 missing view — essential for users managing 50+ tasks.

### 4.1 Layout
```
 Title                      │ Status       │ Priority  │ Assignee    │ Due Date
 ─────────────────────────────────────────────────────────────────────────────
 ▾ TO DO (4)
   Fix login redirect        │ To Do        │ 🔴 Urgent  │ Steve       │ Jun 15
   Write Q3 report           │ To Do        │ 🟠 High    │ Unassigned  │ Jun 20
 ▾ IN PROGRESS (2)
   Update design system      │ In Progress  │ 🔵 Medium  │ Ana         │ —
 ─────────────────────────────────────────────────────────────────────────────
 + Add task
```

**Interaction rules:**
- Clicking a row → opens TaskDrawer.
- Clicking `Status` or `Priority` → opens an inline mini-dropdown, saves immediately.
- Column headers are sortable (client-side).
- Rows are grouped by Stage (collapsible section headers like Asana).
- "+ Add task" at the bottom of each group inserts inline with the same quick-add form.

**Implementation:** No separate data fetch. The Table view re-renders `data.tasks` from the board loader. View state (`'board' | 'table' | 'calendar'`) is `$state` persisted in `localStorage`.

---

## 5. Calendar View

Tasks plotted by `dueDate` on a monthly grid. Simple, not a full Gantt.

### 5.1 Layout
Standard 7-column calendar grid. Each day cell shows tasks due that day as colored priority chips. Clicking a chip opens the TaskDrawer. A right panel lists tasks with no due date.

- Month navigation: `← Prev` / `Next →`.
- Tasks without `dueDate` are excluded from the grid but listed in an "Undated" sidebar rail.
- No new data fetch — same board task data, filtered by `dueDate`.

---

## 6. Task Detail Sidebar — The Most Critical Surface

This is where users spend 80% of their time. The difference between "feels like Asana" and "feels like a CRUD app" lives here.

### 6.1 Target Layout (900px right-side drawer)

```
┌──────────────────────────────────────────────────────────────┐
│ ← STR-102     [Copy Link]  [Delete]               [✕ Close] │
├──────────────────────────────────────────────────────────────┤
│                                      │                        │
│  [TITLE — big editable textarea]     │  PROPERTIES            │
│                                      │  Status    In Progress  │
│  [DESCRIPTION — Tiptap rich editor]  │  Priority  🔴 Urgent   │
│  Add a description...                │  Assignee  Steve ↓     │
│                                      │  Due Date  Jun 15      │
│  ──── SUBTASKS ────                  │                        │
│  ◕ 2/4 complete                      │  LINKED ISSUES         │
│  ◻ Design mockups     STR-105        │  ⛔ Blocks: STR-55     │
│  ◻ Get stakeholder OK STR-106        │  🔗 Relates: STR-44    │
│  + Add subtask                       │                        │
│                                      │  ATTACHMENTS           │
│  ──── ACTIVITY ────                  │  📎 mockup.png         │
│  [All]  [Comments]  [History]        │  + Attach file         │
│                                      │                        │
│  [Avatar] Steve  · 2h ago            │                        │
│  "Looks good, can you fix the..."    │                        │
│  [Edit] [Delete]  (hover only)       │                        │
│                                      │                        │
│  — Priority changed: Medium → Urgent —                        │
│  (system log, centered grey text)                             │
│                                      │                        │
│  [Avatar]  [Tiptap comment editor]   │                        │
│            [Post  Cmd+↵]             │                        │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Specific UX Rules

**Title:** `<textarea>` styled as `text-2xl font-bold`, borderless. Auto-saves on `blur` or `Cmd+Enter`. Auto-expands height. No Save button.

**Description:** Tiptap editor. Starts as placeholder "Add a description..." until clicked. Supports `/` commands (`/code`, `/table`, `/checklist`). Supports `@mention` (queries `groupUsers` via `GET /api/users?q=`). Auto-saves on `blur`.

**Properties Panel (right, 280px):** Each property is a row: `[Label] [Borderless button/value]`. Clicking any value opens an inline popover — never navigates away. Changes fire PATCH immediately and write audit log.

**Subtasks:** Listed below description as mini-rows. Clicking a subtask opens it in the sidebar with a breadcrumb trail back to the parent. Progress ring `◕ 2/4` in section header. "+ Add subtask" creates a new task with `parentTaskId` set to current task.

**Activity Feed:**
- Three tabs: **All** (default), **Comments**, **History**.
- `All` interleaves human comments and system audit logs by `createdAt`.
- System logs: `— Steve changed Priority from Medium to Urgent · 2h ago —` (centered, `text-xs text-zinc-400`).
- Comments: avatar + bubble, author + relative timestamp. Edit/Delete on `group-hover`.
- Comment editor at the bottom. `Cmd+Enter` to submit.
- Comments are editable post-submission; show `(edited)` flag.

---

## 7. My Tasks (Personal View)

Cross-board view of every task assigned to `currentUser.id`, grouped by due urgency.

**Groups:** Due Today · Due This Week · Upcoming · No Due Date · Overdue (shown first in red)

**Data:** New `GET /my-tasks` loader joining `tasks`, `stages`, `boards` filtered by `assigneeId = currentUser`. Sorted by `dueDate ASC NULLS LAST`.

**Layout:** Same Table/List view component, just different data source. Each row shows a `[Board name]` breadcrumb column so users know where the task lives.

---

## 8. Keyboard Shortcuts

All shortcuts require `activeElement` guard: abort if focus is inside `INPUT`, `TEXTAREA`, or `[contenteditable]`.

| Shortcut | Action |
|---|---|
| `Cmd+K` | Open Command Palette |
| `C` | Focus comment editor (TaskDrawer must be open) |
| `A` | Open Assignee combobox (TaskDrawer must be open) |
| `P` | Open Priority combobox (TaskDrawer must be open) |
| `Esc` | Close TaskDrawer / Command Palette / active dropdown |
| `Cmd+Enter` | Submit comment / Save title (within input) |
| `?` | Open keyboard shortcut cheat sheet modal |

**Implementation:** A Svelte action (`use:globalShortcuts`) on the root layout `<div>`. Uses Svelte context to signal open panels (e.g., `getContext('taskSidebar')?.focusComment()`).

---

## 9. Micro-Interactions & Motion

These are non-negotiable. They are the difference between "feels like a tool" and "feels premium."

| Element | Interaction |
|---|---|
| TaskDrawer open | `translateX(100%) → 0` over 300ms, backdrop fades in |
| TaskDrawer close | `translateX(0) → 100%)` over 250ms, backdrop fades |
| Kanban card drag | Card lifts with `scale(1.02)` + `shadow-xl`, drop zone glows |
| Task card added | Card fades + slides from top of column (200ms) |
| Task deleted | Card fades out + height collapses (200ms) before DOM removal |
| Priority badge change | Subtle scale pulse on the badge |
| Comment posted | New comment fades in below the feed |
| Combobox open | Options `translateY(4px) → 0` over 150ms |
| Command Palette open | Backdrop + modal scale-in `scale(0.95) → 1` over 150ms |
| Unread notifications | Pulsing dot on bell icon |

All transitions must use `prefers-reduced-motion` media query to disable animations for accessibility.

---

## 10. Empty States

| Location | Empty State |
|---|---|
| Board with 0 tasks | Illustration + "Create your first task →" CTA button |
| Empty stage column | Faded dashed border, "Drop tasks here" |
| My Tasks (0 assigned) | "You have no assigned tasks. Enjoy the calm." |
| Search: 0 results | "No results for '[query]'. Press Enter to create it." |
| Inbox: 0 notifications | "You're all caught up! 🎉" |
| Calendar: no tasks this month | "No tasks due this month." |

---

## 11. Visual Design Tokens

### Priority Color System
| Priority | Left Border | Badge/Icon | Tailwind |
|---|---|---|---|
| Urgent | `bg-red-500` | 🔴 | `text-red-500` |
| High | `bg-orange-500` | 🟠 | `text-orange-500` |
| Medium | `bg-blue-400` | 🔵 | `text-blue-500` |
| Low | `bg-zinc-300` | ⚪ | `text-zinc-400` |

### Typography
- Task title (sidebar): `text-2xl font-bold tracking-tight`
- Card title: `text-sm font-medium`
- Property labels: `text-xs font-semibold uppercase tracking-wider text-zinc-500`
- System audit logs: `text-xs text-zinc-400 text-center italic`
- Human ID (STR-102): `text-xs font-mono text-zinc-400`

### Spacing & Shape
- Cards: `rounded-xl`, `shadow-sm`, `border border-zinc-200/50 dark:border-white/5`
- Popovers/dropdowns: `rounded-xl`, `shadow-xl`, `border border-zinc-200 dark:border-white/10`
- Buttons: `rounded-lg` (standard), `rounded-full` (icon buttons, pills)
- Hover transitions: always `transition-colors duration-150`

---

## 12. Mobile — Strict Responsive (Phone-First)

Users **must** be able to do their full daily work from a phone. This is not a "nice to have." Every page, every component, every interaction must be designed mobile-first and enhanced for desktop. If it doesn't work on a 375px screen, it doesn't ship.

### 12.1 Breakpoints

| Name | Width | Tailwind prefix | Target device |
|---|---|---|---|
| Mobile | 0–767px | (default, no prefix) | iPhone SE → iPhone Pro Max |
| Tablet | 768–1023px | `md:` | iPad, Android tablet |
| Desktop | 1024px+ | `lg:` | Laptop, external monitor |

**All layout components are built mobile-first.** Desktop styles are added with `md:` / `lg:` overrides, never the reverse.

---

### 12.2 Navigation: Bottom Tab Bar (Mobile)

On mobile (`< 768px`), the left sidebar is **completely replaced** by a fixed **bottom navigation bar** — exactly how Asana's mobile web works.

```
┌──────────────────────────────────────────────────┐
│                                                  │  ← Main content
│                                                  │
│                                                  │
├──────────────────────────────────────────────────┤
│  🏠 Home  │  ✅ My Tasks  │  🔔 Inbox  │  ☰ More │  ← Fixed bottom bar
└──────────────────────────────────────────────────┘
```

- **4 tabs:** Home, My Tasks, Inbox, More (opens a slide-up sheet with Projects + Admin links).
- Active tab has a colored dot or underline indicator.
- The bottom bar is `position: fixed; bottom: 0` with `padding-bottom: env(safe-area-inset-bottom)` to respect iPhone home indicator.
- Each tab icon + label is a minimum **56px tall** touch target.
- The left sidebar (`<aside>`) has `hidden lg:flex` — it only appears on desktop.

---

### 12.3 Kanban Board on Mobile

Trello's approach (horizontal scroll showing all columns) is the correct model for mobile Kanban. We copy it:

- **Horizontal scroll**, not collapsing to list view. Users expect to swipe between columns.
- Each column is `w-[85vw]` (85% viewport width) with a small peek of the next column to signal scrollability.
- `scroll-snap-type: x mandatory` + `scroll-snap-align: start` on each column — snaps cleanly to each column on scroll.
- Stage management is fully supported on mobile. Users can tap "Add Stage" at the end of the horizontal scroll.
- **Cross-Column Drag-and-Drop Limitation:** Moving items across horizontally scrolling, scroll-snapped containers on mobile Safari/Chrome is notoriously flaky because the browser's touch-action scrolling fights with drag coordinates. Instead of native long-press drag across columns, users tap a "Move To..." action on the card to change its stage.
- Within a column, vertical drag-and-drop reordering **remains enabled** (single-axis touch drag is reliable).

```
┌─────────────────────────────────────────────────────┐
│  Content Pipeline                    [Filter] [⌄]   │  ← Board header
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐  ┌──────────────      │
│  │  TO DO (3)               │  │  IN PROGRESS       │  ← Peek of next col
│  │  ┌──────────────────┐    │  │  (2)               │
│  │  │ Fix login bug     │    │  │  ┌─────────────   │
│  │  │ 🔴 Jun 15 · Steve │    │  │  │ Design mock    │
│  │  └──────────────────┘    │  │  │ 🟡 Jun 20 · Ana │
│  │  + New Task              │  │  └─────────────    │
│  └──────────────────────────┘  └──────────────      │
├─────────────────────────────────────────────────────┤
│  🏠 Home  │  ✅ Tasks  │  🔔 Inbox  │  ☰ More       │
└─────────────────────────────────────────────────────┘
```

---

### 12.4 Task Detail on Mobile (Unified Routing)

We do **not** use separate SvelteKit routes for mobile and desktop task details. 
The URL `/boards/[id]/tasks/[taskId]` maps to a single `+page.svelte` that renders the Board in the background and the Task detail over top of it. **The URL drives the state; CSS drives the layout.**

- **Mobile Layout & DOM Management:** Rendering a full Kanban board with hundreds of tasks behind a `z-50` overlay causes scroll jank on mobile. However, completely unmounting the board destroys its local `$state` context, causing a jarring loading flicker when navigating back.
  - **The Solution (CSS Hiding + Event Queueing):** When a Task Detail is opened on mobile, the background Kanban board is wrapped in a container that toggles `display: none` (or Tailwind `hidden`). Svelte 5 keeps the DOM nodes and state cached in memory without calculating layout or paint, preventing Out-Of-Memory (OOM) crashes while ensuring instantaneous "Back" navigation. Furthermore, the sync engine detects the hidden state and **pauses Svelte reactivity** by queuing incoming SSE deltas in a background array instead of applying them immediately. When the user taps "Back", the queue is flushed in a single batch, preventing battery drain from unseen DOM updates.
- **Desktop Layout:** The exact same component uses CSS `hidden lg:flex w-[900px] absolute top-0 right-0 z-50` to act as a right-side drawer, leaving the board visible on the left.
- **Content Flow (Mobile):** Single-column layout (the 2-column desktop split collapses). Order: Title → Properties (Assignee, Priority, Due Date in a horizontal chip row) → Description → Subtasks → Activity Feed → Comment Input (pinned to bottom above keyboard).
- **Navigation:** A `← Back` button in the top-left (mobile only) returns to the board URL `/boards/[id]`, which simply unhides the board container.
- **Keyboard:** Comment input field: `position: sticky; bottom: 0` with `padding-bottom: env(safe-area-inset-bottom)` so it stays above the soft keyboard.

---

### 12.5 Touch Targets

**Every interactive element must be at minimum 44×44px.** This is Apple's HIG requirement and Google's Material Design standard.

| Element | Min height | Implementation |
|---|---|---|
| Buttons | 44px | `min-h-[44px]` |
| Nav tabs | 56px | `min-h-[56px]` |
| Task card | 64px min | Natural — content-driven |
| Input fields | 44px | `h-[44px]` or `py-3` |
| Icon-only buttons | 44×44px | `p-3` on a 16px icon |
| Combobox options | 44px | `py-3 px-4` |

---

### 12.6 Floating Action Button (FAB)

On mobile, the primary "Create Task" action is a **circular FAB** in the bottom-right corner (above the bottom nav bar):

```
                                    ╭─────╮
                                    │  +  │  ← FAB, 56×56px, bg-blue-600
                                    ╰─────╯
┌──────────────────────────────────────────┐
│  🏠  │  ✅  │  🔔  │  ☰               │
└──────────────────────────────────────────┘
```

- `position: fixed; right: 16px; bottom: calc(56px + 16px + env(safe-area-inset-bottom))`
- Tapping it opens an inline quick-add form or navigates to task creation.
- Hidden on desktop (the board's in-column "+ New Task" button is used instead).

---

### 12.7 Typography & Density Scaling

On mobile, tighten spacing and reduce visual density:
- Card padding: `p-3` (not `p-4`)
- Font size for card titles: `text-sm` (same as desktop — do not reduce further)
- Property labels in TaskDrawer: displayed as a horizontal scrolling chip row, not a stacked vertical list
- Sidebar property panel (280px): does not exist on mobile — properties appear inline below the title

---

### 12.8 What Is Permitted to Differ on Mobile

| Feature | Desktop | Mobile |
|---|---|---|
| Navigation | Left sidebar (240px) | Bottom tab bar (4 tabs) |
| Task detail | Right side drawer (900px) | Full-screen page |
| Kanban columns | All visible, horizontally scrollable | `w-[85vw]` snap-scroll columns |
| Cross-column drag | ✅ Enabled | ❌ "Move To..." tap menu |
| Command Palette | `Cmd+K` anywhere | FAB tap + search input |
| Keyboard shortcuts | Full set | None (no physical keyboard assumed) |
| Stage management | ✅ Visible | ✅ Visible (End of scroll) |

---

## 13. Feedback & Error UI System

Native browser dialogs (`alert()`, `confirm()`, `prompt()`) are **banned**. They break the visual language of the app, block the thread, and cannot be styled.

### Toast Notifications
Non-blocking, auto-dismissing messages that slide in from the **bottom-right corner**.

| Type | Color | Duration | Use For |
|---|---|---|---|
| Success | `bg-emerald-600` | 3000ms | Task created, comment posted, settings saved |
| Error | `bg-red-600` | 5000ms | API failure, server 500, permission denied |
| Info | `bg-blue-600` | 3000ms | Background sync complete, copy-to-clipboard |
| Warning | `bg-amber-600` | 4000ms | Approaching due date, unsaved changes |

**Behavior:**
- Slides in with `translateY(16px) → 0` over 200ms.
- Auto-dismisses after its duration. User can also `✕` close manually.
- Multiple toasts stack vertically with a gap.
- Max 3 visible at once — oldest dismissed first if more queue up.

**Implementation:** `Toast.svelte` + a Svelte context store (`toastStore`) mountable from any component via `getContext('toast').add({ type, message })`.

### Confirm Modal (Destructive Actions)
Used for irreversible actions: deleting a task, removing a user, clearing a board.

```
┌──────────────────────────────────────────┐
│  Delete Task                          [✕] │
│  ─────────────────────────────────────── │
│  Are you sure you want to delete          │
│  "Design the onboarding flow"?            │
│  This action cannot be undone.            │
│                                           │
│             [Cancel]  [Delete Task]       │
│                        ↑ bg-red-600       │
└──────────────────────────────────────────┘
```

**Rules:**
- The destructive button label must match the action exactly — "Delete Task", "Remove User", never generic "Confirm".
- Cancel is always on the left, destructive action on the right.
- Clicking outside the modal or pressing `Esc` cancels.
- Backdrop is a semi-transparent `bg-black/40 backdrop-blur-sm`.
- **Accessibility (A11y)**: All modals must include `role="dialog"`, `aria-modal="true"`, and an `aria-labelledby` referencing the modal's title ID. Close buttons must have `aria-label="Close modal"`.

**Implementation:** `ConfirmModal.svelte` + `modalStore` context. Usage: `getContext('modal').confirm({ title, description, confirmLabel, onConfirm })`.


### Form Validation Errors (Inline)
Field-level validation errors display **inline beneath the input** — never as a Toast.

```
<input class="border-red-500 focus:ring-red-500" ... />
<p class="text-xs text-red-500 mt-1">Title cannot be empty.</p>
```

- Input border turns red (`border-red-500`) when invalid.
- Error text appears immediately on `blur` or on failed form submit attempt.
- Error clears as soon as the user starts typing again.

### Full-Page Error Boundary
For failed initial page loads (e.g., board not found, DB connection error) — never a white screen.

```
┌────────────────────────────────────┐
│                                    │
│   ⚠️  Something went wrong          │
│                                    │
│   Failed to load the board.        │
│   This may be a temporary issue.   │
│                                    │
│         [Try Again]                │
│                                    │
└────────────────────────────────────┘
```

Centered card, `max-w-md`, with a "Try Again" button that calls `invalidateAll()` or `location.reload()`.
