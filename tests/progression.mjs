import assert from 'node:assert/strict';
import { ACHIEVEMENTS, xpForLevel, rankForLevel, achievementFor,
  progressionModalMarkup, finaleProgressionMarkup } from '../src/progression.mjs';

assert.equal(ACHIEVEMENTS.length,12);
assert.equal(new Set(ACHIEVEMENTS.map(item=>item[0])).size,12);
assert.equal(xpForLevel(1),0);
assert.equal(xpForLevel(2),125);
assert.equal(xpForLevel(5),800);
assert.equal(rankForLevel(1,'ru').name,'Ловец искр');
assert.equal(rankForLevel(50,'en').name,'Keeper of Luminaria');
assert.equal(achievementFor('polyglot','en').name,'Polyglot');
const progress={xp:145,level:2,games_played:1,wins:1,traps_sprung:2,
  pinned_badges:['lone_detective'],achievements:[{id:'lone_detective'}],
  game:{xp_gained:145,achievements_unlocked:['lone_detective']}};
const modal=progressionModalMarkup(progress,'ru');
assert(modal.includes('1/12'));
assert(modal.includes('Одинокий детектив'));
assert(modal.includes('data-badge-id="lone_detective"'));
const finale=finaleProgressionMarkup(progress,'en');
assert(finale.includes('+145 XP'));
assert(finale.includes('New achievement'));
assert(!finale.includes('undefined'));
console.log('PASS: bilingual ranks, achievement grid, pinning and finale XP.');
