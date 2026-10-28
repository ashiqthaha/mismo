import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export type Role = "owner" | "family";
export type Presence = "yes" | "unknown" | "no";
export type Severity = "safety" | "fix" | "nice";
export type FindingStatus = "new" | "triaged" | "in_project" | "wont_do" | "fixed";
export type ProjectStatus =
  | "idea"
  | "planning"
  | "getting_quotes"
  | "scheduled"
  | "in_progress"
  | "on_hold"
  | "done";
export type Priority = "high" | "medium" | "low";
export type Doer = "diy" | "hired" | "mixed";
export type Who = "diy" | "pro" | "either";
export type OwnerType = "home" | "area" | "system" | "finding" | "project" | "maintenance_log";
export type NotificationEvent =
  | "maintenance_due"
  | "maintenance_overdue"
  | "safety_finding"
  | "task_assigned"
  | "task_due"
  | "budget_threshold"
  | "warranty_ending"
  | "backup_stale";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const day = (name: string) => date(name, { mode: "string" });

// ---- Better Auth tables (field names must match what Better Auth expects) ----

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").$type<Role>().notNull().default("family"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// ---- People ----

export const invite = pgTable("invite", {
  id: id(),
  email: text("email").notNull().unique(),
  role: text("role").$type<Role>().notNull().default("family"),
  invitedBy: text("invited_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});

// ---- The house ----

export const home = pgTable("home", {
  id: id(),
  name: text("name").notNull().default("Home"),
  address: text("address"),
  homeType: text("home_type"),
  subdivision: text("subdivision"),
  yearBuilt: integer("year_built"),
  aboveGradeSqft: integer("above_grade_sqft"),
  basementSqft: integer("basement_sqft"),
  lotSqft: integer("lot_sqft"),
  stories: integer("stories"),
  fullBaths: integer("full_baths"),
  halfBaths: integer("half_baths"),
  exterior: text("exterior"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const area = pgTable("area", {
  id: id(),
  name: text("name").notNull(),
  kind: text("kind").$type<"indoor" | "outdoor">().notNull(),
  level: text("level"),
  present: text("present").$type<Presence>().notNull().default("yes"),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  lastWalkedAt: timestamp("last_walked_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const system = pgTable(
  "system",
  {
    id: id(),
    areaId: text("area_id").references(() => area.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    category: text("category"),
    present: text("present").$type<Presence>().notNull().default("yes"),
    make: text("make"),
    model: text("model"),
    serial: text("serial"),
    installYear: integer("install_year"),
    expectedLifeYears: integer("expected_life_years"),
    warrantyEnd: day("warranty_end"),
    lastServiced: day("last_serviced"),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("system_area_idx").on(t.areaId)],
);

// ---- Finding the work ----

export const project = pgTable("project", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").$type<ProjectStatus>().notNull().default("idea"),
  priority: text("priority").$type<Priority>().notNull().default("medium"),
  targetStart: day("target_start"),
  targetEnd: day("target_end"),
  budgetCents: integer("budget_cents"),
  doer: text("doer").$type<Doer>().notNull().default("diy"),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const finding = pgTable(
  "finding",
  {
    id: id(),
    areaId: text("area_id").references(() => area.id, { onDelete: "set null" }),
    systemId: text("system_id").references(() => system.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    note: text("note"),
    severity: text("severity").$type<Severity>().notNull(),
    status: text("status").$type<FindingStatus>().notNull().default("new"),
    costLow: integer("cost_low"),
    costHigh: integer("cost_high"),
    projectId: text("project_id").references(() => project.id, { onDelete: "set null" }),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("finding_area_idx").on(t.areaId), index("finding_project_idx").on(t.projectId)],
);

// ---- Doing the work ----

export const task = pgTable(
  "task",
  {
    id: id(),
    projectId: text("project_id").references(() => project.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    assigneeId: text("assignee_id").references(() => user.id, { onDelete: "set null" }),
    dueDate: day("due_date"),
    done: boolean("done").notNull().default(false),
    doneAt: timestamp("done_at", { withTimezone: true }),
    blockedById: text("blocked_by_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("task_project_idx").on(t.projectId)],
);

export const maintenancePlan = pgTable("maintenance_plan", {
  id: id(),
  title: text("title").notNull(),
  systemId: text("system_id").references(() => system.id, { onDelete: "cascade" }),
  areaId: text("area_id").references(() => area.id, { onDelete: "cascade" }),
  intervalMonths: integer("interval_months").notNull(),
  bestMonths: jsonb("best_months").$type<number[]>().notNull().default([]),
  who: text("who").$type<Who>().notNull().default("diy"),
  howTo: text("how_to"),
  nextDue: day("next_due"),
  lastDone: day("last_done"),
  enabled: boolean("enabled").notNull().default(true),
  assigneeId: text("assignee_id").references(() => user.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const maintenanceLog = pgTable(
  "maintenance_log",
  {
    id: id(),
    planId: text("plan_id")
      .notNull()
      .references(() => maintenancePlan.id, { onDelete: "cascade" }),
    doneOn: day("done_on").notNull(),
    note: text("note"),
    costCents: integer("cost_cents"),
    doneBy: text("done_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("maintenance_log_plan_idx").on(t.planId)],
);

export const expense = pgTable(
  "expense",
  {
    id: id(),
    projectId: text("project_id").references(() => project.id, { onDelete: "cascade" }),
    maintenanceLogId: text("maintenance_log_id").references(() => maintenanceLog.id, {
      onDelete: "cascade",
    }),
    amountCents: integer("amount_cents").notNull(),
    spentOn: day("spent_on").notNull(),
    vendor: text("vendor"),
    category: text("category"),
    note: text("note"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("expense_project_idx").on(t.projectId)],
);

// ---- Attachments and notes on any record ----

export const file = pgTable(
  "file",
  {
    id: id(),
    ownerType: text("owner_type").$type<OwnerType>().notNull(),
    ownerId: text("owner_id").notNull(),
    kind: text("kind").$type<"photo" | "document">().notNull(),
    phase: text("phase").$type<"before" | "during" | "after">(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    storageKey: text("storage_key").notNull(),
    thumbKey: text("thumb_key"),
    originalName: text("original_name"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("file_owner_idx").on(t.ownerType, t.ownerId)],
);

export const logEntry = pgTable(
  "log_entry",
  {
    id: id(),
    ownerType: text("owner_type").$type<OwnerType>().notNull(),
    ownerId: text("owner_id").notNull(),
    body: text("body").notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("log_entry_owner_idx").on(t.ownerType, t.ownerId)],
);

export const auditLog = pgTable("audit_log", {
  id: id(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  detail: jsonb("detail"),
  at: createdAt(),
});

// ---- Notifications ----

export const notification = pgTable(
  "notification",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    event: text("event").$type<NotificationEvent>().notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    url: text("url"),
    /** Who a reply to the email should go to: the person whose action caused it. */
    replyTo: text("reply_to"),
    status: text("status").$type<"pending" | "sent" | "failed" | "skipped">().notNull().default("pending"),
    sendAfter: timestamp("send_after", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [index("notification_pending_idx").on(t.status, t.sendAfter)],
);

/** One row per reminder already queued, so the hourly check never sends the same one twice. */
export const reminderKey = pgTable("reminder_key", {
  key: text("key").primaryKey(),
  createdAt: createdAt(),
});

export const pushSubscription = pgTable("push_subscription", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
});

export const notificationPref = pgTable(
  "notification_pref",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    event: text("event").$type<NotificationEvent>().notNull(),
    email: boolean("email").notNull().default(true),
    push: boolean("push").notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.userId, t.event] })],
);
