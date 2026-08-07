export interface BoardFilterState {
  searchQuery: string;
  assigneeIds: string[];
  assignedToMe: boolean;
  priorities: string[];
  dateFilter: 'all' | 'overdue' | 'today' | 'this_week' | 'no_date';
  tagIds: string[];
  hierarchy: 'all' | 'epics_only' | 'subtasks_only';
}

export function filterTasks(tasks: any[], filters: BoardFilterState, currentUserId?: string): any[] {
  if (!tasks || !Array.isArray(tasks)) return [];

  const searchLower = filters.searchQuery.trim().toLowerCase();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  return tasks.filter((task) => {
    // 1. Search Query
    if (searchLower) {
      const matchTitle = task.title ? task.title.toLowerCase().includes(searchLower) : false;
      const matchDesc = task.description ? task.description.toLowerCase().includes(searchLower) : false;
      const numberStr = task.number != null ? String(task.number) : '';
      const matchNumber = numberStr ? (`tsk-${numberStr}`.includes(searchLower) || numberStr === searchLower) : false;

      if (!matchTitle && !matchDesc && !matchNumber) {
        return false;
      }
    }

    // 2. Assigned to Me
    if (filters.assignedToMe && currentUserId) {
      if (task.assigneeId !== currentUserId) {
        return false;
      }
    }

    // 3. Specific Assignees
    if (filters.assigneeIds && filters.assigneeIds.length > 0) {
      const includesUnassigned = filters.assigneeIds.includes('unassigned');
      const isTaskUnassigned = !task.assigneeId;

      if (isTaskUnassigned) {
        if (!includesUnassigned) return false;
      } else {
        if (!filters.assigneeIds.includes(task.assigneeId)) return false;
      }
    }

    // 4. Priorities
    if (filters.priorities && filters.priorities.length > 0) {
      if (!task.priority || !filters.priorities.includes(task.priority)) {
        return false;
      }
    }

    // 5. Date Filter
    if (filters.dateFilter && filters.dateFilter !== 'all') {
      if (filters.dateFilter === 'no_date') {
        if (task.dueDate) return false;
      } else {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        const taskDateStr = taskDate.toISOString().slice(0, 10);

        if (filters.dateFilter === 'overdue') {
          if (taskDateStr >= todayStr) return false;
        } else if (filters.dateFilter === 'today') {
          if (taskDateStr !== todayStr) return false;
        }
      }
    }

    // 6. Hierarchy
    if (filters.hierarchy === 'epics_only') {
      if (task.parentTaskId !== null && task.parentTaskId !== undefined) {
        return false;
      }
    } else if (filters.hierarchy === 'subtasks_only') {
      if (task.parentTaskId === null || task.parentTaskId === undefined) {
        return false;
      }
    }

    return true;
  });
}
