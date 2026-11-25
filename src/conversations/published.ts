import type { z } from 'zod/v4';
import {
  conversationMessageSchema,
  conversationNotEmittedSchema,
  conversationSchema,
  conversationScopeSchema,
} from './conversation.v1.js';

/**
 * The JSON Schemas `build-public` projects for `conversations`, as `schemas/conversations/<name>.v<major>.json` with
 * `$id` `urn:salesblaster:contracts:conversations:<name>:v<major>`. Read by the build only; not exported, and removed
 * from the built package after the projection.
 */
export const published: readonly {
  readonly name: string;
  readonly major: number;
  readonly schema: z.ZodType;
}[] = [
  { name: 'conversation', major: 1, schema: conversationSchema },
  { name: 'conversation-message', major: 1, schema: conversationMessageSchema },
  { name: 'conversation-scope', major: 1, schema: conversationScopeSchema },
  {
    name: 'conversation-not-emitted',
    major: 1,
    schema: conversationNotEmittedSchema,
  },
];
