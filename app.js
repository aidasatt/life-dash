const KEY = 'lifedash.todos.v1';

const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

let todos = load();
let filter = 'all';

const listEl   = $('#list');
const titleEl  = $('#title');
const dueEl    = $('#due');
const impEl    = $('#important');
const formEl   = $('#form');
const counter  = $('#counter');
const ringPath = $('#ring');
const pctText  = $('#pct');

formEl.addEventListener('submit', e => {
  e.preventDefault();
  const title = (titleEl.value || '').trim();
  if (!title) return;

  todos.unshift({
    id: Date.now(),
    title,
    due: dueEl.value || null,
    important: impEl.checked,
    done: false,
    createdAt: Date.now()
  });

  titleEl.value = '';
  dueEl.value   = '';
  impEl.checked = false;

  save(); render();
});

$('#clearDone').onclick = () => {
  todos = todos.filter(t => !t.done);
  save(); render();
};

$('#export').onclick = () => {
  const blob = new Blob([JSON.stringify(todos, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {href:url, download:'lifedash-todos.json'});
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
};

$('#import').addEventListener('change', async (e)=>{
  const f = e.target.files?.[0]; if (!f) return;
  try{
    const text = await f.text();
    const data = JSON.parse(text);
    if (Array.isArray(data)){ todos = data; save(); render(); }
    else alert('Неверный формат JSON');
  }catch{ alert('Не удалось прочитать файл'); }
  e.target.value = '';
});

$$('.chips .chip').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    $$('.chips .chip').forEach(x=>x.classList.remove('chip--active'));
    btn.classList.add('chip--active');
    filter = btn.dataset.filter;
    render();
  });
});

function load(){
  try{ return JSON.parse(localStorage.getItem(KEY)) ?? []; }
  catch{ return []; }
}
function save(){
  localStorage.setItem(KEY, JSON.stringify(todos));
}
function escapeHTML(s){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function fmtDate(d){
  try{ return new Date(d).toLocaleDateString('ru-RU',{day:'2-digit',month:'short'}); }
  catch{ return d || '' }
}

function render(){
  // фильтрация
  let items = todos.slice();
  if (filter==='active')    items = items.filter(t=>!t.done);
  if (filter==='done')      items = items.filter(t=> t.done);
  if (filter==='important') items = items.filter(t=> t.important);

  // сортировка: по дате, потом по времени создания
  items.sort((a,b)=>(a.due||'').localeCompare(b.due||'') || b.createdAt - a.createdAt);

  // счётчик и кольцо прогресса
  const done = todos.filter(t=>t.done).length;
  const total = todos.length || 1;
  const pct = Math.round(done/total*100);
  counter.innerHTML = `<i class="fa-solid fa-list-check"></i> ${done} / ${todos.length}`;
  ringPath.setAttribute('stroke-dasharray', `${pct},100`);
  pctText.textContent = pct + '%';

  // отрисовка списка
  listEl.innerHTML = '';
  if (!items.length){
    listEl.innerHTML = `<div class="muted" style="text-align:center; padding:20px">Нет задач. Добавь первую выше ↑</div>`;
    return;
  }

  for (const t of items){
    const li = document.createElement('li');
    li.className = 'item' + (t.done ? ' done' : '');
    li.innerHTML = `
      <button class="btn toggle" title="Готово">${t.done ? '<i class="fa-regular fa-square-check"></i>' : '<i class="fa-regular fa-square"></i>'}</button>
      <div>
        <div class="title">${escapeHTML(t.title)}</div>
        <div class="meta">
          ${t.important ? '<span class="badge" style="padding:4px 8px;border-radius:999px;background:rgba(124,92,255,.25);border:1px solid rgba(124,92,255,.5)"><i class="fa-solid fa-star"></i> важно</span>' : ''}
          ${t.due ? ' · до ' + fmtDate(t.due) : ''}
        </div>
      </div>
      <div class="actions">
        <button class="btn ghost edit" title="Редактировать"><i class="fa-regular fa-pen-to-square"></i></button>
        <button class="btn ghost del" title="Удалить"><i class="fa-regular fa-trash-can"></i></button>
      </div>
    `;

    li.querySelector('.toggle').onclick = () => { t.done = !t.done; save(); render(); };
    li.querySelector('.del').onclick    = () => { todos = todos.filter(x=>x.id!==t.id); save(); render(); };
    li.querySelector('.edit').onclick   = () => {
      const nt = prompt('Новое название задачи', t.title);
      if (nt !== null){ t.title = nt.trim() || t.title; save(); render(); }
    };

    listEl.appendChild(li);
  }
}

render();
