#!/usr/bin/env node
/**
 * 清理 E2E 造数行程：只命中测试账号发布的「完成行程 <时间戳>」与「成长展示 <时间戳>」，
 * 并按外键顺序清掉体验、申请、聊天与通知。
 *
 * 默认 dry-run，只打印计划删除的行数；传 --apply 才真正写库。
 * 用法：node scripts/cleanup-e2e-trips.mjs [--apply] [--db <path>]
 */
import { DatabaseSync } from 'node:sqlite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const dbFlag = args.indexOf('--db');
const dbPath =
  dbFlag >= 0 && args[dbFlag + 1]
    ? resolve(args[dbFlag + 1])
    : resolve(HERE, '../RouteME/SqlLite/routeme.db');

const TITLE_PATTERNS = [/^完成行程 \d{10,}$/, /^成长展示 \d{10,}$/];
const TEST_USER_PATTERNS = ['growth%', 'e2e%'];

const db = new DatabaseSync(dbPath, { readOnly: !apply });
db.exec('PRAGMA busy_timeout = 8000;');
const all = (sql, ...params) => db.prepare(sql).all(...params);

const candidates = all(
  `SELECT t.id, t.title, u.username
     FROM trip_plans t
     JOIN app_users u ON u.id = t.publisher_id
    WHERE (u.username LIKE ? OR u.username LIKE ?)
    ORDER BY t.id`,
  ...TEST_USER_PATTERNS,
).filter((row) => TITLE_PATTERNS.some((pattern) => pattern.test(row.title)));

if (candidates.length === 0) {
  console.log('没有匹配的 E2E 造数行程，无需清理。');
  db.close();
  process.exit(0);
}

const ids = candidates.map((row) => row.id);
const inList = ids.join(',');
const count = (sql) => all(sql)[0].n;

const plan = {
  trip_experiences: count(
    `SELECT COUNT(*) AS n FROM trip_experiences WHERE trip_id IN (${inList})`,
  ),
  trip_experience_photos: count(
    `SELECT COUNT(*) AS n FROM trip_experience_photos WHERE trip_id IN (${inList})`,
  ),
  experience_likes: count(
    `SELECT COUNT(*) AS n FROM experience_likes
      WHERE experience_id IN (SELECT id FROM trip_experiences WHERE trip_id IN (${inList}))`,
  ),
  chat_messages: count(`SELECT COUNT(*) AS n FROM chat_messages WHERE trip_id IN (${inList})`),
  trip_applications: count(
    `SELECT COUNT(*) AS n FROM trip_applications WHERE trip_id IN (${inList})`,
  ),
  notifications: count(`SELECT COUNT(*) AS n FROM notifications WHERE trip_id IN (${inList})`),
};

console.log(`数据库：${dbPath}`);
console.log('匹配行程：');
for (const row of candidates) {
  console.log(`  #${row.id} ${row.title}（发布者 ${row.username}）`);
}
console.log('计划删除：', JSON.stringify({ ...plan, trip_plans: ids.length }));

if (!apply) {
  console.log('dry-run：未写库。加 --apply 执行删除。');
  db.close();
  process.exit(0);
}

db.exec('BEGIN');
try {
  db.exec(
    `DELETE FROM experience_likes
      WHERE experience_id IN (SELECT id FROM trip_experiences WHERE trip_id IN (${inList}))`,
  );
  db.exec(`DELETE FROM trip_experience_photos WHERE trip_id IN (${inList})`);
  db.exec(`DELETE FROM trip_experiences WHERE trip_id IN (${inList})`);
  db.exec(`DELETE FROM chat_messages WHERE trip_id IN (${inList})`);
  db.exec(`DELETE FROM trip_applications WHERE trip_id IN (${inList})`);
  db.exec(`DELETE FROM notifications WHERE trip_id IN (${inList})`);
  db.exec(`DELETE FROM trip_plans WHERE id IN (${inList})`);
  db.exec('COMMIT');
  console.log('已删除。');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
} finally {
  db.close();
}
