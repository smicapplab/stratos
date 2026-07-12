import { db } from './src/lib/server/db/db.js';
import { tasks, stages, auditLogs } from './src/lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { moveTask } from './src/lib/server/services/tasks.js';

async function run() {
  const allTasks = await db.select().from(tasks).limit(1);
  if (allTasks.length === 0) { console.log('no tasks'); process.exit(0); }
  const task = allTasks[0];
  
  const allStages = await db.select().from(stages).where(eq(stages.boardId, task.boardId!));
  const newStage = allStages.find(s => s.id !== task.stageId);
  
  if (!newStage) { console.log('no other stage'); process.exit(0); }
  
  console.log(`Moving task ${task.id} from stage ${task.stageId} to ${newStage.id}`);
  
  await moveTask({ id: task.assigneeId || 'system', groupId: task.groupId, role: 'Admin' }, task.id, newStage.id, null, null);
  
  const logs = await db.select().from(auditLogs).where(eq(auditLogs.taskId, task.id));
  console.log('Logs after move:', logs);
  process.exit(0);
}
run();
