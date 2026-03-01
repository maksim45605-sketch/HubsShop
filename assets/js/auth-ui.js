import { auth, watchAuth, isAdmin, signInGoogleRedirect, signInEmail, signUpEmail, resetPassword, logout, tryHandleRedirectResult } from './firebase.js';
import { qs, toast } from './utils.js';

export function mountAuthUI({
  openBtnSel = '#btnOpenAuth',
  modalSel = '#authModal',
  closeSel = '#authClose',
  userChipSel = '#userChip',
  adminChipSel = '#adminChip',
  onUserChange = ()=>{}
} = {}){
  const openBtn = qs(openBtnSel);
  const modal = qs(modalSel);
  const closeBtn = qs(closeSel);
  const userChip = qs(userChipSel);
  const adminChip = qs(adminChipSel);

  const msg = qs('#authMsg');
  const email = qs('#authEmail');
  const pass = qs('#authPass');

  const btnLogin = qs('#authLogin');
  const btnRegister = qs('#authRegister');
  const btnReset = qs('#authReset');
  const btnGoogle = qs('#authGoogle');
  const btnLogout = qs('#authLogout');

  function open(){ modal.style.display='flex'; }
  function close(){ modal.style.display='none'; }

  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  modal?.addEventListener('click', (e)=>{ if (e.target === modal) close(); });

  btnGoogle?.addEventListener('click', async ()=>{
    toast(msg, 'Открываю вход Google…', 'notice');
    await signInGoogleRedirect();
  });

  btnLogin?.addEventListener('click', async ()=>{
    try{
      await signInEmail(email.value.trim(), pass.value);
      toast(msg, 'Вход выполнен ✅');
      close();
    }catch(e){
      console.warn(e);
      toast(msg, 'Ошибка входа: проверь Email/пароль', 'notice');
    }
  });

  btnRegister?.addEventListener('click', async ()=>{
    try{
      await signUpEmail(email.value.trim(), pass.value);
      toast(msg, 'Аккаунт создан ✅');
      close();
    }catch(e){
      console.warn(e);
      toast(msg, 'Ошибка регистрации: проверь Email/пароль', 'notice');
    }
  });

  btnReset?.addEventListener('click', async ()=>{
    try{
      await resetPassword(email.value.trim());
      toast(msg, 'Письмо для сброса отправлено ✅');
    }catch(e){
      console.warn(e);
      toast(msg, 'Не удалось отправить письмо. Проверь Email.', 'notice');
    }
  });

  btnLogout?.addEventListener('click', async ()=>{
    await logout();
    toast(msg, 'Вы вышли');
  });

  // Handle redirect result on every page load
  tryHandleRedirectResult();

  watchAuth((user)=>{
    const authed = !!user;
    if (userChip){
      userChip.textContent = authed ? (user.email || 'Пользователь') : 'Гость';
    }
    if (openBtn){
      openBtn.textContent = authed ? 'Аккаунт' : 'Вход / Регистрация';
    }
    if (btnLogout){
      btnLogout.classList.toggle('hidden', !authed);
    }
    if (adminChip){
      adminChip.classList.toggle('hidden', !(authed && isAdmin(user)));
    }
    onUserChange(user);
  });

  return { open, close, getUser: ()=>auth.currentUser };
}
