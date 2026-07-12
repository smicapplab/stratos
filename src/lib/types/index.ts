import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import * as schema from '../server/db/schema';

// Task Types
export type Task = InferSelectModel<typeof schema.tasks>;
export type NewTask = InferInsertModel<typeof schema.tasks>;

// Board & Stage Types
export type Board = InferSelectModel<typeof schema.boards>;
export type Stage = InferSelectModel<typeof schema.stages>;

// User & Group Types
export type User = InferSelectModel<typeof schema.users>;
export type Group = InferSelectModel<typeof schema.groups>;

// Define the shape of our JSONB checklist
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}
