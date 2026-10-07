// Site-presentation route names over CAIRN cell identities.

// A route segment: ASCII, lowercase, and drawn from the characters a cell name
// may carry. Combining marks are dropped after compatibility decomposition, so
// "Lakȟótiyapi" routes as "lakhotiyapi"; every other run of characters outside
// the vocabulary becomes one hyphen.
export function routeSegment(text) {
  const slug = String(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9._~-]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  return slug || 'untitled';
}

/** A route name: slash-joined route segments of a vault-relative path. */
export function routeName(path) {
  return String(path).split('/').filter((segment) => segment.length > 0).map(routeSegment).join('/');
}
