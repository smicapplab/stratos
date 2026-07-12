import { db } from './src/lib/server/db/db.js';
import { tasks, users } from './src/lib/server/db/schema.js';
import { getTaskActivity } from './src/lib/server/services/tasks.js';

async function run() {
  const allTasks = await db.select().from(tasks).limit(1);
  const task = allTasks[0];
  const user = await db.select().from(users).where({ id: task.assigneeId || 'system' }).limit(1);
  
  try {
    const res = await getTaskActivity(task.id, { id: 'test', groupId: task.groupId, role: 'Admin' });
    console.log(res);
  } catch (e) {
    console.error("ERROR:");
    console.error(e);
  }
  process.exit(0);
}
run();
