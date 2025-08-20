// lists.js
// Handles student check-in/out lists and rendering.
// Exports an API for UI wiring.

import { fetchStudents, updateRecords } from './api.js';
import { createStudentListItem, setEmptyMessage } from './ui.js';
import { $, els } from './dom.js';
import { refreshStudentLists } from './refresh.js';
import { attendanceAPI, refreshAttendanceFeed } from './attendance.js';
import { state } from './state.js';

/** ============================
       Private Helpers
============================ */

/** Get all checked checkbox values from a list */
function getCheckedIdsFromList(listId) {
  const checked = document.querySelectorAll(`#${listId} input[type="checkbox"]:checked`);
  return Array.from(checked).map(cb => cb.value);
}

/** Sort students by last name, then first name */
function sortStudents(students) {
  return students.slice().sort((a, b) => {
    const aLast = (a.last_name ?? '').toLowerCase();
    const bLast = (b.last_name ?? '').toLowerCase();
    if (aLast !== bLast) return aLast < bLast ? -1 : 1;

    const aFirst = (a.first_name ?? '').toLowerCase();
    const bFirst = (b.first_name ?? '').toLowerCase();
    if (aFirst !== bFirst) return aFirst < bFirst ? -1 : 1;

    return 0;
  });
}

/** Handle check-in/out logic */
async function handleCheckInOut(action) {
  const listId = action === 'check-in' ? 'check-in-list' : 'check-out-list';
  const studentIds = getCheckedIdsFromList(listId);

  if (!studentIds.length) {
    alert(`Please select at least one student to ${action.replace('-', ' ')}`);
    return;
  }

  const newStatus = action === 'check-in';

  const { error } = await updateRecords('students', { checked_in: newStatus }, { id: studentIds });
  if (error) {
    console.error('Check-in/out failed', error);
    alert('Something went wrong. Please try again.');
    return;
  }

  // Fire-and-forget attendance logging
  const performerId = state.parentId;
  const logAction = newStatus ? 'in' : 'out';
  Promise.allSettled(studentIds.map(id => attendanceAPI.log(id, logAction, performerId)));

  // Refresh UI
  await refreshStudentLists();

  updateSelectAllVisibility('check-in-list');
  updateSelectAllVisibility('check-out-list');

  await refreshAttendanceFeed();
}

function initSelectAll(listId) {
  // Normalize base name: 'check-in-list' -> 'check-in'
  const base = listId.endsWith('-list') ? listId.slice(0, -5) : listId;

  // wrapper id in your HTML is e.g. "check-in-select-all-wrapper"
  const wrapperId = `${base}-select-all-wrapper`;
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return; // no wrapper in DOM -> nothing to do

  // find the checkbox inside the wrapper (more robust than getElementById)
  const selectAll = wrapper.querySelector('input[type="checkbox"]');
  if (!selectAll) return; // malformed wrapper

  // the visual box and SVG are within the wrapper's span/svg
  const boxSpan = wrapper.querySelector('span');
  const checkmarkSvg = wrapper.querySelector('svg');

  const listContainer = document.getElementById(listId);
  if (!listContainer) return;

  // SHOW/HIDE wrapper depending on whether there are student items
  // We assume createStudentListItem appends elements to listContainer (so children > 0 means have students)
  wrapper.classList.toggle('hidden', listContainer.children.length === 0);

  // Toggle checkmark and toggle all student checkboxes
  selectAll.addEventListener('change', () => {
    const checked = selectAll.checked;
    if (checkmarkSvg) checkmarkSvg.classList.toggle('hidden', !checked);

    // Find per-student checkbox inputs inside the list. We assume they are normal inputs.
    const studentCheckboxes = listContainer.querySelectorAll('input[type="checkbox"]');
    studentCheckboxes.forEach(cb => {
      cb.checked = checked;

      // If your per-item UI uses a visual span+svg like the "Select All" wrapper,
      // try to toggle that svg too (safe even if not present)
      const cbBox = cb.nextElementSibling; // typical structure: <input /><span>...</span>
      if (cbBox) {
        const cbSvg = cbBox.querySelector('svg');
        if (cbSvg) cbSvg.classList.toggle('hidden', !checked);
      }

      // trigger change event so handlers (syncCheckButtons) run
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  // If any student checkbox changes, update selectAll accordingly
  listContainer.addEventListener('change', (e) => {
    if (e.target && e.target.matches('input[type="checkbox"]')) {
      // ignore the selectAll input itself (selectAll lives outside the list)
      const allStudentCheckboxes = Array.from(listContainer.querySelectorAll('input[type="checkbox"]'));
      const allChecked = allStudentCheckboxes.length > 0 && allStudentCheckboxes.every(cb => cb.checked);
      selectAll.checked = allChecked;
      if (checkmarkSvg) checkmarkSvg.classList.toggle('hidden', !allChecked);

      // keep submit buttons in sync
      syncCheckButtons();
    }
  });

  // initial sync of visual state
  const allStudentCheckboxes = Array.from(listContainer.querySelectorAll('input[type="checkbox"]'));
  const allChecked = allStudentCheckboxes.length > 0 && allStudentCheckboxes.every(cb => cb.checked);
  selectAll.checked = allChecked;
  if (checkmarkSvg) checkmarkSvg.classList.toggle('hidden', !allChecked);
}

function updateSelectAllVisibility(listId) {
  // Normalize base name: 'check-in-list' -> 'check-in'
  const base = listId.endsWith('-list') ? listId.slice(0, -5) : listId;
  const wrapperId = `${base}-select-all-wrapper`;

  const listContainer = document.getElementById(listId);
  const selectAllWrapper = document.getElementById(wrapperId);

  if (!listContainer || !selectAllWrapper) return;

  const hasStudents = listContainer.children.length > 0;
  selectAllWrapper.classList.toggle('hidden', !hasStudents);
}

/** ============================
       Public API
============================ */

/** Show/hide check-in/out buttons based on selections */
export function syncCheckButtons() {
  const anyCheckInSelected = !!els.checkInList.querySelector('input[type="checkbox"]:checked');
  const anyCheckOutSelected = !!els.checkOutList.querySelector('input[type="checkbox"]:checked');

  els.submitCheckIn.classList.toggle('hidden', !anyCheckInSelected);
  els.checkInMsg.classList.toggle('hidden', anyCheckInSelected);
  els.submitCheckOut.classList.toggle('hidden', !anyCheckOutSelected);
  els.checkOutMsg.classList.toggle('hidden', anyCheckOutSelected);
}

/** Load & render student list */
export async function renderStudentList({ checked_in, listId, buttonId, emptyMessage }) {
  const listContainer = $(listId);
  const submitButton = $(buttonId);

  if (!listContainer) { console.error('Missing list container:', listId); return; }
  if (!submitButton) console.warn('Missing submit button:', buttonId);

  // Clear list & hide submit button
  listContainer.innerHTML = '';
  if (submitButton) submitButton.classList.add('hidden');

  // Fetch students
  const students = await fetchStudents({ checked_in });
  if (!students || !students.length) {
    setEmptyMessage(listContainer, emptyMessage);
    return;
  }

  // Sort & render
  sortStudents(students).forEach(s => listContainer.appendChild(createStudentListItem(s)));

  const wrapper = $(`${listId}-select-all-wrapper`);
  if (wrapper) wrapper.classList.remove('hidden');
  initSelectAll(listId);
  updateSelectAllVisibility(listId);
}

/** Thin wrappers for events.js */
export async function handleCheckIn() {
  return await handleCheckInOut('check-in');
}

export async function handleCheckOut() {
  return await handleCheckInOut('check-out');
}
