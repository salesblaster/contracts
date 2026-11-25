import { z } from 'zod/v4';

/**
 * The contact-point type enum: the reachability types of the canonical contact-point model, CLOSED AT BIRTH. A member
 * is added only by a decision of the Identity context, which owns each type's meaning and normalizer.
 *
 * This is the enum's one published home. Until the Source context's own code imports it, a spec pins it equal, member
 * for member and in order, to Source's copy, so the two can never drift into two vocabularies.
 */
export const CONTACT_POINT_TYPES = [
  'email',
  'phone',
  'linkedin',
  'x',
  'whatsapp',
  'github',
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'reddit',
] as const;

/** One of `CONTACT_POINT_TYPES`. */
export type ContactPointType = (typeof CONTACT_POINT_TYPES)[number];

/** `ContactPointType`, closed. */
export const contactPointTypeSchema = z.enum(CONTACT_POINT_TYPES);
