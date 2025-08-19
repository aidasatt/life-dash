const STORAGE_KEY = 'lifedash.todos.v1';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

let todos = load();

const listEl = $('#list');
const form = $('#form');
const title = $('#title');
const due = $('#due');
const important = $('#important');
const progressText = $('#progressText');
const ring = $('#ring');

let filter = 'all';

form.addEventListener('submit', e => {
  e.preventDefault();
  const item = {
    id: Date.now(),
    title: title.value.trim(),
    due: due.value || null,
    important: important.checked,
    done: false,
    createdAt: new Date().toISOString()
  };
  if (!item.title) return;
  todos.unshift(item);
  title.value = '';
  important.checked = false;
  due.value = '';
  save(); render();
});

$('#clearDone').addEventListener('click', () => {
  todos = todos.filter(t => !t.done);
  save(); render();
});

$('#export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(todos, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'lifedash-todos.json';
  document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
});

$$('.filters .chip').forEach(b=>{
  b.addEventListener('click', ()=>{
    $$('.filters .chip').forEach(x=>x.classList.remove('chip--active'));
    b.classList.add('chip--active');
    filter = b.dataset.filter;
    render();
  });
});

function load(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []; }
  catch{ return []; }
}
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}
function render(){
  const data = todos.filter(t=>{
    if (filter==='active') return !t.done;
    if (filter==='done') return t.done;
    if (filter==='important') return t.important;
    return true;
  });

  listEl.innerHTML = '';
  for (const t of data){
    const li = document.createElement('li');
    li.className = 'item' + (t.done ? ' done' : '');
    li.innerHTML = `
      <button class="btn toggle" title="Готово">
        ${t.done ? '<i class="fa-regular fa-square-check"></i>' : '<i class="fa-regular fa-square"></i>'}
      </button>
      <div>
        <div class="title">${escapeHTML(t.title)}</div>
        <div class="meta">
          ${t.important ? '<span class="badge"><i class="fa-solid fa-star"></i> важно</span>' : ''}
          ${t.due ? ' · до ' + formatDate(t.due) : ''}
        </div>
      </div>
      <div class="actions">
        <button class="btn ghost edit" title="Редактировать"><i class="fa-regular fa-pen-to-square"></i></button>
        <button class="btn ghost del" title="Удалить"><i class="fa-regular fa-trash-can"></i></button>
      </div>
    `;
    // handlers
    li.querySelector('.toggle').onclick = ()=>{ t.done = !t.done; save(); render(); };
    li.querySelector('.del').onclick = ()=>{ todos = todos.filter(x=>x.id!==t.id); save(); render(); };
    li.querySelector('.edit').onclick = ()=>{
      const newTitle = prompt('Новое название задачи', t.title);
      if (newTitle !== null){
        t.title = newTitle.trim();
        save(); render();
      }
    };
    listEl.appendChild(li);
  }

  // прогресс
  const total = todos.length || 1;
  const done = todos.filter(t=>t.done).length;
  const pct = Math.round((done/total)*100);
  progressText.textContent = pct + '%';
  ring.setAttribute('stroke-dasharray', `${pct},100`);
}

function formatDate(d){
  try{
    const dd = new Date(d);
    return dd.toLocaleDateString('ru-RU', {day:'2-digit', month:'short'});
  }catch{ return d }
}
function escapeHTML(s){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

render();
