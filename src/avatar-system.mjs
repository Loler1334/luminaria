export const fantasyAvatars = [
  { id: 'mage-male', ru: 'Маг', en: 'Wizard' },
  { id: 'mage-female', ru: 'Волшебница', en: 'Enchantress' },
  { id: 'goblin', ru: 'Гоблин', en: 'Goblin' },
  { id: 'ent', ru: 'Энт', en: 'Ent' },
  { id: 'orc', ru: 'Орк', en: 'Orc' },
  { id: 'elf', ru: 'Эльф', en: 'Elf ranger' },
  { id: 'dwarf', ru: 'Гном', en: 'Dwarf' },
  { id: 'witch', ru: 'Ведьма', en: 'Witch' },
  { id: 'dragonkin', ru: 'Драконорождённый', en: 'Dragonkin' },
];

const avatarIds = new Set(fantasyAvatars.map(avatar => avatar.id));
const legacyAvatarIds = {
  '✶': 'mage-male',
  '✦': 'mage-male',
  '☽': 'mage-female',
  '☾': 'mage-female',
  '♢': 'elf',
  '☼': 'orc',
  '☁': 'ent',
  '✿': 'goblin',
  '✧': 'witch',
  '♧': 'ent',
};

export function normalizeAvatar(value, fallback = 'mage-male') {
  const image = value?.match?.(/src="(data:image\/[^"]+)"/i)?.[1];
  const candidate = image || value;
  if (typeof candidate === 'string' && candidate.startsWith('data:image/')) {
    return candidate.length <= 60000 && /^data:image\/(?:jpeg|png|webp);base64,/i.test(candidate)
      ? candidate
      : fallback;
  }
  if (avatarIds.has(candidate)) return candidate;
  return legacyAvatarIds[candidate] || (avatarIds.has(fallback) ? fallback : 'mage-male');
}

export function avatarPortraitMarkup(id, className = '') {
  const avatar = fantasyAvatars.find(item => item.id === id) || fantasyAvatars[0];
  return `<span class="fantasy-avatar fantasy-avatar--${avatar.id}${className ? ` ${className}` : ''}" aria-hidden="true"></span>`;
}

export function avatarChoicesMarkup(className, selectedId, language = 'en') {
  return fantasyAvatars.map(avatar => {
    const label = avatar[language === 'ru' ? 'ru' : 'en'];
    return `<button type="button" class="${className}${avatar.id === selectedId ? ' selected' : ''}" data-avatar-id="${avatar.id}" aria-label="${label}" title="${label}">${avatarPortraitMarkup(avatar.id)}<small>${label}</small></button>`;
  }).join('');
}
