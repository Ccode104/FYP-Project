const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:BT22CSE104atvnit@db.vzizykcqdyyhbbhmmpcs.supabase.co:5432/postgres' });
async function fixDriverCode() {
  try {
    const pythonDriverCode = `
import sys
import json
lines = sys.stdin.read().splitlines()
if not lines:
    sys.exit()
if len(lines) == 1 and lines[0].startswith('['):
    nums = json.loads(lines[0])
else:
    nums = [int(x) for x in lines if x.strip()]
print(max_subarray(nums))
`;
    
    // Convert to JSON and save back to DB
    const driverObj = { python: pythonDriverCode.trim() };
    await pool.query('UPDATE code_questions SET driver_code = $1 WHERE id = 803', [JSON.stringify(driverObj)]);
    console.log("Updated driver code for question 803");
  } catch (e) {
    console.error(e);
  } finally { pool.end(); }
}
fixDriverCode();
