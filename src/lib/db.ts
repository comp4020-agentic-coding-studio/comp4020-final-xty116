import { mkdirSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
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

  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    answer_id INTEGER REFERENCES answers(id) ON DELETE CASCADE,
    mime TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('image', 'drawing')),
    alt TEXT NOT NULL,
    data BLOB NOT NULL,
    CHECK ((question_id IS NOT NULL) != (answer_id IS NOT NULL))
  );
  CREATE TABLE IF NOT EXISTS course_invites (
    token TEXT PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    accepted_by TEXT REFERENCES sessions(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, label)
  );
  CREATE TABLE IF NOT EXISTS search_usage (
    viewer_id TEXT NOT NULL REFERENCES sessions(id),
    occurred_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_search_usage_time ON search_usage(occurred_at);
`);

const groupColumns = sqlite.pragma("table_info(groups)") as { name: string }[];
if (!groupColumns.some(column => column.name === "kind")) {
  sqlite.exec("ALTER TABLE groups ADD COLUMN kind TEXT NOT NULL DEFAULT 'study'");
}
const questionColumns = sqlite.pragma("table_info(questions)") as { name: string }[];
if (!questionColumns.some(column => column.name === "resolved")) {
  sqlite.exec("ALTER TABLE questions ADD COLUMN resolved INTEGER NOT NULL DEFAULT 0");
}

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
  kind: "study" | "course";
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
  resolved: boolean;
  attachments: AttachmentView[];
}

export interface AnswerView {
  id: number;
  body: string;
  authorName: string;
  anonymous: boolean;
  createdAt: string;
  attachments: AttachmentView[];
}

export interface AttachmentInput { mime: string; kind: "image" | "drawing"; alt: string; data: Buffer }
export interface AttachmentView { id: string; mime: string; kind: "image" | "drawing"; alt: string }

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
    g.kind,
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
  return { ...row, anonymous: Boolean(row.anonymous), resolved: Boolean(row.resolved), attachments: listAttachments("question_id", row.id) };
}

function listAttachments(column: "question_id" | "answer_id", id: number): AttachmentView[] {
  return sqlite.prepare(`SELECT id, mime, kind, alt FROM attachments WHERE ${column} = ?`).all(id) as AttachmentView[];
}

function saveAttachments(column: "question_id" | "answer_id", id: number, attachments: AttachmentInput[]): void {
  const insert = sqlite.prepare(`INSERT INTO attachments (id, ${column}, mime, kind, alt, data) VALUES (?, ?, ?, ?, ?, ?)`);
  for (const item of attachments) insert.run(randomUUID(), id, item.mime, item.kind, item.alt, item.data);
}

export function getAttachment(id: string, viewerId: string): (AttachmentView & { data: Buffer }) | undefined {
  return sqlite.prepare(`SELECT f.id, f.mime, f.kind, f.alt, f.data
    FROM attachments f LEFT JOIN answers a ON a.id = f.answer_id
    JOIN questions q ON q.id = COALESCE(f.question_id, a.question_id)
    JOIN groups g ON g.id = q.group_id
    WHERE f.id = ? AND (g.visibility = 'public' OR EXISTS
      (SELECT 1 FROM memberships m WHERE m.group_id = g.id AND m.session_id = ?))`).get(id, viewerId) as (AttachmentView & { data: Buffer }) | undefined;
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
  kind?: "study" | "course";
}): number {
  return sqlite.transaction(() => {
    const result = sqlite
      .prepare(
        `INSERT INTO groups
          (name, institution, course_code, description, visibility, invite_code, owner_session_id, kind)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.name,
        input.institution,
        input.courseCode,
        input.description,
        input.visibility,
        input.inviteCode,
        input.viewerId,
        input.kind ?? "study",
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
         q.resolved,
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
  attachments?: AttachmentInput[];
}): number | undefined {
  if (!isMember(input.groupId, input.viewerId)) return undefined;
  return sqlite.transaction(() => {
    const result = sqlite
    .prepare(
      `INSERT INTO questions (group_id, author_session_id, title, body, anonymous)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(input.groupId, input.viewerId, input.title, input.body, Number(input.anonymous));
    const id = Number(result.lastInsertRowid);
    saveAttachments("question_id", id, input.attachments ?? []);
    return id;
  })();
}

export function getQuestion(questionId: number, viewerId: string): QuestionView | undefined {
  const row = sqlite
    .prepare(
      `SELECT
         q.id,
         q.group_id AS groupId,
         q.title,
         q.body,
         q.resolved,
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
    answers: answers.map((answer) => ({ ...answer, anonymous: Boolean(answer.anonymous), attachments: listAttachments("answer_id", answer.id) })),
  };
}

export function createAnswer(input: {
  questionId: number;
  viewerId: string;
  body: string;
  anonymous: boolean;
  attachments?: AttachmentInput[];
}): number | undefined {
  const question = sqlite
    .prepare("SELECT group_id AS groupId FROM questions WHERE id = ?")
    .get(input.questionId) as { groupId: number } | undefined;
  if (!question || !isMember(question.groupId, input.viewerId)) return undefined;
  sqlite.transaction(() => {
  const result = sqlite
    .prepare(
      `INSERT INTO answers (question_id, author_session_id, body, anonymous)
       VALUES (?, ?, ?, ?)`,
    )
    .run(input.questionId, input.viewerId, input.body, Number(input.anonymous));
    saveAttachments("answer_id", Number(result.lastInsertRowid), input.attachments ?? []);
  })();
  return question.groupId;
}

export interface CourseInvite { token: string; label: string; accepted: boolean }
export function listCourseInvites(groupId: number, viewerId: string): CourseInvite[] {
  if (!getGroup(groupId, viewerId)?.isOwner) return [];
  return (sqlite.prepare("SELECT token, label, accepted_by IS NOT NULL AS accepted FROM course_invites WHERE group_id = ? ORDER BY created_at, label").all(groupId) as { token: string; label: string; accepted: number }[]).map(row => ({ ...row, accepted: Boolean(row.accepted) }));
}
export function createCourseInvites(groupId: number, viewerId: string, labels: string[]): boolean {
  if (!getGroup(groupId, viewerId)?.isOwner) return false;
  const insert = sqlite.prepare("INSERT INTO course_invites (token, group_id, label) VALUES (?, ?, ?) ON CONFLICT(group_id, label) DO NOTHING");
  sqlite.transaction(() => { for (const label of labels) insert.run(randomBytes(24).toString("hex"), groupId, label); })();
  return true;
}
export function previewInvite(token: string): { name: string; institution: string; courseCode: string; groupId: number; claimed: boolean } | undefined {
  return sqlite.prepare(`SELECT g.name, g.institution, g.course_code AS courseCode, g.id AS groupId,
    i.accepted_by IS NOT NULL AS claimed FROM course_invites i JOIN groups g ON g.id = i.group_id WHERE i.token = ?`).get(token) as { name: string; institution: string; courseCode: string; groupId: number; claimed: boolean } | undefined;
}
export function acceptCourseInvite(token: string, viewerId: string): number | undefined {
  return sqlite.transaction(() => {
    const invite = sqlite.prepare("SELECT group_id AS groupId, accepted_by AS acceptedBy FROM course_invites WHERE token = ?").get(token) as { groupId: number; acceptedBy: string | null } | undefined;
    if (!invite || (invite.acceptedBy && invite.acceptedBy !== viewerId)) return undefined;
    sqlite.prepare("INSERT INTO memberships (group_id, session_id, role) VALUES (?, ?, 'member') ON CONFLICT DO NOTHING").run(invite.groupId, viewerId);
    sqlite.prepare("UPDATE course_invites SET accepted_by = ? WHERE token = ?").run(viewerId, token);
    return invite.groupId;
  })();
}
export function setResolved(questionId: number, viewerId: string, resolved: boolean): number | undefined {
  const result = sqlite.prepare(`UPDATE questions SET resolved = ? WHERE id = ? AND
    (author_session_id = ? OR group_id IN (SELECT id FROM groups WHERE owner_session_id = ?))`)
    .run(Number(resolved), questionId, viewerId, viewerId);
  return result.changes ? questionGroupId(questionId) : undefined;
}
export function canManageQuestion(questionId: number, viewerId: string): boolean {
  return Boolean(sqlite.prepare(`SELECT 1 FROM questions q JOIN groups g ON g.id = q.group_id WHERE q.id = ? AND
    (q.author_session_id = ? OR g.owner_session_id = ?)`).get(questionId, viewerId, viewerId));
}

export interface SearchDocument { id: number; title: string; body: string; groupId: number; groupName: string; courseCode: string; answerCount: number; answers: string; resolved: boolean }
export function searchDocuments(viewerId: string, query: string, groupId?: number): SearchDocument[] {
  const words = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [])].slice(0, 16);
  const rows = sqlite.prepare(`SELECT q.id, q.title, q.body, q.group_id AS groupId, g.name AS groupName, g.course_code AS courseCode, q.resolved,
    (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) AS answerCount,
    COALESCE((SELECT group_concat(body, '\n') FROM answers WHERE question_id = q.id), '') AS answers
    FROM questions q JOIN groups g ON g.id = q.group_id
    WHERE (? IS NULL OR g.id = ?) AND (g.visibility = 'public' OR EXISTS
      (SELECT 1 FROM memberships m WHERE m.group_id = g.id AND m.session_id = ?))
    ORDER BY q.id DESC LIMIT 1200`).all(groupId ?? null, groupId ?? null, viewerId) as SearchDocument[];
  return rows.map(row => {
    const title = row.title.toLowerCase();
    const body = `${row.body} ${row.answers}`.toLowerCase();
    const score = words.reduce((total, word) => total + (title.includes(word) ? 5 : 0) + (body.includes(word) ? 1 : 0), 0);
    return { ...row, resolved: Boolean(row.resolved), score };
  }).sort((a, b) => b.score - a.score).slice(0, 40);
}
export function consumeSearchAllowance(viewerId: string): boolean {
  const now = Date.now();
  return sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM search_usage WHERE occurred_at < ?").run(now - 86400000);
    const counts = sqlite.prepare(`SELECT COUNT(*) AS total,
      SUM(viewer_id = ?) AS personal,
      SUM(viewer_id = ? AND occurred_at > ?) AS recent FROM search_usage`).get(viewerId, viewerId, now - 60000) as { total: number; personal: number; recent: number };
    if (counts.total >= 300 || counts.personal >= 40 || counts.recent >= 6) return false;
    sqlite.prepare("INSERT INTO search_usage (viewer_id, occurred_at) VALUES (?, ?)").run(viewerId, now);
    return true;
  })();
}

export function questionGroupId(questionId: number): number | undefined {
  const question = sqlite
    .prepare("SELECT group_id AS groupId FROM questions WHERE id = ?")
    .get(questionId) as { groupId: number } | undefined;
  return question?.groupId;
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
