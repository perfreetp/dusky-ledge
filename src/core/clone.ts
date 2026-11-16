/**
 * Deep copy for plain-JSON documents.
 *
 * `structuredClone` throws on Vue reactive proxies, and plan documents are plain
 * JSON by design, so a JSON round-trip is both safe and fast enough (a large plan is
 * a few hundred KB at most).
 */
export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
