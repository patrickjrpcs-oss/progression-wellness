const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const DEFAULT_PLAYBOOK = [
  { category: 'Mindset', text: 'Progression, not perfection.' },
  { category: 'Coffee', text: 'Chocolate hazelnut protein powder works well in morning coffee.' },
  { category: 'Fiber', text: 'Psyllium husk with water has little to no taste when drunk right away.' },
  { category: 'Coaching', text: 'Small upgrades beat complete overhauls.' }
];

let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  $('#installButton').classList.remove('hidden');
});

$('#installButton').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  $('#installButton').classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function timeLabel(date = new Date()) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function dateLabel(date = new Date()) {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function includesAny(text, words) {
  return words.some(word => text.includes(word));
}

function numberBefore(text, words) {
  for (const word of words) {
    const pattern = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${word})`, 'i');
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

function analyzeMessage(text) {
  const lower = text.toLowerCase();
  const insights = [];
  const updates = {
    foodNotes: [],
    waterOz: 0,
    movementNotes: [],
    sleepNotes: [],
    supplementNotes: [],
    moodNotes: [],
    alcoholNotes: [],
    saturatedFatFlag: false,
    proteinWin: false,
    fiberWin: false,
    waterWin: false,
    movementWin: false,
    timelineTitle: 'Check-in',
    playbookCandidates: []
  };

  if (includesAny(lower, ['protein coffee', 'protein powder', 'protein shake', 'scoop'])) {
    updates.proteinWin = true;
    updates.foodNotes.push('Protein coffee / protein powder');
    updates.playbookCandidates.push({ category: 'Coffee', text: 'Protein powder can replace creamer or sugary syrup in coffee.' });
  }

  if (includesAny(lower, ['psyllium', 'psyllum', 'husk'])) {
    updates.fiberWin = true;
    updates.supplementNotes.push('Psyllium husk');
    if (includesAny(lower, ['no taste', 'tasteless', 'just like water'])) {
      updates.playbookCandidates.push({ category: 'Fiber', text: 'Psyllium with water tastes neutral when drunk right away.' });
    }
  }

  const tsp = numberBefore(lower, ['tsp', 'teaspoon', 'teaspoons']);
  if (tsp && includesAny(lower, ['psyllium', 'psyllum', 'husk'])) {
    updates.supplementNotes.push(`${tsp} tsp psyllium`);
  }

  const waterOz = numberBefore(lower, ['oz', 'ounces']);
  if (waterOz) updates.waterOz += waterOz;
  const cups = numberBefore(lower, ['cup', 'cups']);
  if (cups) updates.waterOz += cups * 8;
  const bottles = numberBefore(lower, ['bottle', 'bottles']);
  if (bottles) updates.waterOz += bottles * 16;
  if (includesAny(lower, ['water'])) {
    updates.waterWin = true;
    if (!updates.waterOz) updates.waterOz = 8;
  }

  if (includesAny(lower, ['almond', 'almonds', 'carrot', 'carrots', 'snap peas', 'cucumber', 'cucumbers', 'salad', 'steak', 'burger', 'sandwich', 'bagel', 'eggs', 'egg', 'chicken', 'fish', 'chips', 'hot dog', 'hotdog'])) {
    updates.foodNotes.push(text);
  }

  if (includesAny(lower, ['burger', 'cheese', 'cream cheese', 'sausage', 'hot dog', 'hotdog', 'bacon', 'steak'])) {
    updates.saturatedFatFlag = true;
  }

  if (includesAny(lower, ['walk', 'bike', 'ride', 'swim', 'swimming', 'gym', 'stretch', 'stationary', 'workout'])) {
    updates.movementWin = true;
    updates.movementNotes.push(text);
  }

  if (includesAny(lower, ['cpap', 'sleep', 'slept', 'tired', 'exhausted'])) {
    updates.sleepNotes.push(text);
  }

  if (includesAny(lower, ['nutrl', 'beer', 'vodka', 'shot', 'shots', 'alcohol', 'drink', 'dr. mcgillicuddy', 'drs', 'dr '])) {
    updates.alcoholNotes.push(text);
  }

  if (includesAny(lower, ['bad day', 'stressed', 'stress', 'overwhelmed', 'sad', 'rough', 'hard day'])) {
    updates.moodNotes.push(text);
  }

  if (updates.proteinWin) insights.push('protein');
  if (updates.fiberWin) insights.push('fiber');
  if (updates.waterWin) insights.push('water');
  if (updates.movementWin) insights.push('movement');
  if (updates.saturatedFatFlag) insights.push('sat-fat-watch');
  if (updates.alcoholNotes.length) insights.push('alcohol-watch');

  if (insights.length) updates.timelineTitle = `Check-in: ${insights.join(', ')}`;
  return updates;
}

function buildJohnReply(text, updates, context) {
  const lower = text.toLowerCase();
  const parts = [];

  if (updates.proteinWin && updates.fiberWin && updates.waterWin) {
    parts.push('That is a strong start: protein, fiber, and water already checked in. That is exactly the kind of simple routine we are trying to build.');
  } else if (updates.proteinWin) {
    parts.push('Nice upgrade. Protein in the coffee keeps the habit you like and makes it work harder for you.');
  } else if (updates.fiberWin) {
    parts.push('Psyllium logged. And if it tasted basically like water, that is huge because the habit has a real shot at sticking.');
  } else if (updates.movementWin) {
    parts.push('That movement counts. We are not chasing perfect workouts; we are stacking useful wins.');
  } else if (updates.moodNotes.length) {
    parts.push('I hear you. We do not need to fix the whole day at once. Let us find the smallest reset that helps.');
  } else if (updates.foodNotes.length) {
    parts.push('Got it. No judgment — I am logging the real day, not the perfect version.');
  } else {
    parts.push('Got it. I am adding that to the picture.');
  }

  if (updates.saturatedFatFlag) {
    parts.push('Saturated fat is probably something to keep an eye on today because of your LDL goal. No guilt — just balance it with leaner choices later if you can.');
  }

  if (updates.alcoholNotes.length) {
    parts.push('I will keep alcohol as a gentle watch item too, mostly because of weight, sleep quality, and triglycerides.');
  }

  if (updates.waterWin) {
    parts.push(`Water logged${updates.waterOz ? ` — about ${updates.waterOz} oz` : ''}. Keep sipping, especially with psyllium.`);
  }

  if (includesAny(lower, ['plan', 'today', 'work', 'bike', 'ride'])) {
    parts.push('For the rest of today, let us keep it simple: water, one movement win, and a decent protein choice later.');
  } else {
    parts.push('What is one more small win we can make happen today?');
  }

  return parts.join('\n\n');
}

async function ensureDefaults() {
  const playbook = await ProgressionDB.getAll('playbook');
  if (!playbook.length) {
    for (const item of DEFAULT_PLAYBOOK) {
      await ProgressionDB.put('playbook', { id: uid('pb'), ...item, createdAt: new Date().toISOString(), source: 'default' });
    }
  }

  const messages = await ProgressionDB.getAll('messages');
  if (!messages.length) {
    const hour = new Date().getHours();
    const greeting = hour < 11
      ? 'Morning, Pat. How did you sleep, and what does today look like?'
      : 'Hey Pat. Tell me what is going on today and we will find the next step.';
    await ProgressionDB.put('messages', { id: uid('msg'), role: 'coach', body: greeting, createdAt: new Date().toISOString() });
  }
}

async function getTodayLog() {
  const id = todayKey();
  const existing = await ProgressionDB.get('dailyLogs', id);
  return existing || {
    id,
    date: id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    waterOz: 0,
    foodNotes: [],
    movementNotes: [],
    supplementNotes: [],
    sleepNotes: [],
    moodNotes: [],
    alcoholNotes: [],
    flags: [],
    wins: []
  };
}

async function updateTodayFromMessage(text, updates) {
  const log = await getTodayLog();
  log.updatedAt = new Date().toISOString();
  log.waterOz = Number(log.waterOz || 0) + Number(updates.waterOz || 0);
  log.foodNotes = [...(log.foodNotes || []), ...updates.foodNotes].filter(Boolean);
  log.movementNotes = [...(log.movementNotes || []), ...updates.movementNotes].filter(Boolean);
  log.supplementNotes = [...(log.supplementNotes || []), ...updates.supplementNotes].filter(Boolean);
  log.sleepNotes = [...(log.sleepNotes || []), ...updates.sleepNotes].filter(Boolean);
  log.moodNotes = [...(log.moodNotes || []), ...updates.moodNotes].filter(Boolean);
  log.alcoholNotes = [...(log.alcoholNotes || []), ...updates.alcoholNotes].filter(Boolean);
  log.flags = new Set([...(log.flags || [])]);
  if (updates.saturatedFatFlag) log.flags.add('Watch saturated fat today');
  if (updates.alcoholNotes.length) log.flags.add('Alcohol watch item');
  log.flags = Array.from(log.flags);
  log.wins = new Set([...(log.wins || [])]);
  if (updates.proteinWin) log.wins.add('Protein');
  if (updates.fiberWin) log.wins.add('Fiber');
  if (updates.waterWin) log.wins.add('Water');
  if (updates.movementWin) log.wins.add('Movement');
  log.wins = Array.from(log.wins);
  await ProgressionDB.put('dailyLogs', log);
  return log;
}

async function addTimeline(type, title, body) {
  await ProgressionDB.put('timeline', { id: uid('tl'), type, title, body, createdAt: new Date().toISOString() });
}

async function maybeAddPlaybookCards(candidates) {
  if (!candidates.length) return;
  const existing = await ProgressionDB.getAll('playbook');
  const existingText = existing.map(item => item.text.toLowerCase());
  for (const candidate of candidates) {
    if (existingText.includes(candidate.text.toLowerCase())) continue;
    await ProgressionDB.put('playbook', { id: uid('pb'), ...candidate, createdAt: new Date().toISOString(), source: 'conversation' });
  }
}

async function addMessage(role, body, meta = {}) {
  const message = { id: uid('msg'), role, body, meta, createdAt: new Date().toISOString() };
  await ProgressionDB.put('messages', message);
  return message;
}

async function handleUserMessage(text) {
  await addMessage('user', text);
  const updates = analyzeMessage(text);
  const today = await updateTodayFromMessage(text, updates);
  await addTimeline('checkin', updates.timelineTitle, text);
  await maybeAddPlaybookCards(updates.playbookCandidates);
  const reply = buildJohnReply(text, updates, { today });
  await addMessage('coach', reply, { generatedBy: 'local-companion-v1', updates });
  await renderAll();
}

function renderMessage(msg) {
  return `
    <article class="message ${msg.role}">
      <div>${escapeHTML(msg.body).replace(/\n/g, '<br>')}</div>
      <time>${timeLabel(new Date(msg.createdAt))}</time>
    </article>
  `;
}

async function renderChat() {
  const messages = (await ProgressionDB.getAll('messages')).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const container = $('#chatMessages');
  container.innerHTML = messages.map(renderMessage).join('');
  container.scrollTop = container.scrollHeight;
}

async function renderToday() {
  const log = await getTodayLog();
  const chips = [];
  if ((log.wins || []).length) chips.push(...log.wins.map(win => `✅ ${win}`));
  if (log.waterOz) chips.push(`💧 ${log.waterOz} oz`);
  if ((log.flags || []).length) chips.push(...log.flags.map(flag => `⚠️ ${flag}`));
  $('#todayStrip').innerHTML = chips.length
    ? chips.slice(0, 5).map(chip => `<span>${escapeHTML(chip)}</span>`).join('')
    : '<span>Today starts with one honest check-in.</span>';

  const summary = [
    ['Wins', (log.wins || []).join(', ') || 'None yet'],
    ['Water', log.waterOz ? `${log.waterOz} oz` : 'Not logged'],
    ['Food', (log.foodNotes || []).length ? `${log.foodNotes.length} note(s)` : 'Not logged'],
    ['Movement', (log.movementNotes || []).length ? `${log.movementNotes.length} note(s)` : 'Not logged'],
    ['Supplements', (log.supplementNotes || []).join(', ') || 'Not logged'],
    ['Watch items', (log.flags || []).join(', ') || 'None']
  ];
  $('#todaySummary').innerHTML = summary.map(([label, value]) => `
    <div class="summary-item"><strong>${escapeHTML(label)}</strong><span>${escapeHTML(value)}</span></div>
  `).join('');
}

async function renderTimeline() {
  const records = (await ProgressionDB.getAll('timeline')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  $('#timelineList').innerHTML = records.length ? records.map(item => `
    <article class="timeline-item">
      <time>${dateLabel(new Date(item.createdAt))}</time>
      <h4>${escapeHTML(item.title)}</h4>
      <p>${escapeHTML(item.body || '')}</p>
    </article>
  `).join('') : '<div class="empty">No timeline yet. Text John and it will start building.</div>';
}

async function renderPlaybook() {
  const items = (await ProgressionDB.getAll('playbook')).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  $('#playbookItems').innerHTML = items.map(item => `
    <div class="playbook-item">
      <small>${escapeHTML(item.category || 'Note')}</small>
      <span>${escapeHTML(item.text)}</span>
      <button type="button" aria-label="Remove" data-remove-playbook="${item.id}">×</button>
    </div>
  `).join('');
}

async function renderStatus() {
  const data = await ProgressionDB.exportAll();
  const counts = Object.fromEntries(Object.entries(data.stores).map(([key, value]) => [key, value.length]));
  $('#dataStatus').textContent = JSON.stringify({ deviceData: counts, lastChecked: new Date().toLocaleString() }, null, 2);
}

async function renderAll() {
  await renderChat();
  await renderToday();
  await renderTimeline();
  await renderPlaybook();
  await renderStatus();
}

function openPanel() {
  $('#sidePanel').classList.add('open');
  $('#sidePanel').setAttribute('aria-hidden', 'false');
}

function closePanel() {
  $('#sidePanel').classList.remove('open');
  $('#sidePanel').setAttribute('aria-hidden', 'true');
}

$('#openPanel').addEventListener('click', openPanel);
$('#closePanel').addEventListener('click', closePanel);
$('#closePanelBackdrop').addEventListener('click', closePanel);

$$('.tool-tab').forEach(button => {
  button.addEventListener('click', () => {
    $$('.tool-tab').forEach(tab => tab.classList.remove('active'));
    $$('.panel-view').forEach(view => view.classList.remove('active'));
    button.classList.add('active');
    $(`#${button.dataset.panelView}`).classList.add('active');
  });
});

$('#chatInput').addEventListener('input', event => {
  const input = event.target;
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 130)}px`;
});

$('#chatForm').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('#chatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';
  await handleUserMessage(text);
});

$('#quickForm').addEventListener('submit', async event => {
  event.preventDefault();
  const parts = [];
  if ($('#weightInput').value) parts.push(`Weight ${$('#weightInput').value} lbs`);
  if ($('#waterInput').value) parts.push(`${$('#waterInput').value} oz water`);
  if ($('#movementInput').value.trim()) parts.push($('#movementInput').value.trim());
  if ($('#noteInput').value.trim()) parts.push($('#noteInput').value.trim());
  if (!parts.length) return;
  await handleUserMessage(parts.join('. '));
  event.target.reset();
});

$('#addTimelineNote').addEventListener('click', async () => {
  const body = prompt('Add a timeline note');
  if (!body) return;
  await addTimeline('note', 'Manual note', body);
  await renderAll();
});

$('#playbookForm').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('#playbookInput');
  await ProgressionDB.put('playbook', { id: uid('pb'), category: 'Manual', text: input.value.trim(), source: 'manual', createdAt: new Date().toISOString() });
  input.value = '';
  await renderAll();
});

$('#playbookItems').addEventListener('click', async event => {
  const id = event.target.dataset.removePlaybook;
  if (!id) return;
  await ProgressionDB.remove('playbook', id);
  await renderAll();
});

$('#exportButton').addEventListener('click', async () => {
  const data = await ProgressionDB.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `progression-wellness-data-${todayKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

$('#importInput').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    await ProgressionDB.importAll(payload);
    await renderAll();
    alert('Progression data imported.');
  } catch (error) {
    alert(`Import failed: ${error.message}`);
  }
});

$('#clearButton').addEventListener('click', async () => {
  if (!confirm('Clear all local Progression data on this device?')) return;
  await ProgressionDB.clearAll();
  await ensureDefaults();
  await renderAll();
});

(async function boot() {
  await ensureDefaults();
  await renderAll();
})();
