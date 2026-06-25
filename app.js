const STORAGE_KEY = 'trackflow_data_v1';

function loadData(){
  try{ const r=localStorage.getItem(STORAGE_KEY); if(r) return JSON.parse(r); }catch(e){}
  return { habits:[], logs:{}, diary:{} };
}

let data=loadData(), viewDate=new Date();
function saveData(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); }
function pad(n){ return n.toString().padStart(2,'0'); }
function dateKey(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function todayKey(){ return dateKey(new Date()); }
function daysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function isWeekend(d){ const w=d.getDay(); return w===0||w===6; }
function monthLabel(d){ return d.toLocaleDateString('en-US',{month:'long',year:'numeric'}); }
function uid(){ return 'h_'+Math.random().toString(36).slice(2,9); }
function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

function computeStreak(hid){
  const log=data.logs[hid]||{}; let n=0,c=new Date();
  if(!log[dateKey(c)]) c.setDate(c.getDate()-1);
  while(log[dateKey(c)]){ n++; c.setDate(c.getDate()-1); }
  return n;
}

function renderStreakStrip(){
  const el=document.getElementById('streakStrip');
  el.innerHTML='';
  if(!data.habits.length){ el.style.display='none'; return; }
  el.style.display='flex';
  data.habits.forEach(h=>{
    const s=computeStreak(h.id),c=document.createElement('div');
    c.className='streak-card';
    c.innerHTML=`<div class="name">${escapeHtml(h.name)}</div><div class="count">${s}<span class="unit">day${s===1?'':'s'}</span></div>`;
    el.appendChild(c);
  });
}

function renderGrid(){
  const y=viewDate.getFullYear(),m=viewDate.getMonth();
  document.getElementById('monthLabel').textContent=monthLabel(viewDate);
  const num=daysInMonth(y,m),hr=document.getElementById('dayHeaderRow'),tk=todayKey();
  hr.innerHTML='<th class="habit-name-cell" style="background:var(--surface)"></th>';
  for(let d=1;d<=num;d++){
    const dt=new Date(y,m,d),th=document.createElement('th');
    th.textContent=d;
    if(isWeekend(dt)) th.classList.add('weekend');
    if(dateKey(dt)===tk) th.classList.add('today-col');
    hr.appendChild(th);
  }
  const tb=document.getElementById('habitRows');
  tb.innerHTML='';
  document.getElementById('emptyHint').style.display=data.habits.length?'none':'block';
  data.habits.forEach(habit=>{
    const tr=document.createElement('tr'),nc=document.createElement('td');
    nc.className='habit-name-cell';
    nc.innerHTML=`<span>${escapeHtml(habit.name)}</span><button class="delete-habit" data-habit="${habit.id}">✕</button>`;
    tr.appendChild(nc);
    for(let d=1;d<=num;d++){
      const dt=new Date(y,m,d),k=dateKey(dt),td=document.createElement('td');
      td.className='day-cell';
      if(k===tk) td.classList.add('today-col');
      td.dataset.habit=habit.id; td.dataset.date=k;
      const done=!!(data.logs[habit.id]&&data.logs[habit.id][k]);
      td.innerHTML=done?'<div class="stamp">✓</div>':'<div class="stamp-placeholder"></div>';
      tr.appendChild(td);
    }
    tb.appendChild(tr);
  });
}

document.getElementById('habitRows').addEventListener('click',e=>{
  const cell=e.target.closest('.day-cell');
  if(cell){
    const{habit,date}=cell.dataset;
    if(!data.logs[habit]) data.logs[habit]={};
    data.logs[habit][date]=!data.logs[habit][date];
    if(!data.logs[habit][date]) delete data.logs[habit][date];
    saveData(); renderGrid(); renderStreakStrip(); return;
  }
  const del=e.target.closest('.delete-habit');
  if(del){
    const id=del.dataset.habit,h=data.habits.find(x=>x.id===id);
    if(h&&confirm(`Delete "${h.name}"?`)){
      data.habits=data.habits.filter(x=>x.id!==id);
      delete data.logs[id];
      saveData(); renderGrid(); renderStreakStrip();
    }
  }
});

document.getElementById('prevMonth').addEventListener('click',()=>{ viewDate.setMonth(viewDate.getMonth()-1); renderGrid(); });
document.getElementById('nextMonth').addEventListener('click',()=>{ viewDate.setMonth(viewDate.getMonth()+1); renderGrid(); });
document.getElementById('todayBtn').addEventListener('click',()=>{ viewDate=new Date(); renderGrid(); });

// RESET ALL
document.getElementById('resetAllBtn').addEventListener('click',()=>{
  if(confirm('⚠️ Reset EVERYTHING? All habits, streaks and diary will be deleted permanently!')){
    data = { habits:[], logs:{}, diary:{} };
    saveData(); renderGrid(); renderStreakStrip();
    document.getElementById('diaryText').value='';
    document.getElementById('diaryStatus').textContent='Not saved yet';
  }
});

// MODAL
const overlay=document.getElementById('modalOverlay');
const nameInput=document.getElementById('newHabitName');

function openModal(){ overlay.style.display='flex'; nameInput.value=''; nameInput.focus(); }
function closeModal(){ overlay.style.display='none'; }

document.getElementById('addHabitBtn').addEventListener('click', openModal);
document.getElementById('cancelHabitBtn').addEventListener('click', closeModal);
overlay.addEventListener('click',e=>{ if(e.target===overlay) closeModal(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });
document.getElementById('confirmHabitBtn').addEventListener('click', addHabit);
nameInput.addEventListener('keydown',e=>{ if(e.key==='Enter') addHabit(); });

function addHabit(){
  const name=nameInput.value.trim(); if(!name) return;
  data.habits.push({id:uid(),name});
  saveData(); closeModal(); renderGrid(); renderStreakStrip();
}

// DIARY
const diaryDate=document.getElementById('diaryDate');
const diaryText=document.getElementById('diaryText');
const diaryStatus=document.getElementById('diaryStatus');

function loadDiary(k){ diaryText.value=data.diary[k]||''; diaryStatus.textContent=data.diary[k]?'✅ Saved':'Not saved yet'; }

diaryDate.value=todayKey();
loadDiary(todayKey());
diaryDate.addEventListener('change',()=>loadDiary(diaryDate.value));
document.getElementById('saveDiaryBtn').addEventListener('click',()=>{
  const k=diaryDate.value; data.diary[k]=diaryText.value;
  saveData(); diaryStatus.textContent='✅ Saved just now';
});
diaryText.addEventListener('input',()=>{ diaryStatus.textContent='⚠️ Unsaved changes'; });

renderGrid();
renderStreakStrip();

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); });
}
