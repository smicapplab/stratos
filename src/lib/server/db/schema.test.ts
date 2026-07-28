import { describe, it, expect } from 'vitest';
import { tasks } from './schema';
import { getTableColumns } from 'drizzle-orm';

describe('Tasks Schema - Full-Text Search Migration', () => {
	it('should include searchText column in tasks table', () => {
		const columns = getTableColumns(tasks);
		expect(columns).toHaveProperty('searchText');
		expect(columns.searchText.name).toBe('search_text');
	});

	it('should include searchVector column in tasks table', () => {
		const columns = getTableColumns(tasks);
		expect(columns).toHaveProperty('searchVector');
		expect(columns.searchVector.name).toBe('search_vector');
	});
});
