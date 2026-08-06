# 6. Daily Standups & Asynchronous Reports

Stratos Daily Standups provides an asynchronous daily check-in module to keep engineering and product teams aligned without synchronous meeting overhead.

## Enabling Daily Standups for a Project

Daily Standups are **opt-in per project**.

1. Open your project and click **Project Settings**.
2. Locate the **Daily Standups** configuration card.
3. Toggle **Enable Daily Standups** to ON.
4. Once enabled, a **Daily Standup** menu link appears at the bottom of the project's sidebar navigation (below board links).

> **Data Safety Guarantee**: Disabling Daily Standups hides check-in prompts and navigation, but **never deletes historical check-in records**. Re-enabling the feature at any time instantly restores all previous standup history.

---

## Daily Check-in Process

Team members can log their daily intents in the morning and report outcomes in the evening.

1. Navigate to **Projects -> [Your Project] -> Daily Standup**.
2. Click **Log Today's Standup** (or click today's cell in the Team Grid Matrix).
3. **Morning Focus & Intent**:
   - Write your planned accomplishments for the day.
   - **Task Suggestions**: Click any of the pre-populated task chips under *"In-Progress Tasks"* to insert Markdown links directly into your report (e.g. `[Fix API Auth](/boards/b1?task=t1)`).
4. **Evening Accomplishments & Outcome**:
   - Record what you completed.
   - Click pre-populated chips under *"Completed Tasks"* to automatically attach reference links.
5. **Blockers & Dependencies**:
   - Flag any blockers, dependencies, or impediments requiring lead or PM intervention.
6. Click **Save Standup Check-in**.

---

## Retroactive Past-Date Check-ins

If you missed logging a check-in yesterday or were out sick 3 days ago, you can retroactively log or update past entries.

1. Open the **Daily Standup** page for your project.
2. In the **Team Member Grid Matrix**, find your row (indicated by the **"You"** badge).
3. Click on **any past-date cell** on your row.
4. The Check-in Modal will open pre-populated for that specific past date, allowing you to enter or revise your report.

---

## Date Range Navigation & Controls

The top control bar provides flexible date window options for team leads and project managers:

- **Date Presets**:
  - `This Week (Mon–Fri)`: Shows the current work week.
  - `This Month`: Shows the complete current calendar month.
  - `Last Month`: Shows the previous full calendar month.
  - `Last 30 Days`: Shows a rolling 30-day window.
  - `Custom Date Range`: Pick custom Start and End dates.
- **Contextual Chevron Navigation (`←` / `→`)**:
  - Hover over chevrons to see dynamic tooltips (e.g., *"Previous Month"*, *"Next Week"*).
  - Clicking `←` or `→` shifts the view backward or forward while **preserving your active preset selection**.

---

## Team Lead Analytics & Exporting Reports

### Executive Analytics Summary
Project leads and managers can view high-level metrics for the selected date window:
- **Completion Rate %**: Ratio of submitted standups versus expected weekday entries across team members.
- **Total Standups Submitted**: Count of completed or checked-in reports.
- **Blockers Flagged**: Count of reported blockers requiring assistance.

### Native Excel (.xlsx) Workbook Export
1. Click the **Export Excel** button in the header bar.
2. Stratos generates a native `.xlsx` workbook containing two sheets:
   - **Sheet 1 (Executive Summary)**: High-level metrics, date range, and team roster.
   - **Sheet 2 (Detailed Check-in Logs)**: Complete log rows with timestamps, morning focus, evening outcomes, and blockers.

### Printable PDF Report Mode
1. Click the **Print / PDF** button in the header bar (or press `Ctrl+P` / `Cmd+P`).
2. Stratos applies clean print formatting, hiding sidebars and controls, allowing you to save a high-density PDF report directly from your browser.
