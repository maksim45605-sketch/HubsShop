import { db, f, auth } from './firebase.js';
import { mountAuthUI } from './auth-ui.js';
import { qs, escapeHtml, fmtMoneyRub, fmtRobux, getLS, copyText, toast, uid6 } from './utils.js';

mountAuthUI();

const params = new URLSearchParams(location.search);
const gameId = params.get('game') || getLS('selectedGame', null)?.id || '';
const productId = params.get('product') || getLS('selectedProduct', null)?.id || '';

const summary = qs('#summary');
const receiptBox = qs('#receiptBox');
const btnMake = qs('#btnMake');
const btnCopy = qs('#btnCopy');
const btnTg = qs('#btnTg');
const msg = qs('#checkoutMsg');

const nick = qs('#nick');
const promoInput = qs('#promo');
const tg = qs('#tg');

let game = null;
let product = null;
let receiptText = '';

async function load(){
  if (!gameId || !productId){
    summary.innerHTML = '<div class="c-meta">Не выбрана игра/товар. Вернись на главную.</div>';
    btnMake.disabled = true;
    return;
  }
  const gSnap = await f.getDoc(f.doc(db,'games',gameId));
  if (gSnap.exists()) game = gSnap.data();

  const pSnap = await f.getDoc(f.doc(db,'products',productId));
  if (pSnap.exists()) product = { id: pSnap.id, ...pSnap.data() };

  if (!product){
    summary.innerHTML = '<div class="c-meta">Товар не найден.</div>';
    btnMake.disabled = true;
    return;
  }

  summary.innerHTML = `
    <div class="card-row">
      <div class="thumb">${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}"/>` : ''}</div>
      <div>
        <div class="c-title" style="margin:0 0 6px">${escapeHtml(product.title||'Товар')}</div>
        <div class="c-meta">Игра: ${escapeHtml(game?.name || product.gameName || '—')}</div>
        <div class="price-row">
          <span class="pill">${fmtRobux(product.priceRobux)}</span>
          <span class="pill">${fmtMoneyRub(product.priceRub)}</span>
        </div>
      </div>
    </div>
  `;
}

async function findPromo(code){
  const c = (code||'').trim().toUpperCase();
  if (!c) return null;
  const q = f.query(f.collection(db,'promocodes'), f.where('code','==', c), f.where('active','==', true));
  const snap = await f.getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

function calcTotals(promo){
  let rub = Number(product.priceRub||0);
  let robux = Number(product.priceRobux||0);
  let discRub = 0;
  let discRobux = 0;

  if (promo){
    if (promo.type === 'percent'){
      const k = Math.max(0, Math.min(100, Number(promo.value||0))) / 100;
      discRub = Math.round(rub * k);
      discRobux = Math.round(robux * k);
    } else if (promo.type === 'rub'){
      discRub = Math.max(0, Math.round(Number(promo.value||0)));
    } else if (promo.type === 'robux'){
      discRobux = Math.max(0, Math.round(Number(promo.value||0)));
    }
  }

  const totalRub = Math.max(0, rub - discRub);
  const totalRobux = Math.max(0, robux - discRobux);
  return { rub, robux, discRub, discRobux, totalRub, totalRobux };
}

btnMake.addEventListener('click', async ()=>{
  try{
    if (!product) return;
    const n = nick.value.trim();
    if (!n){ toast(msg, 'Напиши никнейм (обязательно)', 'notice'); return; }

    btnMake.disabled = true;
    toast(msg, 'Готовлю чек…', 'notice');

    const promo = await findPromo(promoInput.value);
    const totals = calcTotals(promo);

    // Order doc
    const user = auth.currentUser;
    const orderPayload = {
      createdAt: f.serverTimestamp(),
      status: 'created',
      gameId,
      productId: product.id,
      productTitle: product.title || '',
      gameName: game?.name || '',
      userId: user?.uid || null,
      userEmail: user?.email || null,
      nick: n,
      tg: (tg.value||'').trim(),
      promoCode: promo ? promo.code : null,
      promoType: promo ? promo.type : null,
      promoValue: promo ? promo.value : null,
      priceRub: totals.rub,
      priceRobux: totals.robux,
      discountRub: totals.discRub,
      discountRobux: totals.discRobux,
      totalRub: totals.totalRub,
      totalRobux: totals.totalRobux,
      deliverId: product.deliverId || product.itemId || uid6(),
    };

    const ref = await f.addDoc(f.collection(db,'orders'), orderPayload);
    const orderId = ref.id;

    receiptText = [
      'HubsShop - топ магазин',
      `Заказ: ${orderId}`,
      `Игра: ${orderPayload.gameName || '—'}`,
      `Товар: ${orderPayload.productTitle || '—'}`,
      `Цена: ${totals.totalRobux} R$ / ${totals.totalRub} ₽`,
      promo ? `Промокод: ${promo.code}` : 'Промокод: —',
      `Ник: ${orderPayload.nick}`,
      orderPayload.tg ? `Telegram: ${orderPayload.tg}` : 'Telegram: —',
      `ID для выдачи: ${orderPayload.deliverId}`,
      '',
      'Отправь этот чек в Telegram: @RealZanT'
    ].join('\n');

    receiptBox.innerHTML = `<pre style="margin:0; white-space:pre-wrap; font-weight:800; color:#3c444d">${escapeHtml(receiptText)}</pre>`;
    btnCopy.disabled = false;

    // Prefill Telegram message
    const tgText = encodeURIComponent(receiptText);
    btnTg.href = `https://t.me/RealZanT?text=${tgText}`;

    toast(msg, 'Чек готов ✅', 'success');
  }catch(e){
    console.warn(e);
    toast(msg, 'Ошибка создания чека. Проверь Firestore Rules.', 'notice');
  }finally{
    btnMake.disabled = false;
  }
});

btnCopy.addEventListener('click', async ()=>{
  if (!receiptText) return;
  try{ await copyText(receiptText); toast(msg, 'Скопировано ✅', 'success'); }
  catch{ toast(msg, 'Не удалось скопировать', 'notice'); }
});

await load();
