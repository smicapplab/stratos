# 05 - Dashboards & Analytics

## Concept
Dashboards allow Group Admins and Members to visualize workload, project progress, and custom metrics at a glance.

## Core Widgets
- **Task Status Distribution**: Pie/Donut charts showing tasks by Stage (To Do vs. In Progress vs. Done).
- **Workload by Assignee**: Bar charts showing how many active tasks are assigned to each user in the group.
- **Overdue Tasks**: A quick-filter list of tasks past their `dueDate`.
- **Custom Field Aggregations**: (Advanced) Summing or averaging number-type custom fields (e.g., "Total Story Points" or "Budget").

## Implementation Strategy
- **Database Layer**: Drizzle is used to execute `GROUP BY` and `COUNT()` aggregations natively in Postgres (`src/lib/server/services/dashboards.ts`).
- **The OLTP vs OLAP Compromise**: Running heavy analytical (OLAP) queries on the primary transactional database (OLTP) is an architectural risk. If large teams simultaneously load dashboards, CPU spikes will throttle core Kanban mutations. We accept this for the MVP stage, but rely heavily on the 5-minute Redis cache (see `10-backend-caching.md`) to shield Postgres. Long-term, dashboards must be routed to a read-replica.
- **Frontend Visualization**: We use **Chart.js** via `svelte-chartjs` to render widgets inside the reusable `<WidgetCard>` Svelte component.
- **Performance**: Dashboard queries are fetched asynchronously (using unawaited promises in SvelteKit `load` functions and `{#await}` blocks) so they don't block the initial page load.
- **Global vs Project**: A global Group Dashboard is available at `/dashboard`. Project-specific dashboards will follow the same pattern scoped to `boardId`.
