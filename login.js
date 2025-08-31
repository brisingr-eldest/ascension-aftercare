import { initCheckIO } from './check-io.js';
import { els } from './dom.js';
import { state } from './state.js';
import { show, hide } from './ui.js';

export async function initLogin() {
  els.loginForm.addEventListener('submit', handleLogin);
}

export async function handleLogin(e) {
  e?.preventDefault?.();
  if (els.loginError) els.loginError.textContent = '';

  const pin = els.pinInput.value.trim();
  if (!pin) {
    if (els.loginError) els.loginError.textContent = 'Please enter your PIN.';
    return;
  }
  if (pin.length !== 4 || !/^\d+$/.test(pin)) {
    if (els.loginError) els.loginError.textContent = 'PIN must be exactly 4 digits.';
    return;
  }

  try {
    const resp = await fetch('https://gdmhsmtbfziexehvltmj.supabase.co/functions/v1/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });

    const data = await resp.json();
    if (!resp.ok) {
      if (els.loginError) {
        els.loginError.textContent = data.error || 'Login failed';
        show(els.loginError);
      }
      return;
    }

    state.role = data.role;
    state.parentId = data.user_id;
    state.userId = data.user_id;
    localStorage.setItem('userRole', state.role);
    localStorage.setItem('userId', state.parentId || '');

    await showMainApp(state.role);
  } catch (err) {
    console.error(err);
    if (els.loginError) els.loginError.textContent = 'Network error. Please try again.';
  }
}

export async function showMainApp(role) {
  const loginScreen = els.loginScreen;
  const mainScreen = els.mainScreen;
  const checkInCard = els.checkInCard || document.getElementById('check-in-card');
  const checkOutCard = els.checkOutCard || document.getElementById('check-out-card');
  const adminSection = els.adminSection || document.getElementById('admin-section');

  if (els.userRoleDisplay) els.userRoleDisplay.textContent = `Role: ${role}`;

  if (loginScreen) hide(loginScreen);
  if (mainScreen) show(mainScreen);

  [checkInCard, checkOutCard, adminSection].forEach(el => el && hide(el));

  switch (role) {
    case 'admin':
      [checkInCard, checkOutCard, adminSection].forEach(el => el && show(el));
      await initCheckIO('admin', null);
      break;
    case 'teacher':
      [checkInCard, checkOutCard].forEach(el => el && show(el));
      await initCheckIO('teacher', null);
      break;
    case 'parent':
      if (checkOutCard) show(checkOutCard);
      await initCheckIO('parent', state.parentId);
      break;
    default:
      console.warn('unknown role', role);
      await initCheckIO(null, null);
  }
}
