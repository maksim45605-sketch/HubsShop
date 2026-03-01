import { db, f } from './firebase.js';
import { mountAuthUI } from './auth-ui.js';
import { qs, escapeHtml, setLS, getLS } from './utils.js';

const selectedBox = qs('#selectedBox');
const btnToGame = qs('#btnToGame');
const gamesWrap = qs('#games');
const gamesEmpty = qs('#gamesEmpty');
const search = qs('#gameSearch');

mountAuthUI({
  onUserChange: ()=>{}
});

let gamesCache = [];
let selectedGame = getLS('selectedGame', null);

function renderSelected(){
  if (!selectedGame){
    selectedBox.innerHTML = '<div class="c-meta">Игра не выбрана</div>';
    btnToGame.disabled = true;
    return;
  }
  selectedBox.innerHTML = `
    <div class="card-row">
      <div class="thumb">${selectedGame.coverUrl ? `<img src="${escapeHtml(selectedGame.coverUrl)}" alt=""/>` : ''}</div>
      <div>
        <div class="c-title" style="margin:0 0 6px">${escapeHtml(selectedGame.name||'Игра')}</div>
        <div class="c-meta">Нажми «Далее», чтобы выбрать товар</div>
      </div>
    </div>
  `;
  btnToGame.disabled = false;
}

btnToGame.addEventListener('click', ()=>{
  if (!selectedGame) return;
  location.href = `/game/?id=${encodeURIComponent(selectedGame.id)}`;
});

qs('#btnRefresh').addEventListener('click', ()=>loadGames());

function applyFilter(){
  const q = (search.value||'').trim().toLowerCase();
  const filtered = !q ? gamesCache : gamesCache.filter(g => (g.name||'').toLowerCase().includes(q));
  renderGames(filtered);
}
search.addEventListener('input', applyFilter);

function renderGames(list){
  gamesWrap.innerHTML = '';
  gamesEmpty.classList.toggle('hidden', list.length !== 0);
  list.forEach(g=>{
    const el = document.createElement('div');
    el.className = 'tile';
    el.innerHTML = `
      <div class="tile-cover">${g.coverUrl ? `<img src="${escapeHtml(g.coverUrl)}" alt=""/>` : ''}</div>
      <div class="tile-body">
        <div class="c-title" style="margin:0">${escapeHtml(g.name||'Игра')}</div>
        <div class="c-meta">Открыть товары →</div>
      </div>
    `;
    el.addEventListener('click', ()=>{
      selectedGame = g;
      setLS('selectedGame', g);
      renderSelected();
    });
    gamesWrap.appendChild(el);
  });
}

async function loadGames(){
  gamesWrap.innerHTML = '';
  gamesEmpty.classList.add('hidden');
  try{
    const q = f.query(f.collection(db,'games'), f.orderBy('createdAt','desc'));
    const snap = await f.getDocs(q);
    gamesCache = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    applyFilter();
    // fix selected if removed
    if (selectedGame){
      const still = gamesCache.find(x=>x.id===selectedGame.id);
      if (!still){ selectedGame=null; setLS('selectedGame', null); }
    }
    renderSelected();
  }catch(e){
    console.warn(e);
    gamesEmpty.textContent = 'Ошибка загрузки игр. Проверь Firestore Rules и проект.';
    gamesEmpty.classList.remove('hidden');
  }
}

loadGames();
renderSelected();
