import { z } from 'zod/v4';
import {
  fieldGrammar,
  recordIdSchema,
  SAFE_INTEGER_MAX,
} from '../core/index.js';

/**
 * `conversation@1`: a conversation with a contact, kept as an OCP record (ADR-OCP-007). It is a projection of the
 * runtime's own conversation, written by the engine into the records ref, with its messages as one inline child kind.
 * Its record data, its child and its membership predicate are closed at every level.
 *
 * What this shape does not claim:
 * - a conversation or message the source holds no handle for has no id, so it is not a record: it is counted in the
 *   collection manifest's `not_emitted` aggregate (`ConversationNotEmitted`), never emitted;
 * - the provider is a configured key for the sequencer role, never a vendor name;
 * - a per-message campaign is not carried; a later minor may add an optional corpus campaign key.
 */

/** A non-empty string. */
const text = z.string().min(1);
/** A count: the grammar's integer, at least 0. */
const count = z.number().int().min(0).max(SAFE_INTEGER_MAX);

/** A relative POSIX project path: no leading `/`, and no empty, `.` or `..` segment. */
const PROJECT_PATH_PATTERN =
  '^(?!.*(?:^|/)\\.{1,2}(?:/|$))[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)*$';

/** One message: the conversation's one child kind, under `messages`. */
export interface ConversationMessage {
  /** The child's OCP record id, derived from the sequencer's message handle. */
  readonly id: string;
  readonly direction: 'inbound' | 'outbound';
  /** The message's text body. May be `''`: an HTML-only body is kept outside `content`. */
  readonly content: string;
  /** The closed sensory form. */
  readonly format: 'text' | 'audio' | 'image' | 'video';
  readonly sender_identifier: string;
  readonly sender_display_name?: string;
  /** Who sent it, as the source names it: an open value, not a closed set. */
  readonly sender_type: string;
  /** The grammar's `timestamp`. */
  readonly occurred_at: string;
  readonly via?: string;
}

/** The record data of `conversation@1`. */
export interface Conversation {
  readonly channel:
    | 'email'
    | 'voice'
    | 'agent_chat'
    | 'sms'
    | 'in_app'
    | 'webchat';
  readonly provenance: 'external';
  /** The configured provider key for the sequencer role: a configuration value, never a vendor name. */
  readonly provider: string;
  /** The sequencer's own handles for the conversation, in vendor-neutral names. */
  readonly external_ref: {
    /** The sequencer's thread handle: the conversation's identity. A conversation without one is not emitted. */
    readonly thread_id: string;
    readonly workspace_id?: string;
    readonly lead_id?: string;
    readonly deep_link_url?: string;
    readonly last_email_id?: string;
  };
  /**
   * The thread's root message id. When the source gives no threading headers, this is the message's own id (a
   * self-rooted thread); that value is valid.
   */
  readonly origin_thread_root_id: string;
  /** When the source first recorded the conversation (the grammar's `timestamp`). */
  readonly created_at: string;
  readonly last_message_at?: string;
  readonly archived_at?: string;
  readonly messages: readonly ConversationMessage[];
}

/**
 * The membership predicate of `conversation@1` (ADR-OCP-007 §8.2: the keys of a type's membership predicate and their
 * grammar types; the instance's configuration gives their values). One key, `campaigns`: campaign project paths,
 * cardinality many. The reader resolves each against the corpus's campaign-scope confirmed-address map. It narrows and
 * never widens, and it carries no vendor value.
 */
export interface ConversationScope {
  readonly campaigns: readonly string[];
}

/**
 * The conversation collection manifest's aggregate (ADR-OCP-007 §11.3: counts by reason, never rows). A conversation or
 * message with no source handle has no id, so it cannot be a per-id refusal; the unit that read the source counts it
 * here. Every reason is present, `0` when none.
 */
export interface ConversationNotEmitted {
  readonly conversation_without_provider_handle: number;
  readonly message_without_provider_handle: number;
}

const externalRefSchema = z
  .object({
    thread_id: text,
    workspace_id: text.optional(),
    lead_id: text.optional(),
    deep_link_url: text.optional(),
    last_email_id: text.optional(),
  })
  .strict();

/** `ConversationMessage`, closed. */
export const conversationMessageSchema = z
  .object({
    id: recordIdSchema,
    direction: z.enum(['inbound', 'outbound']),
    content: fieldGrammar.string(),
    format: z.enum(['text', 'audio', 'image', 'video']),
    sender_identifier: text,
    sender_display_name: text.optional(),
    sender_type: text,
    occurred_at: fieldGrammar.timestamp(),
    via: text.optional(),
  })
  .strict();

/** `Conversation`, closed at every level. */
export const conversationSchema = z
  .object({
    channel: z.enum([
      'email',
      'voice',
      'agent_chat',
      'sms',
      'in_app',
      'webchat',
    ]),
    provenance: z.literal('external'),
    provider: text,
    external_ref: externalRefSchema,
    origin_thread_root_id: text,
    created_at: fieldGrammar.timestamp(),
    last_message_at: fieldGrammar.timestamp().optional(),
    archived_at: fieldGrammar.timestamp().optional(),
    messages: z.array(conversationMessageSchema),
  })
  .strict();

/** `ConversationScope`, closed: at least one campaign. */
export const conversationScopeSchema = z
  .object({
    campaigns: z
      .array(z.string().regex(new RegExp(PROJECT_PATH_PATTERN)))
      .min(1),
  })
  .strict();

/** `ConversationNotEmitted`, closed: a non-negative count per reason. */
export const conversationNotEmittedSchema = z
  .object({
    conversation_without_provider_handle: count,
    message_without_provider_handle: count,
  })
  .strict();

const ID = 'urn:salesblaster:contracts:conversations';
const sequencerHandle = (externalId: string) =>
  ({
    kind: 'provider_handle',
    components: [
      {
        name: 'provider',
        canonical_form:
          'The configured provider key for the sequencer role, exactly as configured.',
      },
      {
        name: 'kind',
        canonical_form: 'The record type or child kind, exactly.',
      },
      { name: 'external_id', canonical_form: externalId },
    ],
  }) as const;

/**
 * The type facts of `conversation@1` (ADR-OCP-007 §8.2), as data. Each `schema` names its published schema by `$id`;
 * a generator assembling the record-type facts document replaces it with that schema's path and the
 * sha256 of its published bytes. `scope_schema` names the published membership-predicate schema the scope's grammar
 * is checked against; it is not itself a row field.
 */
export const conversationTypeFacts = {
  record_type: 'conversation',
  major: 1,
  kind: 2,
  writer: 'engine',
  ref: 'records',
  personal_data: 'direct',
  id_basis: sequencerHandle(
    "The sequencer's thread handle, exactly as given; a conversation without one is not emitted.",
  ),
  schema: { id: `${ID}:conversation:v1`, subject: 'record_data' },
  children: [
    {
      kind: 'message',
      array_key: 'messages',
      id_basis: sequencerHandle(
        "The sequencer's message handle, exactly as given; a message without one is not emitted.",
      ),
      schema: {
        id: `${ID}:conversation-message:v1`,
        subject: 'inline_child_data',
      },
    },
  ],
  scope: [
    {
      key: 'campaigns',
      grammar: { type: 'string', cardinality: 'many', nullable: false },
    },
  ],
  scope_schema: { id: `${ID}:conversation-scope:v1` },
} as const;

// Every parsed value is the declared shape, checked by the compiler.
const _conversation = (
  value: z.infer<typeof conversationSchema>,
): Conversation => value;
const _scope = (
  value: z.infer<typeof conversationScopeSchema>,
): ConversationScope => value;
const _notEmitted = (
  value: z.infer<typeof conversationNotEmittedSchema>,
): ConversationNotEmitted => value;
void _conversation;
void _scope;
void _notEmitted;
