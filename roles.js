import { CHECKED_OUT_EMPTY_MSG } from './config.js';
import { els, $ } from './dom.js';
import { renderStudentList } from './lists.js';
import { hide, show } from './ui.js';
import { refreshAdminViews, refreshStudentLists } from './refresh.js';

/** ============================
       Show Main App
============================ */
export async function showMainApp(role) {
  const loginScreen = els.loginScreen;
  const mainScreen = els.mainScreen;
  const checkInCard = $('check-in-card');
  const checkOutCard = $('check-out-card');
  const adminSection = $('admin-section');


  if (els.userRoleDisplay) els.userRoleDisplay.textContent = `Role: ${role}`;

  // hide login & card placeholders, show main
  hide(loginScreen);
  show(mainScreen);

  // hide everything first
  [checkInCard, checkOutCard, adminSection].forEach(hide);

  switch (role) {
    case 'admin':
      [checkInCard, checkOutCard, adminSection].forEach(show);
      // do an admin-only full refresh
      await refreshAdminViews();
      break;
    case 'teacher':
      [checkInCard, checkOutCard].forEach(show);
      await refreshStudentLists();
      break;
    case 'parent':
      show(checkOutCard);
      await renderStudentList({ checked_in: true, listId: 'check-out-list', buttonId: 'submit-check-out', emptyMessage: CHECKED_OUT_EMPTY_MSG });
      break;
    default:
      console.warn('unknown role', role);
  }
}
