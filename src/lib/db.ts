import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

const databasePath =
  process.env.DATABASE_PATH ??
  (process.env.NODE_ENV === "production" ? "/data/studynow.db" : "./.data/studynow.db");

mkdirSync(dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    anon_label TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    institution TEXT NOT NULL,
    course_code TEXT NOT NULL,
    description TEXT NOT NULL,
    visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
    invite_code TEXT NOT NULL UNIQUE,
    owner_session_id TEXT NOT NULL REFERENCES sessions(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS memberships (
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, session_id)
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    author_session_id TEXT NOT NULL REFERENCES sessions(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    anonymous INTEGER NOT NULL DEFAULT 1 CHECK (anonymous IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    author_session_id TEXT NOT NULL REFERENCES sessions(id),
    body TEXT NOT NULL,
    anonymous INTEGER NOT NULL DEFAULT 1 CHECK (anonymous IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_memberships_session ON memberships(session_id);
  CREATE INDEX IF NOT EXISTS idx_questions_group ON questions(group_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id, created_at ASC);
`);

export interface Viewer {
  id: string;
  displayName: string;
  anonLabel: string;
}

export interface GroupSummary {
  id: number;
  name: string;
  institution: string;
  courseCode: string;
  description: string;
  visibility: "public" | "private";
  inviteCode: string;
  createdAt: string;
  memberCount: number;
  questionCount: number;
  isMember: boolean;
  isOwner: boolean;
}

export interface QuestionSummary {
  id: number;
  groupId: number;
  title: string;
  body: string;
  authorName: string;
  anonymous: boolean;
  createdAt: string;
  answerCount: number;
}

export interface AnswerView {
  id: number;
  body: string;
  authorName: string;
  anonymous: boolean;
  createdAt: string;
}

export interface QuestionView extends QuestionSummary {
  group: GroupSummary;
  answers: AnswerView[];
}

type GroupRow = Omit<GroupSummary, "isMember" | "isOwner"> & {
  isMember: number;
  isOwner: number;
};

type QuestionRow = Omit<QuestionSummary, "anonymous"> & { anonymous: number };
type AnswerRow = Omit<AnswerView, "anonymous"> & { anonymous: number };

const groupSelect = `
  SELECT
    g.id,
    g.name,
    g.institution,
    g.course_code AS courseCode,
    g.description,
    g.visibility,
    g.invite_code AS inviteCode,
    g.created_at AS createdAt,
    (SELECT COUNT(*) FROM memberships m WHERE m.group_id = g.id) AS memberCount,
    (SELECT COUNT(*) FROM questions q WHERE q.group_id = g.id) AS questionCount,
    EXISTS(
      SELECT 1 FROM memberships m
      WHERE m.group_id = g.id AND m.session_id = @viewerId
    ) AS isMember,
    (g.owner_session_id = @viewerId) AS isOwner
  FROM groups g
`;

function mapGroup(row: GroupRow): GroupSummary {
  return { ...row, isMember: Boolean(row.isMember), isOwner: Boolean(row.isOwner) };
}

function mapQuestion(row: QuestionRow): QuestionSummary {
  return { ...row, anonymous: Boolean(row.anonymous) };
}

function makeSeedData(): void {
  const count = sqlite.prepare("SELECT COUNT(*) AS count FROM groups").get() as { count: number };
  if (count.count > 0) return;

  sqlite.transaction(() => {
    sqlite
      .prepare("INSERT OR IGNORE INTO sessions (id, display_name, anon_label) VALUES (?, ?, ?)")
      .run("seed-facilitator", "Mira, facilitator", "Anonymous Atlas");
    sqlite
      .prepare("INSERT OR IGNORE INTO sessions (id, display_name, anon_label) VALUES (?, ?, ?)")
      .run("seed-learner", "Theo", "Anonymous Fern");

    const group = sqlite
      .prepare(
        `INSERT INTO groups
          (name, institution, course_code, description, visibility, invite_code, owner_session_id)
         VALUES (?, ?, ?, ?, 'public', ?, ?)`,
      )
      .run(
        "Open Study Hall",
        "Open to every learner",
        "STUDY 101",
        "A public room for comparing explanations and trying StudyNow before creating a course group.",
        "OPEN24",
        "seed-facilitator",
      );
    const groupId = Number(group.lastInsertRowid);

    sqlite
      .prepare("INSERT INTO memberships (group_id, session_id, role) VALUES (?, ?, ?)")
      .run(groupId, "seed-facilitator", "owner");
    sqlite
      .prepare("INSERT INTO memberships (group_id, session_id, role) VALUES (?, ?, ?)")
      .run(groupId, "seed-learner", "member");

    const question = sqlite
      .prepare(
        `INSERT INTO questions
          (group_id, author_session_id, title, body, anonymous)
         VALUES (?, ?, ?, ?, 1)`,
      )
      .run(
        groupId,
        "seed-learner",
        "What makes an explanation actually helpful?",
        "I understand definitions, but I get stuck when I cannot see why an idea matters. What do you include when you explain something to a peer?",
      );

    sqlite
      .prepare(
        `INSERT INTO answers (question_id, author_session_id, body, anonymous)
         VALUES (?, ?, ?, 0)`,
      )
      .run(
        Number(question.lastInsertRowid),
        "seed-facilitator",
        "I start with one concrete situation, name the decision the idea helps with, and only then introduce the formal definition. A useful explanation gives someone a next move, not only a correct sentence.",
      );
  })();
}

makeSeedData();

export function getViewer(id: string): Viewer | undefined {
  return sqlite
    .prepare(
      `SELECT id, display_name AS displayName, anon_label AS anonLabel
       FROM sessions WHERE id = ?`,
    )
    .get(id) as Viewer | undefined;
}

export function createViewer(viewer: Viewer): Viewer {
  sqlite
    .prepare("INSERT INTO sessions (id, display_name, anon_label) VALUES (?, ?, ?)")
    .run(viewer.id, viewer.displayName, viewer.anonLabel);
  return viewer;
}

export function updateViewer(id: string, displayName: string): Viewer {
  sqlite.prepare("UPDATE sessions SET display_name = ? WHERE id = ?").run(displayName, id);
  return getViewer(id)!;
}

export function listJoinedGroups(viewerId: string): GroupSummary[] {
  const rows = sqlite
    .prepare(
      `${groupSelect}
       WHERE EXISTS (
         SELECT 1 FROM memberships own
         WHERE own.group_id = g.id AND own.session_id = @viewerId
       )
       ORDER BY g.created_at DESC`,
    )
    .all({ viewerId }) as GroupRow[];
  return rows.map(mapGroup);
}

export function listPublicGroups(viewerId: string): GroupSummary[] {
  const rows = sqlite
    .prepare(
      `${groupSelect}
       WHERE g.visibility = 'public'
         AND NOT EXISTS (
           SELECT 1 FROM memberships own
           WHERE own.group_id = g.id AND own.session_id = @viewerId
         )
       ORDER BY questionCount DESC, g.created_at DESC`,
    )
    .all({ viewerId }) as GroupRow[];
  return rows.map(mapGroup);
}

export function getGroup(groupId: number, viewerId: string): GroupSummary | undefined {
  const row = sqlite
    .prepare(
      `${groupSelect}
       WHERE g.id = @groupId
         AND (
           g.visibility = 'public'
           OR EXISTS (
             SELECT 1 FROM memberships access
             WHERE access.group_id = g.id AND access.session_id = @viewerId
           )
         )`,
    )
    .get({ groupId, viewerId }) as GroupRow | undefined;
  return row ? mapGroup(row) : undefined;
}

export function createGroup(input: {
  viewerId: string;
  name: string;
  institution: string;
  courseCode: string;
  description: string;
  visibility: "public" | "private";
  inviteCode: string;
}): number {
  return sqlite.transaction(() => {
    const result = sqlite
      .prepare(
        `INSERT INTO groups
          (name, institution, course_code, description, visibility, invite_code, owner_session_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.name,
        input.institution,
        input.courseCode,
        input.description,
        input.visibility,
        input.inviteCode,
        input.viewerId,
      );
    const groupId = Number(result.lastInsertRowid);
    sqlite
      .prepare("INSERT INTO memberships (group_id, session_id, role) VALUES (?, ?, 'owner')")
      .run(groupId, input.viewerId);
    return groupId;
  })();
}

export function joinGroup(viewerId: string, inviteCode: string): number | undefined {
  const group = sqlite
    .prepare("SELECT id FROM groups WHERE invite_code = ?")
    .get(inviteCode.toUpperCase()) as { id: number } | undefined;
  if (!group) return undefined;
  sqlite
    .prepare(
      `INSERT INTO memberships (group_id, session_id, role)
       VALUES (?, ?, 'member') ON CONFLICT(group_id, session_id) DO NOTHING`,
    )
    .run(group.id, viewerId);
  return group.id;
}

export function joinPublicGroup(viewerId: string, groupId: number): boolean {
  const group = sqlite
    .prepare("SELECT id FROM groups WHERE id = ? AND visibility = 'public'")
    .get(groupId) as { id: number } | undefined;
  if (!group) return false;
  sqlite
    .prepare(
      `INSERT INTO memberships (group_id, session_id, role)
       VALUES (?, ?, 'member') ON CONFLICT(group_id, session_id) DO NOTHING`,
    )
    .run(groupId, viewerId);
  return true;
}

export function isMember(groupId: number, viewerId: string): boolean {
  return Boolean(
    sqlite
      .prepare("SELECT 1 FROM memberships WHERE group_id = ? AND session_id = ?")
      .get(groupId, viewerId),
  );
}

export function listQuestions(groupId: number): QuestionSummary[] {
  const rows = sqlite
    .prepare(
      `SELECT
         q.id,
         q.group_id AS groupId,
         q.title,
         q.body,
         CASE WHEN q.anonymous = 1 THEN s.anon_label ELSE s.display_name END AS authorName,
         q.anonymous,
         q.created_at AS createdAt,
         (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) AS answerCount
       FROM questions q
       JOIN sessions s ON s.id = q.author_session_id
       WHERE q.group_id = ?
       ORDER BY q.created_at DESC, q.id DESC`,
    )
    .all(groupId) as QuestionRow[];
  return rows.map(mapQuestion);
}

export function createQuestion(input: {
  groupId: number;
  viewerId: string;
  title: string;
  body: string;
  anonymous: boolean;
}): number | undefined {
  if (!isMember(input.groupId, input.viewerId)) return undefined;
  const result = sqlite
    .prepare(
      `INSERT INTO questions (group_id, author_session_id, title, body, anonymous)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(input.groupId, input.viewerId, input.title, input.body, Number(input.anonymous));
  return Number(result.lastInsertRowid);
}

export function getQuestion(questionId: number, viewerId: string): QuestionView | undefined {
  const row = sqlite
    .prepare(
      `SELECT
         q.id,
         q.group_id AS groupId,
         q.title,
         q.body,
         CASE WHEN q.anonymous = 1 THEN s.anon_label ELSE s.display_name END AS authorName,
         q.anonymous,
         q.created_at AS createdAt,
         (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) AS answerCount
       FROM questions q
       JOIN sessions s ON s.id = q.author_session_id
       JOIN groups g ON g.id = q.group_id
       WHERE q.id = @questionId
         AND (
           g.visibility = 'public'
           OR EXISTS (
             SELECT 1 FROM memberships access
             WHERE access.group_id = g.id AND access.session_id = @viewerId
           )
         )`,
    )
    .get({ questionId, viewerId }) as QuestionRow | undefined;
  if (!row) return undefined;
  const group = getGroup(row.groupId, viewerId);
  if (!group) return undefined;
  const answers = sqlite
    .prepare(
      `SELECT
         a.id,
         a.body,
         CASE WHEN a.anonymous = 1 THEN s.anon_label ELSE s.display_name END AS authorName,
         a.anonymous,
         a.created_at AS createdAt
       FROM answers a
       JOIN sessions s ON s.id = a.author_session_id
       WHERE a.question_id = ?
       ORDER BY a.created_at ASC, a.id ASC`,
    )
    .all(questionId) as AnswerRow[];
  return {
    ...mapQuestion(row),
    group,
    answers: answers.map((answer) => ({ ...answer, anonymous: Boolean(answer.anonymous) })),
  };
}

export function createAnswer(input: {
  questionId: number;
  viewerId: string;
  body: string;
  anonymous: boolean;
}): boolean {
  const question = sqlite
    .prepare("SELECT group_id AS groupId FROM questions WHERE id = ?")
    .get(input.questionId) as { groupId: number } | undefined;
  if (!question || !isMember(question.groupId, input.viewerId)) return false;
  sqlite
    .prepare(
      `INSERT INTO answers (question_id, author_session_id, body, anonymous)
       VALUES (?, ?, ?, ?)`,
    )
    .run(input.questionId, input.viewerId, input.body, Number(input.anonymous));
  return true;
}

export function siteCounts(): { groupCount: number; questionCount: number; answerCount: number } {
  return sqlite
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM groups) AS groupCount,
         (SELECT COUNT(*) FROM questions) AS questionCount,
         (SELECT COUNT(*) FROM answers) AS answerCount`,
    )
    .get() as { groupCount: number; questionCount: number; answerCount: number };
}
