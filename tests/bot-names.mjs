import assert from 'node:assert/strict';
import { localizedBotName } from '../src/bot-names.mjs';

assert.equal(localizedBotName('Звёздный Плут', 'en'), 'Starlight Rogue');
assert.equal(localizedBotName('Звёздный Плут', 'ru'), 'Звёздный Плут');
assert.equal(localizedBotName('Космический Пекарь', 'en'), 'Cosmic Baker');
assert.equal(localizedBotName('Unknown Bot', 'en'), 'Unknown Bot');
console.log('bot name localization passed');
