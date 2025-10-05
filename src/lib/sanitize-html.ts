// Minimal HTML sanitizer to prevent XSS in trusted-but-user-editable content
// Allows a small, safe subset of tags and attributes
const ALLOWED_TAGS = new Set([
  'a', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'p', 'br', 'span'
]);
const ALLOWED_ATTRS = new Set(['href', 'title', 'target', 'rel', 'class']);

export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // Remove script/style/iframe and event handlers
  let out = input
    .replace(/<\/(script|style|iframe)[^>]*>/gi, '')
    .replace(/<(script|style|iframe)[\s\S]*?>[\s\S]*?<\/\1>/gi, '')
    .replace(/ on[a-z]+\s*=\s*\"[^\"]*\"/gi, '')
    .replace(/ on[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/ on[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:\s*/gi, '')
    .replace(/data:text\/html/gi, '');

  // Strip disallowed tags but keep their inner text
  out = out.replace(/<([^\s>/]+)([^>]*)>/gi, (full: string, tagName: string, attrs: string) => {
    const tag = String(tagName).toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      return '';
    }

    // Filter attributes
    const safeAttrs: string[] = [];
  attrs.replace(/([a-zA-Z:-]+)=(\"[^\"]*\"|'[^']*'|[^\s>]+)/g, (_m: string, name: string, value: string) => {
      const n = String(name).toLowerCase();
      if (!ALLOWED_ATTRS.has(n)) return '';

      const v = String(value);
      // Prevent js urls
      if (/^\s*['\"]?\s*javascript:/i.test(v)) return '';
      if (n === 'target') {
        // force safe target behavior
        safeAttrs.push('target="_blank" rel="noopener noreferrer"');
      } else {
        safeAttrs.push(`${n}=${v}`);
      }
      return '';
    });

    return `<${tag}${safeAttrs.length ? ` ${  safeAttrs.join(' ')}` : ''}>`;
  });

  // Close tags if needed is out of scope; rely on input being simple lists/links
  return out;
}

export default sanitizeHtml;
