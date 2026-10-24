import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
  sql,
} from 'drizzle-orm/pg-core';

export const noteStatusEnum = pgEnum('note_status', ['seedling', 'budding', 'evergreen']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    handle: text('handle').notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull().default(''),
    bio: text('bio').notNull().default(''),
    gardenPublic: boolean('garden_public').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailLowerUid: uniqueIndex('users_email_lower_uidx').on(sql`lower(${table.email})`),
    handleUid: uniqueIndex('users_handle_uidx').on(table.handle),
  }),
);

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    contentMd: text('content_md').notNull().default(''),
    excerpt: text('excerpt').notNull().default(''),
    status: noteStatusEnum('status').notNull().default('seedling'),
    readingMins: integer('reading_mins').notNull().default(0),
    published: boolean('published').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    contentTsv: text('content_tsv')
      .generatedAlwaysAs(
        sql`to_tsvector('simple', regexp_replace(lower(coalesce(${table.title}, '') || ' ' || coalesce(${table.contentMd}, '')), '([一-鿿])', ' \1 ', 'g'))`,
      )
      .notNull(),
  },
  (table) => ({
    slugUid: uniqueIndex('notes_author_slug_uidx').on(table.authorId, table.slug),
    authorUpdated: index('notes_author_updated_idx').on(table.authorId, table.updatedAt),
    authorPublished: index('notes_author_published_idx').on(table.authorId, table.published),
  }),
);

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull().default('#8A9A5B'),
  },
  (table) => ({
    nameUid: uniqueIndex('tags_author_name_uidx').on(table.authorId, table.name),
  }),
);

export const noteTags = pgTable(
  'note_tags',
  {
    noteId: uuid('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: {
      columns: [table.noteId, table.tagId],
      name: 'note_tags_pk',
    },
  }),
);

export const links = pgTable(
  'links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    targetSlug: text('target_slug').notNull(),
    targetId: uuid('target_id').references(() => notes.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUid: uniqueIndex('links_source_slug_uidx').on(table.sourceId, table.targetSlug),
    sourceIdx: index('links_source_idx').on(table.sourceId),
    targetIdx: index('links_target_idx').on(table.targetId),
  }),
);

export type User = typeof users.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Link = typeof links.$inferSelect;
