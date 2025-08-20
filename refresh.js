import { renderStudentList } from './lists.js';
import { loadUsersCards, loadStudentsCards } from './loaders.js';
import { initStudentPicker } from './picker.js';
import { CHECKED_IN_EMPTY_MSG, CHECKED_OUT_EMPTY_MSG } from './config.js';
import { refreshAttendanceFeed } from './attendance.js';
import { ensureStudentCache, ensureUserCache } from './state.js';

/* ============================
       Refresh Student Lists
   ============================ */
export async function refreshStudentLists() {
  // Load both check-in and check-out lists in parallel
  await Promise.all([
    renderStudentList({
      checked_in: false,
      listId: 'check-in-list',
      buttonId: 'submit-check-in',
      emptyMessage: CHECKED_IN_EMPTY_MSG
    }),
    renderStudentList({
      checked_in: true,
      listId: 'check-out-list',
      buttonId: 'submit-check-out',
      emptyMessage: CHECKED_OUT_EMPTY_MSG
    })
  ]);
}

/* ============================
       Refresh Admin Views
   ============================ */
export async function refreshAdminViews() {
  await Promise.all([ensureStudentCache(), ensureUserCache()]);

  // Load users, students, and initialize picker in parallel
  await Promise.all([
    loadUsersCards(),
    loadStudentsCards(),
    initStudentPicker(),
    refreshAttendanceFeed()
  ]);

  // Refresh the student check-in/out lists after main admin data
  await refreshStudentLists();
}