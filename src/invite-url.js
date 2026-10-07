export function roomInviteUrl(origin, code) {
  const url = new URL('/', origin);
  url.hostname = url.hostname.replace(/\.+$/, '');
  url.searchParams.set('room', code);
  return url.href;
}

export function personalReturnUrl(code, token, player) {
  const url = new URL(roomInviteUrl('https://luminaria.cc', code));
  const fragment = new URLSearchParams({ return: token, name: player.name });
  if (player.avatar && !player.avatar.startsWith('data:')) fragment.set('avatar', player.avatar);
  url.hash = fragment.toString();
  return url.href;
}

export function parsePersonalReturnHash(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const token = params.get('return') || '';
  if (!/^[\da-f-]{72}$/i.test(token)) return null;
  return {
    token,
    name: (params.get('name') || '').slice(0, 24),
    avatar: (params.get('avatar') || '').slice(0, 64)
  };
}
