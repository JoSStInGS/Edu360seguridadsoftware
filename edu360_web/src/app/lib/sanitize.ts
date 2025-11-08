export function sanitizeSegment(input: string) {
  return input
    .replace(/[\/\\]/g, "-")
    .replace(/[^\p{L}\p{N}_.\-\s]/gu, "")
    .trim()
    .slice(0, 100);
}
