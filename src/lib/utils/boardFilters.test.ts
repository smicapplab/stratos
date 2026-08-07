import { describe, it, expect } from 'vitest';
import { filterTasks, type BoardFilterState } from './boardFilters';

describe('Board Filter Logic', () => {
  const sampleTasks: any[] = [
    {
      id: 'task-1',
      title: 'Fix login bug',
      description: 'Users cannot log in via SSO',
      number: 101,
      priority: 'Urgent',
      assigneeId: 'user-1',
      dueDate: '2026-01-01T00:00:00Z',
      parentTaskId: null
    },
    {
      id: 'task-2',
      title: 'Build Gantt view',
      description: 'Add Gantt view component to board',
      number: 102,
      priority: 'High',
      assigneeId: 'user-2',
      dueDate: '2026-12-31T00:00:00Z',
      parentTaskId: null
    },
    {
      id: 'task-3',
      title: 'Update docs',
      description: 'Document board filters',
      number: 103,
      priority: 'Low',
      assigneeId: null,
      dueDate: null,
      parentTaskId: 'task-1'
    },
    {
      id: 'task-4',
      title: 'Daily Standup Prep',
      description: 'Prepare notes',
      number: 104,
      priority: 'Medium',
      assigneeId: 'user-1',
      dueDate: new Date().toISOString(),
      parentTaskId: null
    }
  ];

  const defaultState: BoardFilterState = {
    searchQuery: '',
    assigneeIds: [],
    assignedToMe: false,
    priorities: [],
    dateFilter: 'all',
    tagIds: [],
    hierarchy: 'all'
  };

  it('filters by assignedToMe', () => {
    const result = filterTasks(sampleTasks, { ...defaultState, assignedToMe: true }, 'user-1');
    expect(result).toHaveLength(2);
    expect(result.map(t => t.id)).toEqual(['task-1', 'task-4']);
  });

  it('filters by search query matching title, description, or task number', () => {
    // Title match
    const titleMatch = filterTasks(sampleTasks, { ...defaultState, searchQuery: 'Gantt' });
    expect(titleMatch).toHaveLength(1);
    expect(titleMatch[0].id).toBe('task-2');

    // Description match
    const descMatch = filterTasks(sampleTasks, { ...defaultState, searchQuery: 'SSO' });
    expect(descMatch).toHaveLength(1);
    expect(descMatch[0].id).toBe('task-1');

    // Task number match: exact number
    const numMatch = filterTasks(sampleTasks, { ...defaultState, searchQuery: '103' });
    expect(numMatch).toHaveLength(1);
    expect(numMatch[0].id).toBe('task-3');

    // Task number match: tsk- prefix format
    const tskNumMatch = filterTasks(sampleTasks, { ...defaultState, searchQuery: 'tsk-101' });
    expect(tskNumMatch).toHaveLength(1);
    expect(tskNumMatch[0].id).toBe('task-1');
  });

  it('filters by priority', () => {
    const result = filterTasks(sampleTasks, { ...defaultState, priorities: ['Urgent', 'High'] });
    expect(result).toHaveLength(2);
    expect(result.map(t => t.id)).toEqual(['task-1', 'task-2']);
  });

  it('filters by date (overdue, today, no_date)', () => {
    // Overdue
    const overdueResult = filterTasks(sampleTasks, { ...defaultState, dateFilter: 'overdue' });
    expect(overdueResult).toHaveLength(1);
    expect(overdueResult[0].id).toBe('task-1');

    // Today
    const todayResult = filterTasks(sampleTasks, { ...defaultState, dateFilter: 'today' });
    expect(todayResult).toHaveLength(1);
    expect(todayResult[0].id).toBe('task-4');

    // No date
    const noDateResult = filterTasks(sampleTasks, { ...defaultState, dateFilter: 'no_date' });
    expect(noDateResult).toHaveLength(1);
    expect(noDateResult[0].id).toBe('task-3');
  });

  it('filters by hierarchy (epics_only, subtasks_only)', () => {
    // epics_only (parentTaskId === null)
    const epicsResult = filterTasks(sampleTasks, { ...defaultState, hierarchy: 'epics_only' });
    expect(epicsResult).toHaveLength(3);
    expect(epicsResult.map(t => t.id)).toEqual(['task-1', 'task-2', 'task-4']);

    // subtasks_only (parentTaskId !== null)
    const subtasksResult = filterTasks(sampleTasks, { ...defaultState, hierarchy: 'subtasks_only' });
    expect(subtasksResult).toHaveLength(1);
    expect(subtasksResult[0].id).toBe('task-3');
  });
});
