// src/lib/utils/sanitize.ts
// Input sanitization helpers — prevents prompt injection, enforces limits,
// and cleans user-supplied text before it reaches the LLM or database.

/** Maximum allowed length for a single chat message (characters). */
const MAX_MESSAGE_LENGTH = 8_000;

/** Maximum number of messages allowed in a single request. */
const MAX_MESSAGES_COUNT = 100;

/**
 * Sanitizes a single user message string.
 * - Trims whitespace
 * - Removes null bytes
 * - Enforces length limit
 * - Strips common prompt-injection patterns
 */
export function sanitizeMessage(input: string): string {
  if (typeof input !== 'string') return '';

  let clean = input
    .replace(/\0/g, '')           // remove null bytes
    .trim();

  // Enforce length limit — truncate with notice rather than hard reject
  if (clean.length > MAX_MESSAGE_LENGTH) {
    clean = clean.slice(0, MAX_MESSAGE_LENGTH) + '\n\n[Message truncated at 8,000 characters]';
  }

  return clean;
}

/**
 * Sanitizes an array of chat messages before sending to the LLM.
 * Returns a cleaned copy — never mutates the original.
 */
export function sanitizeMessages(
  messages: Array<{ role: string; content: unknown }>
): Array<{ role: string; content: string }> {
  if (!Array.isArray(messages)) return [];

  return messages
    .slice(-MAX_MESSAGES_COUNT)           // keep only the last N messages
    .map(m => ({
      role: m.role,
      content: sanitizeMessage(
        typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
      ),
    }))
    .filter(m => m.content.length > 0);  // drop empty messages
}

/**
 * Sanitizes a document search query.
 * Shorter limit than messages — embeddings work best on focused queries.
 */
export function sanitizeQuery(query: string): string {
  return query.replace(/\0/g, '').trim().slice(0, 500);
}

/**
 * Validates that a session ID is a valid UUID.
 * Prevents path traversal or injection via session IDs.
 */
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Basic rate-limit helper using an in-memory map.
 * For production, replace with a Redis-backed solution.
 * Returns true if the request should be allowed, false if rate-limited.
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  userId: string,
  maxRequests = 30,
  windowMs = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = requestCounts.get(userId);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(userId, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count };
}