import { db, f, auth, isAdmin } from './firebase.js';
import { mountAuthUI } from './auth-ui.js';
import { qs, escapeHtml, fmtMoneyRub, fmtRobux, toast } from './utils.js';

const noAdmin = qs('#noAdmin');
const adminUI = qs('#adminUI');
const msg = qs('#adminMsg');

const gamesList = qs('#gamesList');
const productsList = qs('#productsList');
const promoList = qs('#promoList');

const gName = qs('#gName');
const gCover = qs('#gCover');
const btnAddGame = qs('#btnAddGame');

const pGame = qs('#pGame');
const pTitle = qs('#pTitle');
const pImg = qs('#pImg');
const pRobux = qs('#pRobux');
const pRub = qs('#pRub');
const pDeliver = qs('#pDeliver');
const pDesc = qs('#pDesc');
const btnAddProduct = qs('#btnAddProduct');

const promoCode = qs('#promoCode');
const promoType = qs('#promoType');
const promoValue = qs('#promoValue');
const btnAddPromo = qs('#btnAddPromo');

let selectedGame = null;

mountAuthUI({
  onUserChange: (user)=>{
    const ok = isAdmin(user);
    noAdmin.classList.toggle('hidden', ok);
    adminUI.classList.toggle('hidden', !ok);
    if (ok){
      loadGames();
      loadPromos();
    }
  }
});

function ensureAdmin(){
  const user = auth.currentUser;
  return isAdmin(user);
}

async function loadGames(){
  gamesList.innerHTML = '';
  productsList.innerHTML = '';
  selectedGame = null;
  pGame.value = '';

  const q = f.query(f.collection(db,'games'), f.orderBy('createdAt','desc'));
  const snap = await f.getDocs(q);
  const games = snap.docs.map(d=>({ id:d.id, ...d.data() }));

  games.forEach(g=>{
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <div class="card-row" style="align-items:flex-start">
        <div class="thumb">${g.coverUrl ? `<img src="${escapeHtml(g.coverUrl)}"/>` : ''}</div>
        <div style="flex:1">
          <div class="c-title" style="margin:0 0 6px">${escapeHtml(g.name||'Игра')}</div>
          <div class="c-meta">ID: ${escapeHtml(g.id)}</div>
          <div style="height:8px"></div>
          <div style="display:flex; gap:8px; flex-wrap:wrap">
            <button class="btn btn-primary" data-act="select">Выбрать</button>
            <button class="btn btn-secondary" data-act="del">Удалить</button>
          </div>
        </div>
      </div>
    `;
    el.querySelector('[data-act="select"]').addEventListener('click', async ()=>{
      selectedGame = g;
      pGame.value = `${g.name} (${g.id})`;
      await loadProducts();
      toast(msg, 'Игра выбрана ✅');
    });
    el.querySelector('[data-act="del"]').addEventListener('click', async ()=>{
      if (!confirm('Удалить игру? Товары останутся, если их отдельно не удалить.')) return;
      try{
        await f.deleteDoc(f.doc(db,'games',g.id));
        toast(msg, 'Игра удалена', 'success');
        await loadGames();
      }catch(e){
        console.warn(e);
        toast(msg, 'Ошибка удаления. Проверь Rules.', 'notice');
      }
    });
    gamesList.appendChild(el);
  });

  if (!games.length){
    gamesList.innerHTML = '<div class="notice">Пока нет игр</div>';
  }
}

async function loadProducts(){
  productsList.innerHTML = '';
  if (!selectedGame){
    productsList.innerHTML = '<div class="notice">Выбери игру слева</div>';
    return;
  }
  const q = f.query(
    f.collection(db,'products'),
    f.where('gameId','==', selectedGame.id),
    f.orderBy('createdAt','desc')
  );
  const snap = await f.getDocs(q);
  const prods = snap.docs.map(d=>({ id:d.id, ...d.data() }));

  prods.forEach(p=>{
    const el = document.createElement('div');
    el.className = 'tile';
    el.innerHTML = `
      <div class="tile-cover">${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}"/>` : ''}</div>
      <div class="tile-body">
        <div class="c-title" style="margin:0">${escapeHtml(p.title||'Товар')}</div>
        <div class="c-meta">ID выдачи: ${escapeHtml(p.deliverId||'—')}</div>
        <div class="price-row">
          <span class="pill">${fmtRobux(p.priceRobux)}</span>
          <span class="pill">${fmtMoneyRub(p.priceRub)}</span>
        </div>
        <div style="height:8px"></div>
        <button class="btn btn-secondary" style="width:100%">Удалить</button>
      </div>
    `;
    el.querySelector('button').addEventListener('click', async ()=>{
      if (!confirm('Удалить товар?')) return;
      try{
        await f.deleteDoc(f.doc(db,'products',p.id));
        toast(msg, 'Товар удалён', 'success');
        await loadProducts();
      }catch(e){
        console.warn(e);
        toast(msg, 'Ошибка удаления товара', 'notice');
      }
    });
    productsList.appendChild(el);
  });

  if (!prods.length){
    productsList.innerHTML = '<div class="notice">Пока нет товаров</div>';
  }
}

btnAddGame.addEventListener('click', async ()=>{
  if (!ensureAdmin()) return;
  const name = gName.value.trim();
  if (!name){ toast(msg, 'Название игры обязательно', 'notice'); return; }
  try{
    await f.addDoc(f.collection(db,'games'), {
      name,
      coverUrl: gCover.value.trim(),
      createdAt: f.serverTimestamp(),
    });
    gName.value=''; gCover.value='';
    toast(msg, 'Игра добавлена ✅', 'success');
    await loadGames();
  }catch(e){
    console.warn(e);
    toast(msg, 'Ошибка добавления игры. Проверь Rules.', 'notice');
  }
});

btnAddProduct.addEventListener('click', async ()=>{
  if (!ensureAdmin()) return;
  if (!selectedGame){ toast(msg, 'Сначала выбери игру слева', 'notice'); return; }
  const title = pTitle.value.trim();
  if (!title){ toast(msg, 'Название товара обязательно', 'notice'); return; }

  const payload = {
    gameId: selectedGame.id,
    gameName: selectedGame.name || '',
    title,
    description: pDesc.value.trim(),
    imageUrl: pImg.value.trim(),
    priceRobux: Number(pRobux.value||0),
    priceRub: Number(pRub.value||0),
    deliverId: pDeliver.value.trim(),
    createdAt: f.serverTimestamp(),
  };

  try{
    await f.addDoc(f.collection(db,'products'), payload);
    pTitle.value=''; pImg.value=''; pRobux.value=''; pRub.value=''; pDeliver.value=''; pDesc.value='';
    toast(msg, 'Товар добавлен ✅', 'success');
    await loadProducts();
  }catch(e){
    console.warn(e);
    toast(msg, 'Ошибка добавления товара', 'notice');
  }
});

async function loadPromos(){
  promoList.innerHTML='';
  const q = f.query(f.collection(db,'promocodes'), f.orderBy('createdAt','desc'));
  const snap = await f.getDocs(q);
  const promos = snap.docs.map(d=>({ id:d.id, ...d.data() }));

  promos.forEach(p=>{
    const el = document.createElement('div');
    el.className = 'card';
    const badge = p.active ? '<span class="pill">Активен</span>' : '<span class="pill" style="opacity:.6">Выключен</span>';
    el.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start">
        <div>
          <div class="c-title" style="margin:0 0 6px">${escapeHtml(p.code||'CODE')}</div>
          <div class="c-meta">${escapeHtml(p.type||'percent')} : ${escapeHtml(String(p.value??''))}</div>
        </div>
        ${badge}
      </div>
      <div style="height:8px"></div>
      <div style="display:flex; gap:8px; flex-wrap:wrap">
        <button class="btn btn-soft" data-act="toggle">Вкл/Выкл</button>
        <button class="btn btn-secondary" data-act="del">Удалить</button>
      </div>
    `;
    el.querySelector('[data-act="toggle"]').addEventListener('click', async ()=>{
      try{
        await f.updateDoc(f.doc(db,'promocodes',p.id), { active: !p.active });
        await loadPromos();
      }catch(e){
        console.warn(e);
        toast(msg, 'Ошибка обновления промокода', 'notice');
      }
    });
    el.querySelector('[data-act="del"]').addEventListener('click', async ()=>{
      if (!confirm('Удалить промокод?')) return;
      try{
        await f.deleteDoc(f.doc(db,'promocodes',p.id));
        await loadPromos();
      }catch(e){
        console.warn(e);
        toast(msg, 'Ошибка удаления промокода', 'notice');
      }
    });
    promoList.appendChild(el);
  });

  if (!promos.length){
    promoList.innerHTML = '<div class="notice">Пока нет промокодов</div>';
  }
}

btnAddPromo.addEventListener('click', async ()=>{
  if (!ensureAdmin()) return;
  const code = promoCode.value.trim().toUpperCase();
  if (!code){ toast(msg, 'Код обязателен', 'notice'); return; }
  const type = promoType.value;
  const value = Number(promoValue.value||0);
  try{
    await f.addDoc(f.collection(db,'promocodes'), {
      code,
      type,
      value,
      active: true,
      createdAt: f.serverTimestamp(),
    });
    promoCode.value=''; promoValue.value='';
    toast(msg, 'Промокод создан ✅', 'success');
    await loadPromos();
  }catch(e){
    console.warn(e);
    toast(msg, 'Ошибка создания промокода', 'notice');
  }
});
