import { UI_CLASSES } from './config.js';
import { el } from './dom.js';
import { openEditStudentModal, openEditUserModal } from './modals.js';
import { deleteRecords } from './api.js';
import { loadUsersCards } from './loaders.js';
import { refreshAdminViews } from './refresh.js';

/* ============================
       Generic UI Helpers
   ============================ */
export function createActionButton(label, className, onClick) {
  const btn = el('button', { class: className, text: label });
  if (typeof onClick === 'function') btn.addEventListener('click', onClick);
  return btn;
}

/* Create a basic card skeleton with content & actions containers */
export function createCardBase(baseKey, titleText) {
  const card = el('div', { class: `${UI_CLASSES[baseKey]} ${UI_CLASSES.tableCard ?? ''}` });
  const titleDiv = el('div', { class: UI_CLASSES.cardTableName || '', text: titleText || '' });
  card.appendChild(titleDiv);

  const contentContainer = el('div', { class: UI_CLASSES.cardContent || UI_CLASSES.cardTableItem || '' });
  card.appendChild(contentContainer);

  const actionsContainer = el('div', { class: UI_CLASSES.actionsContainer || '' });
  card.appendChild(actionsContainer);

  return { card, contentContainer, actionsContainer };
}

/* Render pills for relations (parents/children) */
export function renderRelations(container, prefixText, items = [], renderLabel) {
  container.appendChild(el('span', { class: UI_CLASSES.cardTablePrefix || '', text: prefixText }));

  if (!items || items.length === 0) {
    container.appendChild(el('span', { text: '—' }));
    return;
  }

  items.forEach(it => {
    const label = typeof renderLabel === 'function' ? renderLabel(it) : String(it);
    const pill = el('span', { class: UI_CLASSES.pill || '', text: label });
    container.appendChild(pill);
  });
}

/* Generic card creation for any entity (user/student) */
export function createEntityCard({ entity, title = '', contentRows = [], relations = [], onEdit, onDelete, cardKey }) {
  const { card, contentContainer, actionsContainer } = createCardBase(cardKey, title);

  // Add content rows
  contentRows.forEach(r => {
    contentContainer.appendChild(
      el('div', { class: UI_CLASSES.cardTableItem || '', text: `${r.label}: ${r.value ?? '—'}` })
    );
  });

  // Add relations
  relations.forEach(r => {
    const relContainer = el('div', { class: UI_CLASSES.relationContainer || '' });
    renderRelations(relContainer, r.prefix, r.items, r.renderLabel);
    contentContainer.appendChild(relContainer);
  });

  // Add actions
  if (onEdit) actionsContainer.appendChild(
    createActionButton('Edit', `${UI_CLASSES.editAction} ${UI_CLASSES.actionLink}`.trim(), onEdit)
  );
  if (onDelete) actionsContainer.appendChild(
    createActionButton('Delete', `${UI_CLASSES.deleteAction} ${UI_CLASSES.actionLink}`.trim(), onDelete)
  );

  return card;
}

/* ============================
       User / Student Cards
   ============================ */
export function createUserCard(user) {
  return createEntityCard({
    entity: user,
    title: `${user.last_name}, ${user.first_name}`,
    contentRows: [{ label: 'Role', value: user.role }],
    relations: [{
      prefix: 'Child(ren):',
      items: (user.students_parents || []).map(sp => sp.student || {}),
      renderLabel: s => `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()
    }],
    onEdit: () => openEditUserModal(user),
    onDelete: async () => {
      if (!confirm(`Are you sure you want to permanently delete ${user.name}? This cannot be undone.`)) return;
      const { error } = await deleteRecords('users', { id: user.id });
      if (!error) await loadUsersCards();
    },
    cardKey: 'userCard'
  });
}

export function createStudentCard(student) {
  const fullName = `${student.last_name || ''}${student.first_name ? ', ' + student.first_name : ''}`.trim();
  return createEntityCard({
    entity: student,
    title: fullName,
    contentRows: [{ label: 'Grade', value: student.grade }],
    relations: [{
      prefix: 'Parent(s):',
      items: (student.students_parents || []).map(sp => sp.parent || {}),
      renderLabel: p => p.name || 'Unknown'
    }],
    onEdit: () => openEditStudentModal(student),
    onDelete: async () => {
      if (!confirm(`Permanently delete ${student.first_name} ${student.last_name}? This cannot be undone.`)) return;
      const { error: relErr } = await deleteRecords('students_parents', { student_id: student.id });
      if (relErr) { alert('Failed to remove student links. See console.'); console.error(relErr); return; }
      const { error } = await deleteRecords('students', { id: student.id });
      if (error) { alert('Failed to delete student. See console.'); console.error(error); return; }
      await refreshAdminViews();
    },
    cardKey: 'studentCard'
  });
}

/* ============================
       Student List Items
   ============================ */
export function createStudentListItem(student) {
  const item = el('label', { class: UI_CLASSES.studentListItem || 'flex items-center space-x-3 p-3 cursor-pointer text-base' });

  const checkbox = el('input', { type: 'checkbox', value: student.id });
  checkbox.className = UI_CLASSES.checkboxInput;

  const box = el('span', { class: UI_CLASSES.checkboxBox });
  box.innerHTML = `
    <svg class="${UI_CLASSES.checkboxIcon}" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" focusable="false">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;

  const nameSpan = el('span', { class: UI_CLASSES.studentName || 'text-sm', text: `${student.last_name}, ${student.first_name}` });

  item.appendChild(checkbox);
  item.appendChild(box);
  item.appendChild(nameSpan);

  return item;
}

export function setEmptyMessage(container, msg) {
  container.innerHTML = '';
  container.textContent = msg;
}
/** ============================
        Show/Hide Helpers
============================ */

export const show = el => el?.classList.remove('hidden');
export const hide = el => el?.classList.add('hidden');
