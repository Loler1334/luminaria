import './style.css';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl=import.meta.env.VITE_SUPABASE_URL;
const supabaseKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if(!supabaseUrl||!supabaseKey){document.body.innerHTML='<main style="max-width:42rem;margin:12vh auto;padding:2rem;font:18px system-ui;color:#fff;background:#101630;border-radius:18px"><h1>Нужно подключить Supabase</h1><p>В Cloudflare добавь переменные <code>VITE_SUPABASE_URL</code> и <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> в Build variables, затем перезапусти сборку.</p></main>';throw new Error('Missing Supabase build variables')}
const supabase=createClient(supabaseUrl,supabaseKey);

const copy={en:{howToPlay:'How to play',eyebrow:'A game for curious minds',headline:'See what others<br /><em>imagine.</em>',lead:'Tell a clue. Choose a dreamlike card. Find the story only your friends can see.',playNow:'Play now',joinFriends:'Join friends',playersOnline:'2,000+ dreamers playing today',sceneCaption:'Every card holds a different story',roomsEyebrow:'Gather around',roomsTitle:'A table is waiting.',createRoom:'Create a room',createRoomHint:'Invite your favorite people',joinRoom:'Join by code',joinRoomHint:'Have an invitation?',rulesTitle:'How Luminaria works',rule1:'One player gives a clue for their secret card.',rule2:'Everyone else plays a card that could fit the clue.',rule3:'Guess the storyteller’s card — and surprise your friends.',welcome:'Welcome to Luminaria',pickName:'Pick a name and join the table.',nickname:'Your nickname',placeholder:'Moonwalker',continue:'Continue',roomWelcome:'Your room is ready',roomText:'Choose a name — then share the room link with friends.',joinWelcome:'Join the story',joinText:'Enter your name to continue to the room.',room:'Room',waiting:'Waiting for dreamers',invite:'Invite friends',copyLink:'Copy link',copied:'Copied!',ready:'I’m ready',start:'Start the game',host:'Host',players:'Players',shareHint:'Anyone with this link can join your room.',readyState:'Ready',notReady:'Not ready',gameDemo:'Demo mode: invite links will become live when we connect multiplayer.'},ru:{howToPlay:'Как играть',eyebrow:'Игра для любопытных умов',headline:'Увидь, что<br /><em>воображают другие.</em>',lead:'Придумай подсказку. Выбери необычную карту. Найди историю, которую увидят твои друзья.',playNow:'Играть',joinFriends:'Войти к друзьям',playersOnline:'Сегодня играют 2 000+ мечтателей',sceneCaption:'В каждой карте — своя история',roomsEyebrow:'Собирайтесь вместе',roomsTitle:'Стол уже ждёт.',createRoom:'Создать комнату',createRoomHint:'Пригласите любимых людей',joinRoom:'Войти по коду',joinRoomHint:'Есть приглашение?',rulesTitle:'Как устроена Luminaria',rule1:'Один игрок даёт подсказку к своей тайной карте.',rule2:'Остальные выбирают карту, которая может подойти к этой подсказке.',rule3:'Угадайте карту ведущего — и удивите друзей.',welcome:'Добро пожаловать в Luminaria',pickName:'Выберите имя и присоединяйтесь к столу.',nickname:'Ваш никнейм',placeholder:'Лунный странник',continue:'Продолжить',roomWelcome:'Ваша комната готова',roomText:'Выберите имя, затем отправьте ссылку на комнату друзьям.',joinWelcome:'Войдите в историю',joinText:'Введите имя, чтобы продолжить в комнату.',room:'Комната',waiting:'Ждём мечтателей',invite:'Пригласить друзей',copyLink:'Скопировать ссылку',copied:'Скопировано!',ready:'Я готов',start:'Начать игру',host:'Ведущий',players:'Игроки',shareHint:'Любой, у кого есть ссылка, сможет войти в комнату.',readyState:'Готов',notReady:'Не готов',gameDemo:'Демо-режим: ссылки станут живыми после подключения мультиплеера.'}};
const siteCopy={en:{guideEyebrow:'Three steps to a story',guideTitle:'Simple rules.<br /><em>Unexpected answers.</em>',guideLead:'Luminaria is best with 3–7 people. Every round, a new player becomes the storyteller.',stepOneTitle:'Make a clue',stepOneText:'The storyteller chooses one private card and gives it a short, imaginative clue.',stepTwoTitle:'Add your card',stepTwoText:'Everyone else secretly adds one card that could fit the clue.',stepThreeTitle:'Find the secret',stepThreeText:'Vote for the storyteller’s card — but never for your own.',scoreTitle:'A little scoring twist',scoreText:'The storyteller scores only when some, but not all, players find their card. Clever clues win.',faqEyebrow:'Before you begin',faqTitle:'A few answers<br /><em>for the table.</em>',faqOneQuestion:'How many people can play?',faqOneAnswer:'A real game starts with 3 players and supports up to 7. Three is the smallest table where bluffing and guessing stay interesting.',faqTwoQuestion:'How long does a game last?',faqTwoAnswer:'Each player spends one card every round. The number of rounds is calculated from the deck and player count before the game begins.',faqThreeQuestion:'Do we need to create accounts?',faqThreeAnswer:'No. Choose a nickname, create a room, and share its link. Guest sessions keep the table in sync while you play.'},ru:{guideEyebrow:'Три шага к истории',guideTitle:'Простые правила.<br /><em>Неожиданные ответы.</em>',guideLead:'В Luminaria лучше всего играть втроём — всемером. В каждом раунде появляется новый ведущий.',stepOneTitle:'Загадай ассоциацию',stepOneText:'Ведущий выбирает тайную карту и даёт к ней короткую, образную подсказку.',stepTwoTitle:'Добавь свою карту',stepTwoText:'Остальные тайно кладут по одной карте, которая подходит к ассоциации.',stepThreeTitle:'Найди тайную карту',stepThreeText:'Проголосуй за карту ведущего — но никогда не за свою.',scoreTitle:'Важный нюанс очков',scoreText:'Ведущий получает очки, только если его карту угадали некоторые, но не все игроки. Выигрывают точные подсказки.',faqEyebrow:'Перед началом',faqTitle:'Несколько ответов<br /><em>для стола.</em>',faqOneQuestion:'Сколько человек могут играть?',faqOneAnswer:'Настоящая игра начинается с 3 игроков и поддерживает до 7. Втроём уже появляются блеф и интересные догадки.',faqTwoQuestion:'Сколько длится партия?',faqTwoAnswer:'Каждый игрок тратит одну карту в раунд. Число раундов рассчитывается из колоды и количества игроков до начала игры.',faqThreeQuestion:'Нужны ли аккаунты?',faqThreeAnswer:'Нет. Выберите ник, создайте комнату и отправьте ссылку друзьям. Гостевые сессии синхронизируют стол во время игры.'}};
Object.assign(siteCopy.en,{ctaEyebrow:'The table is waiting',ctaTitle:'Bring a clue.<br /><em>Leave with a story.</em>',ctaText:'Create a private room in a moment. All your friends need is the invitation link.',ctaPlay:'Create a room',ctaJoin:'I have a room code',footerText:'A card game for curious minds',footerRules:'Rules'});
Object.assign(siteCopy.ru,{ctaEyebrow:'Стол уже ждёт',ctaTitle:'Принеси подсказку.<br /><em>Унеси историю.</em>',ctaText:'Создай приватную комнату за мгновение. Друзьям понадобится только ссылка-приглашение.',ctaPlay:'Создать комнату',ctaJoin:'У меня есть код комнаты',footerText:'Карточная игра для любопытных умов',footerRules:'Правила'});
Object.assign(siteCopy.en,{archiveEyebrow:'The Moonlit Archive',archiveTitle:'102 cards.<br /><em>Countless stories.</em>',archiveText:'Every card is a starting point for a strange, funny, or beautiful association.',archiveButton:'Explore the full deck →'});
Object.assign(siteCopy.ru,{archiveEyebrow:'Лунный архив',archiveTitle:'102 карты.<br /><em>Бесконечно историй.</em>',archiveText:'Каждая карта — начало странной, смешной или красивой ассоциации.',archiveButton:'Открыть всю колоду →'});
Object.assign(siteCopy.en,{rulesScore:'The storyteller gets 0 points if nobody — or everybody — finds the secret card. Give a clue that is just mysterious enough.'});
Object.assign(siteCopy.ru,{rulesScore:'Ведущий получает 0 очков, если его карту не угадал никто или угадали все. Подсказка должна быть достаточно загадочной.'});
let language=localStorage.getItem('luminaria-language')||(navigator.language.startsWith('ru')?'ru':'en');let entryMode='play';const $=s=>document.querySelector(s);const entryDialog=$('#entryDialog');
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
const deckCards=['01-library-whale.png','02-moon-gardener.png','03-mending-rain.png','04-teapot-city.png','05-star-fisher.png','06-bedroom-train.png','07-memory-tree.png','08-cloud-bakery.png','09-shadow-market.png','10-walking-house.png','11-ocean-bedroom.png','12-clockmaker-time.png','13-constellation-feeder.png','14-door-forest.png','15-sunset-suitcase.png','16-sewn-horizon.png','17-ghost-cafe.png','18-planet-builder.png','19-village-bird.png','20-underwater-window.png','21-lost-things-garden.png','22-insect-orchestra.png','23-dream-laundry.png','24-boot-house.png','25-painting-autumn.png','26-sea-above-city.png','27-world-elevator.png','28-snail-tea.png','29-bird-postman.png','30-painted-exit.png','31-animal-station.png','32-pool-banquet.png','33-impossible-island-map.png','34-red-thread-crowd.png','35-dream-card.png','36-chair-field.png','37-apartment-cutaway.png','38-empty-carnival.png','39-furniture-breakfast.png','40-winter-marsh.png','41-weather-market.png','42-fox-library.png','43-river-carpet.png','44-lantern-orchard.png','45-greenhouse-masquerade.png','46-teacup-ship.png','47-toy-council.png','48-misty-deer.png','49-mushroom-station.png','50-mirror-bathhouse.png','51-traveling-theatre.png','52-alchemist-observatory.png','53-ice-river-festival.png','54-upward-waterfall-castle.png','55-shadow-kitchen.png','56-star-shepherds.png','57-ringsail-planet.png','58-milkyway-mender.png','59-cosmic-wedding.png','60-asteroid-lighthouse.png','61-fairy-astronomy-map.png','62-dream-card.png','63-ceramic-meteor-market.png','64-charcoal-eclipse-violin.png','65-whale-spaceship.png','66-rabbit-constellation-feast.png','67-turtle-star-desert.png','68-lunar-crystal-orchestra.png','69-upside-down-space-forest.png','70-moth-post-office.png','71-spider-constellation-stage.png','72-sleeping-giant-village.png',...Array.from({length:30},(_,index)=>`${index+73}-dream-card.png`)];
function deckCardInfo(card){const [number,...slugParts]=card.replace(/\.png$/,'').split('-');const slug=slugParts.join(' ');const title=slug.replace(/\b\w/g,letter=>letter.toUpperCase());return{number:Number(number),title:title==='Dream Card'?`Dream Card ${Number(number)}`:title}}
function openDeckGallery(){const ru=language==='ru';const dialog=$('#deckDialog');dialog.innerHTML=`<section class="deck-gallery"><button class="close" id="closeDeck" aria-label="${ru?'Закрыть':'Close'}">×</button><header><p class="eyebrow"><span></span><span>${ru?'Лунный архив':'The Moonlit Archive'}</span></p><h2>${ru?'Вся колода':'The full deck'}</h2><p>${ru?'102 карты для историй, ассоциаций и неожиданных совпадений. Нажми на карту, чтобы рассмотреть её.':'102 cards for stories, clues, and unexpected connections. Select a card to inspect it.'}</p></header><div class="deck-gallery-grid">${deckCards.map(card=>{const info=deckCardInfo(card);return`<button class="deck-gallery-card" data-card="${card}" aria-label="${ru?'Открыть карту':'Open card'} ${info.number}: ${info.title}"><img src="/deck-preview/${card}" alt="${info.title}"><span>${info.number}</span><strong>${info.title}</strong></button>`}).join('')}</div></section>`;dialog.showModal();$('#closeDeck').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()},{once:true});dialog.querySelectorAll('.deck-gallery-card').forEach(button=>button.addEventListener('click',()=>{const card=button.dataset.card;const info=deckCardInfo(card);openCardPreview({src:`/deck-preview/${card}`,alt:info.title,selected:false,onToggle:()=>{},kind:'gallery'})}))}
document.addEventListener('click',event=>{if(event.target.closest('#deckButton'))openDeckGallery()});
// A tab opened before multiplayer was enabled may still display its old local lobby.
if(document.querySelector('.lobby-page')&&document.body.textContent.includes('Демо-режим'))location.replace('/');
function addDeckSearch(){const dialog=$('#deckDialog');if(!dialog?.open||$('#deckSearch'))return;const ru=language==='ru';const search=document.createElement('input');search.id='deckSearch';search.type='search';search.placeholder=ru?'Найти карту по номеру или названию':'Find a card by number or name';search.setAttribute('aria-label',search.placeholder);search.style.cssText='width:100%;margin-top:18px;padding:12px 14px;border:1px solid #ffffff2a;border-radius:9px;background:#111630;color:#fff;font:14px DM Sans;outline:none';search.addEventListener('input',()=>{const query=search.value.trim().toLowerCase();document.querySelectorAll('.deck-gallery-card').forEach(card=>{card.hidden=Boolean(query)&&!card.textContent.toLowerCase().includes(query)})});dialog.querySelector('.deck-gallery header')?.append(search)}
const deckSearchObserver=new MutationObserver(()=>addDeckSearch());deckSearchObserver.observe(document.body,{childList:true,subtree:true});
const deckPreviewObserver=new MutationObserver(()=>{const preview=$('#cardPreviewDialog'),deck=$('#deckDialog');if(!preview||!deck?.open)return;const button=$('#previewChoose'),label=language==='ru'?'Закрыть':'Close';if(button&&button.textContent!==label)button.textContent=label});deckPreviewObserver.observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',event=>{if(!event.target.closest('#previewChoose')||!$('#deckDialog')?.open)return;event.preventDefault();event.stopImmediatePropagation();$('#cardPreviewDialog')?.close()},true);
function randomDeckHand(){if(liveGameContext)return liveHandCache;return [...deckCards].sort(()=>Math.random()-.5).slice(0,6)}
function updateLanguage(){const t=copy[language],meta=document.querySelector('meta[name="description"]'),ogTitle=document.querySelector('meta[property="og:title"]'),ogDescription=document.querySelector('meta[property="og:description"]'),siteMeta=language==='ru'?{title:'Luminaria — игра воображения',description:'Luminaria — онлайн-игра на ассоциации, тайные карты и воображение для 3–7 друзей.',ogDescription:'Придумай ассоциацию, выбери карту и найди историю, которую увидят друзья.'}:{title:'Luminaria — a game of imagination',description:'Luminaria is an online game of clues, secret cards, and imagination for 3–7 friends.',ogDescription:'Give a clue, choose a card, and find the story your friends can see.'};document.documentElement.lang=language;document.title=siteMeta.title;if(meta)meta.content=siteMeta.description;if(ogTitle)ogTitle.content=siteMeta.title;if(ogDescription)ogDescription.content=siteMeta.ogDescription;$('#languageToggle').textContent=language==='en'?'RU':'EN';document.querySelectorAll('[data-i18n]').forEach(n=>n.innerHTML=t[n.dataset.i18n]);document.querySelectorAll('[data-site-i18n]').forEach(n=>n.innerHTML=siteCopy[language][n.dataset.siteI18n]);$('#dialogTitle').textContent=t.welcome;$('#dialogText').textContent=t.pickName;$('#nicknameLabel').textContent=t.nickname;$('#nickname').placeholder=t.placeholder;$('#entrySubmit').innerHTML=`${t.continue} <b>→</b>`}
function openEntry(mode='play'){entryMode=mode;const t=copy[language];$('#dialogTitle').textContent=mode==='create'?t.roomWelcome:mode==='join'?t.joinWelcome:t.welcome;$('#dialogText').textContent=mode==='create'?t.roomText:mode==='join'?t.joinText:t.pickName;let codeInput=$('#roomCodeInput');if(mode==='join'&&!codeInput){const field=document.createElement('div');field.className='form-field room-code-field';field.innerHTML=`<label for="roomCodeInput">${language==='ru'?'Код комнаты':'Room code'}</label><input id="roomCodeInput" maxlength="6" placeholder="AB12CD" autocomplete="off" autocapitalize="characters">`;$('#nicknameLabel').before(field);codeInput=$('#roomCodeInput')}if(mode!=='join')codeInput?.closest('.room-code-field')?.remove();if(mode==='join'&&codeInput&&!codeInput.dataset.formatBound){codeInput.dataset.formatBound='true';codeInput.addEventListener('input',()=>{codeInput.value=codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6)})}const fromLink=new URLSearchParams(location.search).get('room');if(mode==='join'&&fromLink)codeInput.value=fromLink.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);entryDialog.showModal();setTimeout(()=>$('#nickname').focus(),100)}
function showLobby(player){const t=copy[language],code=Math.random().toString(36).slice(2,8).toUpperCase(),link=`${location.origin}?room=${code}`;document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="lobby-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><button class="language" id="lobbyLanguage">${language==='en'?'RU':'EN'}</button></nav><section class="lobby-hero"><div><p class="eyebrow"><span></span><span>${t.room} ${code}</span></p><h1>${t.waiting}<br><em>${t.players}.</em></h1><p class="lead">${t.gameDemo}</p></div><div class="lobby-orb">✦</div></section><section class="lobby-grid"><article class="lobby-panel players-panel"><div class="panel-title"><h2>${t.players}</h2><span class="count">1 / 7</span></div><div class="player-row"><span class="lobby-avatar">${player.avatar}</span><div><strong>${player.name}</strong><small>${t.host}</small></div><span class="status-dot"></span></div><div class="empty-seat"><span>+</span><p>${t.waiting}…</p></div><div class="empty-seat"><span>+</span><p>${t.waiting}…</p></div></article><article class="lobby-panel invite-panel"><span class="invite-icon">↗</span><h2>${t.invite}</h2><p>${t.shareHint}</p><div class="share-link"><span>${link}</span><button id="copyInvite">${t.copyLink}</button></div><div class="ready-line"><span class="ready-check" id="readyCheck">✓</span><span id="readyLabel">${t.notReady}</span></div><button class="primary-button full" id="readyButton">${t.ready} <b>→</b></button><button class="start-button" id="startButton" disabled>${t.start}</button></article></section></main>`;$('#copyInvite').addEventListener('click',async()=>{await navigator.clipboard?.writeText(link);$('#copyInvite').textContent=t.copied;setTimeout(()=>$('#copyInvite').textContent=t.copyLink,1500)});$('#readyButton').addEventListener('click',()=>{$('#readyCheck').classList.add('is-ready');$('#readyLabel').textContent=t.readyState;$('#readyButton').classList.add('is-ready');$('#readyButton').innerHTML=`✓ ${t.readyState}`;$('#startButton').disabled=false});$('#startButton').addEventListener('click',()=>$('#startButton').textContent=language==='ru'?'Скоро начнём…':'Starting soon…');$('#lobbyLanguage').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);showLobby(player)})}
$('#languageToggle').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);updateLanguage()});$('#playButton').addEventListener('click',()=>openEntry('create'));$('#createRoom').addEventListener('click',()=>openEntry('create'));$('#joinRoom').addEventListener('click',()=>openEntry('join'));$('#scrollRooms').addEventListener('click',()=>$('#rooms').scrollIntoView({behavior:'smooth'}));$('#rulesButton').addEventListener('click',()=>$('#rulesDialog').showModal());$('#closeRules').addEventListener('click',()=>$('#rulesDialog').close());document.querySelectorAll('.avatar-choice').forEach(b=>b.addEventListener('click',()=>{document.querySelector('.avatar-choice.selected').classList.remove('selected');b.classList.add('selected')}));updateLanguage();
$('#finalPlay')?.addEventListener('click',()=>openEntry('create'));$('#finalJoin')?.addEventListener('click',()=>openEntry('join'));
$('#archiveDeck')?.addEventListener('click',openDeckGallery);
function offerRoomJoinFromLink(){const code=new URLSearchParams(location.search).get('room');if(!code||$('#joinLinkedRoom'))return;const button=document.createElement('button');button.id='joinLinkedRoom';button.type='button';button.className='text-button';button.textContent=language==='ru'?`Войти в комнату ${code.toUpperCase()}`:`Join room ${code.toUpperCase()}`;button.addEventListener('click',()=>openEntry('join'));document.querySelector('.hero-actions')?.append(button)}
if(new URLSearchParams(location.search).get('room')){offerRoomJoinFromLink();setTimeout(()=>openEntry('join'),300)}
document.addEventListener('click',(event)=>{const button=event.target.closest('#readyButton');if(!button||liveGameContext||!button.classList.contains('is-ready'))return;event.stopImmediatePropagation();const t=copy[language];$('#readyCheck').classList.remove('is-ready');$('#readyLabel').textContent=t.notReady;button.classList.remove('is-ready');button.innerHTML=`${t.ready} <b>→</b>`;$('#startButton').disabled=true},true);
function legacyShowGame(){const player=JSON.parse(localStorage.getItem('luminaria-player')||'{"name":"Dreamer","avatar":"✦"}');const ru=language==='ru';const cards=randomDeckHand();document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="game-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Твой ход':'Your turn'}</div><button class="language" id="gameLanguage">${ru?'EN':'RU'}</button></nav><section class="game-stage"><div class="storyteller"><span class="lobby-avatar">${player.avatar}</span><div><strong>${player.name}</strong><small>${ru?'Ведущий':'Storyteller'}</small></div></div><p class="eyebrow"><span></span><span>${ru?'Твоя тайная карта':'Your secret card'}</span></p><article class="secret-card"><img src="/deck-preview/04-teapot-city.png" alt="Secret story card"><span>✦</span></article><div class="clue-box"><label for="clueInput">${ru?'Придумай ассоциацию':'Give a clue'}</label><input id="clueInput" maxlength="70" placeholder="${ru?'Например: «Мир внутри мира»':'For example: “A world within a world”'}"><button class="primary-button" id="revealButton">${ru?'Открыть выбор карт':'Reveal card choices'} <b>→</b></button></div></section><section class="hand-area"><div class="hand-heading"><div><p class="eyebrow"><span></span><span>${ru?'Выбери карту из руки':'Choose a card from your hand'}</span></p><h2>${ru?'Какая подходит к подсказке?':'Which card fits the clue?'}</h2></div><span class="hand-count">5</span></div><div class="game-hand">${cards.map((card,index)=>`<button class="hand-card" data-card="${index}" aria-label="${ru?'Выбрать карту':'Choose card'} ${index+1}"><img src="/deck-preview/${card}" alt="Game card ${index+1}"></button>`).join('')}</div></section></main>`;let selected=null;document.querySelectorAll('.hand-card').forEach(card=>card.addEventListener('click',()=>{if(card.classList.contains('selected')){card.classList.remove('selected');selected=null;return}document.querySelector('.hand-card.selected')?.classList.remove('selected');card.classList.add('selected');selected=card.dataset.card}));$('#revealButton').addEventListener('click',()=>{const clue=$('#clueInput').value.trim();if(!clue||selected===null){$('#clueInput').focus();return}$('#revealButton').innerHTML=ru?'Карты открыты ✓':'Cards revealed ✓';$('#revealButton').classList.add('is-ready');$('#clueInput').disabled=true;document.querySelectorAll('.hand-card').forEach(c=>c.disabled=true)});$('#gameLanguage').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);showGame()})}
document.addEventListener('click',(event)=>{const button=event.target.closest('#startButton');if(!button||button.disabled||liveGameContext)return;event.stopImmediatePropagation();showGame()},true);
function gameHand(cards,ru){return `<div class="game-hand">${cards.map(card=>{const info=deckCardInfo(card);return`<button class="hand-card" data-card="${info.number}" aria-label="${ru?'Выбрать карту':'Choose card'} ${info.number}: ${info.title}"><img src="/deck-preview/${card}" alt="${info.title}"></button>`}).join('')}</div>`}
function openCardPreview({src,alt,selected,onToggle,kind='card'}){const existing=$('#cardPreviewDialog');if(existing)existing.remove();const ru=language==='ru',viewOnly=kind==='view';const dialog=document.createElement('dialog');dialog.id='cardPreviewDialog';dialog.innerHTML=`<div class="card-preview-modal"><button class="close" id="closePreview">×</button><img src="${src}" alt="${alt}"><div class="preview-footer"><span>${viewOnly?(ru?'Карта открыта в полном размере.':'Card shown full size.'):(ru?'Рассмотри карту и реши, подходит ли она к ассоциации.':'Take a closer look, then decide whether it fits the clue.')}</span><button class="primary-button" id="previewChoose">${viewOnly?(ru?'Закрыть':'Close'):selected?(ru?'Отменить выбор':'Clear selection'):(kind==='vote'?(ru?'Выбрать для голоса':'Choose for vote'):(ru?'Выбрать карту':'Choose this card'))} ${viewOnly?'':'<b>→</b>'}</button></div></div>`;document.body.append(dialog);dialog.showModal();$('#closePreview').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});$('#previewChoose').addEventListener('click',()=>{if(!viewOnly)onToggle();dialog.close()})}
function bindCardSelection(){const handCountLabel=document.querySelector('.hand-count');if(handCountLabel)handCountLabel.textContent=document.querySelectorAll('.hand-card').length;let selected=null;const cards=[...document.querySelectorAll('.hand-card')];const toggle=card=>{if(card.classList.contains('selected')){card.classList.remove('selected');selected=null;return}cards.find(item=>item.classList.contains('selected'))?.classList.remove('selected');card.classList.add('selected');selected=card.dataset.card};cards.forEach(card=>card.addEventListener('click',()=>{const image=card.querySelector('img');openCardPreview({src:image.src,alt:image.alt,selected:card.classList.contains('selected'),onToggle:()=>toggle(card)})}));return()=>selected}
function showGuesser(storyteller,clue){const ru=language==='ru';const cards=randomDeckHand();document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="game-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Выберите карту':'Choose a card'}</div><button class="language" id="gameLanguage">${ru?'EN':'RU'}</button></nav><section class="guess-stage"><p class="eyebrow"><span></span><span>${ru?'Ассоциация ведущего':'Storyteller’s clue'}</span></p><div class="clue-reveal"><div class="storyteller"><span class="lobby-avatar">${storyteller.avatar}</span><div><strong>${storyteller.name}</strong><small>${ru?'Загадал(а) ассоциацию':'Gave a clue'}</small></div></div><blockquote>“${clue}”</blockquote></div><p class="guess-help">${ru?'Карта ведущего скрыта. Выбери одну из своих карт, которая лучше всего подходит к фразе.':'The storyteller’s card is hidden. Choose one card from your hand that best fits the clue.'}</p></section><section class="hand-area"><div class="hand-heading"><div><p class="eyebrow"><span></span><span>${ru?'Твоя рука':'Your hand'}</span></p><h2>${ru?'Выбери только одну карту':'Choose just one card'}</h2></div><span class="hand-count">5</span></div>${gameHand(cards,ru)}<button class="primary-button send-card" id="sendCard">${ru?'Отправить карту':'Send card'} <b>→</b></button></section></main>`;const getSelected=bindCardSelection();$('#sendCard').addEventListener('click',()=>{if(getSelected()===null)return;$('#sendCard').classList.add('is-ready');$('#sendCard').innerHTML=ru?'Карта отправлена ✓':'Card sent ✓';document.querySelectorAll('.hand-card').forEach(c=>c.disabled=true)});$('#gameLanguage').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);showGuesser(storyteller,clue)})}
function showGame(){const player=JSON.parse(localStorage.getItem('luminaria-player')||'{"name":"Dreamer","avatar":"✦"}');const ru=language==='ru';const cards=randomDeckHand();document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="game-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Твой ход':'Your turn'}</div><button class="language" id="gameLanguage">${ru?'EN':'RU'}</button></nav><section class="host-stage"><div class="storyteller"><span class="lobby-avatar">${player.avatar}</span><div><strong>${player.name}</strong><small>${ru?'Ведущий':'Storyteller'}</small></div></div><p class="eyebrow"><span></span><span>${ru?'Твой ход ведущего':'Your storyteller turn'}</span></p><h1>${ru?'Выбери карту<br>и <em>ассоциацию.</em>':'Choose a card<br>and a <em>clue.</em>'}</h1><p class="lead">${ru?'Остальные игроки увидят только твоё имя и фразу — выбранная карта останется тайной.':'Other players will see only your name and clue — your chosen card stays secret.'}</p><div class="clue-box"><label for="clueInput">${ru?'Твоя ассоциация':'Your clue'}</label><input id="clueInput" maxlength="70" placeholder="${ru?'Например: «Мир внутри мира»':'For example: “A world within a world”'}"><button class="primary-button" id="revealButton">${ru?'Начать выбор':'Start choosing'} <b>→</b></button></div></section><section class="hand-area"><div class="hand-heading"><div><p class="eyebrow"><span></span><span>${ru?'Твоя рука':'Your hand'}</span></p><h2>${ru?'Сначала выбери тайную карту':'First choose your secret card'}</h2></div><span class="hand-count">5</span></div>${gameHand(cards,ru)}</section></main>`;const getSelected=bindCardSelection();$('#revealButton').addEventListener('click',()=>{const clue=$('#clueInput').value.trim();if(!clue||getSelected()===null){$('#clueInput').focus();return}activeRoundClue=clue;$('#revealButton').innerHTML=ru?'Ассоциация отправлена ✓':'Clue sent ✓';$('#revealButton').classList.add('is-ready');$('#clueInput').disabled=true;document.querySelectorAll('.hand-card').forEach(c=>c.disabled=true)});$('#gameLanguage').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);showGame()})}
function showWaiting(){const player=JSON.parse(localStorage.getItem('luminaria-player')||'{"name":"Dreamer","avatar":"✦"}');const ru=language==='ru';document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="waiting-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Выбор карт':'Card selection'}</div><button class="language" id="waitLanguage">${ru?'EN':'RU'}</button></nav><section class="waiting-stage"><div class="waiting-stars">✦ ✧ ✦</div><p class="eyebrow"><span></span><span>${ru?'Ассоциация отправлена':'Clue sent'}</span></p><h1>${ru?'Игроки выбирают<br><em>свои карты.</em>':'Players are choosing<br><em>their cards.</em>'}</h1><p class="lead">${ru?'Твоя карта скрыта вместе с остальными. Когда все выберут — начнётся голосование.':'Your card is hidden among the others. When everyone has chosen, voting begins.'}</p><div class="waiting-players"><div><span>${player.avatar}</span><small>${player.name}</small><b>✓</b></div><div><span>☽</span><small>Mira</small><i></i></div><div><span>♢</span><small>Leo</small><i></i></div><div><span>☼</span><small>June</small><i></i></div></div><button class="primary-button demo-vote" id="voteDemo">${ru?'Показать результаты (демо)':'Show results (demo)'} <b>→</b></button></section></main>`;$('#voteDemo').addEventListener('click',()=>showResults());$('#waitLanguage').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);showWaiting()})}
function showVoting(storyteller,clue){const ru=language==='ru';const cards=['01-library-whale.png','03-mending-rain.png','04-teapot-city.png','08-cloud-bakery.png'];document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="voting-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Голосование':'Voting'}</div><button class="language" id="voteLanguage">${ru?'EN':'RU'}</button></nav><section class="vote-header"><div class="storyteller"><span class="lobby-avatar">${storyteller.avatar}</span><div><strong>${storyteller.name}</strong><small>${ru?'Ассоциация':'Clue'}</small></div></div><blockquote>“${clue}”</blockquote><p>${ru?'Нажми карту, чтобы открыть её крупно. Нельзя голосовать за свою карту.':'Open any card to inspect it closely. You cannot vote for your own card.'}</p></section><section class="vote-grid">${cards.map((card,index)=>`<button class="vote-card" data-vote="${index}" aria-label="${ru?'Открыть карту':'Open card'} ${index+1}"><img src="/deck-preview/${card}" alt="Voting card ${index+1}"><span>${ru?'Карта':'Card'} ${index+1}</span></button>`).join('')}</section><button class="primary-button cast-vote" id="castVote">${ru?'Подтвердить голос':'Confirm vote'} <b>→</b></button></main>`;let selected=null;const voteCards=[...document.querySelectorAll('.vote-card')];const toggle=card=>{if(card.classList.contains('selected')){card.classList.remove('selected');selected=null;return}voteCards.find(item=>item.classList.contains('selected'))?.classList.remove('selected');card.classList.add('selected');selected=card.dataset.vote};voteCards.forEach(card=>card.addEventListener('click',()=>{const image=card.querySelector('img');openCardPreview({src:image.src,alt:image.alt,selected:card.classList.contains('selected'),onToggle:()=>toggle(card),kind:'vote'})}));$('#castVote').addEventListener('click',()=>{if(selected===null)return;$('#castVote').classList.add('is-ready');$('#castVote').innerHTML=ru?'Голос отправлен ✓':'Vote sent ✓';document.querySelectorAll('.vote-card').forEach(c=>c.disabled=true)});$('#voteLanguage').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);showVoting(storyteller,clue)})}
document.addEventListener('click',(event)=>{const button=event.target.closest('#revealButton');if(button?.classList.contains('is-ready'))setTimeout(showWaiting,0)});
function legacyDemoOldResults(){const player=JSON.parse(localStorage.getItem('luminaria-player')||'{"name":"Dreamer","avatar":"✦"}');const ru=language==='ru';const cards=['01-library-whale.png','03-mending-rain.png','04-teapot-city.png','08-cloud-bakery.png'];const names=[['☽','Mira','+3'],['✶',player.name,'+1'],['♢','Leo','+0'],['☼','June','+3']];document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="results-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Результаты':'Results'}</div><button class="language" id="resultLanguage">${ru?'EN':'RU'}</button></nav><section class="result-head"><span class="result-star">✦</span><p class="eyebrow"><span></span><span>${ru?'Карты раскрыты':'Cards revealed'}</span></p><h1>${ru?'Вот что скрывалось<br>за <em>ассоциацией.</em>':'Here is what hid<br>behind the <em>clue.</em>'}</h1><p class="result-clue">“${ru?'Мир внутри мира':'A world within a world'}”</p></section><section class="reveal-grid">${cards.map((card,index)=>`<article class="reveal-card ${index===2?'correct':''}"><img src="/deck-preview/${card}" alt="Revealed card ${index+1}">${index===2?`<span class="correct-tag">✓ ${ru?'Карта ведущего':'Storyteller’s card'}</span>`:''}<small>${index===2?player.name:['Mira','Leo','June'][index]}</small></article>`).join('')}</section><section class="scores"><div class="panel-title"><h2>${ru?'Очки за раунд':'Round scores'}</h2><span class="count">${ru?'Раунд 1':'Round 1'}</span></div>${names.map((item,index)=>`<div class="score-row ${item[1]===player.name?'me':''}"><span class="score-avatar">${item[0]}</span><strong>${item[1]}</strong><em>${index===0?ru?'Угадала карту':'Guessed the card':index===1?ru?'За твою карту проголосовали':'Your card received a vote':ru?'Не угадал':'Did not guess'}</em><b>${item[2]}</b></div>`).join('')}<button class="primary-button next-round" id="nextRound">${ru?'Следующий раунд':'Next round'} <b>→</b></button></section></main>`;$('#nextRound').addEventListener('click',()=>showGame());$('#resultLanguage').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);showResults()})}
document.addEventListener('click',(event)=>{const button=event.target.closest('#castVote');if(button?.classList.contains('is-ready'))setTimeout(showResults,450)});
let uploadedAvatar=null;
$('#avatarUpload').addEventListener('change',(event)=>{const file=event.target.files?.[0];if(!file||!file.type.startsWith('image/'))return;const reader=new FileReader();reader.onload=()=>{uploadedAvatar=reader.result;const label=$('#avatarUploadLabel');label.style.backgroundImage=`url(${uploadedAvatar})`;label.classList.add('has-image')};reader.readAsDataURL(file)});
document.addEventListener('click',(event)=>{if(!event.target.closest('.avatar-choice'))return;uploadedAvatar=null;const label=$('#avatarUploadLabel');label.style.backgroundImage='';label.classList.remove('has-image')},true);
$('#entryForm').addEventListener('submit',async event=>{event.preventDefault();event.stopImmediatePropagation();const nickname=$('#nickname'),name=nickname.value.trim().replace(/\s+/g,' '),codeInput=$('#roomCodeInput');if(name.length<2){nickname.setCustomValidity(language==='ru'?'Ник должен содержать минимум 2 символа.':'Nickname must contain at least 2 characters.');nickname.reportValidity();nickname.focus();return}nickname.value=name;nickname.setCustomValidity('');if(entryMode==='join'&&!/^[A-Z0-9]{6}$/.test(codeInput?.value.trim().toUpperCase()||'')){codeInput?.setCustomValidity(language==='ru'?'Введите шестизначный код комнаты.':'Enter a six-character room code.');codeInput?.reportValidity();codeInput?.focus();return}codeInput?.setCustomValidity('');const player={name,avatar:uploadedAvatar?`<img src="${uploadedAvatar}" alt="">`:$('.avatar-choice.selected').textContent};localStorage.setItem('luminaria-player',JSON.stringify(player));entryDialog.close();await startRoomFlow(player)},true);
function addDeckSelector(){const ru=language==='ru';const grid=$('.lobby-grid');if(!grid)return;grid.insertAdjacentHTML('beforeend',`<article class="lobby-panel deck-panel"><div class="panel-title"><div><p class="eyebrow"><span></span><span>${ru?'Колода комнаты':'Room deck'}</span></p><h2>${ru?'Выбери настроение игры':'Choose the mood'}</h2></div><span class="deck-count">${deckCards.length} ${ru?'карты':'cards'}</span></div><div class="deck-list"><button class="deck-choice selected"><span class="deck-art moon-deck">☾</span><span><strong>${ru?'Лунный Архив':'The Moonlit Archive'}</strong><small>${ru?`Базовая колода · ${deckCards.length} волшебные истории`:`Core deck · ${deckCards.length} enchanted stories`}</small></span><b>${ru?'Бесплатно':'Free'}</b></button><button class="deck-choice locked" disabled><span class="deck-art ember-deck">✦</span><span><strong>${ru?'Янтарные сны':'Amber Dreams'}</strong><small>${ru?'Премиум-колода · скоро':'Premium deck · coming soon'}</small></span><b>🔒</b></button><button class="deck-choice locked" disabled><span class="deck-art forest-deck">♧</span><span><strong>${ru?'Шёпот чащи':'Whispers of the Wildwood'}</strong><small>${ru?'Премиум-колода · скоро':'Premium deck · coming soon'}</small></span><b>🔒</b></button></div></article>`)}
const originalShowLobby=showLobby;showLobby=function(player){originalShowLobby(player);addDeckSelector()};
async function addAuthButton(){if($('#authEntry'))return;const session=(await supabase.auth.getSession()).data.session,signedIn=Boolean(session&&!session.user?.is_anonymous);const button=document.createElement('button');button.type='button';button.id='authEntry';button.className='ghost-button auth-entry';button.textContent=signedIn?(session.user.user_metadata?.nickname||session.user.email||'Profile'):(language==='ru'?'Авторизоваться':'Sign in');button.addEventListener('click',openAuth);const actions=document.querySelector('.nav-actions');if(actions)actions.prepend(button);else $('.nav')?.insertBefore(button,$('.nav .language'))}
async function openAuth(){const existing=$('#authDialog');if(existing)existing.remove();const ru=language==='ru';const session=(await supabase.auth.getSession()).data.session,signedIn=Boolean(session&&!session.user?.is_anonymous);const dialog=document.createElement('dialog');dialog.id='authDialog';dialog.innerHTML=signedIn?`<div class="modal auth-modal"><button class="close" id="closeAuth">×</button><span class="modal-star">✦</span><h2>${ru?'Профиль сохранён':'Profile saved'}</h2><p>${session.user.email||''}</p><p class="auth-note">${ru?'Твой ник, язык и будущая статистика будут привязаны к этому аккаунту.':'Your nickname, language, and future stats will be linked to this account.'}</p><button class="primary-button full" id="signOut">${ru?'Выйти из аккаунта':'Sign out'}</button></div>`:`<div class="modal auth-modal"><button class="close" id="closeAuth">×</button><span class="modal-star">✦</span><h2>${ru?'Сохрани профиль':'Save your profile'}</h2><p>${ru?'Играть можно и без аккаунта. Вход сохранит твой профиль на других устройствах.':'You can play as a guest. Signing in saves your profile across devices.'}</p><button class="google-button" id="googleSignIn"><span>G</span>${ru?'Продолжить с Google':'Continue with Google'}</button><div class="auth-divider"><span>${ru?'или':'or'}</span></div><label class="auth-label" for="authEmail">${ru?'Войти по email':'Sign in with email'}</label><input id="authEmail" type="email" placeholder="you@example.com" autocomplete="email"><button class="primary-button full" id="emailSignIn">${ru?'Отправить ссылку для входа':'Send sign-in link'} <b>→</b></button><small class="auth-note">${ru?'Мы отправим безопасную ссылку на твой email — пароль не нужен.':'We’ll send a secure sign-in link — no password needed.'}</small></div>`;document.body.append(dialog);dialog.showModal();$('#closeAuth').addEventListener('click',()=>dialog.close());if(signedIn){$('#signOut').addEventListener('click',async()=>{const {error}=await supabase.auth.signOut();if(error)return alert(error.message);localStorage.removeItem('luminaria-player');sessionStorage.removeItem(`luminaria-profile-dismissed-${session.user.id}`);if($('#nickname'))$('#nickname').value='';document.querySelector('.avatar-choice.selected')?.classList.remove('selected');document.querySelector('.avatar-choice')?.classList.add('selected');dialog.close();$('#authEntry')?.remove();addAuthButton()});return}$('#googleSignIn').addEventListener('click',async()=>{const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin}});if(error)alert(error.message)});$('#emailSignIn').addEventListener('click',async()=>{const email=$('#authEmail').value.trim();if(!email)return $('#authEmail').focus();const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin}});if(error){alert(error.message);return}$('#emailSignIn').innerHTML=ru?'Проверь почту ✓':'Check your inbox ✓';$('#emailSignIn').classList.add('is-ready')})}
async function openProfileSetup(session){if($('#profileSetupDialog'))return;const ru=language==='ru';const dialog=document.createElement('dialog');dialog.id='profileSetupDialog';const suggested=(session.user.user_metadata?.full_name||session.user.user_metadata?.name||'').split(' ')[0];dialog.innerHTML=`<form class="modal auth-modal profile-setup" id="profileSetupForm"><button type="button" class="close" id="closeProfileSetup" aria-label="${ru?'Закрыть':'Close'}">×</button><span class="modal-star">✦</span><h2>${ru?'Создай свой профиль':'Create your profile'}</h2><p>${ru?'Придумай ник и выбери аватар — они будут видны игрокам за столом.':'Choose a nickname and avatar — other players will see them at the table.'}</p><label class="auth-label" for="profileNickname">${ru?'Никнейм':'Nickname'}</label><input id="profileNickname" maxlength="24" value="${suggested}" placeholder="${ru?'Лунный странник':'Moonwalker'}" autocomplete="nickname" required><p class="avatar-title">${ru?'Аватар':'Avatar'}</p><div class="profile-avatar-grid"><button type="button" class="profile-avatar selected">☽</button><button type="button" class="profile-avatar">✦</button><button type="button" class="profile-avatar">☼</button><button type="button" class="profile-avatar">♢</button><button type="button" class="profile-avatar">☁</button><label class="profile-upload" id="profileUploadLabel" title="${ru?'Загрузить фото':'Upload photo'}"><input id="profileAvatarUpload" type="file" accept="image/*" hidden>＋</label></div><button class="primary-button full" type="submit">${ru?'Сохранить профиль':'Save profile'} <b>→</b></button><small class="auth-note">${ru?'Фото пока сохраняется в профиле; выбранный символ — в аккаунте.':'A photo is saved in your profile; the selected symbol is saved to your account.'}</small></form>`;document.body.append(dialog);dialog.showModal();const dismiss=()=>{sessionStorage.setItem(`luminaria-profile-dismissed-${session.user.id}`,'1');dialog.close();dialog.remove()};$('#closeProfileSetup').addEventListener('click',dismiss);dialog.addEventListener('cancel',event=>{event.preventDefault();dismiss()});let avatar='☽',uploaded=null;dialog.querySelectorAll('.profile-avatar').forEach(button=>button.addEventListener('click',()=>{dialog.querySelector('.profile-avatar.selected')?.classList.remove('selected');button.classList.add('selected');avatar=button.textContent;uploaded=null;const label=$('#profileUploadLabel');label.style.backgroundImage='';label.classList.remove('has-image')}));$('#profileAvatarUpload').addEventListener('change',event=>{const file=event.target.files?.[0];if(!file||!file.type.startsWith('image/'))return;const reader=new FileReader();reader.onload=()=>{uploaded=reader.result;const label=$('#profileUploadLabel');label.style.backgroundImage=`url(${uploaded})`;label.classList.add('has-image');dialog.querySelector('.profile-avatar.selected')?.classList.remove('selected')};reader.readAsDataURL(file)});$('#profileSetupForm').addEventListener('submit',async event=>{event.preventDefault();const name=$('#profileNickname').value.trim();if(!name)return;const player={name,avatar:uploaded?`<img src="${uploaded}" alt="">`:avatar};localStorage.setItem('luminaria-player',JSON.stringify(player));const {error}=await supabase.auth.updateUser({data:{nickname:name,avatar:avatar}});if(error){alert(error.message);return}sessionStorage.removeItem(`luminaria-profile-dismissed-${session.user.id}`);dialog.close();dialog.remove();$('#authEntry')?.remove();addAuthButton()})}
async function syncAuthProfile(session){if(!session)return;$('#authEntry')?.remove();addAuthButton();if(!session.user.user_metadata?.nickname)openProfileSetup(session)}
supabase.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>syncAuthProfile(session),0)});
const lobbyWithDecks=showLobby;showLobby=function(player){lobbyWithDecks(player);addAuthButton()};
addAuthButton();

let liveRoomChannel=null;
function makeRoomCode(){return Array.from(crypto.getRandomValues(new Uint32Array(6)),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('')}
function safeAvatar(player){const value=player.avatar||'☽';const image=value.match?.(/src="(data:image\/[^\"]+)"/i)?.[1];const candidate=image||value;return typeof candidate==='string'&&candidate.startsWith('data:image/')?(candidate.length<=60000?candidate:'☽'):candidate}
function avatarMarkup(value, fallback='☽'){const avatar=safeAvatar({avatar:value||fallback});return typeof avatar==='string'&&avatar.startsWith('data:image/')?`<img src="${avatar}" alt="">`:avatar}
function avatarDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(reader.error);reader.onload=()=>resolve(String(reader.result));reader.readAsDataURL(file)})}
async function compressAvatar(file){const source=await avatarDataUrl(file);const image=await new Promise((resolve,reject)=>{const value=new Image();value.onload=()=>resolve(value);value.onerror=()=>reject(new Error('Could not read image'));value.src=source});for(const [maxSide,quality] of [[160,.7],[128,.65],[96,.6]]){const ratio=Math.min(1,maxSide/Math.max(image.naturalWidth||maxSide,image.naturalHeight||maxSide));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round((image.naturalWidth||maxSide)*ratio));canvas.height=Math.max(1,Math.round((image.naturalHeight||maxSide)*ratio));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const result=canvas.toDataURL('image/jpeg',quality);if(result.length<=60000)return result}return null}
async function ensureLivePlayer(player){player.avatar=safeAvatar(player);let {data:{session}}=await supabase.auth.getSession();if(!session){const {data,error}=await supabase.auth.signInAnonymously();if(error)throw error;session=data.session}const {error}=await supabase.from('profiles').upsert({id:session.user.id,nickname:player.name,avatar:player.avatar},{onConflict:'id'});if(error)throw error;return session}
async function startRoomFlow(player){try{const session=await ensureLivePlayer(player);if(entryMode==='create')return createLiveRoom(player,session);if(entryMode==='join'){const code=$('#roomCodeInput')?.value.trim().toUpperCase();return joinLiveRoom(player,session,code)}return createLiveRoom(player,session)}catch(error){console.error(error);const message=error.message?.includes('Anonymous')?(language==='ru'?'Для гостевой игры включи Anonymous Sign-ins в Supabase → Authentication → Sign In / Providers.':'Enable Anonymous Sign-ins in Supabase → Authentication → Sign In / Providers to play as a guest.'):error.message;alert(message||'Could not connect to Luminaria.');if(!entryDialog.open)entryDialog.showModal()}}

const openEntryWithoutSavedProfile=openEntry;
let openingSavedRoom=false;
openEntry=async function(mode='play'){
  const session=(await supabase.auth.getSession()).data.session;
  const hasSavedAccount=Boolean(session&&!session.user?.is_anonymous);
  let player=null;
  if(hasSavedAccount){try{player=JSON.parse(localStorage.getItem('luminaria-player')||'null')}catch{}}
  else localStorage.removeItem('luminaria-player');
  const linkedCode=new URLSearchParams(location.search).get('room')?.trim().toUpperCase();
  if(player?.name&&!openingSavedRoom&&(mode==='create'||mode==='play')){
    entryMode='create';openingSavedRoom=true;
    Promise.resolve(startRoomFlow(player)).finally(()=>{openingSavedRoom=false});
    return;
  }
  if(player?.name&&!openingSavedRoom&&mode==='join'&&linkedCode){
    openingSavedRoom=true;
    ensureLivePlayer(player).then(session=>joinLiveRoom(player,session,linkedCode)).catch(error=>{console.error(error);alert(error.message||'Could not join this room.')}).finally(()=>{openingSavedRoom=false});
    return;
  }
  openEntryWithoutSavedProfile(mode);
  if($('#nickname'))$('#nickname').value=player?.name||'';
};

document.addEventListener('click',event=>{const button=event.target.closest('#revealButton');if(!button?.classList.contains('is-ready'))return;const image=document.querySelector('.hand-card.selected img');if(image)activeStorytellerCard=image.src.split('/').pop()});
function showResults(){const player=JSON.parse(localStorage.getItem('luminaria-player')||'{"name":"Dreamer","avatar":"✦"}');const ru=language==='ru';const defaultCards=['01-library-whale.png','03-mending-rain.png','04-teapot-city.png','08-cloud-bakery.png'];const cards=activeStorytellerCard?[activeStorytellerCard,...defaultCards.filter(card=>card!==activeStorytellerCard)].slice(0,4):defaultCards;const correctIndex=0;const otherNames=['Mira','Leo','June'];let otherIndex=0;const owners=cards.map((card,index)=>index===correctIndex?player.name:otherNames[otherIndex++]);const scores=[[player.name,'+5',ru?'Базовые +3 и +2 за двух угадавших':'Base +3 and +2 for two correct guesses'],['Mira','+3',ru?'Угадала карту ведущего':'Guessed the storyteller’s card'],['Leo','+0',ru?'Не угадал':'Did not guess'],['June','+3',ru?'Два голоса за её карту + бонус «Созвездие»':'Two votes for her card + Constellation bonus']];document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="results-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Результаты':'Results'}</div><button class="language" id="resultLanguage">${ru?'EN':'RU'}</button></nav><section class="result-head"><span class="result-star">✦</span><p class="eyebrow"><span></span><span>${ru?'Карты раскрыты':'Cards revealed'}</span></p><h1>${ru?'Вот что скрывалось<br>за <em>ассоциацией.</em>':'Here is what hid<br>behind the <em>clue.</em>'}</h1><p class="result-clue">“${activeRoundClue||(ru?'Твоя ассоциация':'Your clue')}”</p></section><section class="reveal-grid">${cards.map((card,index)=>`<article class="reveal-card ${index===correctIndex?'correct':''}"><img src="/deck-preview/${card}" alt="Revealed card ${index+1}">${index===correctIndex?`<span class="correct-tag">✓ ${ru?'Карта ведущего':'Storyteller’s card'}</span>`:''}<small>${owners[index]}</small></article>`).join('')}</section><section class="scores"><div class="panel-title"><h2>${ru?'Очки за раунд':'Round scores'}</h2><span class="count">${ru?'Раунд 1':'Round 1'}</span></div>${scores.map((item,index)=>`<div class="score-row ${index===0?'me':''}"><span class="score-avatar">${index===0?'✦':['☽','♢','☼'][index-1]}</span><strong>${item[0]}</strong><em>${item[2]}</em><b>${item[1]}</b></div>`).join('')}<button class="primary-button next-round" id="nextRound">${ru?'Следующий раунд':'Next round'} <b>→</b></button></section></main>`;$('#nextRound').addEventListener('click',()=>{activeRoundClue='';activeStorytellerCard='';showGame()});$('#resultLanguage').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);showResults()})}
let liveGameContext=null,liveRound=null,liveRoundChannel=null,liveHandVersion=0,liveStorytellerId=null,liveRoundNumber=1,liveRoundNumberForId=null,liveTotalRounds=0;
let liveHandCache=[];
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
showLiveLobby=function(room,player,session){liveGameContext={room,player,session};if(room.status==='playing')return showGame();if(room.status==='finished'){watchLiveRound();return showGameFinished()}return renderLiveLobby(room,player,session)};
function nextRoundStorageKey(){return `luminaria-next-round-${liveGameContext.room.id}`}
async function loadLiveRound(){
  if(!liveGameContext)return null;
  const {data,error}=await supabase.from('rounds').select('*').eq('room_id',liveGameContext.room.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(error)throw error;
  let pending=null;
  try{pending=JSON.parse(localStorage.getItem(nextRoundStorageKey())||'null')}catch{}
  if(data?.phase==='results'&&pending?.completedRoundId===data.id){
    liveStorytellerId=pending.storytellerId;
    liveHandVersion=data.id;
    liveRound=null;
    return null;
  }
  if(data&&pending&&data.id!==pending.completedRoundId)localStorage.removeItem(nextRoundStorageKey());
  liveRound=data;
  if(data){
    liveStorytellerId=data.storyteller_id;
    if(data.id!==liveRoundNumberForId){
      const {count}=await supabase.from('rounds').select('*',{count:'exact',head:true}).eq('room_id',liveGameContext.room.id);
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
function showLiveRoundWaiting(){const ru=language==='ru',context=liveGameContext;document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="waiting-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Ожидание':'Waiting'}</div></nav><section class="waiting-stage"><div class="waiting-stars">✦ ✧ ✦</div><p class="eyebrow"><span></span><span>${ru?'Комната в игре':'Room is live'}</span></p><h1>${ru?'Ведущий выбирает<br><em>ассоциацию.</em>':'The storyteller is choosing<br><em>a clue.</em>'}</h1><p class="lead">${ru?'Как только ассоциация появится, ты сможешь выбрать и отправить карту из своей руки.':'As soon as the clue appears, you can choose and submit a card from your hand.'}</p><div class="waiting-players"><div><span>${avatarMarkup(context.player.avatar)}</span><small>${context.player.name}</small><i></i></div></div></section><section class="waiting-score" id="waitingScore"></section></main>`;updateLivePhaseProgress().catch(console.error);addWaitingScoreboard().catch(console.error)}
async function addWaitingScoreboard(){if(!liveGameContext)return;const host=$('#waitingScore');if(!host)return;const ru=language==='ru',roster=await loadLiveRoster(liveGameContext.room.id);if(!host.isConnected)return;host.innerHTML=`<div class="panel-title"><h2>${ru?'Общий счёт':'Total score'}</h2><span class="count">${ru?'Раунд':'Round'} ${liveRoundNumber}</span></div>${[...roster].sort((a,b)=>b.score-a.score).map((seat,index)=>`<div class="score-row ${seat.user_id===liveGameContext.session.user.id?'me':''}"><span class="score-avatar">${avatarMarkup(seat.profile?.avatar,['✦','☽','♢','☼'][index%4])}</span><strong>${seat.profile?.nickname||'Dreamer'}</strong><em>${index===0?(ru?'Лидер':'Leading'):(ru?'За столом':'At the table')}</em><b>${seat.score}</b></div>`).join('')}`}
async function updateLivePhaseProgress(round=liveRound){
  if(!liveGameContext||!round||!['submitting','voting'].includes(round.phase))return;
  const {data,error}=await supabase.rpc('luminaria_round_progress',{target_round_id:round.id}).single();
  if(error)throw error;
  const host=document.querySelector(round.phase==='voting'?'.vote-header':'.waiting-stage,.guess-stage,.host-stage');
  if(!host)return;
  let progress=$('#livePhaseProgress');
  if(!progress){progress=document.createElement('p');progress.id='livePhaseProgress';progress.className='lead';host.append(progress)}
  progress.textContent=round.phase==='submitting'
    ?(language==='ru'?`Карты выбраны: ${data.submission_count} из ${data.participant_count}`:`Cards chosen: ${data.submission_count} of ${data.participant_count}`)
    :(language==='ru'?`Голоса поданы: ${data.vote_count} из ${Math.max(0,data.participant_count-1)}`:`Votes cast: ${data.vote_count} of ${Math.max(0,data.participant_count-1)}`);
}
async function routeLiveRound(){const round=await loadLiveRound();if(!round)return showLiveRoundWaiting();const context=liveGameContext;if(round.phase==='submitting'&&round.storyteller_id!==context.session.user.id){const {data:storyteller}=await supabase.from('profiles').select('nickname,avatar').eq('id',round.storyteller_id).single();return demoShowGuesser({name:storyteller?.nickname||'Storyteller',avatar:storyteller?.avatar||'✦'},round.clue)}showLiveRoundWaiting()}
async function showLiveVoting(round){
  const ru=language==='ru',context=liveGameContext;
  const {data:submissions,error}=await supabase.from('card_submissions').select('id,card_id,player_id').eq('round_id',round.id);
  if(error)throw error;
  const isStoryteller=round.storyteller_id===context.session.user.id;
  const roster=await loadLiveRoster(round.room_id);
  const name=id=>roster.find(seat=>seat.user_id===id)?.profile?.nickname||'Dreamer';
  const visibleSubmissions=isStoryteller?submissions:submissions.filter(submission=>submission.player_id!==context.session.user.id);
  document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="voting-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Голосование':'Voting'}</div></nav><section class="vote-header"><p class="eyebrow"><span></span><span>${ru?'Ассоциация ведущего':'Storyteller’s clue'}</span></p><blockquote>“${round.clue}”</blockquote><p>${isStoryteller?(ru?'Игроки голосуют. Нажми на любую карту, чтобы открыть её крупно.':'Players are voting. Select any card to inspect it full screen.'):ru?'Нажми на карту, чтобы открыть её крупно и выбрать для голоса. Твоя карта скрыта.':'Select a card to inspect it full screen and choose it for your vote. Your own card is hidden.'}</p></section><section class="vote-grid">${visibleSubmissions.map((submission,index)=>`<button class="vote-card ${isStoryteller?'storyteller-card':''}" data-submission="${submission.id}"><img src="/deck-preview/${submission.card_id}" alt="${ru?'Карта':'Card'} ${index+1}"><span>${isStoryteller?name(submission.player_id):`${ru?'Карта':'Card'} ${index+1}`}</span></button>`).join('')}</section>${isStoryteller?`<p class="lead">${ru?'Голосование завершится автоматически, когда все игроки сделают выбор.':'Voting will finish automatically when every player has voted.'}</p>`:`<button class="primary-button cast-vote" id="castLiveVote">${ru?'Подтвердить голос':'Confirm vote'} <b>→</b></button>`}</main>`;
  updateLivePhaseProgress(round).catch(console.error);
  let selected=null;
  const voteCards=[...document.querySelectorAll('.vote-card')];
  const toggle=card=>{if(isStoryteller)return;document.querySelector('.vote-card.selected')?.classList.remove('selected');card.classList.add('selected');selected=card.dataset.submission};
  voteCards.forEach(card=>card.addEventListener('click',()=>{const image=card.querySelector('img');openCardPreview({src:image.src,alt:image.alt,selected:card.classList.contains('selected'),onToggle:()=>toggle(card),kind:isStoryteller?'view':'vote'})}));
  if(isStoryteller)return;
  $('#castLiveVote').addEventListener('click',async()=>{
    if(!selected)return;
    const castButton=$('#castLiveVote');
    castButton.disabled=true;
    const {error}=await supabase.from('votes').insert({round_id:round.id,voter_id:context.session.user.id,submission_id:selected});
    if(error){castButton.disabled=false;return alert(error.message)}
    document.querySelectorAll('.vote-card').forEach(card=>card.disabled=true);
    castButton.classList.add('is-ready');
    castButton.textContent=ru?'Голос отправлен ✓':'Vote sent ✓';
  })
}
routeLiveRound=async function(){const round=await loadLiveRound();if(!round)return showLiveRoundWaiting();const context=liveGameContext;if(round.phase==='voting')return showLiveVoting(round);if(round.phase==='submitting'&&round.storyteller_id!==context.session.user.id){const {data:storyteller}=await supabase.from('profiles').select('nickname,avatar').eq('id',round.storyteller_id).single();return demoShowGuesser({name:storyteller?.nickname||'Storyteller',avatar:storyteller?.avatar||'✦'},round.clue)}showLiveRoundWaiting()};
async function showLiveResults(round){
  const ru=language==='ru';
  const [{data:submissions,error:submissionError},{data:votes,error:voteError}]=await Promise.all([supabase.from('card_submissions').select('id,card_id,player_id').eq('round_id',round.id),supabase.from('votes').select('submission_id,voter_id').eq('round_id',round.id)]);
  if(submissionError||voteError)throw submissionError||voteError;
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
  document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="results-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><div class="game-round">${ru?'Раунд':'Round'} <b>1</b> <span>•</span> ${ru?'Результаты':'Results'}</div></nav><section class="result-head"><span class="result-star">✦</span><p class="eyebrow"><span></span><span>${ru?'Карты раскрыты':'Cards revealed'}</span></p><h1>${ru?'Вот что скрывалось<br>за <em>ассоциацией.</em>':'Here is what hid<br>behind the <em>clue.</em>'}</h1><p class="result-clue">“${round.clue}”</p></section><section class="reveal-grid">${submissions.map(submission=>`<article class="reveal-card ${submission.id===storytellerCard?.id?'correct':''}"><img src="/deck-preview/${submission.card_id}" alt="${ru?'Карта':'Card'}">${submission.id===storytellerCard?.id?`<span class="correct-tag">✓ ${ru?'Карта ведущего':'Storyteller’s card'}</span>`:''}<small>${name(submission.player_id)}</small></article>`).join('')}</section><section class="scores"><div class="panel-title"><h2>${ru?'Итог раунда':'Round result'}</h2><span class="count">${correctVotes} ${ru?'угадали':'guessed correctly'}</span></div>${roster.map((seat,index)=>`<div class="score-row ${seat.user_id===round.storyteller_id?'me':''}"><span class="score-avatar">${avatarMarkup(seat.profile?.avatar,['✦','☽','♢','☼'][index%4])}</span><strong>${name(seat.user_id)}</strong><em>${explanationFor(seat)}</em><b>+${pointsFor(seat)}</b></div>`).join('')}</section></main>`
  if(nextStoryteller){const notice=document.createElement('p');notice.className='next-storyteller';notice.textContent=ru?`Следующий ведущий — ${nextStoryteller.profile?.nickname||'Мечтатель'}`:`Next storyteller — ${nextStoryteller.profile?.nickname||'Dreamer'}`;$('.scores')?.append(notice)}
}
routeLiveRound=async function(){const {data:roomState}=await supabase.from('rooms').select('status').eq('id',liveGameContext.room.id).maybeSingle();if(roomState?.status==='finished')return showGameFinished();await loadLiveDeckProgress();const round=await loadLiveRound();if(!round)return showLiveRoundWaiting();const context=liveGameContext;await loadLiveHand();if(round.phase==='results')return showLiveResults(round);if(round.phase==='voting')return showLiveVoting(round);if(round.phase==='submitting'&&round.storyteller_id!==context.session.user.id){const {data:storyteller}=await supabase.from('profiles').select('nickname,avatar').eq('id',round.storyteller_id).single();return demoShowGuesser({name:storyteller?.nickname||'Storyteller',avatar:storyteller?.avatar||'✦'},round.clue)}showLiveRoundWaiting()};
async function watchLiveRound(){if(!liveGameContext)return;liveRoundChannel?.unsubscribe();const roomId=liveGameContext.room.id;liveRoundChannel=supabase.channel(`round-${roomId}`).on('postgres_changes',{event:'*',schema:'public',table:'rounds',filter:`room_id=eq.${roomId}`},()=>routeLiveRound()).on('postgres_changes',{event:'*',schema:'public',table:'card_submissions'},()=>advanceLiveRound()).on('postgres_changes',{event:'*',schema:'public',table:'votes'},()=>advanceLiveRound()).on('postgres_changes',{event:'UPDATE',schema:'public',table:'rooms',filter:`id=eq.${roomId}`},payload=>{liveGameContext.room=payload.new;if(payload.new.status==='lobby')showLiveLobby(payload.new,liveGameContext.player,liveGameContext.session);else routeLiveRound()}).subscribe()}
let advancingRound=false;
async function advanceLiveRound(){
  if(!liveGameContext||advancingRound)return;
  advancingRound=true;
  try {
    const round=await loadLiveRound();
    if(!round||round.phase==='results'||round.storyteller_id!==liveGameContext.session.user.id)return;
    const {data:progress,error}=await supabase.rpc('luminaria_round_progress',{target_round_id:round.id}).single();
    if(error)throw error;
    if(round.phase==='submitting'&&progress.participant_count>1&&progress.submission_count>=progress.participant_count){
      const {error}=await supabase.from('rounds').update({phase:'voting'}).eq('id',round.id).eq('phase','submitting').select().single();
      if(error)throw error;
    }
    if(round.phase==='voting'&&progress.participant_count>1&&progress.vote_count>=progress.participant_count-1){
      const {error}=await supabase.rpc('finalize_luminaria_round',{target_round_id:round.id});
      if(error)throw error;
    }
  } finally { advancingRound=false; }
}
// Private card inserts are not visible to the storyteller through Realtime.
// Recover progress independently of those notifications without resetting a hand.
let roundSyncBusy=false;
setInterval(async()=>{
  if(!liveGameContext||roundSyncBusy||document.querySelector('.lobby-page'))return;
  roundSyncBusy=true;
  try {
    const previous=liveRound?`${liveRound.id}:${liveRound.phase}`:null;
    await advanceLiveRound();
    const round=await loadLiveRound();
    const current=round?`${round.id}:${round.phase}`:null;
    if(current&&current!==previous&&!preparingNextRound)await routeLiveRound();
    if(round&&document.querySelector('.waiting-stage')){
      const ru=language==='ru';
      document.querySelector('.waiting-stage h1').textContent=round.phase==='voting'?(ru?'Игроки голосуют.':'Players are voting.'):(ru?'Ждём карты остальных игроков.':'Waiting for the other players’ cards.');
      document.querySelector('.waiting-stage .lead').textContent=ru?'Следующий этап откроется автоматически.':'The next stage will open automatically.';
    }
    if(round)await updateLivePhaseProgress(round);
    document.querySelector('#roundSyncError')?.remove();
  } catch(error){
    console.error('Round synchronization failed',error);
    let notice=document.querySelector('#roundSyncError');
    if(!notice){notice=document.createElement('p');notice.id='roundSyncError';notice.setAttribute('role','alert');document.querySelector('main')?.append(notice)}
    notice.textContent=`${language==='ru'?'Не удалось обновить раунд':'Could not sync the round'}: ${error.message||'Connection error'}`;
  } finally {roundSyncBusy=false}
},2000);
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
    if((liveStorytellerId||liveGameContext.room.host_id)===liveGameContext.session.user.id)return demoShowGame();
    showLiveRoundWaiting();
  }catch(error){
    console.error('Could not open live game',error);
    alert(error.message||'Could not open the game.');
  }finally{openingLiveGame=false}
};
// Realtime may be delayed on a freshly connected browser. Polling keeps the lobby
// in sync and lets invitees enter an already started room without reloading.
setInterval(async()=>{if(!liveGameContext||!document.querySelector('.lobby-page'))return;const {data}=await supabase.from('rooms').select('status').eq('id',liveGameContext.room.id).maybeSingle();if(data?.status==='playing')showGame()},1500);
// Persist the start before changing the host's screen, so every guest observes the same phase.
let startingLiveGame=false;
function requestWithTimeout(request,timeout=15000){return Promise.race([request,new Promise((_,reject)=>setTimeout(()=>reject(new Error(language==='ru'?'Сервер слишком долго готовит колоду. Попробуй ещё раз.':'The server is taking too long to prepare the deck. Please try again.')),timeout))])}
function suspendLobbyObservers(){[moonPhaseObserver,deckSearchObserver,deckPreviewObserver,leaveLobbyObserver,avatarObserver].forEach(observer=>observer.disconnect())}
document.addEventListener('click',async event=>{const button=event.target.closest('#startButton');const context=liveGameContext;if(!button||button.disabled||startingLiveGame||!context||context.room.host_id!==context.session.user.id)return;event.preventDefault();event.stopImmediatePropagation();suspendLobbyObservers();startingLiveGame=true;button.disabled=true;button.textContent=language==='ru'?'Готовим колоду…':'Preparing the deck…';try{const shuffled=[...deckCards].sort(()=>Math.random()-.5);const {data:deckSetup,error:deckError}=await requestWithTimeout(supabase.rpc('start_luminaria_game',{target_room_id:context.room.id,card_ids:shuffled}));if(deckError)throw deckError;liveTotalRounds=deckSetup?.[0]?.total_rounds||0;liveHandCache=[];context.room={...context.room,status:'playing'};await showGame()}catch(error){const {data:roomState}=await supabase.from('rooms').select('status').eq('id',context.room.id).maybeSingle().catch(()=>({data:null}));if(roomState?.status==='playing'){context.room={...context.room,status:'playing'};await showGame();return}button.disabled=false;button.textContent=language==='ru'?'Начать игру':'Start the game';alert(error.message||'Could not start the room.')}finally{startingLiveGame=false}},true);
document.addEventListener('click',async event=>{const button=event.target.closest('#revealButton,#sendCard');if(!button||!liveGameContext)return;const context=liveGameContext,isHost=button.id==='revealButton';if(isHost!== ((liveStorytellerId||context.room.host_id)===context.session.user.id))return;const image=document.querySelector('.hand-card.selected img');const clue=$('#clueInput')?.value.trim();if(!image||(isHost&&!clue))return;event.preventDefault();event.stopImmediatePropagation();try{let round=liveRound;if(isHost){const {data,error}=await supabase.from('rounds').insert({room_id:context.room.id,storyteller_id:context.session.user.id,clue}).select().single();if(error)throw error;round=data;liveRound=round;liveStorytellerId=round.storyteller_id}else if(!round){round=await loadLiveRound()}const cardId=image.src.split('/').pop();const {error}=await supabase.rpc('play_luminaria_card',{target_round_id:round.id,chosen_card_id:cardId});if(error)throw error;liveHandCache=[];showLiveRoundWaiting();await advanceLiveRound()}catch(error){console.error(error);alert(error.message||'Could not save this card.')}},true);
async function showGameFinished(){
  const ru=language==='ru';
  const roster=liveGameContext?await loadLiveRoster(liveGameContext.room.id):[];
  const ranking=[...roster].sort((a,b)=>b.score-a.score);
  const winningScore=ranking[0]?.score;
  const winners=ranking.filter(seat=>seat.score===winningScore);
  const winnerNames=winners.map(seat=>seat.profile?.nickname||'Dreamer').join(ru?' и ':' & ');
  const {data:recentRounds,count:completedRounds}=liveGameContext?await supabase.from('rounds').select('id,clue,storyteller_id,created_at',{count:'exact'}).eq('room_id',liveGameContext.room.id).order('created_at',{ascending:false}).limit(5):{data:[],count:0};
  const storytellerName=id=>roster.find(seat=>seat.user_id===id)?.profile?.nickname||'Dreamer';
  const isHost=liveGameContext?.room.host_id===liveGameContext?.session.user.id;
  document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="results-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a></nav><section class="result-head"><span class="result-star">✦</span><p class="eyebrow"><span></span><span>${ru?'Колода завершена':'The deck is complete'}</span></p><h1>${ru?'Партия<br><em>завершена.</em>':'The game is<br><em>complete.</em>'}</h1><p class="result-clue">${winner?(ru?`Победитель — ${winner.profile?.nickname||'Мечтатель'}!`:`Winner — ${winner.profile?.nickname||'Dreamer'}!`):(ru?'Все карты этой партии сыграны.':'Every card in this game has been played.')}</p></section><section class="scores final-scores"><div class="panel-title"><h2>${ru?'Финальный рейтинг':'Final ranking'}</h2><span class="count">${ru?'Колода сыграна':'Deck complete'}</span></div>${ranking.map((seat,index)=>`<div class="score-row ${seat.user_id===liveGameContext?.session.user.id?'me':''}"><span class="score-avatar">${index+1}</span><strong>${seat.profile?.nickname||'Dreamer'}</strong><em>${index===0?(ru?'Победитель':'Winner'):(ru?'Место за столом':'Place at the table')}</em><b>${seat.score}</b></div>`).join('')}${isHost?`<button class="primary-button next-round" id="rematchButton">${ru?'Новая партия':'Play again'} <b>→</b></button>`:`<p class="lead">${ru?'Ведущий может начать новую партию в этой же комнате.':'The host can start a new game in this room.'}</p>`}<a class="text-button" href="/">${ru?'На главную':'Back to home'}</a></section>${recentRounds?.length?`<section class="round-history"><div class="panel-title"><h2>${ru?'Последние истории':'Recent stories'}</h2><span class="count">${ru?'Финал партии':'Game finale'}</span></div>${recentRounds.map((round,index)=>`<div><span>${((completedRounds||recentRounds.length)-index).toString().padStart(2,'0')}</span><blockquote>“${round.clue}”</blockquote><small>${storytellerName(round.storyteller_id)}</small></div>`).join('')}</section>`:''}</main>`
  const winnerLine=document.querySelector('.result-clue');
  if(winnerLine&&winners.length)winnerLine.textContent=ru?`${winners.length>1?'Победители':'Победитель'} — ${winnerNames}!`:`${winners.length>1?'Winners':'Winner'} — ${winnerNames}!`;
  document.querySelectorAll('.final-scores .score-row').forEach((row,index)=>{if(ranking[index]?.score===winningScore)row.querySelector('em').textContent=ru?'Победитель':'Winner'});
  $('#rematchButton')?.addEventListener('click',()=>restartLiveRoom().catch(error=>alert(error.message||'Could not start a rematch.')));
}
async function restartLiveRoom(){
  if(!liveGameContext||liveGameContext.room.host_id!==liveGameContext.session.user.id)return;
  const {error}=await supabase.rpc('restart_luminaria_room',{target_room_id:liveGameContext.room.id});
  if(error)throw error;
  liveRound=null;liveHandCache=[];liveRoundNumber=1;liveRoundNumberForId=null;liveTotalRounds=0;
  localStorage.removeItem(nextRoundStorageKey());
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
    if(deckState.remaining_cards===0)return showGameFinished();
    const completed=await loadLiveRound();
    if(completed&&completed.phase!=='results')return routeLiveRound();
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
    if(liveStorytellerId===liveGameContext.session.user.id)demoShowGame();else showLiveRoundWaiting();
  }finally{preparingNextRound=false}
}
async function addLiveScoreboard(){if(!liveGameContext||!document.querySelector('.results-page')||$('#liveScoreboard'))return;const scores=$('.scores');if(!scores)return;const roster=await loadLiveRoster(liveGameContext.room.id);const ru=language==='ru';const board=document.createElement('section');board.id='liveScoreboard';board.className='live-scoreboard';board.innerHTML=`<div class="panel-title"><h2>${ru?'Общий счёт':'Total score'}</h2><span class="count">${ru?'Комната':'Room'} ${liveGameContext.room.code}</span></div>${[...roster].sort((a,b)=>b.score-a.score).map((seat,index)=>`<div class="score-row ${seat.user_id===liveGameContext.session.user.id?'me':''}"><span class="score-avatar">${index+1}</span><strong>${seat.profile?.nickname||'Dreamer'}</strong><em>${index===0?(ru?'Лидер':'Leading'):(ru?'За столом':'At the table')}</em><b>${seat.score}</b></div>`).join('')}`;scores.after(board)}
const liveResultsObserver=new MutationObserver(()=>{if(!liveGameContext||!document.querySelector('.results-page')||$('#nextLiveRound'))return;const ru=language==='ru',scores=$('.scores');if(!scores)return;const button=document.createElement('button');button.id='nextLiveRound';button.className='primary-button next-round';button.innerHTML=`${ru?'Следующий раунд':'Next round'} <b>→</b>`;button.addEventListener('click',()=>prepareNextLiveRound().catch(console.error));scores.append(button);addLiveScoreboard().catch(console.error)});liveResultsObserver.observe(document.body,{childList:true,subtree:true});
async function createLiveRoom(player,session){for(let attempt=0;attempt<3;attempt++){const code=makeRoomCode();const {data:room,error}=await supabase.from('rooms').insert({code,host_id:session.user.id}).select().single();if(error?.code==='23505')continue;if(error)throw error;const {error:seatError}=await supabase.from('room_players').insert({room_id:room.id,user_id:session.user.id});if(seatError)throw seatError;return showLiveLobby(room,player,session)}throw new Error('Could not create a unique room code.')}
async function joinLiveRoom(player,session,code){
  const {data:room,error}=await supabase.from('rooms').select().eq('code',code).maybeSingle();
  if(error)throw error;
  if(!room)throw new Error(language==='ru'?'Комната с таким кодом не найдена.':'No room found with that code.');
  const {data:existingSeat,error:seatLookupError}=await supabase.from('room_players').select('user_id').eq('room_id',room.id).eq('user_id',session.user.id).maybeSingle();
  if(seatLookupError)throw seatLookupError;
  if(!existingSeat){
    if(room.status!=='lobby')throw new Error(language==='ru'?'Игра уже началась — новые игроки не могут присоединиться.':'This game has already started, so new players cannot join.');
    const roster=await loadLiveRoster(room.id);
    if(roster.length>=7)throw new Error(language==='ru'?'В комнате уже максимум 7 игроков.':'This room already has the maximum of 7 players.');
    if(roster.some(seat=>seat.profile?.nickname?.trim().toLocaleLowerCase()===player.name.trim().toLocaleLowerCase()))throw new Error(language==='ru'?'Этот ник уже занят в комнате. Выбери другой.':'This nickname is already used in the room. Please choose another one.');
    const {error:seatError}=await supabase.from('room_players').insert({room_id:room.id,user_id:session.user.id});
    if(seatError)throw seatError;
  }
  showLiveLobby(room,player,session)
}
async function loadLiveRoster(roomId){const {data:seats,error}=await supabase.from('room_players').select('user_id,is_ready,score').eq('room_id',roomId).order('joined_at');if(error)throw error;const ids=seats.map(seat=>seat.user_id);const {data:profiles}=ids.length?await supabase.from('profiles').select('id,nickname,avatar').in('id',ids):{data:[]};const safeProfiles=(profiles||[]).map(profile=>({...profile,avatar:safeAvatar({avatar:profile.avatar})}));return seats.map(seat=>({...seat,profile:safeProfiles.find(profile=>profile.id===seat.user_id)}))}
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
  liveRoomChannel?.unsubscribe();liveRoundChannel?.unsubscribe();liveGameContext=null;liveRound=null;liveHandCache=[];
  location.assign('/');
});
function showLiveLobby(room,player,session){liveRoomChannel?.unsubscribe();const ru=language==='ru';const invite=`${location.origin}?room=${room.code}`;document.body.innerHTML=`<div class="sky"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="lobby-page"><nav class="nav"><a class="brand" href="/"><span class="brand-mark">✦</span> Luminaria</a><button class="language" id="lobbyLanguage">${ru?'EN':'RU'}</button></nav><section class="lobby-hero"><div><p class="eyebrow"><span></span><span>${ru?'Комната':'Room'} ${room.code}</span></p><h1>${ru?'Собираем<br><em>мечтателей.</em>':'Gathering<br><em>dreamers.</em>'}</h1><p class="lead">${ru?'Комната обновляется в реальном времени. Для начала нужны минимум 3 игрока. Поделись ссылкой и дождись друзей.':'This room updates live. At least 3 players are required. Share the link and wait for your friends.'}</p></div><div class="lobby-orb">✦</div></section><section class="lobby-grid"><article class="lobby-panel players-panel"><div class="panel-title"><h2>${ru?'Игроки':'Players'}</h2><span class="count" id="liveCount">0 / 7</span></div><div id="liveRoster"></div></article><article class="lobby-panel invite-panel"><span class="invite-icon">↗</span><h2>${ru?'Пригласить друзей':'Invite friends'}</h2><p>${ru?'Любой, у кого есть ссылка, сможет войти в комнату.':'Anyone with this link can join your room.'}</p><div class="share-link"><span>${invite}</span><button id="copyInvite">${ru?'Скопировать':'Copy link'}</button></div><button class="text-button share-room-button" id="shareInvite">${ru?'Поделиться ссылкой':'Share invitation'}</button><div class="ready-line"><span class="ready-check" id="readyCheck">✓</span><span id="readyLabel">${ru?'Не готов':'Not ready'}</span></div><button class="primary-button full" id="readyButton">${ru?'Я готов':'I’m ready'} <b>→</b></button>${room.host_id===session.user.id?`<button class="start-button" id="startButton" disabled>${ru?'Начать игру':'Start the game'}</button>`:''}</article></section></main>`;const render=async()=>{try{const roster=await loadLiveRoster(room.id);if(!$('#liveCount'))return;$('#liveCount').textContent=`${roster.length} / 7`;$('#liveRoster').innerHTML=roster.map(seat=>`<div class="player-row"><span class="lobby-avatar">${seat.profile?.avatar||'☽'}</span><div><strong>${seat.profile?.nickname||'Dreamer'}</strong><small>${seat.user_id===room.host_id?(ru?'Ведущий':'Host'):seat.is_ready?(ru?'Готов':'Ready'):(ru?'Не готов':'Not ready')}</small></div><span class="status-dot ${seat.is_ready?'is-ready':''}"></span></div>`).join('')+Array.from({length:Math.max(0,3-roster.length)},()=>`<div class="empty-seat"><span>+</span><p>${ru?'Ждём мечтателей…':'Waiting for dreamers…'}</p></div>`).join('');const mine=roster.find(seat=>seat.user_id===session.user.id);if(mine?.is_ready){$('#readyCheck').classList.add('is-ready');$('#readyLabel').textContent=ru?'Готов':'Ready';$('#readyButton').classList.add('is-ready');$('#readyButton').innerHTML=`✓ ${ru?'Готов':'Ready'}`}else{$('#readyCheck').classList.remove('is-ready');$('#readyLabel').textContent=ru?'Не готов':'Not ready';$('#readyButton').classList.remove('is-ready');$('#readyButton').innerHTML=`${ru?'Я готов':'I’m ready'} <b>→</b>`}if(room.host_id===session.user.id)$('#startButton').disabled=roster.length<3||!roster.every(seat=>seat.is_ready)}catch(error){console.error(error)}};$('#copyInvite').addEventListener('click',async()=>{await navigator.clipboard?.writeText(invite);$('#copyInvite').textContent=ru?'Скопировано!':'Copied!';setTimeout(()=>$('#copyInvite').textContent=ru?'Скопировать':'Copy link',1500)});$('#shareInvite').addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:'Luminaria',text:ru?'Присоединяйся к моей комнате в Luminaria':'Join my Luminaria room',url:invite});else{await navigator.clipboard?.writeText(invite);$('#shareInvite').textContent=ru?'Ссылка скопирована':'Link copied'}}catch(error){if(error?.name!=='AbortError')console.error(error)}});$('#readyButton').addEventListener('click',async()=>{const roster=await loadLiveRoster(room.id);const mine=roster.find(seat=>seat.user_id===session.user.id);const {error}=await supabase.from('room_players').update({is_ready:!mine?.is_ready}).eq('room_id',room.id).eq('user_id',session.user.id);if(error)return alert(error.message);render()});$('#startButton')?.addEventListener('click',async()=>{await supabase.from('rooms').update({status:'playing'}).eq('id',room.id);showGame()});$('#lobbyLanguage').addEventListener('click',()=>{language=language==='en'?'ru':'en';localStorage.setItem('luminaria-language',language);showLiveLobby(room,player,session)});liveRoomChannel=supabase.channel(`room-${room.id}`).on('postgres_changes',{event:'*',schema:'public',table:'room_players',filter:`room_id=eq.${room.id}`},render).on('postgres_changes',{event:'UPDATE',schema:'public',table:'rooms',filter:`id=eq.${room.id}`},payload=>{if(payload.new.status==='playing')showGame()}).subscribe();render()}

// Restore authenticated profiles from the database instead of repeatedly asking
// for a nickname after reloads, OAuth redirects, or a resumed browser tab.
async function loadSavedProfile(session){
  const {data,error}=await supabase.from('profiles').select('nickname,avatar').eq('id',session.user.id).maybeSingle();
  if(error)throw error;
  return data;
}
syncAuthProfile=async function(session){
  $('#authEntry')?.remove();
  if(!session||session.user?.is_anonymous){
    addAuthButton();
    return;
  }
  const saved=await loadSavedProfile(session).catch(()=>null);
  if(saved?.nickname){
    localStorage.setItem('luminaria-player',JSON.stringify({name:saved.nickname,avatar:safeAvatar({avatar:saved.avatar})}));
    addAuthButton();
    return;
  }
  addAuthButton();
  if(sessionStorage.getItem(`luminaria-profile-dismissed-${session.user.id}`))return;
  openProfileSetup(session);
};

// Store an uploaded avatar as data rather than HTML. Existing uploaded avatars
// from older sessions are converted by safeAvatar() before they reach Supabase.
document.addEventListener('change',async event=>{
  const input=event.target;
  if(input?.id!=='profileAvatarUpload')return;
  event.stopImmediatePropagation();
  const file=input.files?.[0];
  if(!file||!file.type.startsWith('image/'))return;
  const avatar=await compressAvatar(file).catch(()=>null);
  if(!avatar)return alert(language==='ru'?'Не удалось обработать фото. Выбери другое изображение.':'Could not process this photo. Please choose another image.');
  input.dataset.avatar=avatar;const label=$('#profileUploadLabel');if(label){label.style.backgroundImage=`url(${avatar})`;label.classList.add('has-image')};
},true);
document.addEventListener('change',async event=>{
  const input=event.target;
  if(input?.id!=='avatarUpload')return;
  event.stopImmediatePropagation();
  const file=input.files?.[0];
  if(!file||!file.type.startsWith('image/'))return;
  const avatar=await compressAvatar(file).catch(()=>null);
  if(!avatar)return alert(language==='ru'?'Не удалось обработать фото. Выбери другое изображение.':'Could not process this photo. Please choose another image.');
  uploadedAvatar=avatar;const label=$('#avatarUploadLabel');if(label){label.style.backgroundImage=`url(${avatar})`;label.classList.add('has-image')};
},true);
document.addEventListener('click',event=>{if(event.target.closest('.profile-avatar'))$('#profileAvatarUpload')?.removeAttribute('data-avatar')},true);
document.addEventListener('submit',async event=>{
  const form=event.target;
  if(form?.id!=='profileSetupForm')return;
  event.preventDefault();event.stopImmediatePropagation();
  const session=(await supabase.auth.getSession()).data.session;
  const name=$('#profileNickname')?.value.trim().replace(/\s+/g,' ');
  if(!session||!name||name.length<2)return;
  const avatar=$('#profileAvatarUpload')?.dataset.avatar||form.querySelector('.profile-avatar.selected')?.textContent||'☽';
  const {error}=await supabase.from('profiles').upsert({id:session.user.id,nickname:name,avatar},{onConflict:'id'});
  if(error)return alert(error.message);
  await supabase.auth.updateUser({data:{nickname:name}});
  localStorage.setItem('luminaria-player',JSON.stringify({name,avatar}));
  $('#profileSetupDialog')?.close();$('#profileSetupDialog')?.remove();
  $('#authEntry')?.remove();addAuthButton();
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
  liveRoomChannel?.unsubscribe();liveRoundChannel?.unsubscribe();
  liveRoomChannel=null;liveRoundChannel=null;liveGameContext=null;liveRound=null;liveHandCache=[];
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
