import pkg from 'pg';
import 'dotenv/config';

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/stratos',
});


async function setup() {
	console.log('Setting up Postgres triggers...');
	
	// Trigger to enforce max depth of 4 and prevent cyclical dependencies
	await pool.query(`
		CREATE OR REPLACE FUNCTION enforce_task_depth()
		RETURNS TRIGGER AS $$
		DECLARE
			current_parent_id UUID;
			depth INTEGER := 0;
			visited UUID[] := ARRAY[]::UUID[];
		BEGIN
			-- If there's no parent, it's a top-level task.
			IF NEW.parent_task_id IS NULL THEN
				RETURN NEW;
			END IF;

			current_parent_id := NEW.parent_task_id;
			visited := array_append(visited, NEW.id);

			WHILE current_parent_id IS NOT NULL LOOP
				-- Cyclical dependency check
				IF current_parent_id = ANY(visited) THEN
					RAISE EXCEPTION 'Cyclical dependency detected in task hierarchy!';
				END IF;

				visited := array_append(visited, current_parent_id);
				depth := depth + 1;

				-- Enforce max depth of 4 (Parent -> Subtask -> Sub-subtask -> Sub-sub-subtask)
				IF depth >= 4 THEN
					RAISE EXCEPTION 'Maximum task depth of 4 exceeded!';
				END IF;

				-- Move up the chain
				SELECT parent_task_id INTO current_parent_id 
				FROM tasks 
				WHERE id = current_parent_id;
			END LOOP;

			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`);

	await pool.query(`
		DROP TRIGGER IF EXISTS check_task_depth_trigger ON tasks;
		CREATE TRIGGER check_task_depth_trigger
		BEFORE INSERT OR UPDATE OF parent_task_id
		ON tasks
		FOR EACH ROW
		EXECUTE FUNCTION enforce_task_depth();
	`);

	console.log('Triggers set up successfully!');
	process.exit(0);
}

setup().catch(console.error);
