import { el, els, $ } from './dom.js';
import { state } from './state.js';
import { initStudentPicker, renderSelectedStudents } from './picker.js';
import { usersAPI, studentsAPI, insertRecords, deleteRecords, fetchStudents } from './api.js';
import { loadUsersCards, loadStudentsCards } from './loaders.js';
import { refreshStudentLists } from './refresh.js';

/* ============================
       Helper Functions
   ============================ */
function prefillForm(fieldsMap, entity) {
  for (const [inputId, key] of Object.entries(fieldsMap)) {
    const elInput = $(inputId);
    if (elInput) elInput.value = entity[key] ?? '';
  }
}

export function openModal(type, prefillFn, id = null) {
  const modal = els[`${type}Modal`];
  const form = els[`${type}Form`];
  const title = els[`${type}ModalTitle`];
  if (!modal || !form || !title) return;

  form.reset();
  state.currentEdit[`${type}Id`] = id;
  if (type === 'student') state.selectedStudents = [];

  if (typeof prefillFn === 'function') prefillFn();
  title.textContent = type === 'user' ? 'Add New User' : 'Add Student';
  modal.classList.remove('hidden');
}

export function closeModal(type) {
  const modal = els[`${type}Modal`];
  const form = els[`${type}Form`];
  if (!modal || !form) return;

  form.reset();
  state.currentEdit[`${type}Id`] = null;
  if (type === 'student') state.selectedStudents = [];
  modal.classList.add('hidden');
}

function openEditModal(type, entity, fieldsMap, extraFn) {
  openModal(type, () => {
    prefillForm(fieldsMap, entity);
    if (extraFn) extraFn();
  }, entity.id);
}

function requireFields(payload, fields) {
  for (const [key, msg] of Object.entries(fields)) {
    if (!payload[key]) { alert(msg); return false; }
  }
  return true;
}

/* ============================
       Edit Modal Helpers
   ============================ */
export const openEditUserModal = user => openEditModal(
  'user',
  user,
  { 'user-first-name': 'first_name', 'user-last-name': 'last_name', 'user-role': 'role', 'user-pin': 'pin' },
  () => {
    state.selectedStudents = (user.students_parents || []).map(sp => sp.student);
    renderSelectedStudents();
  }
);

export const openEditStudentModal = student => openEditModal(
  'student',
  student,
  { 'student-first-name': 'first_name', 'student-last-name': 'last_name', 'student-grade': 'grade' }
);

/* ============================
       Generic Submit
   ============================ */
export async function submitEntityForm({
  type,                 // 'user' | 'student'
  getPayload,           // function returning { insert/update payload }
  createFn,             // async function to create new entity
  updateFn,             // async function to update existing entity
  postSubmitFn          // optional async function to refresh UI or relationships
}) {
  try {
    const payload = getPayload();
    if (!payload) return;

    const currentId = state.currentEdit[`${type}Id`];
    if (currentId) {
      const { error } = await updateFn(currentId, payload);
      if (error) { alert(`Failed to update ${type}`); return; }
    } else {
      const { data, error } = await createFn(payload);
      if (error) { alert(`Failed to create ${type}`); return; }
      if (type === 'user') payload.id = data[0].id; // attach new ID for relationships
    }

    if (typeof postSubmitFn === 'function') await postSubmitFn(currentId || payload.id);

    // reset & close
    const form = els[`${type}Form`];
    const modal = els[`${type}Modal`];
    if (form) form.reset();
    state.currentEdit[`${type}Id`] = null;
    if (type === 'user') state.selectedStudents = [];
    if (modal) modal.classList.add('hidden');

  } catch (err) {
    console.error(err);
    alert('Unexpected error. See console.');
  }
}

/* ============================
       User / Student Submits
   ============================ */
export function submitUserForm(e) {
  e?.preventDefault();

  submitEntityForm({
    type: 'user',
    getPayload: () => {
      const payload = {
        first_name: $('user-first-name').value.trim(),
        last_name: $('user-last-name').value.trim(),
        role: $('user-role').value,
        pin: $('user-pin').value.trim()
      };
      if (!requireFields(payload, { first_name: 'Please fill required fields', last_name: 'Please fill required fields', role: 'Please fill required fields', pin: 'Please fill required fields' })) return null;
      return payload;
    },
    createFn: usersAPI.create,
    updateFn: usersAPI.update,
    postSubmitFn: async (userId) => {
      await deleteRecords('students_parents', { parent_id: userId });
      if (state.selectedStudents.length) {
        await insertRecords('students_parents', state.selectedStudents.map(s => ({ student_id: s.id, parent_id: userId })));
      }
      await loadUsersCards();
      await loadStudentsCards();
    }
  });
}

export function submitStudentForm(e) {
  e.preventDefault();

  submitEntityForm({
    type: 'student',
    getPayload: () => {
      const payload = {
        first_name: $('student-first-name').value.trim(),
        last_name: $('student-last-name').value.trim(),
        grade: $('student-grade').value.trim()
      };
      if (!requireFields(payload, { first_name: 'Please provide first name', last_name: 'Please provide last name' })) return null;
      return payload;
    },
    createFn: studentsAPI.create,
    updateFn: studentsAPI.update,
    postSubmitFn: async () => {
      await loadStudentsCards();
      await initStudentPicker({ forceRefresh: true });
      await refreshStudentLists();

      const students = await fetchStudents();
      state.studentsById = Object.fromEntries(students.map(s => [s.id, s]));
    }
  });
}