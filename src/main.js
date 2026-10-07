import { roomInviteUrl, personalReturnUrl, parsePersonalReturnHash } from './invite-url.js';
import { roundOptions, selectedRoundOption } from './round-options.mjs';
import './lobby-settings.css';
import { rankPlayers, fallbackStory, fitStory, storyLanguage } from './game-finale.mjs';
import { finaleMarkup, starAwardMarkup } from './finale-view.mjs';
import { votingOrder, serialRefresh, finalRoundReached } from './round-state.js';
import './style.css';
import './public-rooms.css';
import './branding.css';
import { avatarChoicesMarkup, avatarPortraitMarkup, normalizeAvatar } from './avatar-system.mjs';
import './avatar-system.css';
import { installRerolls } from './reroll.js';
import './finale.css';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl=import.meta.env.VITE_SUPABASE_URL;
const supabaseKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if(!supabaseUrl||!supabaseKey){document.body.innerHTML='<main style="max-width:42rem;margin:12vh auto;padding:2rem;font:18px system-ui;color:#fff;background:#101630;border-radius:18px"><h1>Нужно подключить Supabase</h1><p>В Cloudflare добавь переменные <code>VITE_SUPABASE_URL</code> и <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> в Build variables, затем перезапусти сборку.</p></main>';throw new Error('Missing Supabase build variables')}
const supabase=createClient(supabaseUrl,supabaseKey);
let pendingRoomIsPublic=false;
const isMissingRpc=error=>error?.code==='PGRST202'||error?.code==='42883';
const createRealtimeChannel=supabase.channel.bind(supabase);
supabase.channel=(topic,options={})=>createRealtimeChannel(topic,{...options,config:{...options.config,private:true}});

const copy={en:{howToPlay:'How to play',eyebrow:'A game for curious minds',headline:'See what others<br /><em>imagine.</em>',lead:'Tell a clue. Choose a dreamlike card. Find the story only your friends can see.',playNow:'Play now',joinFriends:'Join friends',playersOnline:'2,000+ dreamers playing today',sceneCaption:'Every card holds a different story',roomsEyebrow:'Gather around',roomsTitle:'A table is waiting.',createRoom:'Create a room',createRoomHint:'Invite your favorite people',joinRoom:'Join by code',joinRoomHint:'Have an invitation?',rulesTitle:'How Luminaria works',rule1:'One player gives a clue for their secret card.',rule2:'Everyone else plays a card that could fit the clue.',rule3:'Guess the storyteller’s card — and surprise your friends.',welcome:'Welcome to Luminaria',pickName:'Pick a name and join the table.',nickname:'Your nickname',placeholder:'Moonwalker',continue:'Continue',roomWelcome:'Your room is ready',roomText:'Choose a name — then share the room link with friends.',joinWelcome:'Join the story',joinText:'Enter your name to continue to the room.',room:'Room',waiting:'Waiting for dreamers',invite:'Invite friends',copyLink:'Copy link',copied:'Copied!',ready:'I’m ready',start:'Start the game',host:'Host',players:'Players',shareHint:'Anyone with this link can join your room.',readyState:'Ready',notReady:'Not ready',gameDemo:'Demo mode: invite links will become live when we connect multiplayer.'},ru:{howToPlay:'Как играть',eyebrow:'Игра для любопытных умов',headline:'Увидь, что<br /><em>воображают другие.</em>',lead:'Придумай подсказку. Выбери необычную карту. Найди историю, которую увидят твои друзья.',playNow:'Играть',joinFriends:'Войти к друзьям',playersOnline:'Сегодня играют 2 000+ мечтателей',sceneCaption:'В каждой карте — своя история',roomsEyebrow:'Собирайтесь вместе',roomsTitle:'Стол уже ждёт.',createRoom:'Создать комнату',createRoomHint:'Пригласите любимых людей',joinRoom:'Войти по коду',joinRoomHint:'Есть приглашение?',rulesTitle:'Как устроена Luminaria',rule1:'Один игрок даёт подсказку к своей тайной карте.',rule2:'Остальные выбирают карту, которая может подойти к этой подсказке.',rule3:'Угадайте карту ведущего — и удивите друзей.',welcome:'Добро пожаловать в Luminaria',pickName:'Выберите имя и присоединяйтесь к столу.',nickname:'Ваш никнейм',placeholder:'Лунный странник',continue:'Продолжить',roomWelcome:'Ваша комната готова',roomText:'Выберите имя, затем отправьте ссылку на комнату друзьям.',joinWelcome:'Войдите в историю',joinText:'Введите имя, чтобы продолжить в комнату.',room:'Комната',waiting:'Ждём мечтателей',invite:'Пригласить друзей',copyLink:'Скопировать ссылку',copied:'Скопировано!',ready:'Я готов',start:'Начать игру',host:'Ведущий',players:'Игроки',shareHint:'Любой, у кого есть ссылка, сможет войти в комнату.',readyState:'Готов',notReady:'Не готов',gameDemo:'Демо-режим: ссылки станут живыми после подключения мультиплеера.'}};
const siteCopy={en:{guideEyebrow:'Three steps to a story',guideTitle:'Simple rules.<br /><em>Unexpected answers.</em>',guideLead:'Luminaria is best with 3–10 people. Every round, a new player becomes the storyteller.',stepOneTitle:'Make a clue',stepOneText:'The storyteller chooses one private card and gives it a short, imaginative clue.',stepTwoTitle:'Add your card',stepTwoText:'Everyone else secretly adds one card that could fit the clue.',stepThreeTitle:'Find the secret',stepThreeText:'Vote for the storyteller’s card — but never for your own.',scoreTitle:'A little scoring twist',scoreText:'The storyteller scores only when some, but not all, players find their card. Clever clues win.',faqEyebrow:'Before you begin',faqTitle:'A few answers<br /><em>for the table.</em>',faqOneQuestion:'How many people can play?',faqOneAnswer:'A real game starts with 3 players and supports up to 10. Three is the smallest table where bluffing and guessing stay interesting.',faqTwoQuestion:'How long does a game last?',faqTwoAnswer:'Each player spends one card every round. The number of rounds is calculated from the deck and player count before the game begins.',faqThreeQuestion:'Do we need to create accounts?',faqThreeAnswer:'No. Choose a nickname, create a room, and share its link. Guest sessions keep the table in sync while you play.'},ru:{guideEyebrow:'Три шага к истории',guideTitle:'Простые правила.<br /><em>Неожиданные ответы.</em>',guideLead:'В Luminaria лучше всего играть компанией от трёх до десяти человек. В каждом раунде появляется новый ведущий.',stepOneTitle:'Загадай ассоциацию',stepOneText:'Ведущий выбирает тайную карту и даёт к ней короткую, образную подсказку.',stepTwoTitle:'Добавь свою карту',stepTwoText:'Остальные тайно кладут по одной карте, которая подходит к ассоциации.',stepThreeTitle:'Найди тайную карту',stepThreeText:'Проголосуй за карту ведущего — но никогда не за свою.',scoreTitle:'Важный нюанс очков',scoreText:'Ведущий получает очки, только если его карту угадали некоторые, но не все игроки. Выигрывают точные подсказки.',faqEyebrow:'Перед началом',faqTitle:'Несколько ответов<br /><em>для стола.</em>',faqOneQuestion:'Сколько человек могут играть?',faqOneAnswer:'Настоящая игра начинается с 3 игроков и поддерживает до 10. Втроём уже появляются блеф и интересные догадки.',faqTwoQuestion:'Сколько длится партия?',faqTwoAnswer:'Каждый игрок тратит одну карту в раунд. Число раундов рассчитывается из колоды и количества игроков до начала игры.',faqThreeQuestion:'Нужны ли аккаунты?',faqThreeAnswer:'Нет. Выберите ник, создайте комнату и отправьте ссылку друзьям. Гостевые сессии синхронизируют стол во время игры.'}};
Object.assign(siteCopy.en,{stepThreeText:'Guess the storyteller’s card, and choose yours to fool the others.',scoreText:'The storyteller scores when at least one, but not every, player finds their card. The best clues are unexpected.'});
Object.assign(siteCopy.ru,{stepThreeText:'Угадай карту ведущего, а свою подбери так, чтобы за неё проголосовали другие.',scoreText:'Ведущий получает очки, если его карту угадал хотя бы один игрок, но не все. Чем неожиданнее ассоциация, тем лучше.'});
Object.assign(copy.en,{rule3:'Guess the storyteller’s card, and choose yours to fool the others.'});
Object.assign(copy.ru,{rule3:'Угадай карту ведущего, а свою подбери так, чтобы за неё проголосовали другие.'});
Object.assign(siteCopy.en,{ctaEyebrow:'The table is waiting',ctaTitle:'Bring a clue.<br /><em>Leave with a story.</em>',ctaText:'Create a private room in a moment. All your friends need is the invitation link.',ctaPlay:'Create a room',ctaJoin:'I have a room code',footerText:'A card game for curious minds',footerRules:'Rules'});
Object.assign(siteCopy.ru,{ctaEyebrow:'Стол уже ждёт',ctaTitle:'Принеси подсказку.<br /><em>Унеси историю.</em>',ctaText:'Создай приватную комнату за мгновение. Друзьям понадобится только ссылка-приглашение.',ctaPlay:'Создать комнату',ctaJoin:'У меня есть код комнаты',footerText:'Карточная игра для любопытных умов',footerRules:'Правила'});
Object.assign(siteCopy.en,{archiveEyebrow:'The Moonlit Archive',archiveTitle:'Four decks.<br /><em>Countless stories.</em>',archiveText:'Every card is a starting point for a strange, funny, or beautiful association.',archiveButton:'Explore all decks →',decksMenu:'Decks'});
Object.assign(siteCopy.ru,{archiveEyebrow:'Лунный архив',archiveTitle:'Четыре колоды.<br /><em>Бесконечно историй.</em>',archiveText:'Каждая карта — начало странной, смешной или красивой ассоциации.',archiveButton:'Посмотреть все колоды →',decksMenu:'Колоды'});
Object.assign(siteCopy.en,{rulesScore:'The storyteller scores when at least one, but not every, player finds their card. Choose an unexpected clue.'});
Object.assign(siteCopy.ru,{rulesScore:'Ведущий получает очки, если его карту угадал хотя бы один игрок, но не все. Выбирай неочевидную ассоциацию.'});
Object.assign(copy.en,{feedback:'Help improve the game'});
Object.assign(copy.ru,{feedback:'Помочь улучшить игру'});
Object.assign(copy.ru,{openRoomsEyebrow:'Играйте вместе',openRoomsTitle:'Открытые комнаты',refreshRooms:'Обновить ↻',roomAccess:'Кто может войти?',privateRoom:'Закрытое лобби',publicRoom:'Открытое лобби',publicRoomHint:'Видно всем. Знакомься с новыми игроками.',privateRoomHint:'Вход только по твоей ссылке или коду.'});
Object.assign(copy.en,{openRoomsEyebrow:'Meet new players',openRoomsTitle:'Open rooms',refreshRooms:'Refresh ↻',roomAccess:'Who can join?',privateRoom:'Private lobby',publicRoom:'Open lobby',publicRoomHint:'Visible to everyone. Meet new players.',privateRoomHint:'Only through your invitation link or code.'});
Object.assign(siteCopy.ru,{faqTitle:'Перед первой<br /><em>игрой.</em>',faqOneAnswer:'От 3 до 10 человек. Можно пригласить друзей по ссылке или присоединиться к открытой комнате.',faqTwoAnswer:'Число раундов выбирает создатель комнаты перед стартом. Каждый по очереди будет ведущим; доступные варианты зависят от количества игроков и карт в колоде.',faqThreeAnswer:'Регистрация не обязательна — можно играть гостем. Ник и аватар меняются в профиле. Вход в аккаунт позволит использовать профиль на других устройствах.'});
Object.assign(siteCopy.en,{faqTitle:'Before your<br /><em>first game.</em>',faqOneAnswer:'3 to 10 players. Invite friends with a link or join an open room.',faqTwoAnswer:'The host chooses the number of rounds before starting. Everyone takes a turn as storyteller. Available lengths depend on the player count and deck size.',faqThreeAnswer:'No registration required: you can play as a guest. Edit your nickname and avatar in your profile. Sign in to use your profile on other devices.'});
let language=localStorage.getItem('luminaria-language')||(navigator.language.startsWith('ru')?'ru':'en');let entryMode='play';const $=s=>document.querySelector(s);const entryDialog=$('#entryDialog');
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function showInlineGameError(message){let notice=document.querySelector('#gameActionError');if(!notice){notice=document.createElement('p');notice.id='gameActionError';notice.className='inline-game-error';notice.setAttribute('role','alert');document.querySelector('main')?.append(notice)}if(notice)notice.textContent=message}
$('#closeEntry').addEventListener('click',()=>entryDialog.close());
let activeRoundClue='';
let activeStorytellerCard='';
const moonPhases=[
  {icon:'☾',rule:'short',ru:'Тонкий месяц',en:'Crescent Moon',ruText:'Ассоциация должна быть короткой — до трёх слов.',enText:'Keep the clue short — up to three words.'},
  {icon:'◐',ru:'Полутень',en:'Half Shadow',ruText:'Намекни на настроение, а не на предмет.',enText:'Hint at a mood, not an object.'},
  {icon:'●',rule:'question',ru:'Новолуние',en:'New Moon',ruText:'Скажи ассоциацию как вопрос.',enText:'Give your clue as a question.'},
  {icon:'◕',ru:'Полнолуние',en:'Full Moon',ruText:'Добавь к ассоциации цвет или ощущение.',enText:'Add a color or a sensation to your clue.'}
];
let activeMoonPhase=null;
function renderMoonPhase(){const stage=document.querySelector('.host-stage,.guess-stage,.waiting-stage,.vote-header,.result-head');if(!stage||stage.querySelector('.moon-phase'))return;if(!activeMoonPhase)activeMoonPhase=moonPhases[Math.floor(Math.random()*moonPhases.length)];const phase=activeMoonPhase,ru=language==='ru';const badge=document.createElement('aside');badge.className='moon-phase';badge.innerHTML=`<span>${phase.icon}</span><div><b>${ru?'Лунная фаза: ':'Moon phase: '}${ru?phase.ru:phase.en}</b><small>${ru?phase.ruText:phase.enText}</small></div>`;stage.prepend(badge)}
const moonPhaseObserver=new MutationObserver(()=>renderMoonPhase());moonPhaseObserver.observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',event=>{if(event.target.closest('#nextRound'))activeMoonPhase=null},true);
document.addEventListener('click',event=>{if(!event.target.closest('#revealButton')||!activeMoonPhase)return;const clue=$('#clueInput')?.value.trim()||'';const invalid=activeMoonPhase.rule==='short'&&clue.split(/\s+/).filter(Boolean).length>3||activeMoonPhase.rule==='question'&&clue&&!/[?？]$/.test(clue);if(!invalid)return;event.preventDefault();event.stopImmediatePropagation();alert(activeMoonPhase.rule==='short'?(language==='ru'?'Тонкий месяц: используй не больше трёх слов.':'Crescent Moon: use no more than three words.'):(language==='ru'?'Новолуние: оформи ассоциацию как вопрос.':'New Moon: phrase the clue as a question.'))},true);
const archivedDeck=__LUMINARIA_DECK_FILES__.filter(card=>card.endsWith('-card.webp'));
const removedCards=new Set(['060-card.webp','063-card.webp']);
const deckPool=archivedDeck.filter(card=>!removedCards.has(card));

const popDeck=__LUMINARIA_DECK_FILES__.filter(card=>card.endsWith('-pop.webp'));
const absurdDeck=__LUMINARIA_DECK_FILES__.filter(card=>card.endsWith('-abs.webp'));
const memeDeck=__LUMINARIA_DECK_FILES__.filter(card=>card.endsWith('-meme.webp'));
const cardAssetVersion=card=>card==='420-pop.webp'?'?v=naked-gun-1':'';
const availableCards=new Set(__LUMINARIA_AVAILABLE_CARDS__);
const deckCovers={moon:'005-card.webp',pop:'206-pop.webp',abs:'001-abs.webp',meme:'007-meme.webp'};
const decks={moon:{ru:'Лунный архив',en:'Moonlit Archive',cards:deckPool,icon:'☾'},pop:{ru:'Поп-культура',en:'Pop Culture',cards:popDeck,icon:'✦'},abs:{ru:'Бытовой абсурд',en:'Everyday Absurdity',cards:absurdDeck,icon:'✳'},meme:{ru:'Мемный хаос',en:'Meme Chaos',cards:memeDeck,icon:'✺'}};
const deckKeyByDatabaseId={'moonlit-archive':'moon','pop-culture':'pop','everyday-absurdity':'abs','meme-chaos':'meme'};
copy.ru.openRoomsIntro='Новая история начинается с новых знакомых. Выбирай комнату и присоединяйся к игре.';
copy.en.openRoomsIntro='A new story starts with new people. Pick a table and join in.';
let openRoomsLoading=false;
async function renderOpenRooms(){
  const list=$('#openRoomsList');if(!list||openRoomsLoading)return;
  openRoomsLoading=true;
  try{
    const {data,error}=await supabase.rpc('list_open_luminaria_rooms');
    if(error)throw error;
    if(!$('#openRoomsList'))return;
    const ru=language==='ru';
    list.innerHTML=data?.length?data.map(room=>{
      const deck=decks[deckKeyByDatabaseId[room.deck_id]||'moon'];
      return `<article class="open-room-card"><div><strong>${escapeHtml(room.host_name)}</strong><small>${escapeHtml(deck[language])} · ${Number(room.player_count)||0}/10 ${ru?'игроков':'players'} · ${Number(room.round_cycles)||2} ${ru?'круга':'cycles'}</small></div><button type="button" class="open-room-join" data-open-room="${escapeHtml(room.code)}">${ru?'Войти':'Join'} →</button></article>`;
    }).join(''):`<p class="open-rooms-empty">${ru?'Пока нет открытых комнат. Создай свою — и другие смогут присоединиться.':'No open rooms yet. Create one so others can join.'}</p>`;
  }catch(error){
    if($('#openRoomsList'))list.innerHTML=`<p class="open-rooms-empty">${language==='ru'?'Не удалось загрузить комнаты. Попробуй обновить список.':'Could not load rooms. Try refreshing.'}</p>`;
    console.error('Open rooms:',error);
  }finally{openRoomsLoading=false}
}
$('#refreshOpenRooms')?.addEventListener('click',renderOpenRooms);
$('#openRoomsList')?.addEventListener('click',async event=>{
  const button=event.target.closest('[data-open-room]');if(!button)return;
  await openEntry('join');
  const input=$('#roomCodeInput');if(input)input.value=button.dataset.openRoom;
});
renderOpenRooms();
setInterval(()=>{if(!document.hidden)renderOpenRooms()},15000);
function selectedDeckId(){return {'pop-culture':'pop','everyday-absurdity':'abs','meme-chaos':'meme'}[liveGameContext?.room.deck_id]||'moon'}
function selectedDeckCards(){return decks[selectedDeckId()].cards}

function shuffleDeck(cards){
  const shuffled=[...cards];
  for(let index=shuffled.length-1;index>0;index--){
    const swapIndex=Math.floor(Math.random()*(index+1));
    [shuffled[index],shuffled[swapIndex]]=[shuffled[swapIndex],shuffled[index]];
  }
  return shuffled;
}
function deckCardInfo(card){const [number,...slugParts]=card.replace(/\.(png|webp)$/i,'').split('-');const slug=slugParts.join(' ');const title=slug.replace(/\b\w/g,letter=>letter.toUpperCase());return{number:Number(number),title:title==='Dream Card'?`Dream Card ${Number(number)}`:title}}
function openDeckGallery(deckId='moon'){
  const ru=language==='ru',deck=decks[deckId]||decks.moon;
  let dialog=$('#deckDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='deckDialog';document.body.append(dialog)}
  dialog.innerHTML=`<section class="deck-gallery"><button class="close" id="closeDeck" aria-label="${ru?'Закрыть':'Close'}">×</button><header><p class="eyebrow">${ru?'Коллекция карт':'Card collection'}</p><h2>${deck[language]}</h2><p>${deck.cards.length} ${ru?'карт. Длительность партии выбирается в лобби.':'cards. Choose game length in the lobby.'}</p><div class="deck-tabs">${Object.entries(decks).map(([id,d])=>`<button type="button" data-gallery-deck="${id}" aria-pressed="${id===deckId}">${d.icon} ${d[language]}</button>`).join('')}</div></header><div class="deck-gallery-grid">${deck.cards.map((card,index)=>`<button class="deck-gallery-card" data-card="${card}" aria-label="${ru?'Карта':'Card'} ${index+1}"><img loading="lazy" decoding="async" width="240" height="360" src="/deck-thumbs/${card}${cardAssetVersion(card)||'?v=2'}" data-full-src="/deck-preview/${card}${cardAssetVersion(card)}" alt="${ru?'Карта':'Card'} ${index+1}"><span>${index+1}</span></button>`).join('')}</div></section>`;
  dialog.querySelectorAll('.deck-gallery-card img').forEach(image=>{image.onerror=()=>{image.onerror=null;image.src=image.dataset.fullSrc}});
  if(!dialog.open)dialog.showModal();addDeckSearch();$('#closeDeck').onclick=()=>dialog.close();dialog.onclick=event=>{if(event.target===dialog)dialog.close()};
  dialog.querySelectorAll('[data-gallery-deck]').forEach(button=>button.onclick=()=>openDeckGallery(button.dataset.galleryDeck));
  const slides=deck.cards.map((card,index)=>({src:`/deck-preview/${card}${cardAssetVersion(card)}`,alt:`${ru?'Карта':'Card'} ${index+1}`}));
  dialog.querySelectorAll('.deck-gallery-card').forEach((button,index)=>button.onclick=()=>openCardPreview({items:slides,index,kind:'gallery'}));
}
function openDeckMenu(){
  const ru=language==='ru';let dialog=$('#deckMenuDialog');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='deckMenuDialog';document.body.append(dialog)}
  dialog.innerHTML=`<section class="deck-menu"><button class="close" aria-label="${ru?'Закрыть':'Close'}">×</button><p class="eyebrow">${ru?'Коллекция Luminaria':'Luminaria collection'}</p><h2>${ru?'Выбери колоду':'Explore the decks'}</h2><div class="deck-menu-options">${Object.entries(decks).map(([id,deck])=>`<button type="button" data-open-deck="${id}"><img src="/deck-thumbs/${deck.cards[0]}${cardAssetVersion(deck.cards[0])}" alt="" width="240" height="360"><strong>${deck[language]}</strong><span>${deck.cards.length} ${ru?'карт · Смотреть →':'cards · Explore →'}</span></button>`).join('')}</div></section>`;
  dialog.querySelector('.close').onclick=()=>dialog.close();dialog.onclick=event=>{if(event.target===dialog)dialog.close()};
  dialog.querySelectorAll('[data-open-deck]').forEach(button=>button.onclick=()=>{dialog.close();openDeckGallery(button.dataset.openDeck)});
  if(!dialog.open)dialog.showModal();
}
document.addEventListener('click',event=>{if(event.target.closest('#deckButton'))openDeckMenu()});
// A tab opened before multiplayer was enabled may still display its old local lobby.
if(document.querySelector('.lobby-page')&&document.body.textContent.includes('Демо-режим'))location.replace('/');
function addDeckSearch(){const dialog=$('#deckDialog');if(!dialog?.open||$('#deckSearch'))return;const ru=language==='ru';const search=document.createElement('input');search.id='deckSearch';search.type='search';search.placeholder=ru?'Найти карту по номеру или названию':'Find a card by number or name';search.setAttribute('aria-label',search.placeholder);search.style.cssText='width:100%;margin-top:18px;padding:12px 14px;border:1px solid #ffffff2a;border-radius:9px;background:#111630;color:#fff;font:14px DM Sans;outline:none';search.addEventListener('input',()=>{const query=search.value.trim().toLowerCase();document.querySelectorAll('.deck-gallery-card').forEach(card=>{card.hidden=Boolean(query)&&!card.textContent.toLowerCase().includes(query)})});dialog.querySelector('.deck-gallery header')?.append(search)}
const deckSearchObserver=new MutationObserver(()=>addDeckSearch());deckSearchObserver.observe(document.body,{childList:true,subtree:true});
const deckPreviewObserver=new MutationObserver(()=>{const preview=$('#cardPreviewDialog'),deck=$('#deckDialog');if(!preview||!deck?.open)return;const button=$('#previewChoose'),label=language==='ru'?'Закрыть':'Close';if(button&&button.textContent!==label)button.textContent=label});deckPreviewObserver.observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',event=>{if(!event.target.closest('#previewChoose')||!$('#deckDialog')?.open)return;event.preventDefault();event.stopImmediatePropagation();$('#cardPreviewDialog')?.close()},true);
function randomDeckHand(){if(liveGameContext)return liveHandCache;return shuffleDeck(deckPool).slice(0,6)}
function updateLanguage(){const t=copy[language],meta=document.querySelector('meta[name="description"]'),ogTitle=document.querySelector('meta[property="og:title"]'),ogDescription=document.querySelector('meta[property="og:description"]'),siteMeta=language==='ru'?{title:'Luminaria — игра воображения',description:'Luminaria — онлайн-игра на ассоциации, тайные карты и воображение для 3–10 друзей.',ogDescription:'Придумай ассоциацию, выбери карту и найди историю, которую увидят друзья.'}:{title:'Luminaria — a game of imagination',description:'Luminaria is an online game of clues, secret cards, and imagination for 3–10 friends.',ogDescription:'Give a clue, choose a card, and find the story your friends can see.'};document.documentElement.lang=language;document.title=siteMeta.title;if(meta)meta.content=siteMeta.description;if(ogTitle)ogTitle.content=siteMeta.title;if(ogDescription)ogDescription.content=siteMeta.ogDescription;$('#languageToggle').textContent=language==='en'?'RU':'EN';document.querySelectorAll('[data-i18n]').forEach(n=>n.innerHTML=t[n.dataset.i18n]);document.querySelectorAll('[data-site-i18n]').forEach(n=>n.innerHTML=siteCopy[language][n.dataset.siteI18n]);$('#dialogTitle').textContent=t.welcome;$('#dialogText').textContent=t.pickName;$('#nicknameLabel').textContent=t.nickname;$('#nickname').placeholder=t.placeholder;$('#entrySubmit').innerHTML=`${t.continue} <b>→</b>`}
function openEntry(mode='play'){entryMode=mode;$('#roomVisibilityField').hidden=mode!=='create';const t=copy[language];$('#dialogTitle').textContent=mode==='create'?(language==='ru'?'Создать комнату':'Create a room'):(language==='ru'?'Войти в комнату':'Join a room');$('#dialogText').textContent=mode==='create'?(language==='ru'?'Собери друзей или познакомься с новой компанией.':'Bring your friends or meet a new crowd.'):(language==='ru'?'Введи код комнаты. Профиль можно настроить отдельно.':'Enter the room code. You can edit your profile separately.');$('#entrySubmit').innerHTML=`${mode==='create'?(language==='ru'?'Создать':'Create'):(language==='ru'?'Войти':'Join')} <b>→</b>`;let codeInput=$('#roomCodeInput');if(mode==='join'&&!codeInput){const field=document.createElement('div');field.className='form-field room-code-field';field.innerHTML=`<label for="roomCodeInput">${language==='ru'?'Код комнаты':'Room code'}</label><input id="roomCodeInput" maxlength="6" placeholder="AB12CD" autocomplete="off" autocapitalize="characters">`;$('#nicknameLabel').before(field);codeInput=$('#roomCodeInput')}if(mode!=='join')codeInput?.closest('.room-code-field')?.remove();if(mode==='join'&&codeInput&&!codeInput.dataset.formatBound){codeInput.dataset.formatBound='true';codeInput.addEventListener('input',()=>{codeInput.setCustomValidity('');codeInput.value=codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6)})}const fromLink=new URLSearchParams(location.search).get('room');if(mode==='join'&&fromLink)codeInput.value=fromLink.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);entryDialog.showModal();setTimeout(()=>mode==='join'?$('#roomCodeInput')?.focus():$('#entrySubmit')?.focus(),100)}
function refreshAvatarLabels(){const picker=$('#avatarPicker');if(!picker)return;const selected=picker.querySelector('.avatar-choice.selected')?.dataset.avatarId||'mage-male';picker.querySelectorAll('.avatar-choice').forEach(button=>button.remove());picker.insertAdjacentHTML('afterbegin',avatarChoicesMarkup('avatar-choice',selected,language))}
function showLobby(player){const t=copy[language],code=Math.random().toString(36).slice(2,8).toUpperCase(),link=roomInviteUrl(location.origin,code);document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="lobby-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><button class="language" id="lobbyLanguage">${language==='en'?'RU':'EN'}</button></nav><section class="lobby-hero"><div><p class="eyebrow"><span></span><span>${t.room} ${code}</span></p><h1>${t.waiting}<br><em>${t.players}.</em></h1><p class="lead">${t.gameDemo}</p></div><div class="lobby-orb">✦</div></section><section class="lobby-grid"><article class="lobby-panel players-panel"><div class="panel-title"><h2>${t.players}</h2><span class="count">1 / 10</span></div><div class="player-row"><span class="lobby-avatar">${player.avatar}</span><div><strong>${player.name}</strong><small>${t.host}</small></div><span class="status-dot"></span></div><div class="empty-seat"><span>+</span><p>${t.waiting}…</p></div><div class="empty-seat"><span>+</span><p>${t.waiting}…</p></div></article><article class="lobby-panel invite-panel"><span class="invite-icon">↗</span><h2>${t.invite}</h2><p>${t.shareHint}</p><div class="share-link"><span>${link}</span><button id="copyInvite">${t.copyLink}</button></div><div class="ready-line"><span class="ready-check" id="readyCheck">✓</span><span id="readyLabel">${t.notReady}</span></div><button class="primary-button full" id="readyButton">${t.ready} <b>→</b></button><button class="start-button" id="startButton" disabled>${t.start}</button></article></section></main>`;$('#copyInvite').addEventListener('click',async()=>{await navigator.clipboard?.writeText(link);$('#copyInvite').textContent=t.copied;setTimeout(()=>$('#copyInvite').textContent=t.copyLink,1500)});$('#readyButton').addEventListener('click',()=>{$('#readyCheck').classList.add('is-ready');$('#readyLabel').textContent=t.readyState;$('#readyButton').classList.add('is-ready');$('#readyButton').innerHTML=`✓ ${t.readyState}`;$('#startButton').disabled=false});$('#startButton').addEventListener('click',()=>$('#startButton').textContent=language==='ru'?'Скоро начнём…':'Starting soon…');$('#lobbyLanguage').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);showLobby(player)})}
refreshAvatarLabels();$('#avatarPicker').addEventListener('click',event=>{const button=event.target.closest('.avatar-choice');if(!button)return;$('#avatarPicker .avatar-choice.selected')?.classList.remove('selected');button.classList.add('selected');uploadedAvatar=null;const label=$('#avatarUploadLabel');label.style.backgroundImage='';label.classList.remove('has-image')});$('#languageToggle').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);updateLanguage();refreshAvatarLabels();renderOpenRooms()});$('#playButton').addEventListener('click',()=>openEntry('create'));$('#createRoom').addEventListener('click',()=>openEntry('create'));$('#joinRoom').addEventListener('click',()=>openEntry('join'));$('#scrollRooms').addEventListener('click',()=>$('#rooms').scrollIntoView({behavior:'smooth'}));$('#rulesButton').addEventListener('click',showRoomRules);$('#closeRules').addEventListener('click',()=>$('#rulesDialog').close());updateLanguage();
function openFeedback(){
  const ru=language==='ru',dialog=document.createElement('dialog');dialog.id='feedbackDialog';
  dialog.innerHTML=`<form class="modal auth-modal feedback-modal" id="feedbackForm"><button class="close" id="closeFeedback" type="button" aria-label="${ru?'Закрыть':'Close'}">×</button><span class="modal-star">✦</span><h2>${ru?'Помоги сделать игру лучше':'Help make the game better'}</h2><p>${ru?'Расскажи, что улучшить или какой баг заметил. Сообщение придёт разработчику в Telegram.':'Tell us what to improve or report a bug. Your message goes to the developer in Telegram.'}</p><label class="auth-label" for="feedbackMessage">${ru?'Пожелание или описание проблемы':'Suggestion or bug report'}</label><textarea id="feedbackMessage" name="message" maxlength="1000" minlength="5" required></textarea><label class="feedback-trap" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><p class="feedback-status" id="feedbackStatus" role="status" aria-live="polite"></p><button class="primary-button full" type="submit">${ru?'Отправить':'Send feedback'} <b>→</b></button></form>`;
  document.body.append(dialog);dialog.showModal();
  $('#closeFeedback').addEventListener('click',()=>{dialog.close();dialog.remove()});
  dialog.addEventListener('cancel',()=>dialog.remove());
  $('#feedbackMessage').focus();
}
$('#feedbackButton').addEventListener('click',openFeedback);
document.addEventListener('submit',async event=>{
  const form=event.target;if(form?.id!=='feedbackForm')return;
  event.preventDefault();const button=form.querySelector('[type="submit"]'),status=$('#feedbackStatus');button.disabled=true;
  status.textContent=language==='ru'?'Отправляем…':'Sending…';
  try{
    const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:form.elements.message.value,website:form.elements.website.value}),signal:AbortSignal.timeout(12000)});
    if(response.status===429)throw new Error('rate');
    if(response.status===503)throw new Error('setup');
    if(!response.ok)throw new Error('send');
    status.textContent=language==='ru'?'Спасибо! Сообщение отправлено.':'Thank you! Your message was sent.';form.reset();
  }catch(error){
    status.textContent=error.message==='rate'?(language==='ru'?'Слишком часто. Попробуй ещё раз позже.':'Too many messages. Please try again later.'):error.message==='setup'?(language==='ru'?'Форма обратной связи пока настраивается.':'Feedback is not configured yet.'):language==='ru'?'Не удалось отправить. Попробуй позже.':'Could not send. Please try again later.';
  }finally{button.disabled=false}
});
$('#finalPlay')?.addEventListener('click',()=>openEntry('create'));$('#finalJoin')?.addEventListener('click',()=>openEntry('join'));
$('#archiveDeck')?.addEventListener('click',openDeckGallery);
function offerRoomJoinFromLink(){const code=new URLSearchParams(location.search).get('room');if(!code||$('#joinLinkedRoom'))return;const button=document.createElement('button');button.id='joinLinkedRoom';button.type='button';button.className='text-button';button.textContent=language==='ru'?`Войти в комнату ${code.toUpperCase()}`:`Join room ${code.toUpperCase()}`;button.addEventListener('click',()=>openEntry('join'));document.querySelector('.hero-actions')?.append(button)}
if(new URLSearchParams(location.search).get('room')){offerRoomJoinFromLink();setTimeout(()=>openEntry('join'),300)}
document.addEventListener('click',(event)=>{const button=event.target.closest('#readyButton');if(!button||liveGameContext||!button.classList.contains('is-ready'))return;event.stopImmediatePropagation();const t=copy[language];$('#readyCheck').classList.remove('is-ready');$('#readyLabel').textContent=t.notReady;button.classList.remove('is-ready');button.innerHTML=`${t.ready} <b>→</b>`;$('#startButton').disabled=true},true);
function legacyShowGame(){const player=JSON.parse(localStorage.getItem('luminaria-player')||'{"name":"Dreamer","avatar":"✦"}');const ru=language==='ru';const cards=randomDeckHand();document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="game-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Твой ход':'Your turn'}</div><button class="language" id="gameLanguage">${ru?'EN':'RU'}</button></nav><section class="game-stage"><div class="storyteller"><span class="lobby-avatar">${player.avatar}</span><div><strong>${player.name}</strong><small>${ru?'Ведущий':'Storyteller'}</small></div></div><p class="eyebrow"><span></span><span>${ru?'Твоя тайная карта':'Your secret card'}</span></p><article class="secret-card"><img src="/deck-preview/04-teapot-city.png" alt="Secret story card"><span>✦</span></article><div class="clue-box"><label for="clueInput">${ru?'Придумай ассоциацию':'Give a clue'}</label><input id="clueInput" maxlength="70" placeholder="${ru?'Например: «Мир внутри мира»':'For example: “A world within a world”'}"><button class="primary-button" id="revealButton">${ru?'Открыть выбор карт':'Reveal card choices'} <b>→</b></button></div></section><section class="hand-area"><div class="hand-heading"><div><p class="eyebrow"><span></span><span>${ru?'Выбери карту из руки':'Choose a card from your hand'}</span></p><h2>${ru?'Какая подходит к подсказке?':'Which card fits the clue?'}</h2></div><span class="hand-count">5</span></div><div class="game-hand">${cards.map((card,index)=>`<button class="hand-card" data-card="${index}" aria-label="${ru?'Выбрать карту':'Choose card'} ${index+1}"><img src="/deck-preview/${card}${cardAssetVersion(card)}" alt="Game card ${index+1}"></button>`).join('')}</div></section></main>`;let selected=null;document.querySelectorAll('.hand-card').forEach(card=>card.addEventListener('click',()=>{if(card.classList.contains('selected')){card.classList.remove('selected');selected=null;return}document.querySelector('.hand-card.selected')?.classList.remove('selected');card.classList.add('selected');selected=card.dataset.card}));$('#revealButton').addEventListener('click',()=>{const clue=$('#clueInput').value.trim();if(!clue||selected===null){$('#clueInput').focus();return}$('#revealButton').innerHTML=ru?'Карты открыты ✓':'Cards revealed ✓';$('#revealButton').classList.add('is-ready');$('#clueInput').disabled=true;document.querySelectorAll('.hand-card').forEach(c=>c.disabled=true)});$('#gameLanguage').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);showGame()})}
document.addEventListener('click',(event)=>{const button=event.target.closest('#startButton');if(!button||button.disabled||liveGameContext)return;event.stopImmediatePropagation();showGame()},true);
function gameHand(cards,ru){return `<div class="game-hand">${cards.map(card=>{const info=deckCardInfo(card);return`<button class="hand-card" data-card="${info.number}" aria-label="${ru?'Выбрать карту':'Choose card'} ${info.number}: ${info.title}"><img src="/deck-preview/${card}${cardAssetVersion(card)}" alt="${info.title}"></button>`}).join('')}</div>`}
function openCardPreview({src,alt,selected,onToggle,kind='card',items,index=0}){
  const existing=$('#cardPreviewDialog');if(existing)existing.remove();
  const ru=language==='ru',viewOnly=kind==='view'||kind==='gallery';
  const slides=items?.length?items:[{src,alt,selected,onToggle}];
  let active=Math.max(0,Math.min(index,slides.length-1));
  const dialog=document.createElement('dialog');dialog.id='cardPreviewDialog';
  dialog.innerHTML=`<div class="card-preview-modal"><button class="close" id="closePreview">×</button><button class="preview-arrow preview-prev" type="button" aria-label="${ru?'Предыдущая карта':'Previous card'}">‹</button><img id="previewImage" alt=""><button class="preview-arrow preview-next" type="button" aria-label="${ru?'Следующая карта':'Next card'}">›</button><div class="preview-position" id="previewPosition"></div><div class="preview-footer"><span>${viewOnly?(ru?'Листай карты стрелками.':'Browse cards with the arrows.'):(ru?'Рассмотри карту и реши, подходит ли она к ассоциации.':'Take a closer look, then decide whether it fits the clue.')}</span><button class="primary-button" id="previewChoose"></button></div></div>`;
  document.body.append(dialog);
  const render=()=>{const slide=slides[active],button=$('#previewChoose');$('#previewImage').src=slide.src;$('#previewImage').alt=slide.alt||'';$('#previewPosition').textContent=`${active+1} / ${slides.length}`;button.innerHTML=viewOnly?(ru?'Закрыть':'Close'):slide.selected?.()?(ru?'Отменить выбор':'Clear selection'):(kind==='vote'?(ru?'Выбрать для голоса':'Choose for vote'):(ru?'Выбрать карту':'Choose this card'))+` ${viewOnly?'':'<b>→</b>'}`;dialog.querySelectorAll('.preview-arrow').forEach(arrow=>arrow.hidden=slides.length<2)};
  const move=step=>{active=(active+step+slides.length)%slides.length;render()};
  const onKey=event=>{if(event.key==='ArrowLeft'){event.preventDefault();move(-1)}if(event.key==='ArrowRight'){event.preventDefault();move(1)}};
  dialog.showModal();render();document.addEventListener('keydown',onKey);
  const close=()=>dialog.close();$('#closePreview').addEventListener('click',close);dialog.addEventListener('click',event=>{if(event.target===dialog)close()});dialog.addEventListener('close',()=>document.removeEventListener('keydown',onKey),{once:true});dialog.querySelector('.preview-prev').addEventListener('click',()=>move(-1));dialog.querySelector('.preview-next').addEventListener('click',()=>move(1));$('#previewChoose').addEventListener('click',()=>{if(!viewOnly)slides[active].onToggle?.();close()})
}
function bindCardSelection(){const handCountLabel=document.querySelector('.hand-count');if(handCountLabel)handCountLabel.textContent=document.querySelectorAll('.hand-card').length;let selected=null;const cards=[...document.querySelectorAll('.hand-card')];const toggle=card=>{if(card.classList.contains('selected')){card.classList.remove('selected');selected=null;return}cards.find(item=>item.classList.contains('selected'))?.classList.remove('selected');card.classList.add('selected');selected=card.dataset.card};const slides=cards.map(card=>{const image=card.querySelector('img');return{src:image.src,alt:image.alt,selected:()=>card.classList.contains('selected'),onToggle:()=>toggle(card)}});cards.forEach((card,index)=>card.addEventListener('click',()=>openCardPreview({items:slides,index,kind:'card'})));return()=>selected}
function showGuesser(storyteller,clue){const ru=language==='ru';const cards=randomDeckHand();document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="game-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Выберите карту':'Choose a card'}</div><button class="language" id="gameLanguage">${ru?'EN':'RU'}</button></nav><section class="guess-stage"><p class="eyebrow"><span></span><span>${ru?'Ассоциация ведущего':'Storyteller’s clue'}</span></p><div class="clue-reveal"><div class="storyteller"><span class="lobby-avatar">${storyteller.avatar}</span><div><strong>${storyteller.name}</strong><small>${ru?'Загадал(а) ассоциацию':'Gave a clue'}</small></div></div><blockquote>“${clue}”</blockquote></div><p class="guess-help">${ru?'Карта ведущего скрыта. Выбери одну из своих карт, которая лучше всего подходит к фразе.':'The storyteller’s card is hidden. Choose one card from your hand that best fits the clue.'}</p></section><section class="hand-area"><div class="hand-heading"><div><p class="eyebrow"><span></span><span>${ru?'Твоя рука':'Your hand'}</span></p><h2>${ru?'Выбери только одну карту':'Choose just one card'}</h2></div><span class="hand-count">5</span></div>${gameHand(cards,ru)}<button class="primary-button send-card" id="sendCard">${ru?'Отправить карту':'Send card'} <b>→</b></button></section></main>`;const getSelected=bindCardSelection();$('#sendCard').addEventListener('click',()=>{if(getSelected()===null)return;$('#sendCard').classList.add('is-ready');$('#sendCard').innerHTML=ru?'Карта отправлена ✓':'Card sent ✓';document.querySelectorAll('.hand-card').forEach(c=>c.disabled=true)});$('#gameLanguage').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);showGuesser(storyteller,clue)})}
function showGame(){const player=JSON.parse(localStorage.getItem('luminaria-player')||'{"name":"Dreamer","avatar":"✦"}');const ru=language==='ru';const cards=randomDeckHand();document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="game-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Твой ход':'Your turn'}</div><button class="language" id="gameLanguage">${ru?'EN':'RU'}</button></nav><section class="host-stage"><div class="storyteller"><span class="lobby-avatar">${player.avatar}</span><div><strong>${player.name}</strong><small>${ru?'Ведущий':'Storyteller'}</small></div></div><p class="eyebrow"><span></span><span>${ru?'Твой ход ведущего':'Your storyteller turn'}</span></p><h1>${ru?'Выбери карту<br>и <em>ассоциацию.</em>':'Choose a card<br>and a <em>clue.</em>'}</h1><p class="lead">${ru?'Остальные игроки увидят только твоё имя и фразу — выбранная карта останется тайной.':'Other players will see only your name and clue — your chosen card stays secret.'}</p><div class="clue-box"><label for="clueInput">${ru?'Твоя ассоциация':'Your clue'}</label><input id="clueInput" maxlength="70" placeholder="${ru?'Например: «Мир внутри мира»':'For example: “A world within a world”'}"><button class="primary-button" id="revealButton">${ru?'Начать выбор':'Start choosing'} <b>→</b></button></div></section><section class="hand-area"><div class="hand-heading"><div><p class="eyebrow"><span></span><span>${ru?'Твоя рука':'Your hand'}</span></p><h2>${ru?'Сначала выбери тайную карту':'First choose your secret card'}</h2></div><span class="hand-count">5</span></div>${gameHand(cards,ru)}</section></main>`;const getSelected=bindCardSelection();$('#revealButton').addEventListener('click',()=>{const clue=$('#clueInput').value.trim();if(!clue||getSelected()===null){$('#clueInput').focus();return}activeRoundClue=clue;$('#revealButton').innerHTML=ru?'Ассоциация отправлена ✓':'Clue sent ✓';$('#revealButton').classList.add('is-ready');$('#clueInput').disabled=true;document.querySelectorAll('.hand-card').forEach(c=>c.disabled=true)});$('#gameLanguage').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);showGame()})}
function showWaiting(){const player=JSON.parse(localStorage.getItem('luminaria-player')||'{"name":"Dreamer","avatar":"✦"}');const ru=language==='ru';document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="waiting-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Выбор карт':'Card selection'}</div><button class="language" id="waitLanguage">${ru?'EN':'RU'}</button></nav><section class="waiting-stage"><div class="waiting-stars">✦ ✧ ✦</div><p class="eyebrow"><span></span><span>${ru?'Ассоциация отправлена':'Clue sent'}</span></p><h1>${ru?'Игроки выбирают<br><em>свои карты.</em>':'Players are choosing<br><em>their cards.</em>'}</h1><p class="lead">${ru?'Твоя карта скрыта вместе с остальными. Когда все выберут — начнётся голосование.':'Your card is hidden among the others. When everyone has chosen, voting begins.'}</p><div class="waiting-players"><div><span>${player.avatar}</span><small>${player.name}</small><b>✓</b></div><div><span>☽</span><small>Mira</small><i></i></div><div><span>♢</span><small>Leo</small><i></i></div><div><span>☼</span><small>June</small><i></i></div></div><button class="primary-button demo-vote" id="voteDemo">${ru?'Показать результаты (демо)':'Show results (demo)'} <b>→</b></button></section></main>`;$('#voteDemo').addEventListener('click',()=>showResults());$('#waitLanguage').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);showWaiting()})}
function showVoting(storyteller,clue){const ru=language==='ru';const cards=['01-library-whale.png','03-mending-rain.png','04-teapot-city.png','08-cloud-bakery.png'];document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="voting-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Голосование':'Voting'}</div><button class="language" id="voteLanguage">${ru?'EN':'RU'}</button></nav><section class="vote-header"><div class="storyteller"><span class="lobby-avatar">${storyteller.avatar}</span><div><strong>${storyteller.name}</strong><small>${ru?'Ассоциация':'Clue'}</small></div></div><blockquote>“${clue}”</blockquote><p>${ru?'Нажми карту, чтобы открыть её крупно. Нельзя голосовать за свою карту.':'Open any card to inspect it closely. You cannot vote for your own card.'}</p></section><section class="vote-grid">${cards.map((card,index)=>`<button class="vote-card" data-vote="${index}" aria-label="${ru?'Открыть карту':'Open card'} ${index+1}"><img src="/deck-preview/${card}${cardAssetVersion(card)}" alt="Voting card ${index+1}"><span>${ru?'Карта':'Card'} ${index+1}</span></button>`).join('')}</section><button class="primary-button cast-vote" id="castVote">${ru?'Подтвердить голос':'Confirm vote'} <b>→</b></button></main>`;let selected=null;const voteCards=[...document.querySelectorAll('.vote-card')];const toggle=card=>{if(card.classList.contains('selected')){card.classList.remove('selected');selected=null;return}voteCards.find(item=>item.classList.contains('selected'))?.classList.remove('selected');card.classList.add('selected');selected=card.dataset.vote};voteCards.forEach(card=>card.addEventListener('click',()=>{const image=card.querySelector('img');openCardPreview({src:image.src,alt:image.alt,selected:card.classList.contains('selected'),onToggle:()=>toggle(card),kind:'vote'})}));$('#castVote').addEventListener('click',()=>{if(selected===null)return;$('#castVote').classList.add('is-ready');$('#castVote').innerHTML=ru?'Голос отправлен ✓':'Vote sent ✓';document.querySelectorAll('.vote-card').forEach(c=>c.disabled=true)});$('#voteLanguage').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);showVoting(storyteller,clue)})}
document.addEventListener('click',(event)=>{const button=event.target.closest('#revealButton');if(button?.classList.contains('is-ready'))setTimeout(showWaiting,0)});
function legacyDemoOldResults(){const player=JSON.parse(localStorage.getItem('luminaria-player')||'{"name":"Dreamer","avatar":"✦"}');const ru=language==='ru';const cards=['01-library-whale.png','03-mending-rain.png','04-teapot-city.png','08-cloud-bakery.png'];const names=[['☽','Mira','+3'],['✶',player.name,'+1'],['♢','Leo','+0'],['☼','June','+3']];document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="results-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Результаты':'Results'}</div><button class="language" id="resultLanguage">${ru?'EN':'RU'}</button></nav><section class="result-head"><span class="result-star">✦</span><p class="eyebrow"><span></span><span>${ru?'Карты раскрыты':'Cards revealed'}</span></p><h1>${ru?'Вот что скрывалось<br>за <em>ассоциацией.</em>':'Here is what hid<br>behind the <em>clue.</em>'}</h1><p class="result-clue">“${ru?'Мир внутри мира':'A world within a world'}”</p></section><section class="reveal-grid">${cards.map((card,index)=>`<article class="reveal-card ${index===2?'correct':''}"><img src="/deck-preview/${card}${cardAssetVersion(card)}" alt="Revealed card ${index+1}">${index===2?`<span class="correct-tag">✓ ${ru?'Карта ведущего':'Storyteller’s card'}</span>`:''}<small>${index===2?player.name:['Mira','Leo','June'][index]}</small></article>`).join('')}</section><section class="scores"><div class="panel-title"><h2>${ru?'Очки за раунд':'Round scores'}</h2><span class="count">${ru?'Раунд 1':'Round 1'}</span></div>${names.map((item,index)=>`<div class="score-row ${item[1]===player.name?'me':''}"><span class="score-avatar">${item[0]}</span><strong>${item[1]}</strong><em>${index===0?ru?'Угадала карту':'Guessed the card':index===1?ru?'За твою карту проголосовали':'Your card received a vote':ru?'Не угадал':'Did not guess'}</em><b>${item[2]}</b></div>`).join('')}<button class="primary-button next-round" id="nextRound">${ru?'Следующий раунд':'Next round'} <b>→</b></button></section></main>`;$('#nextRound').addEventListener('click',()=>showGame());$('#resultLanguage').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);showResults()})}
document.addEventListener('click',(event)=>{const button=event.target.closest('#castVote');if(button?.classList.contains('is-ready'))setTimeout(showResults,450)});
let uploadedAvatar=null;
$('#avatarUpload').addEventListener('change',(event)=>{const file=event.target.files?.[0];if(!file||!file.type.startsWith('image/'))return;const reader=new FileReader();reader.onload=()=>{uploadedAvatar=reader.result;const label=$('#avatarUploadLabel');label.style.backgroundImage=`url(${uploadedAvatar})`;label.classList.add('has-image')};reader.readAsDataURL(file)});
document.addEventListener('click',(event)=>{if(!event.target.closest('.avatar-choice'))return;uploadedAvatar=null;const label=$('#avatarUploadLabel');label.style.backgroundImage='';label.classList.remove('has-image')},true);
$('#entryForm').addEventListener('submit',async event=>{
  event.preventDefault();event.stopImmediatePropagation();
  if(event.currentTarget.dataset.connecting)return;
  const codeInput=$('#roomCodeInput');
  if(entryMode==='join'&&!/^[A-Z0-9]{6}$/.test(codeInput?.value.trim().toUpperCase()||'')){
    codeInput?.setCustomValidity(language==='ru'?'Введите шестизначный код комнаты.':'Enter a six-character room code.');codeInput?.reportValidity();codeInput?.focus();return;
  }
  codeInput?.setCustomValidity('');
  pendingRoomIsPublic=entryMode==='create'&&document.querySelector('input[name=roomVisibility]:checked')?.value==='public';
  const form=event.currentTarget,button=$('#entrySubmit'),label=button.innerHTML;
  form.dataset.connecting='true';button.disabled=true;
  button.textContent=language==='ru'?'Подключаемся…':'Connecting…';
  try{await startRoomFlow()}finally{delete form.dataset.connecting;button.disabled=false;button.innerHTML=label}
},true);

function showRoomRules(){
  const t=copy[language];
  $('#rulesDialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='rulesDialog';
  dialog.innerHTML=`<div class="modal rules-modal"><button type="button" class="close" aria-label="${language==='ru'?'Закрыть':'Close'}">×</button><span class="modal-star">✦</span><h2>${t.rulesTitle}</h2><ol><li>${t.rule1}</li><li>${t.rule2}</li><li>${t.rule3}</li></ol><aside class="rules-score"><span>✦</span><p>${siteCopy[language].rulesScore}</p></aside></div>`;
  dialog.querySelector('.close').onclick=()=>{dialog.close();dialog.remove()};
  document.body.append(dialog);dialog.showModal();
}
function lobbySettingsColumn(grid){
  let column=grid.querySelector('.lobby-settings-column');
  if(!column){column=document.createElement('div');column.className='lobby-settings-column';grid.append(column)}
  return column;
}
function addDeckSelector(){
  const ru=language==='ru',grid=$('.lobby-grid');if(!grid||grid.querySelector('.deck-panel'))return;
  const canChoose=!liveGameContext||liveGameContext.room.host_id===liveGameContext.session.user.id;
  lobbySettingsColumn(grid).insertAdjacentHTML('beforeend',`<article class="lobby-panel deck-panel"><div class="panel-title"><h2>${ru?'Колода для игры':'Game deck'}</h2></div><p>${canChoose?(ru?'Выбери колоду перед началом игры.':'Choose a deck before starting.'):(ru?'Колоду перед стартом выбирает создатель комнаты. Можно просмотреть все коллекции.':'The host chooses the deck before starting. Explore all collections.')}</p><div class="deck-list">${Object.entries(decks).map(([id,deck])=>`<div class="deck-option"><button type="button" class="deck-choice ${selectedDeckId()===id?'selected':''}" data-select-deck="${id}" aria-pressed="${selectedDeckId()===id}" ${canChoose?'':'disabled'}><img class="deck-cover" src="/deck-thumbs/${deckCovers[id]}" alt="" loading="lazy"><span class="deck-choice-shade" aria-hidden="true"></span><span><strong>${deck[language]}</strong><small>${deck.cards.length} ${ru?'карт':'cards'}</small></span></button><button type="button" class="text-button" data-browse-deck="${id}">${ru?'Посмотреть карты →':'Browse cards →'}</button></div>`).join('')}</div></article>`);
  grid.querySelectorAll('[data-select-deck]').forEach(button=>button.onclick=()=>saveLobbySettings(button.dataset.selectDeck,liveGameContext.room.round_cycles||2));
  grid.querySelectorAll('[data-browse-deck]').forEach(button=>button.onclick=()=>openDeckGallery(button.dataset.browseDeck));
}
let lobbyRoster=[];
let savingLobbySettings=false;
function renderRoundSelector(roster=lobbyRoster){
  lobbyRoster=roster;
  const grid=$('.lobby-grid'),context=liveGameContext;if(!grid||!context)return;
  const ru=language==='ru',n=roster.length,cards=selectedDeckCards().length;
  const options=roundOptions(n,cards),chosen=selectedRoundOption(n,cards,context.room.round_cycles||2);
  let panel=$('#roundSettings');if(!panel){panel=document.createElement('article');panel.id='roundSettings';panel.className='lobby-panel';lobbySettingsColumn(grid).append(panel)}
  const host=context.room.host_id===context.session.user.id;
  panel.innerHTML=`<h2>${ru?'Длительность партии':'Game length'}</h2><p>${ru?'Полный круг — каждый игрок становится ведущим один раз. Для стола от 7 игроков можно сыграть один круг, чтобы оставить карты на обмен.':'In a full cycle everyone tells a clue once. Tables of 7+ can play one cycle to keep cards in reserve for swaps.'}</p><label for="roundCycles">${ru?'Количество раундов':'Number of rounds'}</label><select id="roundCycles" ${!host||!chosen||savingLobbySettings?'disabled':''}>${options.map(o=>`<option value="${o.cycles}" ${o.cycles===chosen?.cycles?'selected':''}>${o.rounds} ${ru?'раундов':'rounds'} · ${o.cycles} ${ru?'круга':'cycles'}</option>`).join('')}</select><p class="round-capacity">${n<3?(ru?'Варианты появятся, когда соберутся хотя бы 3 игрока.':'Options appear when at least 3 players join.'):chosen?(ru?`${n} игроков · ${chosen.cards} из ${cards} карт. Каждый загадает ${chosen.cycles} раз. Следующий круг потребует ${(options.at(-1).cycles+1)*n*n} карт.`:`${n} players · ${chosen.cards} of ${cards} cards. Everyone tells ${chosen.cycles} clues. Another cycle needs ${(options.at(-1).cycles+1)*n*n} cards.`):(ru?'Не хватает карт для выбранного числа игроков и запаса на обмен.':'Not enough cards for this player count plus the swap reserve.')}</p>`;
  $('#roundCycles').onchange=event=>saveLobbySettings(selectedDeckId(),Number(event.target.value));
  const start=$('#startButton');if(start)start.disabled=savingLobbySettings||!chosen||!roster.every(seat=>seat.is_ready);
}
async function saveLobbySettings(deckId,cycles){
  if(savingLobbySettings)return;
  const context=liveGameContext;savingLobbySettings=true;renderRoundSelector();
  try{
    const choice=selectedRoundOption(lobbyRoster.length,decks[deckId].cards.length,cycles);
    const {data,error}=await supabase.rpc('configure_luminaria_lobby',{target_room_id:context.room.id,chosen_deck:{moon:'moonlit-archive',pop:'pop-culture',abs:'everyday-absurdity',meme:'meme-chaos'}[deckId],chosen_cycles:choice?.cycles||2});
    if(error)throw error;
    if(liveGameContext===context)context.room={...context.room,...data};
  }catch(error){showInlineGameError(error.message)}finally{
    savingLobbySettings=false;$('.deck-panel')?.remove();addDeckSelector();renderRoundSelector();
  }
}
const originalShowLobby=showLobby;showLobby=function(player){originalShowLobby(player);addDeckSelector()};
let navProfileCache=null;
async function addAuthButton(){
  const session=(await supabase.auth.getSession()).data.session;
  let button=$('#authEntry');
  if(!button){button=document.createElement('button');button.type='button';button.id='authEntry'}
  if(session){
    const profile=navProfileCache?.id===session.user.id?navProfileCache:null;
    let localAvatar='☽';try{localAvatar=JSON.parse(localStorage.getItem('luminaria-player')||'{}').avatar||'☽'}catch{}
    const avatar=safeAvatar({avatar:profile?.avatar||localAvatar});
    button.className='profile-entry';
    button.setAttribute('aria-label',language==='ru'?`Профиль: ${profile?.nickname||'гость'}`:`Profile: ${profile?.nickname||'guest'}`);
    button.title=profile?.nickname|| (session.user.is_anonymous?(language==='ru'?'Гостевой профиль':'Guest profile'):(session.user.email||'Profile'));
    if(button._renderedAvatar!==avatar){
      button.replaceChildren();
      if(typeof avatar==='string'&&avatar.startsWith('data:image/')){const image=document.createElement('img');image.src=avatar;image.alt='';image.className='avatar-photo';button.append(image)}else button.innerHTML=avatarPortraitMarkup(avatar);
      button._renderedAvatar=avatar;
    }
    button.onclick=()=>session.user.is_anonymous?openProfileSetup(session,profile):openAuth();
  }else{
    button.className='ghost-button auth-entry';
    delete button._renderedAvatar;
    const signInLabel=language==='ru'?'Авторизоваться':'Sign in';
    if(button.textContent!==signInLabel)button.textContent=signInLabel;
    button.setAttribute('aria-label',button.textContent);button.title=button.textContent;
    button.onclick=()=>openAuth();
  }
  const target=document.querySelector('.nav-tools')||document.querySelector('.nav-actions')||document.querySelector('.nav');
  if(target&&button.parentElement!==target){const languageButton=[...target.children].find(child=>child.matches?.('.language'))||null;target.insertBefore(button,languageButton)}
}
function ensureGameNavTools(){const nav=$('.nav');if(!nav||nav.querySelector('.nav-actions'))return;let tools=nav.querySelector('.nav-tools');if(!tools){tools=document.createElement('div');tools.className='nav-tools';nav.append(tools)}if(!tools.querySelector('#deckButton')){const deck=document.createElement('button');deck.type='button';deck.id='deckButton';deck.className='ghost-button deck-nav-button';deck.textContent=language==='ru'?'Колоды':'Decks';tools.append(deck)}if(!tools.querySelector('#roomRulesButton')){const rules=document.createElement('button');rules.type='button';rules.id='roomRulesButton';rules.className='room-rules-button';rules.textContent=language==='ru'?'Как играть':'How to play';rules.onclick=showRoomRules;tools.prepend(rules)}addAuthButton()}
let navToolsQueued=false;const navToolsObserver=new MutationObserver(()=>{if(navToolsQueued)return;navToolsQueued=true;requestAnimationFrame(()=>{navToolsQueued=false;ensureGameNavTools()})});navToolsObserver.observe(document.body,{childList:true,subtree:true});
async function openAuth(){
  const existing=$('#authDialog');if(existing)existing.remove();
  const ru=language==='ru';
  const session=(await supabase.auth.getSession()).data.session;
  const signedIn=Boolean(session&&!session.user?.is_anonymous);
  const dialog=document.createElement('dialog');dialog.id='authDialog';
  dialog.innerHTML=signedIn
    ?`<div class="modal auth-modal"><button class="close" id="closeAuth">×</button><span class="modal-star">✦</span><h2>${ru?'Профиль аккаунта':'Account profile'}</h2><p>${session.user.email||''}</p><button class="primary-button full" id="editAccountProfile">${ru?'Изменить ник и аватар':'Edit nickname and avatar'}</button><p class="auth-note">${ru?'Или выйди из аккаунта — в следующей игре можно будет выбрать гостевой профиль.':'Or sign out and choose a guest profile for your next game.'}</p><button class="text-button full" id="signOut">${ru?'Выйти из аккаунта':'Sign out'}</button></div>`
    :`<div class="modal auth-modal"><button class="close" id="closeAuth">×</button><span class="modal-star">✦</span><h2>${ru?'Сохрани профиль':'Save your profile'}</h2><p>${ru?'Играть можно и без аккаунта. Вход сохранит твой профиль на других устройствах.':'You can play as a guest. Signing in saves your profile across devices.'}</p><button class="google-button" id="googleSignIn"><span>G</span>${ru?'Продолжить с Google':'Continue with Google'}</button><div class="auth-divider"><span>${ru?'или':'or'}</span></div><label class="auth-label" for="authEmail">${ru?'Войти по email':'Sign in with email'}</label><input id="authEmail" type="email" placeholder="you@example.com" autocomplete="email"><button class="primary-button full" id="emailSignIn">${ru?'Отправить ссылку для входа':'Send sign-in link'} <b>→</b></button><small class="auth-note">${ru?'Мы отправим безопасную ссылку на твой email — пароль не нужен.':'We’ll send a secure sign-in link — no password needed.'}</small><button class="text-button full guest-auth-button" id="guestFromAuth">${ru?'Продолжить как гость':'Continue as guest'}</button></div>`;
  document.body.append(dialog);dialog.showModal();
  $('#closeAuth').addEventListener('click',()=>dialog.close());
  if(signedIn){
    $('#editAccountProfile').addEventListener('click',()=>{dialog.close();dialog.remove();openProfileSetup(session,navProfileCache?.id===session.user.id?navProfileCache:null)});
    $('#signOut').addEventListener('click',async()=>{
      if(liveGameContext){alert(ru?'Сначала выйди из текущей комнаты: выход из аккаунта прервёт твои действия в этой партии.':'Leave the current room first. Signing out now would interrupt your actions in this game.');return}
      const {error}=await supabase.auth.signOut();if(error)return alert(error.message);
      localStorage.removeItem('luminaria-player');localStorage.removeItem('luminaria-player-user');
      navProfileCache=null;
      sessionStorage.removeItem(`luminaria-profile-dismissed-${session.user.id}`);
      uploadedAvatar=null;
      const avatarInput=$('#avatarUpload');if(avatarInput)avatarInput.value='';
      const avatarLabel=$('#avatarUploadLabel');if(avatarLabel){avatarLabel.style.backgroundImage='';avatarLabel.classList.remove('has-image')}
      if($('#nickname'))$('#nickname').value='';
      document.querySelector('.avatar-choice.selected')?.classList.remove('selected');
      document.querySelector('.avatar-choice')?.classList.add('selected');
      dialog.close();$('#authEntry')?.remove();addAuthButton();
    });
    return;
  }
    $('#guestFromAuth')?.addEventListener('click',async()=>{
    try{
      let guestSession=(await supabase.auth.getSession()).data.session;
      if(!guestSession){const result=await supabase.auth.signInAnonymously();if(result.error)throw result.error;guestSession=result.data.session}
      dialog.close();dialog.remove();openProfileSetup(guestSession);
    }catch(error){alert(error.message||'Could not start a guest profile.')}
  });
  $('#googleSignIn').addEventListener('click',async()=>{const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin}});if(error)alert(error.message)});
  $('#emailSignIn').addEventListener('click',async()=>{const email=$('#authEmail').value.trim();if(!email)return $('#authEmail').focus();const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin}});if(error){alert(error.message);return}$('#emailSignIn').innerHTML=ru?'Проверь почту ✓':'Check your inbox ✓';$('#emailSignIn').classList.add('is-ready')});
}
async function openProfileSetup(session){const previous=$('#profileSetupDialog');if(previous?.open)return;previous?.remove();const ru=language==='ru';const dialog=document.createElement('dialog');dialog.id='profileSetupDialog';const suggested=(session.user.user_metadata?.full_name||session.user.user_metadata?.name||'').split(' ')[0];dialog.innerHTML=`<form class="modal auth-modal profile-setup" id="profileSetupForm" autocomplete="off"><button type="button" class="close" id="closeProfileSetup" aria-label="${ru?'Закрыть':'Close'}">×</button><span class="modal-star">✦</span><h2>${ru?'Создай свой профиль':'Create your profile'}</h2><p>${ru?'Придумай ник и выбери аватар — они будут видны игрокам за столом.':'Choose a nickname and avatar — other players will see them at the table.'}</p><label class="auth-label" for="profileNickname">${ru?'Никнейм':'Nickname'}</label><input id="profileNickname" name="luminaria-profile-nickname" type="text" maxlength="24" value="${suggested}" placeholder="${ru?'Лунный странник':'Moonwalker'}" autocomplete="off" autocapitalize="none" spellcheck="false" data-lpignore="true" data-1p-ignore data-bwignore required><p class="avatar-title">${ru?'Аватар':'Avatar'}</p><div class="profile-avatar-grid">${avatarChoicesMarkup('profile-avatar','mage-female',language)}<label class="profile-upload" id="profileUploadLabel" title="${ru?'Загрузить фото':'Upload photo'}"><input id="profileAvatarUpload" type="file" accept="image/*" hidden>＋</label></div><button class="primary-button full" type="submit">${ru?'Сохранить профиль':'Save profile'} <b>→</b></button><small class="auth-note">${ru?'Фото или аватар сохраняются в твоём профиле.':'Your photo or avatar is saved in your profile.'}</small></form>`;document.body.append(dialog);dialog.showModal();const dismiss=()=>{sessionStorage.setItem(`luminaria-profile-dismissed-${session.user.id}`,'1');dialog.close();dialog.remove()};$('#closeProfileSetup').addEventListener('click',dismiss);dialog.addEventListener('cancel',event=>{event.preventDefault();dismiss()});dialog.querySelectorAll('.profile-avatar').forEach(button=>button.addEventListener('click',()=>{dialog.querySelector('.profile-avatar.selected')?.classList.remove('selected');button.classList.add('selected');const label=$('#profileUploadLabel');label.style.backgroundImage='';label.classList.remove('has-image')}))}
const renderProfileSetup=openProfileSetup;
openProfileSetup=async function(session,profile=null){
  if($('#profileSetupDialog')?.open)return;
  const metadata=session?.user?.user_metadata||{};
  if(!profile)profile=await loadSavedProfile(session).catch(()=>null);
  const suggested=profile?.nickname||metadata.nickname||metadata.name||metadata.full_name?.split(' ')[0]||'';
  await renderProfileSetup({...session,user:{...session.user,user_metadata:{...metadata,name:escapeHtml(suggested),full_name:escapeHtml(suggested)}}});
  if(session?.user?.is_anonymous){
    const form=$('#profileSetupForm');
    const ru=language==='ru';
    const signInButton=document.createElement('button');signInButton.type='button';signInButton.className='text-button full';signInButton.id='guestSignIn';signInButton.textContent=ru?'Выйти и войти по почте':'Sign out and sign in with email';
    form?.querySelector('.auth-note')?.before(signInButton);
    signInButton.addEventListener('click',async()=>{
      if(liveGameContext){alert(ru?'Сначала выйди из текущей комнаты.':'Leave the current room first.');return}
      const {error}=await supabase.auth.signOut();if(error){alert(error.message);return}
      localStorage.removeItem('luminaria-player');localStorage.removeItem('luminaria-player-user');
      sessionStorage.removeItem(`luminaria-profile-dismissed-${session.user.id}`);navProfileCache=null;uploadedAvatar=null;
      $('#profileSetupDialog')?.close();$('#profileSetupDialog')?.remove();$('#authEntry')?.remove();addAuthButton();openAuth();
    });
  }
  const nameInput=$('#profileNickname');if(nameInput&&profile?.nickname)nameInput.value=profile.nickname;
  if(!profile)return;
  navProfileCache={id:session.user.id,nickname:profile.nickname,avatar:safeAvatar({avatar:profile.avatar})};
  const avatar=navProfileCache.avatar;
  if(typeof avatar==='string'&&avatar.startsWith('data:image/')){
    const input=$('#profileAvatarUpload'),label=$('#profileUploadLabel');if(input)input.dataset.avatar=avatar;if(label){label.style.backgroundImage=`url(${avatar})`;label.classList.add('has-image')}
    document.querySelector('.profile-avatar.selected')?.classList.remove('selected');
  }else{
    const choice=[...document.querySelectorAll('.profile-avatar')].find(button=>button.dataset.avatarId===avatar);
    if(choice){document.querySelector('.profile-avatar.selected')?.classList.remove('selected');choice.classList.add('selected')}
  }
};
async function syncAuthProfile(session){if(!session)return;$('#authEntry')?.remove();addAuthButton();if(!session.user.user_metadata?.nickname)openProfileSetup(session)}
supabase.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>syncAuthProfile(session),0)});
const lobbyWithDecks=showLobby;showLobby=function(player){lobbyWithDecks(player);addAuthButton()};
addAuthButton();

let liveRoomChannel=null,liveChatChannel=null,liveChatRoomId=null,liveChatMessages=[],liveStarScores={},unreadChatCount=0;
function chatStorageKey(){return liveChatRoomId?`luminaria-chat-${liveChatRoomId}`:null}
let liveStarPartyId=null;
function starStorageKey(){return liveChatRoomId&&liveStarPartyId?`luminaria-stars-v2-${liveChatRoomId}-${liveStarPartyId}`:null}
function resetPartyStars(){
  const key=starStorageKey();if(key)localStorage.removeItem(key);
  liveStarPartyId=null;liveStarScores={};finaleStarRanking=[];
}
async function syncStarParty(){
  if(!liveGameContext||liveGameContext.room.status==='lobby')return;
  const epoch=liveGameEpoch,roomId=liveGameContext.room.id;
  const {data,error}=await supabase.from('rounds').select('id').eq('room_id',roomId).order('created_at',{ascending:true}).order('id',{ascending:true}).limit(1).maybeSingle();
  if(error)throw error;
  if(epoch!==liveGameEpoch||roomId!==liveGameContext?.room.id||!data||liveStarPartyId===data.id)return;
  liveStarPartyId=data.id;
  try{liveStarScores=JSON.parse((starStorageKey()&&localStorage.getItem(starStorageKey()))||'{}')}catch{liveStarScores={}}
  renderStarScores();
  liveChatChannel?.send({type:'broadcast',event:'score_request',payload:{partyId:liveStarPartyId}});
}

function saveLiveChat(){const key=chatStorageKey();if(key)localStorage.setItem(key,JSON.stringify(liveChatMessages.slice(-50)))}
let finaleStarRanking=[];
function renderStarScores(){const award=$('#finaleStarAward');if(award)award.innerHTML=starAwardMarkup(finaleStarRanking,liveStarScores,language);const board=$('#starLeaderboard');if(!board)return;const ru=language==='ru',ranking=Object.values(liveStarScores).filter(item=>item&&typeof item.name==='string'&&Number.isSafeInteger(item.score)&&item.score>=0).sort((a,b)=>b.score-a.score).slice(0,7),title=document.createElement('strong');title.textContent=ru?'Звёздный рейтинг':'Star ranking';board.replaceChildren(title);if(!ranking.length){const empty=document.createElement('small');empty.textContent=ru?'Сделай первый результат':'Set the first score';board.append(empty);return}ranking.forEach((item,index)=>{const row=document.createElement('span'),name=document.createElement('b'),score=document.createElement('em');name.textContent=`${index+1}. ${item.name.slice(0,24)}`;score.textContent=`${item.score} ✦`;row.append(name,score);board.append(row)})}
function setupLiveChat(){if(!liveGameContext||liveChatRoomId===liveGameContext.room.id)return;liveChatChannel?.unsubscribe();liveChatRoomId=liveGameContext.room.id;unreadChatCount=0;try{liveChatMessages=JSON.parse(localStorage.getItem(chatStorageKey())||'[]');liveStarScores=JSON.parse((starStorageKey()&&localStorage.getItem(starStorageKey()))||'{}')}catch{liveChatMessages=[];liveStarScores={}}liveChatChannel=supabase.channel(`chat-${liveChatRoomId}`,{config:{private:true,broadcast:{self:true}}}).on('broadcast',{event:'message'},event=>{const message=event.payload||event;if(!message?.text)return;if(liveChatMessages.some(item=>item.id===message.id))return;liveChatMessages.push(message);liveChatMessages=liveChatMessages.slice(-50);saveLiveChat();if(message.senderId!==liveGameContext?.session.user.id&&!$('#liveChat')?.classList.contains('open')){unreadChatCount++;updateChatUnread()}renderLiveChatMessages()}).on('broadcast',{event:'profile_update'},event=>{const profile=event.payload||event;if(typeof profile?.userId!=='string'||!liveProfileCache.has(profile.userId)||typeof profile.nickname!=='string'||profile.nickname.length>24)return;applyLiveProfileUpdate(profile.userId,profile.nickname,profile.avatar)}).on('broadcast',{event:'star_score'},event=>{const item=event.payload||event;if(!liveStarPartyId||item?.partyId!==liveStarPartyId||!item?.userId||!Number.isSafeInteger(item.score)||item.score<0)return;const previous=liveStarScores[item.userId];if(!previous||item.score>=previous.score){liveStarScores[item.userId]=item;localStorage.setItem(starStorageKey(),JSON.stringify(liveStarScores));renderStarScores()}}).on('broadcast',{event:'score_request'},event=>{if(!liveStarPartyId||(event.payload||event).partyId!==liveStarPartyId)return;const mine=liveStarScores[liveGameContext?.session.user.id];if(mine)liveChatChannel?.send({type:'broadcast',event:'star_score',payload:mine})}).subscribe(status=>{if(status==='SUBSCRIBED'){const mine=liveStarScores[liveGameContext.session.user.id];if(mine)liveChatChannel.send({type:'broadcast',event:'star_score',payload:mine});liveChatChannel.send({type:'broadcast',event:'score_request',payload:{partyId:liveStarPartyId}})}});ensureLiveChat()}
function updateChatUnread(){const button=$('#liveChatToggle'),badge=$('#chatUnreadBadge');if(!button||!badge)return;badge.hidden=unreadChatCount<1;badge.textContent=unreadChatCount>9?'9+':String(unreadChatCount);button.classList.toggle('has-unread',unreadChatCount>0);button.setAttribute('aria-label',unreadChatCount?`${language==='ru'?'Непрочитанных сообщений':'Unread messages'}: ${unreadChatCount}`:(language==='ru'?'Чат':'Chat'))}
function renderLiveChatMessages(){const list=$('#liveChatMessages');if(!list)return;list.replaceChildren(...liveChatMessages.map(message=>{const row=document.createElement('p'),name=document.createElement('strong'),text=document.createElement('span');name.textContent=`${message.name}: `;text.textContent=message.text;row.append(name,text);return row}));list.scrollTop=list.scrollHeight}
function ensureLiveChat(){if(!liveGameContext||!document.querySelector('main')||$('#liveChat'))return;const ru=language==='ru',widget=document.createElement('aside');widget.id='liveChat';widget.className='live-chat';widget.innerHTML=`<button class="live-chat-toggle" id="liveChatToggle" type="button">💬 <span>${ru?'Чат':'Chat'}</span><i id="chatUnreadBadge" class="chat-unread-badge" hidden></i></button><section class="live-chat-panel"><header><strong>${ru?'Чат комнаты':'Room chat'}</strong><button id="closeLiveChat" type="button">×</button></header><div id="liveChatMessages"></div><form id="liveChatForm"><input id="liveChatInput" maxlength="180" placeholder="${ru?'Написать сообщение…':'Write a message…'}" autocomplete="off"><button type="submit">➤</button></form></section>`;document.body.append(widget);const toggle=()=>{const opening=!widget.classList.contains('open');widget.classList.toggle('open');if(opening){unreadChatCount=0;updateChatUnread()}};$('#liveChatToggle').addEventListener('click',toggle);$('#closeLiveChat').addEventListener('click',toggle);$('#liveChatForm').addEventListener('submit',async event=>{event.preventDefault();const input=$('#liveChatInput'),text=input.value.trim();if(!text||!liveChatChannel)return;input.value='';await liveChatChannel.send({type:'broadcast',event:'message',payload:{id:crypto.randomUUID(),senderId:liveGameContext.session.user.id,name:liveGameContext.player.name,text,at:Date.now()}})});renderLiveChatMessages();updateChatUnread()}
const liveChatObserver=new MutationObserver(()=>{if(liveGameContext&&!$('#liveChat'))ensureLiveChat()});liveChatObserver.observe(document.body,{childList:true,subtree:false});
function makeRoomCode(){return Array.from(crypto.getRandomValues(new Uint32Array(6)),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('')}
const renderLegacyGuesser=showGuesser;
showGuesser=function(storyteller,clue){renderLegacyGuesser({...storyteller,name:escapeHtml(storyteller?.name||'Storyteller'),avatar:avatarMarkup(safeAvatar({avatar:storyteller?.avatar}))},escapeHtml(clue||''));const avatar=$('.storyteller .lobby-avatar'),name=$('.storyteller strong');if(avatar&&liveStorytellerId){avatar.dataset.liveProfileId=liveStorytellerId;avatar.dataset.liveProfileField='avatar'}if(name&&liveStorytellerId){name.dataset.liveProfileId=liveStorytellerId;name.dataset.liveProfileField='nickname'}};
function safeAvatar(player){return normalizeAvatar(player?.avatar||'mage-male')}
function cachePlayer(player,userId){if(!player?.name)return;const avatar=typeof player.avatar==='string'&&player.avatar.startsWith('data:image/')?'☽':safeAvatar(player);localStorage.setItem('luminaria-player',JSON.stringify({name:String(player.name).slice(0,24),avatar}));if(userId)localStorage.setItem('luminaria-player-user',userId)}
function avatarMarkup(value, fallback='mage-male'){const avatar=safeAvatar({avatar:value||fallback});return typeof avatar==='string'&&avatar.startsWith('data:image/')?`<img class="avatar-photo" src="${avatar}" alt="">`:avatarPortraitMarkup(avatar)}
function avatarDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(reader.error);reader.onload=()=>resolve(String(reader.result));reader.readAsDataURL(file)})}
async function compressAvatar(file){
  const source=await avatarDataUrl(file),image=await new Promise((resolve,reject)=>{const value=new Image();value.onload=()=>resolve(value);value.onerror=()=>reject(new Error('Could not read image'));value.src=source});
  const ru=language==='ru',size=260,dialog=document.createElement('dialog');
  dialog.id='avatarCropDialog';dialog.innerHTML=`<section class="avatar-crop-modal"><button class="close" id="cancelAvatarCrop" type="button" aria-label="${ru?'Закрыть':'Close'}">×</button><h2>${ru?'Обрежь аватар':'Crop your avatar'}</h2><p>${ru?'Перетаскивай фотографию внутри круга и выбери масштаб.':'Drag the photo inside the circle and choose the zoom.'}</p><canvas id="avatarCropCanvas" width="${size}" height="${size}"></canvas><label>${ru?'Масштаб':'Zoom'} <input id="avatarCropZoom" type="range" min="1" max="3" value="1" step="0.01"></label><button class="primary-button full" id="saveAvatarCrop" type="button">${ru?'Использовать фото':'Use photo'} <b>→</b></button></section>`;
  document.body.append(dialog);dialog.showModal();
  const canvas=$('#avatarCropCanvas'),ctx=canvas.getContext('2d'),zoom=$('#avatarCropZoom'),base=Math.max(size/image.naturalWidth,size/image.naturalHeight);let scale=base,x=0,y=0,drag=null;
  const clamp=()=>{const w=image.naturalWidth*scale,h=image.naturalHeight*scale;x=Math.max((size-w)/2,Math.min((w-size)/2,x));y=Math.max((size-h)/2,Math.min((h-size)/2,y))};
  const draw=()=>{clamp();ctx.clearRect(0,0,size,size);ctx.drawImage(image,(size-image.naturalWidth*scale)/2+x,(size-image.naturalHeight*scale)/2+y,image.naturalWidth*scale,image.naturalHeight*scale)};
  zoom.addEventListener('input',()=>{scale=base*Number(zoom.value);draw()});
  canvas.addEventListener('pointerdown',event=>{drag={x:event.clientX,y:event.clientY,ox:x,oy:y};canvas.setPointerCapture(event.pointerId)});
  canvas.addEventListener('pointermove',event=>{if(!drag)return;x=drag.ox+event.clientX-drag.x;y=drag.oy+event.clientY-drag.y;draw()});
  const stopDrag=()=>{drag=null};canvas.addEventListener('pointerup',stopDrag);canvas.addEventListener('pointercancel',stopDrag);draw();
  return new Promise(resolve=>{const finish=value=>{dialog.close();dialog.remove();resolve(value)};$('#cancelAvatarCrop').addEventListener('click',()=>finish(null));dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null)});$('#saveAvatarCrop').addEventListener('click',()=>{const output=document.createElement('canvas');output.width=160;output.height=160;const outputContext=output.getContext('2d');outputContext.drawImage(canvas,0,0,size,size,0,0,160,160);let result=output.toDataURL('image/jpeg',.75);if(result.length>60000)result=output.toDataURL('image/jpeg',.58);finish(result.length<=60000?result:null)})})
}
async function ensureLivePlayer(player){player.name=String(player.name||'Dreamer').replace(/[<>]/g,'').trim().slice(0,24)||'Dreamer';player.avatar=safeAvatar(player);let {data:{session}}=await supabase.auth.getSession();if(!session){const {data,error}=await supabase.auth.signInAnonymously();if(error)throw error;session=data.session}const {error}=await supabase.from('profiles').upsert({id:session.user.id,nickname:player.name,avatar:player.avatar},{onConflict:'id'});if(error)throw error;cachePlayer(player,session.user.id);navProfileCache={id:session.user.id,nickname:player.name,avatar:player.avatar};addAuthButton();return session}
async function ensureRoomIdentity(){
  let session=(await supabase.auth.getSession()).data.session;
  if(!session){const result=await supabase.auth.signInAnonymously();if(result.error)throw result.error;session=result.data.session}
  const saved=await loadSavedProfile(session);
  const player=saved?.nickname?{name:saved.nickname,avatar:safeAvatar({avatar:saved.avatar})}:{name:`${language==='ru'?'Игрок':'Guest'} ${session.user.id.slice(0,5).toUpperCase()}`,avatar:'mage-male'};
  return {player,session:await ensureLivePlayer(player)};
}
async function startRoomFlow(){
  const mode=entryMode,code=$('#roomCodeInput')?.value.trim().toUpperCase();
  try{
    const {player,session}=await ensureRoomIdentity();
    if(mode==='join')return await joinLiveRoom(player,session,code);
    return await createLiveRoom(player,session);
  }catch(error){
    console.error(error);alert(error.message||'Could not connect to Luminaria.');
    if(!entryDialog.open)entryDialog.showModal();
  }
}


document.addEventListener('click',event=>{const button=event.target.closest('#revealButton');if(!button?.classList.contains('is-ready'))return;const image=document.querySelector('.hand-card.selected img');if(image)activeStorytellerCard=image.src.split('/').pop()});
function showResults(){const player=JSON.parse(localStorage.getItem('luminaria-player')||'{"name":"Dreamer","avatar":"✦"}');const ru=language==='ru';const defaultCards=['01-library-whale.png','03-mending-rain.png','04-teapot-city.png','08-cloud-bakery.png'];const cards=activeStorytellerCard?[activeStorytellerCard,...defaultCards.filter(card=>card!==activeStorytellerCard)].slice(0,4):defaultCards;const correctIndex=0;const otherNames=['Mira','Leo','June'];let otherIndex=0;const owners=cards.map((card,index)=>index===correctIndex?player.name:otherNames[otherIndex++]);const scores=[[player.name,'+5',ru?'Базовые +3 и +2 за двух угадавших':'Base +3 and +2 for two correct guesses'],['Mira','+3',ru?'Угадала карту ведущего':'Guessed the storyteller’s card'],['Leo','+0',ru?'Не угадал':'Did not guess'],['June','+3',ru?'Два голоса за её карту + бонус «Созвездие»':'Two votes for her card + Constellation bonus']];document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="results-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Результаты':'Results'}</div><button class="language" id="resultLanguage">${ru?'EN':'RU'}</button></nav><section class="result-head"><span class="result-star">✦</span><p class="eyebrow"><span></span><span>${ru?'Карты раскрыты':'Cards revealed'}</span></p><h1>${ru?'Вот что скрывалось<br>за <em>ассоциацией.</em>':'Here is what hid<br>behind the <em>clue.</em>'}</h1><p class="result-clue">“${activeRoundClue||(ru?'Твоя ассоциация':'Your clue')}”</p></section><section class="reveal-grid">${cards.map((card,index)=>`<article class="reveal-card ${index===correctIndex?'correct':''}"><img src="/deck-preview/${card}${cardAssetVersion(card)}" alt="Revealed card ${index+1}">${index===correctIndex?`<span class="correct-tag">✓ ${ru?'Карта ведущего':'Storyteller’s card'}</span>`:''}<small>${owners[index]}</small></article>`).join('')}</section><section class="scores"><div class="panel-title"><h2>${ru?'Очки за раунд':'Round scores'}</h2><span class="count">${ru?'Раунд 1':'Round 1'}</span></div>${scores.map((item,index)=>`<div class="score-row ${index===0?'me':''}"><span class="score-avatar">${index===0?'✦':['☽','♢','☼'][index-1]}</span><strong>${item[0]}</strong><em>${item[2]}</em><b>${item[1]}</b></div>`).join('')}<button class="primary-button next-round" id="nextRound">${ru?'Следующий раунд':'Next round'} <b>→</b></button></section></main>`;$('#nextRound').addEventListener('click',()=>{activeRoundClue='';activeStorytellerCard='';showGame()});$('#resultLanguage').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);showResults()})}
let liveGameContext=null,liveRound=null,liveRoundChannel=null,liveHandVersion=0,liveStorytellerId=null,liveRoundNumber=1,liveRoundNumberForId=null,liveTotalRounds=0;
let liveHandCache=[];
let liveGameEpoch=0;
function resetLiveParty(){
  liveGameEpoch++;
  resetPartyStars();
  liveRound=null;liveHandCache=[];liveStorytellerId=null;
  liveRoundNumber=1;liveRoundNumberForId=null;liveTotalRounds=0;liveHandVersion=0;
  activeRoundClue='';activeStorytellerCard='';activeMoonPhase=null;
  if(liveGameContext)localStorage.removeItem(nextRoundStorageKey());
}
async function loadLiveHand(){if(!liveGameContext)return [];const {data,error}=await supabase.rpc('luminaria_hand',{target_room_id:liveGameContext.room.id});if(error)throw error;liveHandCache=(data||[]).map(card=>card.card_id);return liveHandCache}
async function loadLiveDeckProgress(){
  if(!liveGameContext)return 0;
  const {data,error}=await supabase.rpc('luminaria_deck_state',{target_room_id:liveGameContext.room.id}).single();
  if(error)throw error;
  liveTotalRounds=data?.cards_per_player||0;
  syncLiveRoundNumber();
  return liveTotalRounds;
}
const demoShowGame=showGame,demoShowGuesser=showGuesser,renderLiveLobby=showLiveLobby;
function roomRecoveryToken(code){let saved=null;try{saved=JSON.parse(localStorage.getItem('luminaria-last-room')||'null')}catch{}return saved?.code===code&&saved.recoveryToken?saved.recoveryToken:`${crypto.randomUUID()}${crypto.randomUUID()}`}
async function rememberLiveRoom(room,player){const recoveryToken=roomRecoveryToken(room.code);localStorage.setItem('luminaria-last-room',JSON.stringify({code:room.code,recoveryToken,player:{name:player.name,avatar:typeof player.avatar==='string'&&player.avatar.startsWith('data:image/')?'☽':safeAvatar(player)}}));const {error}=await supabase.rpc('set_luminaria_recovery_token',{target_room_id:room.id,recovery_token:recoveryToken});if(error)console.warn('Room recovery is not installed yet',error.message)}
showLiveLobby=function(room,player,session){liveGameContext={room,player,session};if(room.status==='closed')return showClosedRoom();if(room.status==='lobby')resetLiveParty();rememberLiveRoom(room,player);setupLiveChat();if(room.status==='playing')return showGame();if(room.status==='finished'){watchLiveRound();return showGameFinished()}const rendered=renderLiveLobby(room,player,session);addDeckSelector();return rendered};
async function copyPersonalReturnLink(button){
  const context=liveGameContext;if(!context)return;
  const token=roomRecoveryToken(context.room.code);
  button.disabled=true;
  const {error}=await supabase.rpc('set_luminaria_recovery_token',{target_room_id:context.room.id,recovery_token:token});
  if(error){button.disabled=false;alert(error.message);return}
  localStorage.setItem('luminaria-last-room',JSON.stringify({code:context.room.code,recoveryToken:token,player:{name:context.player.name,avatar:typeof context.player.avatar==='string'&&context.player.avatar.startsWith('data:image/')?'☽':safeAvatar(context.player)}}));
  const url=personalReturnUrl(location.origin,context.room.code,token,context.player);
  try{
    await navigator.clipboard.writeText(url);
    button.textContent=language==='ru'?'✓ Личная ссылка скопирована':'✓ Personal link copied';
  }catch(error){
    prompt(language==='ru'?'Скопируй личную ссылку и сохрани её у себя. Не отправляй другим игрокам.':'Copy this personal link and keep it private.',url);
  }finally{button.disabled=false}
}
const personalReturnObserver=new MutationObserver(()=>{
  const context=liveGameContext;
  if(!context||!['lobby','playing','finished'].includes(context.room.status)){$('#personalReturnPanel')?.remove();return}
  if($('#personalReturnPanel'))return;
  const panel=document.createElement('aside');panel.id='personalReturnPanel';
  const button=document.createElement('button');button.type='button';button.textContent=language==='ru'?'↺ Моя ссылка для возврата':'↺ My return link';
  button.addEventListener('click',()=>copyPersonalReturnLink(button));
  const hint=document.createElement('small');hint.textContent=language==='ru'?'Сохрани её для другого браузера. Не делись с другими.':'Save it for another browser. Keep it private.';
  panel.append(button,hint);document.body.append(panel);
});
personalReturnObserver.observe(document.body,{childList:true,subtree:true});
function showClosedRoom(){
  localStorage.removeItem('luminaria-last-room');
  const ru=language==='ru';
  document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i></div><main class="waiting-page"><section class="waiting-stage"><span class="waiting-stars">✦</span><h1>${ru?'Комната закрыта':'Room closed'}</h1><p class="lead">${ru?'Создатель закрыл это лобби. Можно найти другую открытую комнату или создать свою.':'The host closed this lobby. Find another open room or create your own.'}</p><a class="primary-button" href="/">${ru?'На главную':'Back to home'} →</a></section></main>`;
}
function nextRoundStorageKey(){return `luminaria-next-round-${liveGameContext.room.id}`}
async function loadLiveRound(){
  if(!liveGameContext||liveGameContext.room.status!=='playing')return null;
  const epoch=liveGameEpoch;
  const {data,error}=await supabase.from('rounds').select('*').eq('room_id',liveGameContext.room.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(error)throw error;
  if(epoch!==liveGameEpoch||liveGameContext.room.status!=='playing')return null;
  let pending=null;
  try{pending=JSON.parse(localStorage.getItem(nextRoundStorageKey())||'null')}catch{}
  if(data?.phase==='results'&&pending?.completedRoundId===data.id){
    liveStorytellerId=pending.storytellerId;
    liveHandVersion=data.id;
    liveRound=null;
    return null;
  }
  if(data&&pending&&data.id!==pending.completedRoundId)localStorage.removeItem(nextRoundStorageKey());
  if(!data){localStorage.removeItem(nextRoundStorageKey());liveStorytellerId=liveGameContext.room.host_id;liveRoundNumber=1;liveRoundNumberForId=null;}
  if(data)data.clue=escapeHtml(data.clue||'');
  liveRound=data;
  if(data&&!liveStarPartyId)await syncStarParty();
  if(data){
    liveStorytellerId=data.storyteller_id;
    if(data.id!==liveRoundNumberForId){
      const {count}=await supabase.from('rounds').select('*',{count:'exact',head:true}).eq('room_id',liveGameContext.room.id);
      if(epoch!==liveGameEpoch)return null;
      liveRoundNumber=Math.max(1,count||1);
      liveRoundNumberForId=data.id;
    }
  }
  return data;
}
function syncLiveRoundNumber(){
  if(!liveGameContext)return;
  const number=document.querySelector('.game-round b');
  if(number&&number.textContent!==String(liveRoundNumber))number.textContent=String(liveRoundNumber);
  if(number&&liveTotalRounds){
    let limit=document.querySelector('.round-limit');
    if(!limit){limit=document.createElement('small');limit.className='round-limit';number.after(limit)}
    const limitText=` / ${liveTotalRounds}`;
    if(limit.textContent!==limitText)limit.textContent=limitText;
  }
}
const roundNumberObserver=new MutationObserver(syncLiveRoundNumber);roundNumberObserver.observe(document.body,{childList:true,subtree:true});
function showLiveRoundWaiting(){const ru=language==='ru',context=liveGameContext,canBrowseHand=liveHandCache.length&&(liveStorytellerId||context.room.host_id)!==context.session.user.id;document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="waiting-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Ожидание':'Waiting'}</div></nav><section class="waiting-stage"><div class="waiting-stars">✦ ✧ ✦</div><p class="eyebrow"><span></span><span>${ru?'Комната в игре':'Room is live'}</span></p><h1>${ru?'Ведущий выбирает<br><em>ассоциацию.</em>':'The storyteller is choosing<br><em>a clue.</em>'}</h1><p class="lead">${ru?'Пока ведущий думает, рассмотри свои карты или поймай как можно больше звёзд.':'While the storyteller thinks, explore your cards or catch as many stars as possible.'}</p><div class="waiting-players" id="awaitedStoryteller"></div><section class="waiting-score" id="waitingScore"></section><div class="waiting-minigame"><div class="star-arena"><i></i><i></i><i></i><button id="catchStar" type="button" aria-label="${ru?'Поймать звезду':'Catch the star'}">✦</button></div><div class="star-game-info"><strong>${ru?'Не дай звезде сбежать':'Don’t let the star escape'}</strong><small>${ru?'Твой счёт:':'Your score:'} <b id="starHits">0</b></small><div id="starLeaderboard"></div></div></div></section>${canBrowseHand?`<section class="waiting-hand"><div class="hand-heading"><div><p class="eyebrow"><span></span><span>${ru?'Твоя рука':'Your hand'}</span></p><h2>${ru?'Можно заранее рассмотреть карты':'Explore your cards while you wait'}</h2></div><span class="hand-count">${liveHandCache.length}</span></div>${gameHand(liveHandCache,ru)}</section>`:''}</main>`;if(canBrowseHand){const cards=[...document.querySelectorAll('.hand-card')],slides=cards.map(card=>{const image=card.querySelector('img');return{src:image.src,alt:image.alt}});cards.forEach((card,index)=>card.addEventListener('click',()=>openCardPreview({items:slides,index,kind:'view'})))}bindWaitingMinigame();updateLivePhaseProgress().catch(console.error);addWaitingScoreboard().catch(console.error);ensureLiveChat()}
function bindWaitingMinigame(){const star=$('#catchStar'),hits=$('#starHits'),context=liveGameContext;if(!star||!hits||!context)return;if(!liveStarPartyId){star.disabled=true;void syncStarParty().then(()=>{if(star.isConnected&&liveStarPartyId){star.disabled=false;bindWaitingMinigame()}}).catch(console.error);return}const partyId=liveStarPartyId;const userId=context.session.user.id,mine=liveStarScores[userId]||{userId,name:context.player.name,score:0,partyId};liveStarScores[userId]=mine;hits.textContent=mine.score;const move=()=>{star.style.setProperty('--x',`${Math.round(Math.random()*210-105)}px`);star.style.setProperty('--y',`${Math.round(Math.random()*105-52)}px`)};const timer=setInterval(()=>{if(!star.isConnected)return clearInterval(timer);move()},1100);star.addEventListener('pointerdown',event=>{event.preventDefault();if(partyId!==liveStarPartyId||context.room.status!=='playing')return;mine.score+=1;hits.textContent=mine.score;liveStarScores[userId]={...mine};localStorage.setItem(starStorageKey(),JSON.stringify(liveStarScores));renderStarScores();liveChatChannel?.send({type:'broadcast',event:'star_score',payload:mine});move()});renderStarScores()}
async function addWaitingScoreboard(){if(!liveGameContext)return;const host=$('#waitingScore');if(!host)return;const ru=language==='ru',roster=await loadLiveRoster(liveGameContext.room.id);if(!host.isConnected)return;host.innerHTML=`<div class="panel-title"><h2>${ru?'Общий счёт':'Total score'}</h2><span class="count">${ru?'Раунд':'Round'} ${liveRoundNumber}</span></div>${[...roster].sort((a,b)=>b.score-a.score).map((seat,index)=>`<div class="score-row ${seat.user_id===liveGameContext.session.user.id?'me':''}"><span class="score-avatar" data-live-profile-id="${seat.user_id}" data-live-profile-field="avatar">${avatarMarkup(seat.profile?.avatar,['✦','☽','♢','☼'][index%4])}</span><strong data-live-profile-id="${seat.user_id}" data-live-profile-field="nickname">${seat.profile?.nickname||'Dreamer'}</strong><em>${index===0?(ru?'Лидер':'Leading'):(ru?'За столом':'At the table')}</em><b>${seat.score}</b></div>`).join('')}`}
async function updateLivePhaseProgress(round=liveRound){
  const context=liveGameContext;if(!context)return;
  const root=document.querySelector('main'),ru=language==='ru';
  const roster=await loadLiveRoster(context.room.id);
  if(!root?.isConnected||liveGameContext!==context)return;
  if(!round){
    const seat=roster.find(item=>item.user_id===(liveStorytellerId||context.room.host_id));
    const waiting=$('#awaitedStoryteller');
    if(waiting&&seat)waiting.innerHTML=`<div><span data-live-profile-id="${seat.user_id}" data-live-profile-field="avatar">${avatarMarkup(seat.profile?.avatar)}</span><small>${ru?'Ждём ассоциацию от':'Waiting for a clue from'} <strong data-live-profile-id="${seat.user_id}" data-live-profile-field="nickname">${seat.profile?.nickname||'Dreamer'}</strong></small><i></i></div>`;
    return;
  }
  if(!['submitting','voting'].includes(round.phase))return;
  const {data,error}=await supabase.rpc('luminaria_round_waiting',{target_round_id:round.id});
  if(error)throw error;
  if(!root.isConnected||liveRound?.id!==round.id||liveRound?.phase!==round.phase)return;
  const host=root.querySelector(round.phase==='voting'?'.vote-header':'.waiting-stage,.guess-stage,.host-stage');if(!host)return;
  const voting=round.phase==='voting',required=(data||[]).filter(seat=>!voting||seat.user_id!==round.storyteller_id);
  const done=seat=>voting?seat.has_voted:seat.has_submitted;
  let progress=$('#livePhaseProgress');
  if(!progress){progress=document.createElement('div');progress.id='livePhaseProgress';const anchor=host.querySelector('#waitingScore');anchor?anchor.before(progress):host.append(progress)}
  progress.innerHTML=`<p class="lead">${ru?(voting?'Голоса поданы':'Карты выбраны'):(voting?'Votes cast':'Cards chosen')}: ${required.filter(done).length} ${ru?'из':'of'} ${required.length}</p><div class="phase-waiting">${required.map(seat=>`<span class="${done(seat)?'done':''}" data-live-profile-id="${seat.user_id}" data-live-profile-field="nickname">${done(seat)?'✓':(ru?'Ждём:':'Waiting:')} ${roster.find(p=>p.user_id===seat.user_id)?.profile?.nickname||'Dreamer'}</span>`).join('')}</div>`;
  if(host.matches('.waiting-stage')){
    host.querySelector('h1').textContent=ru?(voting?'Ждём голоса игроков':'Игроки выбирают карты'):(voting?'Waiting for votes':'Players are choosing cards');
    host.querySelector(':scope > .lead').textContent=ru?'Можно посмотреть общий счёт или поймать звезду.':'Check the scores or catch a star while you wait.';
    $('#awaitedStoryteller')?.replaceChildren();
  }
}
async function routeLiveRound(){const round=await loadLiveRound();if(!round)return showLiveRoundWaiting();const context=liveGameContext;if(round.phase==='submitting'&&round.storyteller_id!==context.session.user.id){const {data:storyteller}=await supabase.from('profiles').select('nickname,avatar').eq('id',round.storyteller_id).single();return demoShowGuesser({name:storyteller?.nickname||'Storyteller',avatar:storyteller?.avatar||'✦'},round.clue)}showLiveRoundWaiting()}
async function showLiveVoting(round){
  round={...round,clue:escapeHtml(round.clue)};
  const ru=language==='ru',context=liveGameContext;
  const {data:submissions,error}=await supabase.from('card_submissions').select('id,card_id,player_id').eq('round_id',round.id);
  if(error)throw error;
  for(const submission of submissions||[])if(!availableCards.has(submission.card_id))submission.card_id=deckPool[0];
  const isStoryteller=round.storyteller_id===context.session.user.id;
  const roster=await loadLiveRoster(round.room_id);
  const name=id=>roster.find(seat=>seat.user_id===id)?.profile?.nickname||'Dreamer';
  const ordered=votingOrder(submissions,round.id);
  const visibleSubmissions=isStoryteller?ordered:ordered.filter(submission=>submission.player_id!==context.session.user.id);
  document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="voting-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Голосование':'Voting'}</div></nav><section class="vote-header"><p class="eyebrow"><span></span><span>${ru?'Ассоциация ведущего':'Storyteller’s clue'}</span></p><blockquote>“${round.clue}”</blockquote><p>${isStoryteller?(ru?'Игроки голосуют. Нажми на любую карту, чтобы открыть её крупно.':'Players are voting. Select any card to inspect it full screen.'):ru?'Нажми на карту, чтобы открыть её крупно и выбрать для голоса. Твоя карта скрыта.':'Select a card to inspect it full screen and choose it for your vote. Your own card is hidden.'}</p></section><section class="vote-grid">${visibleSubmissions.map((submission,index)=>`<button class="vote-card ${isStoryteller?'storyteller-card':''}" data-submission="${submission.id}"><img src="/deck-preview/${submission.card_id}${cardAssetVersion(submission.card_id)}" alt="${ru?'Карта':'Card'} ${index+1}"><span>${isStoryteller?name(submission.player_id):`${ru?'Карта':'Card'} ${index+1}`}</span></button>`).join('')}</section>${isStoryteller?`<p class="lead">${ru?'Голосование завершится автоматически, когда все игроки сделают выбор.':'Voting will finish automatically when every player has voted.'}</p>`:`<button class="primary-button cast-vote" id="castLiveVote">${ru?'Подтвердить голос':'Confirm vote'} <b>→</b></button>`}</main>`;
  updateLivePhaseProgress(round).catch(console.error);
  let selected=null;
  const voteCards=[...document.querySelectorAll('.vote-card')];
  const toggle=card=>{if(isStoryteller)return;document.querySelector('.vote-card.selected')?.classList.remove('selected');card.classList.add('selected');selected=card.dataset.submission};
  const voteSlides=voteCards.map(card=>{const image=card.querySelector('img');return{src:image.src,alt:image.alt,selected:()=>card.classList.contains('selected'),onToggle:()=>toggle(card)}});
  voteCards.forEach((card,index)=>card.addEventListener('click',()=>openCardPreview({items:voteSlides,index,kind:isStoryteller?'view':'vote'})));
  if(isStoryteller)return;
  const castButton=$('#castLiveVote');
  const restoreVote=vote=>{
    if(!vote)return false;
    selected=vote.submission_id;
    voteCards.forEach(card=>{card.disabled=true;card.classList.toggle('selected',card.dataset.submission===selected)});
    castButton.disabled=true;castButton.classList.add('is-ready');castButton.textContent=ru?'Голос отправлен ✓':'Vote sent ✓';return true;
  };
  const readVote=async()=>{const {data,error}=await supabase.from('votes').select('submission_id').eq('round_id',round.id).eq('voter_id',context.session.user.id).maybeSingle();if(error)throw error;return data};
  castButton.disabled=true;
  try{if(!restoreVote(await readVote()))castButton.disabled=false}catch(error){castButton.disabled=false;showInlineGameError(error.message)}
  castButton.addEventListener('click',async()=>{
    if(!selected||castButton.disabled)return;
    castButton.disabled=true;
    try{
      const chosen=selected;
      const {error}=await supabase.from('votes').insert({round_id:round.id,voter_id:context.session.user.id,submission_id:chosen});
      if(error){const saved=await readVote();if(!saved)throw error;restoreVote(saved)}else restoreVote({submission_id:chosen});
      try{await advanceLiveRound();await routeLiveRound()}catch(error){console.error('Vote saved; round refresh failed',error);if(castButton.isConnected)showInlineGameError(ru?'Голос сохранён. Обновляем результаты…':'Vote saved. Refreshing the results…')}
    }catch(error){
      if(!castButton.isConnected)return;
      if(!castButton.classList.contains('is-ready'))castButton.disabled=false;
      showInlineGameError(ru?'Не удалось подтвердить отправку голоса. Попробуй снова.': 'Could not confirm your vote. Please retry.');
    }
  });
}
routeLiveRound=async function(){const round=await loadLiveRound();if(!round)return showLiveRoundWaiting();const context=liveGameContext;if(round.phase==='voting')return showLiveVoting(round);if(round.phase==='submitting'&&round.storyteller_id!==context.session.user.id){const {data:storyteller}=await supabase.from('profiles').select('nickname,avatar').eq('id',round.storyteller_id).single();return demoShowGuesser({name:storyteller?.nickname||'Storyteller',avatar:storyteller?.avatar||'✦'},round.clue)}showLiveRoundWaiting()};
async function showLiveResults(round){
  round={...round,clue:escapeHtml(round.clue)};
  const {data:deckState,error:deckError}=await supabase.rpc('luminaria_deck_state',{target_room_id:round.room_id}).single();
  if(deckError)throw deckError;
  const isFinalRound=finalRoundReached(deckState,liveRoundNumber,liveGameContext?.room.status);
  const ru=language==='ru';
  const [{data:submissions,error:submissionError},{data:votes,error:voteError}]=await Promise.all([supabase.from('card_submissions').select('id,card_id,player_id').eq('round_id',round.id),supabase.from('votes').select('submission_id,voter_id').eq('round_id',round.id)]);
  if(submissionError||voteError)throw submissionError||voteError;
  for(const submission of submissions||[])if(!availableCards.has(submission.card_id))submission.card_id=deckPool[0];
  const roster=await loadLiveRoster(round.room_id);
  const name=id=>roster.find(seat=>seat.user_id===id)?.profile?.nickname||'Dreamer';
  const storytellerCard=submissions.find(item=>item.player_id===round.storyteller_id);
  const correctVotes=votes.filter(vote=>vote.submission_id===storytellerCard?.id).length;
  const storytellerPoints=correctVotes>0&&correctVotes<roster.length-1?3+correctVotes:0;
  const currentStorytellerIndex=Math.max(0,roster.findIndex(seat=>seat.user_id===round.storyteller_id));
  const nextStoryteller=roster[(currentStorytellerIndex+1)%roster.length];
  const pointsFor=seat=>{
    if(seat.user_id===round.storyteller_id)return storytellerPoints;
    const ownSubmission=submissions.find(submission=>submission.player_id===seat.user_id);
    const ownCardVotes=ownSubmission?votes.filter(vote=>vote.submission_id===ownSubmission.id).length:0;
    const guessed=votes.some(vote=>vote.voter_id===seat.user_id&&vote.submission_id===storytellerCard?.id);
    return ownCardVotes+(guessed?3:0);
  };
  const explanationFor=seat=>{
    if(seat.user_id===round.storyteller_id)return correctVotes===0?(ru?'Никто не угадал — 0 баллов':'Nobody guessed — 0 points'):correctVotes===roster.length-1?(ru?'Все угадали — 0 баллов':'Everyone guessed — 0 points'):(ru?'Карта ведущего':'Storyteller’s card');
    const guessed=votes.some(vote=>vote.voter_id===seat.user_id&&vote.submission_id===storytellerCard?.id);
    const ownSubmission=submissions.find(submission=>submission.player_id===seat.user_id);
    const ownCardVotes=ownSubmission?votes.filter(vote=>vote.submission_id===ownSubmission.id).length:0;
    if(guessed&&ownCardVotes)return ru?'Угадал(а) и получил(а) голос за свою карту':'Guessed and received a vote for their card';
    if(guessed)return ru?'Угадал(а) карту ведущего':'Guessed the storyteller’s card';
    if(ownCardVotes)return ru?'Голоса за его(её) карту':'Votes for their card';
    return ru?'Без очков в этом раунде':'No points this round';
  };
  document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="results-page" data-final-round="${isFinalRound}"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Результаты':'Results'}</div></nav><section class="result-head"><span class="result-star">✦</span><p class="eyebrow"><span></span><span>${ru?'Карты раскрыты':'Cards revealed'}</span></p><h1>${ru?'Вот что скрывалось<br>за <em>ассоциацией.</em>':'Here is what hid<br>behind the <em>clue.</em>'}</h1><p class="result-clue">“${round.clue}”</p></section><section class="reveal-grid">${submissions.map(submission=>`<article class="reveal-card ${submission.id===storytellerCard?.id?'correct':''}"><img src="/deck-preview/${submission.card_id}${cardAssetVersion(submission.card_id)}" alt="${ru?'Карта':'Card'}">${submission.id===storytellerCard?.id?`<span class="correct-tag">✓ ${ru?'Карта ведущего':'Storyteller’s card'}</span>`:''}<small>${name(submission.player_id)}</small></article>`).join('')}</section><section class="scores"><div class="panel-title"><h2>${ru?'Итог раунда':'Round result'}</h2><span class="count">${correctVotes} ${ru?'угадали':'guessed correctly'}</span></div>${roster.map((seat,index)=>`<div class="score-row ${seat.user_id===round.storyteller_id?'me':''}"><span class="score-avatar">${avatarMarkup(seat.profile?.avatar,['✦','☽','♢','☼'][index%4])}</span><strong>${name(seat.user_id)}</strong><em>${explanationFor(seat)}</em><b>+${pointsFor(seat)}</b></div>`).join('')}</section></main>`
  document.querySelectorAll('.reveal-card').forEach((card,index)=>{const submission=submissions[index];if(!submission)return;const nameNode=card.querySelector('small');if(nameNode){nameNode.dataset.liveProfileId=submission.player_id;nameNode.dataset.liveProfileField='nickname'}const voterNames=votes.filter(vote=>vote.submission_id===submission.id).map(vote=>name(vote.voter_id));const note=document.createElement('span');note.className='reveal-voters';note.textContent=voterNames.length?`${ru?'Голосовали:':'Voted by:'} ${voterNames.join(', ')}`:(ru?'Нет голосов':'No votes');card.append(note)});
  document.querySelectorAll('.scores .score-row').forEach((row,index)=>{const seat=roster[index];if(!seat)return;const avatar=row.querySelector('.score-avatar'),playerName=row.querySelector('strong');if(avatar){avatar.dataset.liveProfileId=seat.user_id;avatar.dataset.liveProfileField='avatar'}if(playerName){playerName.dataset.liveProfileId=seat.user_id;playerName.dataset.liveProfileField='nickname'}});
  if(nextStoryteller&&!isFinalRound){const notice=document.createElement('p');notice.className='next-storyteller';notice.textContent=ru?`Следующий ведущий — ${nextStoryteller.profile?.nickname||'Мечтатель'}`:`Next storyteller — ${nextStoryteller.profile?.nickname||'Dreamer'}`;$('.scores')?.append(notice)}
}
routeLiveRound=serialRefresh(async function(){
  if(!liveGameContext||preparingNextRound||submittingLiveCard)return;
  const epoch=liveGameEpoch;
  const {data:roomState,error}=await supabase.from('rooms').select('status').eq('id',liveGameContext.room.id).maybeSingle();if(error)throw error;
  if(epoch!==liveGameEpoch)return;
  if(roomState?.status==='finished'){
    liveGameContext.room.status='finished';
    const {data:finalRound,error:finalRoundError}=await supabase.from('rounds').select('*').eq('room_id',liveGameContext.room.id).eq('phase','results').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(1).maybeSingle();
    if(finalRoundError)throw finalRoundError;
    if(finalRound){
      const finalKey=`${finalRound.id}:results`;
      if(document.querySelector('main')?.dataset.roundView===finalKey)return;
      const epoch=liveGameEpoch;await loadLiveDeckProgress();if(epoch!==liveGameEpoch)return;
      await showLiveResults(finalRound);const main=document.querySelector('main');if(main)main.dataset.roundView=finalKey;return;
    }
    return showGameFinished();
  }
  if(roomState?.status!=='playing')return;
  await loadLiveDeckProgress();const round=await loadLiveRound();
  if(!round||epoch!==liveGameEpoch)return;
  const key=`${round.id}:${round.phase}`;
  if(document.querySelector('main')?.dataset.roundView===key){await updateLivePhaseProgress(round);return}
  const context=liveGameContext;await loadLiveHand();
  if(epoch!==liveGameEpoch)return;
  if(round.phase==='results')await showLiveResults(round);
  else if(round.phase==='voting')await showLiveVoting(round);
  else {
    const {data:submitted,error}=await supabase.from('card_submissions').select('id').eq('round_id',round.id).eq('player_id',context.session.user.id).maybeSingle();if(error)throw error;
    if(submitted||round.storyteller_id===context.session.user.id)showLiveRoundWaiting();
    else {const {data:storyteller}=await supabase.from('profiles').select('nickname,avatar').eq('id',round.storyteller_id).single();demoShowGuesser({name:storyteller?.nickname||'Storyteller',avatar:storyteller?.avatar||'✦'},round.clue)}
  }
  const main=document.querySelector('main');if(main)main.dataset.roundView=key;
});
async function watchLiveRound(){if(!liveGameContext)return;liveRoundChannel?.unsubscribe();const roomId=liveGameContext.room.id;liveRoundChannel=supabase.channel(`round-${roomId}`).on('postgres_changes',{event:'*',schema:'public',table:'rounds',filter:`room_id=eq.${roomId}`},()=>routeLiveRound()).on('postgres_changes',{event:'UPDATE',schema:'public',table:'rooms',filter:`id=eq.${roomId}`},payload=>{liveGameContext.room=payload.new;if(payload.new.status==='lobby')showLiveLobby(payload.new,liveGameContext.player,liveGameContext.session);else routeLiveRound()}).subscribe()}
let advancingRound=false;
async function advanceLiveRound(){
  if(!liveGameContext||advancingRound)return;
  advancingRound=true;
  try {
    const round=await loadLiveRound();
    if(!round||round.phase==='results')return;
    const {error}=await supabase.rpc('advance_luminaria_round',{target_round_id:round.id});
    if(error&&error.code==='PGRST202'){
      if(round.storyteller_id!==liveGameContext.session.user.id)return;
      const {data:progress,error:progressError}=await supabase.rpc('luminaria_round_progress',{target_round_id:round.id}).single();
      if(progressError)throw progressError;
      if(round.phase==='submitting'&&progress.submission_count>=progress.participant_count){const {error:updateError}=await supabase.from('rounds').update({phase:'voting'}).eq('id',round.id).eq('phase','submitting');if(updateError)throw updateError}
      if(round.phase==='voting'&&progress.vote_count>=progress.participant_count-1){const {error:finishError}=await supabase.rpc('finalize_luminaria_round',{target_round_id:round.id});if(finishError)throw finishError}
      return;
    }
    if(error)throw error;
  } finally { advancingRound=false; }
}
// Private card inserts are not visible to the storyteller through Realtime.
// Recover progress independently of those notifications without resetting a hand.
let roundSyncBusy=false;
setInterval(async()=>{
  if(!liveGameContext||roundSyncBusy||document.hidden||document.querySelector('.lobby-page,.game-finale'))return;
  roundSyncBusy=true;
  try {
    const previous=liveRound?`${liveRound.id}:${liveRound.phase}`:null;
    await advanceLiveRound();
    const round=await loadLiveRound();
    const current=round?`${round.id}:${round.phase}`:null;
    if(current&&!preparingNextRound)await routeLiveRound();
    if(round&&document.querySelector('.waiting-stage')){
      const ru=language==='ru';
      document.querySelector('.waiting-stage h1').textContent=round.phase==='voting'?(ru?'Игроки голосуют.':'Players are voting.'):(ru?'Ждём карты остальных игроков.':'Waiting for the other players’ cards.');
      document.querySelector('.waiting-stage .lead').textContent=ru?'Следующий этап откроется автоматически.':'The next stage will open automatically.';
    }
    await updateLivePhaseProgress(round);
    document.querySelector('#roundSyncError')?.remove();
  } catch(error){
    console.error('Round synchronization failed',error);
    let notice=document.querySelector('#roundSyncError');
    if(!notice){notice=document.createElement('p');notice.id='roundSyncError';notice.setAttribute('role','alert');document.querySelector('main')?.append(notice)}
    notice.textContent=`${language==='ru'?'Не удалось обновить раунд':'Could not sync the round'}: ${error.message||'Connection error'}`;
  } finally {roundSyncBusy=false}
},10000);
let openingLiveGame=false;
showGame=async function(){
  if(!liveGameContext)return demoShowGame();
  if(openingLiveGame)return;
  suspendLobbyObservers();
  openingLiveGame=true;
  try{
    await watchLiveRound();
    await Promise.all([loadLiveHand(),loadLiveDeckProgress()]);
    const round=await loadLiveRound();
    if(round)return routeLiveRound();
    if(liveGameContext.room.status!=='playing')return;
    if((liveStorytellerId||liveGameContext.room.host_id)===liveGameContext.session.user.id)return demoShowGame();
    showLiveRoundWaiting();
  }catch(error){
    console.error('Could not open live game',error);
    alert(error.message||'Could not open the game.');
  }finally{openingLiveGame=false}
};
// Realtime may be delayed on a freshly connected browser. Polling keeps the lobby
// in sync and lets invitees enter an already started room without reloading.
function exitRemovedLobby(){
  if(!liveGameContext)return;
  localStorage.removeItem('luminaria-last-room');
  liveRoomChannel?.unsubscribe();liveRoundChannel?.unsubscribe();liveChatChannel?.unsubscribe();
  liveRoomChannel=null;liveRoundChannel=null;liveChatChannel=null;liveChatRoomId=null;liveChatMessages=[];
  liveGameContext=null;liveRound=null;liveHandCache=[];
  alert(language==='ru'?'Ведущий удалил тебя из комнаты.':'The host removed you from the room.');
  location.assign('/');
}
setInterval(async()=>{const context=liveGameContext;if(!context||document.hidden||!document.querySelector('.lobby-page'))return;try{const {data}=await supabase.from('rooms').select('*').eq('id',context.room.id).maybeSingle();if(!data||liveGameContext!==context)return;const roster=await loadLiveRoster(data.id);if(liveGameContext!==context)return;if(!roster.some(seat=>seat.user_id===context.session.user.id)){exitRemovedLobby();return}context.room=data;if(data.status==='playing')showGame();else{$('.deck-panel')?.remove();addDeckSelector();renderRoundSelector(roster)}}catch(error){console.error('Could not refresh lobby',error)}},10000);
// Persist the start before changing the host's screen, so every guest observes the same phase.
let startingLiveGame=false;
function requestWithTimeout(request,timeout=15000){return Promise.race([request,new Promise((_,reject)=>setTimeout(()=>reject(new Error(language==='ru'?'Сервер слишком долго готовит колоду. Попробуй ещё раз.':'The server is taking too long to prepare the deck. Please try again.')),timeout))])}
function suspendLobbyObservers(){[moonPhaseObserver,deckSearchObserver,deckPreviewObserver,leaveLobbyObserver,avatarObserver].forEach(observer=>observer.disconnect())}
document.addEventListener('click',async event=>{const button=event.target.closest('#startButton');const context=liveGameContext;if(!button||button.disabled||startingLiveGame||!context||context.room.host_id!==context.session.user.id)return;event.preventDefault();event.stopImmediatePropagation();suspendLobbyObservers();startingLiveGame=true;button.disabled=true;button.textContent=language==='ru'?'Готовим колоду…':'Preparing the deck…';try{const roster=await loadLiveRoster(context.room.id);const chosen=selectedRoundOption(roster.length,selectedDeckCards().length,context.room.round_cycles||2);if(!chosen)throw new Error(language==='ru'?'Не хватает карт для стола и запаса на обмен.':'Not enough cards for this table and the swap reserve.');const shuffled=shuffleDeck(selectedDeckCards()).slice(0,chosen.cards);const {data:deckSetup,error:deckError}=await requestWithTimeout(supabase.rpc('start_luminaria_game',{target_room_id:context.room.id,card_ids:shuffled}));if(deckError)throw deckError;liveTotalRounds=deckSetup?.[0]?.total_rounds||0;liveHandCache=[];liveRound=null;liveStorytellerId=null;liveRoundNumber=1;localStorage.removeItem(nextRoundStorageKey());context.room={...context.room,status:'playing'};await showGame()}catch(error){const {data:roomState}=await supabase.from('rooms').select('status').eq('id',context.room.id).maybeSingle().catch(()=>({data:null}));if(roomState?.status==='playing'){context.room={...context.room,status:'playing'};await showGame();return}button.disabled=false;button.textContent=language==='ru'?'Начать игру':'Start the game';alert(error.message||'Could not start the room.')}finally{startingLiveGame=false}},true);
let submittingLiveCard=false;
document.addEventListener('click',async event=>{const button=event.target.closest('#revealButton,#sendCard');if(!button||!liveGameContext||submittingLiveCard)return;const context=liveGameContext,isHost=button.id==='revealButton';if(isHost!==((liveStorytellerId||context.room.host_id)===context.session.user.id))return;const image=document.querySelector('.hand-card.selected img');const clue=$('#clueInput')?.value.trim();if(!image||(isHost&&!clue))return;event.preventDefault();event.stopImmediatePropagation();submittingLiveCard=true;button.disabled=true;try{let round=await loadLiveRound();if(isHost&&!round){await loadLiveDeckProgress();if(liveRoundNumber>liveTotalRounds)throw new Error('Достигнут лимит раундов. Обнови страницу.');if(liveStorytellerId!==context.session.user.id)throw new Error('Сейчас очередь другого ведущего.');const {data,error}=await supabase.from('rounds').insert({room_id:context.room.id,storyteller_id:context.session.user.id,clue}).select().single();if(error)throw error;round=data;liveRound=round;liveStorytellerId=round.storyteller_id}else if(!round){round=await loadLiveRound()}if(!round)throw new Error(language==='ru'?'Раунд ещё не создан. Попробуй снова.':'The round is not ready yet. Please try again.');const cardId=decodeURIComponent(image.src.split('/').pop());const existing=await supabase.from('card_submissions').select('id,card_id').eq('round_id',round.id).eq('player_id',context.session.user.id).maybeSingle();if(existing.error)throw existing.error;if(!existing.data){const {error}=await supabase.rpc('play_luminaria_card',{target_round_id:round.id,chosen_card_id:cardId});if(error){const retry=await supabase.from('card_submissions').select('id').eq('round_id',round.id).eq('player_id',context.session.user.id).maybeSingle();if(retry.error||!retry.data)throw error}}liveHandCache=[];await loadLiveHand();showLiveRoundWaiting();await advanceLiveRound()}catch(error){console.error(error);button.disabled=false;showInlineGameError(error.message||'Could not save this card.')}finally{submittingLiveCard=false;routeLiveRound().catch(console.error)}},true);
let openingFinale=null;
async function showGameFinished(){
  const context=liveGameContext;if(!context)return;
  if(document.querySelector('.game-finale')?.dataset.finalRoom===context.room.id)return;
  if(openingFinale)return openingFinale;
  openingFinale=(async()=>{
    const [roster,{data:rounds,error}]=await Promise.all([
      loadLiveRoster(context.room.id),
      supabase.from('rounds').select('id,clue,storyteller_id,created_at').eq('room_id',context.room.id).eq('phase','results').order('created_at',{ascending:true}).order('id',{ascending:true})
    ]);
    if(error)throw error;
    if(liveGameContext?.room.id!==context.room.id)return;
    const ru=language==='ru',decode=document.createElement('textarea');
    const ranking=rankPlayers(roster).map(seat=>{decode.innerHTML=seat.profile?.nickname||'Dreamer';return {...seat,name:decode.value,avatarHtml:avatarMarkup(seat.profile?.avatar,'✦')}});
    const history=rounds||[],story=fallbackStory(history,storyLanguage(history));
    await syncStarParty();
    finaleStarRanking=ranking;
    document.body.innerHTML=finaleMarkup({starScores:liveStarScores,ranking,rounds:history,roomId:context.room.id,roomCode:context.room.code,userId:context.session.user.id,language,story,isHost:context.room.host_id===context.session.user.id});
    const root=document.querySelector('.game-finale');
    $('#rematchButton')?.addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{await restartLiveRoom()}catch(error){if(button.isConnected){button.disabled=false;showInlineGameError(error.message)}}});
    $('#copyPartyStory').addEventListener('click',async event=>{try{await navigator.clipboard.writeText($('#partyStory').textContent);event.target.textContent=ru?'Скопировано ✓':'Copied ✓'}catch{$('#storyStatus').textContent=ru?'Выдели текст истории, чтобы скопировать её.':'Select the story text to copy it.'}});
    let storyLoading=false;
    const loadStory=async()=>{
      if(storyLoading||!root.isConnected)return;storyLoading=true;
      const status=root.querySelector('#storyStatus'),retry=root.querySelector('#retryPartyStory'),text=root.querySelector('#partyStory');
      retry.hidden=true;status.textContent=ru?'Собираем образы всех ассоциаций в одну историю…':'Weaving every round’s imagery into one story…';
      try{
        const {data:{session}}=await supabase.auth.getSession();
        if(!session)throw new Error('Session unavailable');
        const response=await fetch('/api/finale-story',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({roomId:context.room.id,language}),signal:AbortSignal.timeout(35000)});
        if(!response.ok)throw new Error('Story unavailable');
        const result=await response.json();if(typeof result.story!=='string'||!result.story.trim())throw new Error('Empty story');
        if(!root.isConnected)return;
        text.textContent=fitStory(result.story);status.textContent=ru?'История по ассоциациям всей партии.':'A story inspired by every round.';
      }catch{
        if(root.isConnected){status.textContent=ru?'Пока — эпилог из отдельных фраз. История по всей партии временно недоступна; все ассоциации сохранены ниже.':'For now, a vignette from a few clues. The full story is temporarily unavailable; every clue is listed below.';retry.hidden=false}
      }finally{storyLoading=false}
    };
    $('#retryPartyStory').addEventListener('click',loadStory);void loadStory();
  })();
  try{await openingFinale}finally{openingFinale=null}
}
async function restartLiveRoom(){
  if(!liveGameContext||liveGameContext.room.host_id!==liveGameContext.session.user.id)return;
  const {error}=await supabase.rpc('restart_luminaria_room',{target_room_id:liveGameContext.room.id});
  if(error)throw error;
  resetLiveParty();
  const {data:room}=await supabase.from('rooms').select().eq('id',liveGameContext.room.id).single();
  if(room)showLiveLobby(room,liveGameContext.player,liveGameContext.session);
}
let preparingNextRound=false;
async function prepareNextLiveRound(){
  if(!liveGameContext||preparingNextRound)return;
  preparingNextRound=true;
  try{
    const {data:deckState,error:deckError}=await supabase.rpc('luminaria_deck_state',{target_room_id:liveGameContext.room.id}).single();
    if(deckError)throw deckError;
    const completed=await loadLiveRound();
    if(completed&&completed.phase!=='results'){preparingNextRound=false;return routeLiveRound()}
    if(deckState.remaining_cards===0||(completed&&liveRoundNumber>=deckState.cards_per_player))return showGameFinished();
    if(completed){
      const roster=await loadLiveRoster(liveGameContext.room.id);
      const currentIndex=Math.max(0,roster.findIndex(seat=>seat.user_id===completed.storyteller_id));
      liveStorytellerId=roster[(currentIndex+1)%roster.length]?.user_id||liveGameContext.room.host_id;
      localStorage.setItem(nextRoundStorageKey(),JSON.stringify({completedRoundId:completed.id,storytellerId:liveStorytellerId}));
      liveHandVersion=completed.id;
      liveRound=null;
      liveRoundNumber+=1;
      liveRoundNumberForId=null;
    }
    await loadLiveHand();
    if(liveStorytellerId===liveGameContext.session.user.id)demoShowGame();else showLiveRoundWaiting();
  }finally{preparingNextRound=false}
}
async function addLiveScoreboard(){if(!liveGameContext||!document.querySelector('.results-page')||$('#liveScoreboard'))return;const scores=$('.scores');if(!scores)return;const roster=await loadLiveRoster(liveGameContext.room.id);const ru=language==='ru';const board=document.createElement('section');board.id='liveScoreboard';board.className='live-scoreboard';board.innerHTML=`<div class="panel-title"><h2>${ru?'Общий счёт':'Total score'}</h2><span class="count">${ru?'Комната':'Room'} ${liveGameContext.room.code}</span></div>${[...roster].sort((a,b)=>b.score-a.score).map((seat,index)=>`<div class="score-row ${seat.user_id===liveGameContext.session.user.id?'me':''}"><span class="score-avatar">${index+1}</span><strong>${seat.profile?.nickname||'Dreamer'}</strong><em>${index===0?(ru?'Лидер':'Leading'):(ru?'За столом':'At the table')}</em><b>${seat.score}</b></div>`).join('')}`;scores.after(board)}
const liveResultsObserver=new MutationObserver(()=>{if(!liveGameContext||document.querySelector('.game-finale')||!document.querySelector('.results-page')||$('#nextLiveRound'))return;const ru=language==='ru',scores=$('.scores');if(!scores)return;const isFinal=document.querySelector('.results-page')?.dataset.finalRound==='true';const button=document.createElement('button');button.id='nextLiveRound';button.className='primary-button next-round';button.innerHTML=isFinal?`${ru?'Результаты игры':'Final game results'} <b>→</b>`:`${ru?'Следующий раунд':'Next round'} <b>→</b>`;button.addEventListener('click',()=>{if(isFinal)showGameFinished().catch(error=>showInlineGameError(error.message));else prepareNextLiveRound().catch(console.error)});scores.append(button);if(!isFinal)addLiveScoreboard().catch(console.error)});liveResultsObserver.observe(document.body,{childList:true,subtree:true});
async function createLiveRoom(player,session){for(let attempt=0;attempt<3;attempt++){const code=makeRoomCode();let room;const result=await supabase.rpc('create_luminaria_room',{room_code:code,public_room:pendingRoomIsPublic});if(!result.error){room=Array.isArray(result.data)?result.data[0]:result.data}else if(isMissingRpc(result.error)){if(pendingRoomIsPublic)throw new Error(language==='ru'?'Открытые комнаты ещё не подключены в базе данных.':'Public rooms are not enabled in the database yet.');const {data:legacyRoom,error}=await supabase.from('rooms').insert({code,host_id:session.user.id}).select().single();if(error?.code==='23505')continue;if(error)throw error;const {error:seatError}=await supabase.from('room_players').insert({room_id:legacyRoom.id,user_id:session.user.id});if(seatError)throw seatError;room=legacyRoom}else if(result.error.code==='23505')continue;else throw result.error;if(!room)throw new Error('Room creation returned no room.');return showLiveLobby(room,player,session)}throw new Error('Could not create a unique room code.')}
async function showRecoveredLiveRoom(room,session,profile){
  const requestedName=String(profile?.name||'Dreamer').replace(/[<>]/g,'').trim().slice(0,24);
  const restored={name:requestedName.length>=2?requestedName:'Dreamer',avatar:safeAvatar({avatar:profile?.avatar})};
  const {error}=await supabase.from('profiles').update({nickname:restored.name,avatar:restored.avatar}).eq('id',session.user.id);
  if(error)console.warn('Could not restore display profile',error.message);
  cachePlayer(restored,session.user.id);
  navProfileCache={id:session.user.id,nickname:restored.name,avatar:restored.avatar};
  addAuthButton();
  showLiveLobby(room,restored,session);
}
async function joinLiveRoom(player,session,code){
  let room,secureJoin=false;
  const lookup=await supabase.rpc('lookup_luminaria_room',{room_code:code});
  if(!lookup.error){room=Array.isArray(lookup.data)?lookup.data[0]:lookup.data;secureJoin=true}
  else if(isMissingRpc(lookup.error)){const legacy=await supabase.from('rooms').select().eq('code',code).maybeSingle();if(legacy.error)throw legacy.error;room=legacy.data}
  else throw lookup.error;
  if(!room)throw new Error(language==='ru'?'Комната с таким кодом не найдена.':'No room found with that code.');
  if(room.status==='closed')throw new Error(language==='ru'?'Создатель закрыл эту комнату.':'The host closed this room.');
  const {data:existingSeat,error:seatLookupError}=await supabase.from('room_players').select('user_id').eq('room_id',room.id).eq('user_id',session.user.id).maybeSingle();
  if(seatLookupError)throw seatLookupError;
  if(!existingSeat){
    const personalLink=parsePersonalReturnHash(location.hash);
    if(personalLink){
      const {error}=await supabase.rpc('reclaim_luminaria_seat',{room_code:room.code,recovery_token:personalLink.token});
      if(error)throw new Error(language==='ru'?'Личная ссылка возвращения устарела. Открой новую ссылку из предыдущего браузера.':'This personal return link is no longer valid. Open a fresh link from your previous browser.');
      history.replaceState(null,'',location.pathname+location.search);
      const {data:recoveredRoom}=await supabase.from('rooms').select().eq('id',room.id).single();
      return showRecoveredLiveRoom(recoveredRoom||room,session,{name:personalLink.name||player.name,avatar:personalLink.avatar||player.avatar});
    }
    let saved=null;try{saved=JSON.parse(localStorage.getItem('luminaria-last-room')||'null')}catch{}
    if(room.status!=='lobby'&&saved?.code===room.code&&saved.recoveryToken){
      const {error:reclaimError}=await supabase.rpc('reclaim_luminaria_seat',{room_code:room.code,recovery_token:saved.recoveryToken});
      if(reclaimError)throw new Error(language==='ru'?'Не удалось восстановить место. Открой личную ссылку возвращения из прежнего браузера.':'Could not recover your seat. Open your personal return link from the previous browser.');
      const {data:recoveredRoom}=await supabase.from('rooms').select().eq('id',room.id).single();
      return showRecoveredLiveRoom(recoveredRoom||room,session,saved.player||player);
    }
    if(room.status!=='lobby')throw new Error(language==='ru'?'Игра уже началась. Открой личную ссылку возвращения из прежнего браузера. Обычная ссылка комнаты не подтверждает твоё место.':'The game has started. Open your personal return link from the previous browser. The regular room link cannot identify your seat.');
    if(secureJoin){const joined=await supabase.rpc('join_luminaria_room',{target_room_id:room.id});if(joined.error)throw joined.error;room=Array.isArray(joined.data)?joined.data[0]:joined.data||room}
    else{const roster=await loadLiveRoster(room.id);if(roster.length>=10)throw new Error(language==='ru'?'В комнате уже максимум 10 игроков.':'This room already has the maximum of 10 players.');if(roster.some(seat=>seat.profile?.nickname?.trim().toLocaleLowerCase()===player.name.trim().toLocaleLowerCase()))throw new Error(language==='ru'?'Этот ник уже занят в комнате. Выбери другой.':'This nickname is already used in the room.');const {error:seatError}=await supabase.from('room_players').insert({room_id:room.id,user_id:session.user.id});if(seatError)throw seatError}
  }
  if(parsePersonalReturnHash(location.hash))history.replaceState(null,'',location.pathname+location.search);
  showLiveLobby(room,player,session)
}
const liveProfileCache=new Map();
function applyLiveProfileUpdate(userId,nickname,avatar){
  const safeName=String(nickname).trim().slice(0,24)||'Dreamer',safeImage=safeAvatar({avatar}),previousName=liveProfileCache.get(userId)?.nickname?.replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'");
  const profile={id:userId,nickname:escapeHtml(safeName),avatar:safeImage};
  liveProfileCache.set(userId,profile);
  if(liveGameContext?.session.user.id===userId)liveGameContext.player={...liveGameContext.player,name:safeName,avatar:safeImage};
  [...document.querySelectorAll('[data-live-profile-id]')].filter(node=>node.dataset.liveProfileId===userId).forEach(node=>{
    if(node.dataset.liveProfileField==='nickname'){const current=node.textContent||'',prefix=previousName&&current.endsWith(previousName)?current.slice(0,-previousName.length):'',badge=node.querySelector(':scope > small');node.replaceChildren(document.createTextNode(`${prefix}${safeName}`),...(badge?[badge]:[]))}
    else if(node.dataset.liveProfileField==='avatar'){
      node.replaceChildren();
      if(safeImage.startsWith('data:image/')){const image=document.createElement('img');image.src=safeImage;image.alt='';node.append(image)}else node.innerHTML=avatarPortraitMarkup(safeImage);
    }
  });
  if(liveStarScores[userId]){liveStarScores[userId]={...liveStarScores[userId],name:safeName};const key=starStorageKey();if(key)localStorage.setItem(key,JSON.stringify(liveStarScores));renderStarScores()}
}
async function loadLiveRoster(roomId){
  const {data:seats,error}=await supabase.from('room_players').select('user_id,is_ready,score').eq('room_id',roomId).order('joined_at');
  if(error)throw error;
  const missingIds=[...new Set(seats.map(seat=>seat.user_id).filter(id=>!liveProfileCache.has(id)))];
  if(missingIds.length){
    const {data:profiles,error:profileError}=await supabase.from('profiles').select('id,nickname,avatar').in('id',missingIds);
    if(profileError)throw profileError;
    for(const profile of profiles||[])liveProfileCache.set(profile.id,{...profile,nickname:escapeHtml(profile.nickname||'Dreamer'),avatar:safeAvatar({avatar:profile.avatar})});
  }
  return seats.map(seat=>({...seat,profile:liveProfileCache.get(seat.user_id)}));
}
const leaveLobbyObserver=new MutationObserver(()=>{
  if(!liveGameContext||!document.querySelector('.lobby-page')||$('#leaveLobby')||liveGameContext.room.host_id===liveGameContext.session.user.id)return;
  const button=document.createElement('button');
  button.id='leaveLobby';button.type='button';button.className='text-button leave-lobby-button';
  button.textContent=language==='ru'?'Покинуть комнату':'Leave room';
  document.querySelector('.invite-panel')?.append(button);
});leaveLobbyObserver.observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',async event=>{
  if(!event.target.closest('#leaveLobby')||!liveGameContext)return;
  const context=liveGameContext;
  const {error}=await supabase.from('room_players').delete().eq('room_id',context.room.id).eq('user_id',context.session.user.id);
  if(error)return alert(error.message);
  liveRoomChannel?.unsubscribe();liveRoundChannel?.unsubscribe();liveChatChannel?.unsubscribe();
  liveRoomChannel=null;liveRoundChannel=null;liveChatChannel=null;liveChatRoomId=null;liveChatMessages=[];liveGameContext=null;liveRound=null;liveHandCache=[];
  localStorage.removeItem('luminaria-last-room');
  location.assign('/');
});
function showLiveLobby(room,player,session){liveRoomChannel?.unsubscribe();if(room.status==='lobby')liveProfileCache.clear();const ru=language==='ru';const invite=roomInviteUrl(location.origin,room.code);document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="lobby-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><button class="language" id="lobbyLanguage">${ru?'EN':'RU'}</button></nav><section class="lobby-hero"><div><p class="eyebrow"><span></span><span>${ru?'Комната':'Room'} ${room.code}</span></p><h1>${ru?'Собираем<br><em>мечтателей.</em>':'Gathering<br><em>dreamers.</em>'}</h1><p class="lead">${ru?'Комната обновляется в реальном времени. Для начала нужны минимум 3 игрока. Поделись ссылкой и дождись друзей.':'This room updates live. At least 3 players are required. Share the link and wait for your friends.'}</p></div><div class="lobby-orb">✦</div></section><section class="lobby-grid"><article class="lobby-panel players-panel"><div class="panel-title"><h2>${ru?'Игроки':'Players'}</h2><span class="count" id="liveCount">0 / 10</span></div><div id="liveRoster"></div></article><article class="lobby-panel invite-panel"><span class="invite-icon">↗</span><h2>${ru?'Пригласить друзей':'Invite friends'}</h2><p>${ru?'Любой, у кого есть ссылка, сможет войти в комнату.':'Anyone with this link can join your room.'}</p><div class="share-link"><span>${invite}</span><button id="copyInvite">${ru?'Скопировать':'Copy link'}</button></div><button class="text-button share-room-button" id="shareInvite">${ru?'Поделиться ссылкой':'Share invitation'}</button><div class="ready-line"><span class="ready-check" id="readyCheck">✓</span><span id="readyLabel">${ru?'Не готов':'Not ready'}</span></div><button class="primary-button full" id="readyButton">${ru?'Я готов':'I’m ready'} <b>→</b></button>${room.host_id===session.user.id?`<button class="start-button" id="startButton" disabled>${ru?'Начать игру':'Start the game'}</button>`:''}</article></section></main>`;let removedFromLobby=false;const render=async()=>{try{const roster=await loadLiveRoster(room.id);if(!$('#liveCount'))return;const mine=roster.find(seat=>seat.user_id===session.user.id);if(!mine){if(!removedFromLobby){removedFromLobby=true;exitRemovedLobby()}return}renderRoundSelector(roster);$('#liveCount').textContent=`${roster.length} / 10`;$('#liveRoster').innerHTML=roster.map(seat=>`<div class="player-row"><span class="lobby-avatar" data-live-profile-id="${seat.user_id}" data-live-profile-field="avatar">${avatarMarkup(seat.profile?.avatar,'☽')}</span><div><strong data-live-profile-id="${seat.user_id}" data-live-profile-field="nickname">${seat.profile?.nickname||'Dreamer'}</strong><small>${seat.user_id===room.host_id?(ru?'Ведущий':'Host'):seat.is_ready?(ru?'Готов':'Ready'):(ru?'Не готов':'Not ready')}</small></div><span class="status-dot ${seat.is_ready?'is-ready':''}"></span>${room.host_id===session.user.id&&seat.user_id!==room.host_id?`<button type="button" class="kick-player-button" data-kick-user-id="${seat.user_id}" title="${ru?'Исключить из комнаты':'Remove from room'}" aria-label="${ru?'Исключить из комнаты':'Remove from room'}">×</button>`:''}</div>`).join('')+Array.from({length:Math.max(0,3-roster.length)},()=>`<div class="empty-seat"><span>+</span><p>${ru?'Ждём мечтателей…':'Waiting for dreamers…'}</p></div>`).join('');if(mine.is_ready){$('#readyCheck').classList.add('is-ready');$('#readyLabel').textContent=ru?'Готов':'Ready';$('#readyButton').classList.add('is-ready');$('#readyButton').innerHTML=`✓ ${ru?'Готов':'Ready'}`}else{$('#readyCheck').classList.remove('is-ready');$('#readyLabel').textContent=ru?'Не готов':'Not ready';$('#readyButton').classList.remove('is-ready');$('#readyButton').innerHTML=`${ru?'Я готов':'I’m ready'} <b>→</b>`}if(room.host_id===session.user.id)$('#startButton').disabled=savingLobbySettings||!selectedRoundOption(roster.length,selectedDeckCards().length,room.round_cycles||2)||!roster.every(seat=>seat.is_ready)}catch(error){console.error(error)}};$('#liveRoster').addEventListener('click',async event=>{const button=event.target.closest('[data-kick-user-id]');if(!button||button.disabled||room.host_id!==session.user.id)return;const nickname=button.closest('.player-row')?.querySelector('strong')?.textContent||'Dreamer';if(!confirm(ru?`Исключить ${nickname} из комнаты?`:`Remove ${nickname} from the room?`))return;button.disabled=true;const {error}=await supabase.rpc('kick_luminaria_player',{target_room_id:room.id,target_user_id:button.dataset.kickUserId});if(error){alert(error.message);button.disabled=false;return}render()});$('#copyInvite').addEventListener('click',async()=>{await navigator.clipboard?.writeText(invite);$('#copyInvite').textContent=ru?'Скопировано!':'Copied!';setTimeout(()=>$('#copyInvite').textContent=ru?'Скопировать':'Copy link',1500)});$('#shareInvite').addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:'Luminaria',text:ru?'Присоединяйся к моей комнате в Luminaria':'Join my Luminaria room',url:invite});else{await navigator.clipboard?.writeText(invite);$('#shareInvite').textContent=ru?'Ссылка скопирована':'Link copied'}}catch(error){if(error?.name!=='AbortError')console.error(error)}});$('#readyButton').addEventListener('click',async()=>{const roster=await loadLiveRoster(room.id);const mine=roster.find(seat=>seat.user_id===session.user.id);const {error}=await supabase.from('room_players').update({is_ready:!mine?.is_ready}).eq('room_id',room.id).eq('user_id',session.user.id);if(error)return alert(error.message);render()});$('#lobbyLanguage').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);showLiveLobby(room,player,session)});installRoomVisibilityControls(room,session);liveRoomChannel=supabase.channel(`room-${room.id}`).on('postgres_changes',{event:'*',schema:'public',table:'room_players',filter:`room_id=eq.${room.id}`},render).on('postgres_changes',{event:'UPDATE',schema:'public',table:'rooms',filter:`id=eq.${room.id}`},payload=>{room=payload.new;liveGameContext.room=room;if(room.status==='closed')showClosedRoom();else if(room.status==='playing')showGame();else{updateRoomVisibilityControls(room);$('.deck-panel')?.remove();addDeckSelector();render()}}).subscribe();render()}

function updateRoomVisibilityControls(room){
  const panel=$('#roomVisibilityControls');if(!panel)return;
  const ru=language==='ru',isHost=room.host_id===liveGameContext?.session.user.id;
  panel.innerHTML=`<strong>${room.is_public?(ru?'Открытая комната':'Open room'):(ru?'Закрытая комната':'Private room')}</strong><p>${room.is_public?(ru?'Её видят все посетители сайта, пока ты в лобби.':'Visitors can find it while you are in the lobby.'):(ru?'Войти можно только по ссылке или коду.':'Players can join by invitation link or code only.')}</p>${isHost?`<button type="button" id="toggleRoomVisibility" class="text-button">${room.is_public?(ru?'Сделать закрытой':'Make private'):(ru?'Сделать открытой':'Make public')}</button>`:''}`;
  $('#toggleRoomVisibility')?.addEventListener('click',async event=>{
    const button=event.currentTarget;button.disabled=true;
    try{
      const {data,error}=await supabase.rpc('set_luminaria_room_visibility',{target_room_id:room.id,make_public:!room.is_public});
      if(error)throw error;
      const updated=Array.isArray(data)?data[0]:data;
      if(updated){liveGameContext.room=updated;updateRoomVisibilityControls(updated)}
    }catch(error){alert(error.message||'Could not update room visibility.');button.disabled=false}
  });
}
function installRoomVisibilityControls(room,session){
  const invite=$('.invite-panel');if(!invite)return;
  const panel=document.createElement('div');panel.id='roomVisibilityControls';panel.className='room-visibility-controls';
  invite.insertBefore(panel,invite.querySelector('.ready-line'));
  updateRoomVisibilityControls(room);
  if(room.host_id===session.user.id){
    const close=document.createElement('button');close.id='closeLobby';close.type='button';close.className='text-button close-lobby-button';
    close.textContent=language==='ru'?'Закрыть комнату и выйти':'Close room and leave';
    invite.append(close);
    close.addEventListener('click',async()=>{
      close.disabled=true;
      const {error}=await supabase.rpc('close_luminaria_room',{target_room_id:room.id});
      if(error){alert(error.message);close.disabled=false;return}
      localStorage.removeItem('luminaria-last-room');location.assign('/');
    });
    touchOpenRoom(room.id);
  }
}
async function touchOpenRoom(roomId){
  const context=liveGameContext;
  if(!context||context.room.id!==roomId||context.room.host_id!==context.session.user.id||context.room.status!=='lobby'||document.hidden)return;
  const {error}=await supabase.rpc('touch_luminaria_room',{target_room_id:roomId});
  if(error&&!isMissingRpc(error))console.error('Lobby heartbeat:',error);
}
setInterval(()=>{if(liveGameContext?.room.status==='lobby')touchOpenRoom(liveGameContext.room.id)},30000);

// Restore authenticated profiles from the database instead of repeatedly asking
// for a nickname after reloads, OAuth redirects, or a resumed browser tab.
async function loadSavedProfile(session){
  const {data,error}=await supabase.from('profiles').select('nickname,avatar').eq('id',session.user.id).maybeSingle();
  if(error)throw error;
  return data;
}
syncAuthProfile=async function(session){
  $('#authEntry')?.remove();
  if(!session){
    navProfileCache=null;
    addAuthButton();
    return;
  }
  const saved=await loadSavedProfile(session).catch(()=>null);
  if(saved?.nickname){
    navProfileCache={id:session.user.id,nickname:saved.nickname,avatar:safeAvatar({avatar:saved.avatar})};
    cachePlayer({name:saved.nickname,avatar:safeAvatar({avatar:saved.avatar})},session.user.id);
    addAuthButton();
    return;
  }
  navProfileCache={id:session.user.id,nickname:session.user.user_metadata?.nickname||session.user.user_metadata?.name||'Dreamer',avatar:safeAvatar({avatar:session.user.user_metadata?.avatar||'☽'})};
  addAuthButton();
  if(session.user?.is_anonymous)return;
  if(sessionStorage.getItem(`luminaria-profile-dismissed-${session.user.id}`))return;
  openProfileSetup(session);
};

// Store an uploaded avatar as data rather than HTML. Existing uploaded avatars
// from older sessions are converted by safeAvatar() before they reach Supabase.
document.addEventListener('change',async event=>{
  const input=event.target;if(input?.id!=='profileAvatarUpload')return;
  event.stopImmediatePropagation();
  const file=input.files?.[0];input.value='';
  if(!file||!file.type.startsWith('image/')||input.dataset.processing)return;
  const form=input.closest('form'),submit=form?.querySelector('[type="submit"]');
  input.dataset.processing='true';if(submit)submit.disabled=true;
  try{
    const avatar=await compressAvatar(file);
    if(!avatar||!input.isConnected)return;
    input.dataset.avatar=avatar;
    const label=form?.querySelector('#profileUploadLabel');if(label){label.style.backgroundImage=`url(${avatar})`;label.classList.add('has-image')}
    form?.querySelector('.profile-avatar.selected')?.classList.remove('selected');
  }catch{alert(language==='ru'?'Не удалось обработать фото. Выбери другое изображение.':'Could not process this photo.')}finally{delete input.dataset.processing;if(submit)submit.disabled=false}
},true);
document.addEventListener('change',async event=>{
  const input=event.target;if(input?.id!=='avatarUpload')return;
  event.stopImmediatePropagation();
  const file=input.files?.[0];input.value='';
  if(!file||!file.type.startsWith('image/')||input.dataset.processing)return;
  const form=input.closest('form'),submit=form?.querySelector('[type="submit"]');
  input.dataset.processing='true';if(submit)submit.disabled=true;
  try{
    const avatar=await compressAvatar(file);
    if(!avatar||!input.isConnected)return;
    uploadedAvatar=avatar;
    const label=form?.querySelector('#avatarUploadLabel');if(label){label.style.backgroundImage=`url(${avatar})`;label.classList.add('has-image')}
    form?.querySelector('.avatar-choice.selected')?.classList.remove('selected');
  }catch{alert(language==='ru'?'Не удалось обработать фото. Выбери другое изображение.':'Could not process this photo.')}finally{delete input.dataset.processing;if(submit)submit.disabled=false}
},true);
document.addEventListener('click',event=>{if(event.target.closest('.profile-avatar'))$('#profileAvatarUpload')?.removeAttribute('data-avatar')},true);
document.addEventListener('submit',async event=>{
  const form=event.target;if(form?.id!=='profileSetupForm')return;
  event.preventDefault();event.stopImmediatePropagation();
  if(form.dataset.saving||form.querySelector('[data-processing]'))return;
  const name=form.querySelector('#profileNickname')?.value.trim().replace(/\s+/g,' ');
  if(!name||name.length<2)return;
  const submit=form.querySelector('[type="submit"]'),dialog=form.closest('dialog');
  form.dataset.saving='true';if(submit)submit.disabled=true;
  try{
    const session=(await supabase.auth.getSession()).data.session;if(!session)throw new Error(language==='ru'?'Войди в профиль ещё раз.':'Please sign in again.');
    const avatar=form.querySelector('#profileAvatarUpload')?.dataset.avatar||form.querySelector('.profile-avatar.selected')?.dataset.avatarId||'mage-female';
    const {error}=await supabase.from('profiles').upsert({id:session.user.id,nickname:name,avatar},{onConflict:'id'});if(error)throw error;
    if(liveGameContext?.session.user.id===session.user.id)liveGameContext.player={name,avatar};
    cachePlayer({name,avatar},session.user.id);
    navProfileCache={id:session.user.id,nickname:name,avatar:safeAvatar({avatar})};
    applyLiveProfileUpdate(session.user.id,name,avatar);
    liveChatChannel?.send({type:'broadcast',event:'profile_update',payload:{userId:session.user.id,nickname:name,avatar}});
    sessionStorage.removeItem(`luminaria-profile-dismissed-${session.user.id}`);
    dialog?.close();dialog?.remove();$('#authEntry')?.remove();addAuthButton();
  }catch(error){alert(error.message)}finally{delete form.dataset.saving;if(submit)submit.disabled=false}
},true);

function hydrateAvatarImages(){
  document.querySelectorAll('.lobby-avatar,.score-avatar,.waiting-players span').forEach(node=>{
    const value=node.textContent?.trim();
    if(!value?.startsWith('data:image/')||node.querySelector('img'))return;
    if(value.length>60000){node.textContent='☽';return}
    node.textContent='';const image=document.createElement('img');image.src=value;image.alt='';image.loading='lazy';node.append(image);
  });
}
let avatarHydrationQueued=false;
const avatarObserver=new MutationObserver(()=>{
  if(avatarHydrationQueued)return;
  avatarHydrationQueued=true;
  requestAnimationFrame(()=>{avatarHydrationQueued=false;hydrateAvatarImages()});
});avatarObserver.observe(document.body,{childList:true,subtree:true});

// A resumed tab can miss Realtime messages. Rehydrate from Supabase on return.
let resumingLiveRoom=false;
document.addEventListener('visibilitychange',async()=>{
  if(document.visibilityState!=='visible'||!liveGameContext||resumingLiveRoom)return;
  resumingLiveRoom=true;
  try{
    const {data:room,error}=await supabase.from('rooms').select('*').eq('id',liveGameContext.room.id).maybeSingle();
    if(error||!room)return;
    liveGameContext.room=room;
    if(room.status==='lobby')await showLiveLobby(room,liveGameContext.player,liveGameContext.session);
    else await showGame();
  }finally{resumingLiveRoom=false}
});

function clearLiveRoomNavigation(){
  liveRoomChannel?.unsubscribe();liveRoundChannel?.unsubscribe();liveChatChannel?.unsubscribe();
  liveRoomChannel=null;liveRoundChannel=null;liveChatChannel=null;liveChatRoomId=null;liveChatMessages=[];liveGameContext=null;liveRound=null;liveHandCache=[];
  localStorage.removeItem('luminaria-last-room');
  history.replaceState({},'',`${location.pathname}${location.hash}`);
}
// Brand links and browser Back both leave the room cleanly instead of leaving a
// stale invitation code in the address bar.
document.addEventListener('click',event=>{
  if(!event.target.closest('a.brand'))return;
  if(liveGameContext)clearLiveRoomNavigation();
},true);
window.addEventListener('popstate',()=>{
  if(!liveGameContext||new URLSearchParams(location.search).get('room'))return;
  clearLiveRoomNavigation();
  location.replace('/');
});

installRerolls({
  supabase,
  getContext: () => liveGameContext,
  getLanguage: () => language,
  cardInfo: deckCardInfo,
  onChanged: async () => {
    const clue = $('#clueInput')?.value || '';
    await loadLiveHand();
    await showGame();
    if ($('#clueInput')) $('#clueInput').value = clue;
  },
});
