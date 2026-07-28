import { db } from './src/lib/server/db/db';
import { getBoardReports } from './src/lib/server/services/dashboards';
import { boards } from './src/lib/server/db/schema';
import { users } from './src/lib/server/db/schema';

async function main() {
  const allBoards = await db.select().from(boards).limit(1);
  const adminUser = await db.select().from(users).where({ email: 'admin@acme.internal' }).limit(1);
  
  if (allBoards.length === 0 || adminUser.length === 0) {
    console.log("Missing board or user");
    process.exit(1);
  }
  
  const actor = adminUser[0];
  const boardId = allBoards[0].id;
  
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  
  try {
    const res = await getBoardReports(actor as any, boardId, start, end);
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

main();
