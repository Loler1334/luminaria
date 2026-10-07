export function roomInviteUrl(origin, code) {
  const url = new URL('/', origin);
  url.hostname = url.hostname.replace(/\.+$/, '');
  url.searchParams.set('room', code);
  return url.href;
}
