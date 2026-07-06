const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const DEFAULT_PLAYBOOK = [
  'Progression, not perfection.',
  'Make the next healthy step smaller, not harder.',
  'When the day is messy, log the truth and reset gently.',
  'Sleep, water, movement, food, and stress all count.'
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

function todayLabel(date = new Date()) {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function escapeHTML(value = '') {
  return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function johnReply(text) {
  const lower = text.toLowerCase();
  if (lower.includes('tired') || lower.includes('sleep')) return 'That matters. Tonight we keep the bar low: hydrate, prep for sleep, and pick one small win for tomorrow.';
  if (lower.includes('food') || lower.includes('eat')) return 'Good note. No judgment here. Let’s look for the pattern, not a perfect day.';
  if (lower.includes('workout') || lower.includes('walk') || lower.includes('gym')) return 'That counts. Movement is a vote for the person you’re becoming.';
  if (lower.includes('bad') || lower.includes('hard') || lower.includes('stress')) return 'I hear you. Hard days are exactly why Progression exists. What is the smallest reset we can do next?';
  return 'Got it. I’m adding that to the picture. What is one small thing that would make the rest of today easier?';
}

async function addMessage(role, body) {
  const message = { id: uid('msg'), role, body, createdAt: new Date().toISOString() };
  await ProgressionDB.put('messages', message);
  await ProgressionDB.put('timeline', { id: uid('tl'), type: 'chat', title: role === 'coach' ? 'John replied' : 'You checked in', body, createdAt: message.createdAt });
  await renderAll();
}

async function renderChat() {
  const messages = (await ProgressionDB.getAll('messages')).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const container = $('#chatMessages');
  container.innerHTML = messages.map(msg => `
    <article class="message ${msg.role}">
      <div>${escapeHTML(msg.body)}</div>
      <time>${new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
    </article>
  `).join('');
  container.scrollTop = container.scrollHeight;
}

async function renderTimeline() {
  const records = (await ProgressionDB.getAll('timeline')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  $('#timelineList').innerHTML = records.length ? records.map(item => `
    <article class="timeline-item">
      <time>${todayLabel(new Date(item.createdAt))}</time>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.body || '')}</p>
    </article>
  `).join('') : '<div class="empty">No timeline yet. Save a log or message John.</div>';
}

async function renderPlaybook() {
  let items = await ProgressionDB.getAll('playbook');
  if (!items.length) {
    for (const text of DEFAULT_PLAYBOOK) await ProgressionDB.put('playbook', { id: uid('pb'), text, createdAt: new Date().toISOString() });
    items = await ProgressionDB.getAll('playbook');
  }
  items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  $('#playbookItems').innerHTML = items.map(item => `
    <div class="playbook-item">
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
  await renderTimeline();
  await renderPlaybook();
  await renderStatus();
}

$$('.tab').forEach(button => {
  button.addEventListener('click', () => {
    $$('.tab').forEach(tab => tab.classList.remove('active'));
    $$('.view').forEach(view => view.classList.remove('active'));
    button.classList.add('active');
    $(`#${button.dataset.view}`).classList.add('active');
  });
});

$('#chatForm').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('#chatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await addMessage('user', text);
  await addMessage('coach', johnReply(text));
});

$('#dailyForm').addEventListener('submit', async event => {
  event.preventDefault();
  const log = {
    id: uid('log'),
    createdAt: new Date().toISOString(),
    energy: $('#energy').value,
    mood: $('#mood').value,
    sleep: $('#sleep').value,
    water: $('#water').value,
    movement: $('#movement').value.trim(),
    food: $('#food').value.trim(),
    win: $('#win').value.trim(),
    hardThing: $('#hardThing').value.trim()
  };
  await ProgressionDB.put('dailyLogs', log);
  const summary = `Energy ${log.energy}/10, mood ${log.mood}/10. Win: ${log.win || 'noted'}. Hard thing: ${log.hardThing || 'none logged'}.`;
  await ProgressionDB.put('timeline', { id: uid('tl'), type: 'dailyLog', title: 'Daily log saved', body: summary, createdAt: log.createdAt });
  await addMessage('coach', `Nice job logging today. ${log.win ? `I’m counting this win: ${log.win}` : 'Even showing up counts.'}`);
  event.target.reset();
  $('#energy').value = 5;
  $('#mood').value = 5;
  await renderAll();
});

$('#addTimelineNote').addEventListener('click', async () => {
  const body = prompt('Add a timeline note');
  if (!body) return;
  await ProgressionDB.put('timeline', { id: uid('tl'), type: 'note', title: 'Manual note', body, createdAt: new Date().toISOString() });
  await renderAll();
});

$('#playbookForm').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('#playbookInput');
  await ProgressionDB.put('playbook', { id: uid('pb'), text: input.value.trim(), createdAt: new Date().toISOString() });
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
  const date = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.download = `progression-test-data-${date}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

$('#importInput').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  const payload = JSON.parse(await file.text());
  await ProgressionDB.importAll(payload);
  await renderAll();
  alert('Progression data imported.');
});

$('#clearButton').addEventListener('click', async () => {
  if (!confirm('Clear all local Progression data on this device?')) return;
  await ProgressionDB.clearAll();
  await renderAll();
});

(async function boot() {
  const messages = await ProgressionDB.getAll('messages');
  if (!messages.length) {
    await ProgressionDB.put('messages', { id: uid('msg'), role: 'coach', body: 'Hey, it’s John. No pressure today. Just tell me what’s going on and we’ll find the next step.', createdAt: new Date().toISOString() });
  }
  await renderAll();
})();
