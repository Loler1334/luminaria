const botNames = new Map([
  ['Лунный Архивариус', 'Moonlit Archivist'],
  ['Звёздный Плут', 'Starlight Rogue'],
  ['Хранитель Маяка', 'Lighthouse Keeper'],
  ['Тень Часовщика', "Clockmaker's Shadow"],
  ['Кометный Гоблин', 'Comet Goblin'],
  ['Сонный Оракул', 'Sleepy Oracle'],
  ['Космический Пекарь', 'Cosmic Baker'],
  ['Пыльный Дракон', 'Dusty Dragon'],
  ['Сырный Астроном', 'Cheese Astronomer'],
]);

export function localizedBotName(name, language = 'ru') {
  if (language !== 'en') return name || 'Бот';
  return botNames.get(name) || name || 'Bot';
}
