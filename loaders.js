import { selectRecords } from './api.js';
import { createUserCard, createStudentCard } from './ui.js';

/** ============================
       Generic Card Loader
============================ */
export async function loadCards({
  table,
  selectFields,
  containerId,
  createFn,
  emptyMessage = 'No items.',
  sortBy = 'last_name',      // default sort field
  sortDir = 'asc'            // 'asc' or 'desc'
}) {
  const { data, error } = await selectRecords(table, { selectFields });
  const container = document.getElementById(containerId);
  if (!container) return console.error(`Missing container ${containerId} in DOM`);

  container.innerHTML = '';
  if (error) {
    container.innerHTML = `<div class="text-red-600">Failed to load ${table}.</div>`;
    return;
  }
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="text-gray-600">${emptyMessage}</div>`;
    return;
  }

  // Sort dynamically
  data.sort((a, b) => {
    const aVal = (a[sortBy] ?? '').toString().toLowerCase();
    const bVal = (b[sortBy] ?? '').toString().toLowerCase();
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  data.forEach(item => container.appendChild(createFn(item)));
}

/** ============================
       Users / Students Cards
============================ */
export async function loadUsersCards() {
  const sortSelect = document.getElementById('users-sort');
  let sortBy = 'last_name';
  let sortDir = 'asc';

  if (sortSelect) {
    const [field, dir] = sortSelect.value.split('-');
    sortBy = field;
    sortDir = dir;
  }

  return loadCards({
    table: 'users',
    selectFields: `
      id,
      first_name,
      last_name,
      role,
      pin,
      students_parents (
        student:students (
          id,
          first_name,
          last_name
        )
      )
    `,
    containerId: 'users-container',
    createFn: createUserCard,
    emptyMessage: 'No users found.',
    sortBy,
    sortDir
  });
}

export async function loadStudentsCards() {
  const sortSelect = document.getElementById('students-sort');
  let sortBy = 'last_name';
  let sortDir = 'asc';

  if (sortSelect) {
    const [field, dir] = sortSelect.value.split('-');
    sortBy = field;
    sortDir = dir;
  }

  return loadCards({
    table: 'students',
    selectFields: `
      id,
      last_name,
      first_name,
      grade,
      students_parents (
        parent:users (
          id,
          first_name,
          last_name
        )
      )
    `,
    containerId: 'students-container',
    createFn: createStudentCard,
    emptyMessage: 'No students found.',
    sortBy,
    sortDir
  });
}