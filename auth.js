import { els } from './dom.js';
import { showMainApp } from './roles.js';
import { state } from './state.js';
import { show } from './ui.js';

export async function handleLogin(e) {
  e.preventDefault();
  els.loginError.textContent = '';

  const pin = els.pinInput.value.trim();
  if (!pin) return (els.loginError.textContent = 'Please enter your PIN.');
  if (pin.length !== 4 || !/^\d+$/.test(pin)) return (els.loginError.textContent = 'PIN must be exactly 4 digits.');

  try {
    const resp = await fetch('https://gdmhsmtbfziexehvltmj.supabase.co/functions/v1/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    const data = await resp.json();
    if (!resp.ok) { els.loginError.textContent = data.error || 'Login failed'; show(els.loginError); return; }

    // success
    state.role = data.role;
    state.parentId = data.user_id;
    localStorage.setItem('userRole', state.role);
    localStorage.setItem('userId', state.parentId);

    showMainApp(state.role);
  } catch (err) {
    console.error(err);
    els.loginError.textContent = 'Network error. Please try again.';
  }
}

export function handleLogout() { location.reload(); }