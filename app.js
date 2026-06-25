// ---------- STATE ----------
const STORAGE_KEY = 'ledger_app_data_v1';

function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){ console.error('Failed to load data', e); }
  return { habits: [], logs: {}, diary: {} };
  // habits: [{id, name}]
  // logs: { habitId: { 'YYYY-MM-DD': true } }
  // diary: { 'YYYY-MM-DD': 'text' }
}

let data = loadData();
let viewDate = new Date(); // month currently being viewed

function saveData(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---------- HELPERS ----------
function pad(n){ return n.toString().padStart(2,'0'); }
function dateKey(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function todayKey(){ return dateKey(new Date()); }
function daysInMonth(year, month){ return new Date(year, month+1, 0).getDate(); }
function isWeekend(d){ const wd = d.getDay(); return wd === 0 || wd === 6; }
function monthLabel(d){
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function uid(){ return 'h_' + Math.random().toString(36).slice(2,9); }

// ---------- STREAK CALCULATION ----------
// Current streak: consecutive days ending today (or yesterday if today not yet done) where habit was checked.
function computeStreak(habitId){
  const log = data.logs[habitId] || {};
  let streak = 0;
  let cursor = new Date();
  // if today isn't logged yet, start counting from yesterday so an unbroken streak isn't reset to 0 mid-day
  if(!log[dateKey(cursor)]){
    cursor.setDate(cursor.getDate()-1);
  }
  while(log[dateKey(cursor)]){
    streak++;
    cursor.setDate(cursor.getDate()-1);
  }
  return streak;
}

// ---------- RENDER: STREAK STRIP ----------
function renderStreakStrip(){
  const el = document.getElementById('streakStrip');
  el.innerHTML = '';
  if(data.habits.length === 0){ el.hidden = true; return; }
  el.hidden = false;
  data.habits.forEach(h => {
    const streak = computeStreak(h.id);
    const card = document.createElement('div');
    card.className = 'streak-card';
    card.innerHTML = `
      <div class="name">${escapeHtml(h.name)}</div>
      <div class="count">${streak}<span class="unit">day${streak===1?'':'s'}</span></div>
    `;
    el.appendChild(card);
  });
}

// ---------- RENDER: GRID ----------
function renderGrid(){
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  document.getElementById('monthLabel').textContent = monthLabel(viewDate);

  const numDays = daysInMonth(year, month);
  const headerRow = document.getElementById('dayHeaderRow');
  headerRow.innerHTML = '<th class="habit-name-cell" style="background:var(--surface)"></th>';

  const tKey = todayKey();

  for(let day=1; day<=numDays; day++){
    const d = new Date(year, month, day);
    const th = document.createElement('th');
    th.textContent = day;
    if(isWeekend(d)) th.classList.add('weekend');
    if(dateKey(d) === tKey) th.classList.add('today-col');
    headerRow.appendChild(th);
  }

  const tbody = document.getElementById('habitRows');
  tbody.innerHTML = '';
  document.getElementById('emptyHint').hidden = data.habits.length > 0;

  data.habits.forEach(habit => {
    const tr = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.className = 'habit-name-cell';
    nameCell.innerHTML = `<span>${escapeHtml(habit.name)}</span><button class="delete-habit" title="Delete habit" data-habit="${habit.id}">✕</button>`;
    tr.appendChild(nameCell);

    for(let day=1; day<=numDays; day++){
      const d = new Date(year, month, day);
      const key = dateKey(d);
      const td = document.createElement('td');
      td.className = 'day-cell';
      if(key === tKey) td.classList.add('today-col');
      td.dataset.habit = habit.id;
      td.dataset.date = key;

      const done = !!(data.logs[habit.id] && data.logs[habit.id][key]);
      td.innerHTML = done
        ? '<div class="stamp">✓</div>'
        : '<div class="stamp-placeholder"></div>';

      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- EVENTS: GRID ----------
document.getElementById('habitRows').addEventListener('click', (e) => {
  const cell = e.target.closest('.day-cell');
  if(cell){
    const { habit, date } = cell.dataset;
    if(!data.logs[habit]) data.logs[habit] = {};
    data.logs[habit][date] = !data.logs[habit][date];
    if(!data.logs[habit][date]) delete data.logs[habit][date];
    saveData();
    renderGrid();
    renderStreakStrip();
    return;
  }
  const delBtn = e.target.closest('.delete-habit');
  if(delBtn){
    const id = delBtn.dataset.habit;
    const habit = data.habits.find(h => h.id === id);
    if(habit && confirm(`Delete "${habit.name}"? This removes all its history.`)){
      data.habits = data.habits.filter(h => h.id !== id);
      delete data.logs[id];
      saveData();
      renderGrid();
      renderStreakStrip();
    }
  }
});

// ---------- MONTH NAV ----------
document.getElementById('prevMonth').addEventListener('click', () => {
  viewDate.setMonth(viewDate.getMonth()-1);
  renderGrid();
});
document.getElementById('nextMonth').addEventListener('click', () => {
  viewDate.setMonth(viewDate.getMonth()+1);
  renderGrid();
});
document.getElementById('todayBtn').addEventListener('click', () => {
  viewDate = new Date();
  renderGrid();
});

// ---------- ADD HABIT MODAL ----------
const modalOverlay = document.getElementById('modalOverlay');
const newHabitName = document.getElementById('newHabitName');

document.getElementById('addHabitBtn').addEventListener('click', () => {
  modalOverlay.hidden = false;
  newHabitName.value = '';
  newHabitName.focus();
});
document.getElementById('cancelHabitBtn').addEventListener('click', () => {
  modalOverlay.hidden = true;
});
modalOverlay.addEventListener('click', (e) => {
  if(e.target === modalOverlay) modalOverlay.hidden = true;
});
document.getElementById('confirmHabitBtn').addEventListener('click', addHabit);
newHabitName.addEventListener('keydown', (e) => {
  if(e.key === 'Enter') addHabit();
});

function addHabit(){
  const name = newHabitName.value.trim();
  if(!name) return;
  data.habits.push({ id: uid(), name });
  saveData();
  modalOverlay.hidden = true;
  renderGrid();
  renderStreakStrip();
}

// ---------- DIARY ----------
const diaryDateInput = document.getElementById('diaryDate');
const diaryTextarea = document.getElementById('diaryText');
const diaryStatus = document.getElementById('diaryStatus');
const saveDiaryBtn = document.getElementById('saveDiaryBtn');

function loadDiaryFor(key){
  diaryTextarea.value = data.diary[key] || '';
  diaryStatus.textContent = data.diary[key] ? 'Saved' : 'Not saved yet';
}

diaryDateInput.value = todayKey();
loadDiaryFor(todayKey());

diaryDateInput.addEventListener('change', () => {
  loadDiaryFor(diaryDateInput.value);
});

saveDiaryBtn.addEventListener('click', () => {
  const key = diaryDateInput.value;
  data.diary[key] = diaryTextarea.value;
  saveData();
  diaryStatus.textContent = 'Saved just now';
});

diaryTextarea.addEventListener('input', () => {
  diaryStatus.textContent = 'Unsaved changes';
});

// ---------- INIT ----------
renderGrid();
renderStreakStrip();

// ---------- PWA: register service worker ----------
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}
