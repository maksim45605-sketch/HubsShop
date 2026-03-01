import { db, f } from './firebase.js';
import { mountAuthUI } from './auth-ui.js';
import { qs, escapeHtml, fmtMoneyRub, fmtRobux, setLS, getLS } from './utils.js';

mountAuthUI();

const params = new URLSearchParams(location.search);
const gameId = params.get('id') || (getLS('selectedGame', null)?.id) || '';

const gameTitle = qs('#gameTitle');
const gameInfo = qs('#gameInfo');
const productsWrap = qs('#products');
const productsEmpty = qs('#productsEmpty');
const search = qs('#prodSearch');
const selectedProductBox = qs('#selectedProduct');
const btnCheckout = qs('#btnCheckout');

let productsCache = [];
let selectedProduct = getLS('selectedProduct', null);
let gameData = null;

function renderSelectedProduct(){
  if (!selectedProduct){
    selectedProductBox.innerHTML = '<div class="c-meta">Товар не выбран</div>';
    btnCheckout.disabled = true;
    return;
  }
  selectedProductBox.innerHTML = `
    <div class="card-row">
      <div class="thumb">${selectedProduct.imageUrl ? `<img src="${escapeHtml(selectedProduct.imageUrl)}"/>` : ''}</div>
      <div>
        <div class="c-title" style="margin:0 0 6px">${escapeHtml(selectedProduct.title||'Товар')}</div>
        <div class="price-row">
          <span class="pill">${fmtRobux(selectedProduct.priceRobux)}</span>
          <span class="pill">${fmtMoneyRub(selectedProduct.priceRub)}</span>
        </div>
      </div>
    </div>
  `;
  btnCheckout.disabled = false;
}

btnCheckout.addEventListener('click', ()=>{
  if (!selectedProduct || !gameData) return;
  setLS('selectedGame', { id: gameId, ...gameData });
  setLS('selectedProduct', selectedProduct);
  location.href = `/checkout/?game=${encodeURIComponent(gameId)}&product=${encodeURIComponent(selectedProduct.id)}`;
});

qs('#btnRefresh').addEventListener('click', ()=>loadProducts());

function applyFilter(){
  const q = (search.value||'').trim().toLowerCase();
  const filtered = !q ? productsCache : productsCache.filter(p => (p.title||'').toLowerCase().includes(q));
  renderProducts(filtered);
}
search.addEventListener('input', applyFilter);

function renderProducts(list){
  productsWrap.innerHTML = '';
  productsEmpty.classList.toggle('hidden', list.length !== 0);
  list.forEach(p=>{
    const el = document.createElement('div');
    el.className = 'tile';
    el.innerHTML = `
      <div class="tile-cover">${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}"/>` : ''}</div>
      <div class="tile-body">
        <div class="c-title" style="margin:0">${escapeHtml(p.title||'Товар')}</div>
        <div class="c-meta">${escapeHtml((p.description||'').slice(0,80))}${(p.description||'').length>80?'…':''}</div>
        <div class="price-row">
          <span class="pill">${fmtRobux(p.priceRobux)}</span>
          <span class="pill">${fmtMoneyRub(p.priceRub)}</span>
        </div>
        <div style="height:8px"></div>
        <button class="btn btn-primary" style="width:100%">Выбрать</button>
      </div>
    `;
    el.querySelector('button').addEventListener('click', (ev)=>{
      ev.stopPropagation();
      selectedProduct = p;
      setLS('selectedProduct', p);
      renderSelectedProduct();
    });
    el.addEventListener('click', ()=>{
      selectedProduct = p;
      setLS('selectedProduct', p);
      renderSelectedProduct();
    });
    productsWrap.appendChild(el);
  });
}

async function loadGame(){
  if (!gameId){
    gameTitle.textContent = 'Игра не выбрана';
    gameInfo.innerHTML = '<div class="c-meta">Вернись на главную и выбери игру</div>';
    return;
  }
  const ref = f.doc(db, 'games', gameId);
  const snap = await f.getDoc(ref);
  if (!snap.exists()){
    gameTitle.textContent = 'Игра не найдена';
    gameInfo.innerHTML = '<div class="c-meta">Такой игры нет в базе</div>';
    return;
  }
  gameData = snap.data();
  gameTitle.textContent = gameData.name || 'Игра';
  gameInfo.innerHTML = `
    <div class="card-row">
      <div class="thumb">${gameData.coverUrl ? `<img src="${escapeHtml(gameData.coverUrl)}"/>` : ''}</div>
      <div>
        <div class="c-title" style="margin:0 0 6px">${escapeHtml(gameData.name||'Игра')}</div>
        <div class="c-meta">ID: ${escapeHtml(gameId)}</div>
      </div>
    </div>
  `;
}

async function loadProducts(){
  productsWrap.innerHTML = '';
  productsEmpty.classList.add('hidden');
  if (!gameId){
    productsEmpty.textContent = 'Сначала выбери игру.';
    productsEmpty.classList.remove('hidden');
    return;
  }
  try{
    const q = f.query(
      f.collection(db,'products'),
      f.where('gameId','==', gameId),
      f.orderBy('createdAt','desc')
    );
    const snap = await f.getDocs(q);
    productsCache = snap.docs.map(d=>({ id:d.id, ...d.data() }));
    applyFilter();

    // fix selected if removed
    if (selectedProduct && selectedProduct.gameId !== gameId){
      selectedProduct = null; setLS('selectedProduct', null);
    }
    if (selectedProduct){
      const still = productsCache.find(x=>x.id===selectedProduct.id);
      if (!still){ selectedProduct=null; setLS('selectedProduct', null); }
    }
    renderSelectedProduct();
  }catch(e){
    console.warn(e);
    productsEmpty.textContent = 'Ошибка загрузки товаров. Проверь Firestore Rules.';
    productsEmpty.classList.remove('hidden');
  }
}

await loadGame();
await loadProducts();
renderSelectedProduct();
