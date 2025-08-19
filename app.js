// LifeDash — PWA dashboard
const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));
const todayISO = () => new Date().toISOString().slice(0,10);

const store = {
  get k(){ return JSON.parse(localStorage.getItem('lifedash')||'{}'); },
  set k(v){ localStorage.setItem('lifedash', JSON.stringify(v)); },
  get(){ return this.k; },
  set(obj){ this.k = obj; },
  patch(p){ const d=this.k; Object.assign(d,p); this.k=d; }
};

// init state
const data = Object.assign({
  habits: [],     // {name, done:[iso]}
  notes: [],      // {id,title,html,ts}
  gallery: [],    // dataURL strings
  reminders: []   // {id,text,ts}
}, store.get());

function save(){ store.set(data); }

/* ---------- Tabs ---------- */
$$('header .tab').forEach(b => b.addEventListener('click', () => {
  $$('.tab').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  const id = b.dataset.tab;
  $$('.view').forEach(v=>v.classList.remove('active'));
  $('#'+id).classList.add('active');
  if (id==='dash') drawChart();
}));

/* ---------- Habits ---------- */
function calcStreak(dates){
  const set=new Set(dates||[]);
  let d=new Date(), s=0;
  while(true){
    const iso=d.toISOString().slice(0,10);
    if(set.has(iso)){ s++; d.setDate(d.getDate()-1); } else break;
  }
  return s;
}
function weekDots(dates){
  const set=new Set(dates||[]), res=[];
  const d=new Date();
  for(let i=6;i>=0;i--){
    const t=new Date(d); t.setDate(d.getDate()-i);
    res.push(set.has(t.toISOString().slice(0,10)));
  }
  return res;
}

function renderHabits(){
  const ul = $('#habitList'); ul.innerHTML='';
  if (!data.habits.length) $('#habitsEmpty').style.display='block';
  else $('#habitsEmpty').style.display='none';

  let best=0; let today=0;
  data.habits.forEach((h, idx) => {
    const li = document.createElement('li'); li.className='h-item';
    li.innerHTML = `<div class="h-row">
        <div class="h-title">${h.name}</div>
        <div class="sp"></div>
        <button class="h-btn">Сегодня ✓</button>
      </div>
      <div class="h-meta">
        <div>Серия: <strong class="streak">0</strong></div>
        <div class="dots"></div>
      </div>`;

    const isDone = (h.done||[]).includes(todayISO());
    if (isDone) { li.querySelector('.h-btn').classList.add('done'); today++; }
    li.querySelector('.h-btn').onclick = () => {
      h.done = h.done||[]; if (!h.done.includes(todayISO())) h.done.push(todayISO());
      save(); renderHabits(); drawChart();
    };

    const streak = calcStreak(h.done); best = Math.max(best, streak);
    li.querySelector('.streak').textContent = streak;

    const dots = li.querySelector('.dots');
    weekDots(h.done).forEach(on => {
      const d=document.createElement('span'); d.className='dot'+(on?' on':''); dots.appendChild(d);
    });

    ul.appendChild(li);
  });
  $('#kpiHabits').textContent = data.habits.length;
  $('#kpiStreak').textContent = best;
}
$('#addHabit').onclick = () => {
  const dlg = $('#dlgHabit'); $('#dlgTitle').textContent='Новая привычка';
  $('#habitName').value=''; dlg.showModal();
  $('#saveHabit').onclick = () => {
    const v = $('#habitName').value.trim(); if(!v) return;
    data.habits.unshift({name:v, done:[]}); save(); renderHabits(); drawChart(); dlg.close();
  };
};
$('#exportCSV').onclick = () => {
  const rows = [['habit','dates']].concat(
    data.habits.map(h => [h.name, (h.done||[]).join(' ')])
  );
  const csv = rows.map(r=>r.map(x=>`"${(x||'').replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const a = Object.assign(document.createElement('a'), {href:URL.createObjectURL(blob), download:'habits.csv'});
  a.click(); URL.revokeObjectURL(a.href);
};

/* ---------- Dashboard Chart ---------- */
let chart;
function drawChart(){
  const labels = [...Array(7)].map((_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-6+i);
    return d.toLocaleDateString('ru-RU',{weekday:'short'});
  });
  const counts = [...Array(7)].map((_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-6+i);
    const iso=d.toISOString().slice(0,10);
    return data.habits.reduce((acc,h)=>acc+((h.done||[]).includes(iso)?1:0),0);
  });
  const ctx = $('#weekChart');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type:'bar',
    data:{ labels, datasets:[{ label:'Выполнено привычек', data:counts }]},
    options:{ responsive:true, maintainAspectRatio:false }
  });
}

/* ---------- Notes (simple) ---------- */
let currentNote = null;
function renderNotesList(){
  const ul = $('#noteList'); ul.innerHTML='';
  data.notes.sort((a,b)=>b.ts-a.ts).forEach(n=>{
    const li=document.createElement('li'); li.textContent=n.title||'(без названия)';
    li.onclick = ()=>{ currentNote=n; $('#noteTitle').value=n.title||''; $('#noteEditor').innerHTML=n.html||''; };
    ul.appendChild(li);
  });
}
$('#newNote').onclick = () => {
  const n={id:crypto.randomUUID(), title:$('#noteTitle').value||'Новая', html:$('#noteEditor').innerHTML||'', ts:Date.now()};
  data.notes.unshift(n); currentNote=n; save(); renderNotesList();
};
$('#deleteNote').onclick = () => {
  if (!currentNote) return;
  data.notes = data.notes.filter(n=>n.id!==currentNote.id);
  currentNote=null; $('#noteTitle').value=''; $('#noteEditor').innerHTML=''; save(); renderNotesList();
};
$('#noteTitle').addEventListener('input', ()=>{ if(currentNote){ currentNote.title=$('#noteTitle').value; currentNote.ts=Date.now(); save(); renderNotesList(); }});
$('#noteEditor').addEventListener('input', ()=>{ if(currentNote){ currentNote.html=$('#noteEditor').innerHTML; currentNote.ts=Date.now(); save(); }});

/* ---------- Gallery ---------- */
$('#addImages').onclick = ()=> $('#pickImages').click();
$('#pickImages').addEventListener('change', async (e)=>{
  const files=[...e.target.files];
  for (const f of files){
    const url = await readAsDataURL(f);
    data.gallery.unshift(url);
  }
  save(); renderGallery();
});
function readAsDataURL(f){ return new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(f); }); }
function renderGallery(){
  const g = $('#grid'); g.innerHTML='';
  data.gallery.forEach(src=>{ const img=new Image(); img.src=src; g.appendChild(img); });
}

/* ---------- Reminders ---------- */
async function notify(text){
  if (!('Notification' in window)) return alert(text);
  if (Notification.permission !== 'granted'){
    await Notification.requestPermission();
  }
  if (Notification.permission === 'granted') new Notification(text);
}
$('#addRem').onclick = async () => {
  const text=$('#remText').value.trim(); const when=$('#remTime').value;
  if(!text||!when) return;
  const ts= new Date(when).getTime();
  const r={id:crypto.randomUUID(), text, ts};
  data.reminders.push(r); save(); renderReminders();
  // локальное "псевдо-напоминание" (работает, пока вкладка открыта)
  const delay = ts - Date.now();
  if (delay>0) setTimeout(()=>notify(text), delay);
};
function renderReminders(){
  const ul=$('#remList'); ul.innerHTML='';
  data.reminders.sort((a,b)=>a.ts-b.ts).forEach(r=>{
    const li=document.createElement('li'); const dt=new Date(r.ts);
    li.textContent = `${dt.toLocaleString()} — ${r.text}`;
    ul.appendChild(li);
  });
}
$('#exportICS').onclick = () => {
  // экспорт ближайшего напоминания в .ics
  if (!data.reminders.length) return;
  const r=data.reminders[0];
  const dt = (t)=> new Date(t).toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//LifeDash//EN
BEGIN:VEVENT
UID:${r.id}
DTSTAMP:${dt(Date.now())}
DTSTART:${dt(r.ts)}
DTEND:${dt(r.ts+30*60*1000)}
SUMMARY:${r.text}
END:VEVENT
END:VCALENDAR`;
  const blob=new Blob([ics],{type:'text/calendar'});
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:'reminder.ics'});
  a.click(); URL.revokeObjectURL(a.href);
};

/* ---------- Install (A2HS) ---------- */
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault(); deferredPrompt=e;
  const b=$('#installBtn'); b.hidden=false;
  b.onclick=async()=>{ b.hidden=true; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; };
});

/* ---------- SW ---------- */
if ('serviceWorker' in navigator){
  window.addEventListener('load', ()=> navigator.serviceWorker.register('./sw.js'));
}

/* ---------- Render all ---------- */
function init(){
  renderHabits(); renderNotesList(); renderGallery(); renderReminders(); drawChart();
}
init();
