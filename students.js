import { fetchRelations, fetchStudents, fetchUsers, insertStudent, updateStudent, deleteStudent } from './api.js';
import { clearContainer, els } from './dom.js';
import { UI_CLASSES } from './ui.js';
import { state } from './state.js';
import { renderUsers } from './users.js';
import { renderCheckIO } from './check-io.js';

let editingStudent = null;

state.studentsSort = {
  field: 'lastName',
  direction: 'asc'
};

export async function initStudents() {
  // Load students, parents (users), and relations
  const [users, students, relations] = await Promise.all([
    fetchUsers(),
    fetchStudents(),
    fetchRelations()
  ]);

  // local caches
  state.users = users || [];
  state.students = students || [];
  state.relations = relations || [];

  // initial render
  renderStudents();

  // sort select wiring
  if (els.studentsSort) {
    els.studentsSort.addEventListener('change', () => {
      const [field, dir] = (els.studentsSort.value || '').split('-');
      state.studentsSort.field = field || 'lastName';
      state.studentsSort.direction = dir || 'asc';
      renderStudents();
    });
  }

  // modal wiring
  if (els.studentsAddButton) els.studentsAddButton.addEventListener('click', openStudentModal);
  if (els.studentsFormCancelButton) els.studentsFormCancelButton.addEventListener('click', closeStudentModal);
  if (els.studentsModalOverlay) els.studentsModalOverlay.addEventListener('click', e => {
    if (e.target === els.studentsModalOverlay) closeStudentModal();
  });
  if (els.studentsFormSaveButton) els.studentsFormSaveButton.addEventListener('click', saveStudent);
}

/* ---------------------------
   Rendering & Sorting
   --------------------------- */

export async function renderStudents() {
  clearContainer(els.studentsContainer);

  state.relations = await fetchRelations();

  // attach parents on each render
  const userMap = new Map((state.users || []).map(u => [u.id, u]));
  (state.students || []).forEach(s => {
    const rels = (state.relations || []).filter(r => r.studentId === s.id);
    s.parents = rels.map(r => userMap.get(r.parentId)).filter(Boolean);
  });

  const { field: selectedField, direction } = state.studentsSort;

  const fallback = ['lastName', 'firstName', 'grade'];
  const primary = selectedField || 'lastName';
  const sortFields = [primary, ...fallback.filter(f => f !== primary)];

  const sorted = [...(state.students || [])].sort((a, b) => {
    for (const f of sortFields) {
      let result = 0;

      if (f === 'grade') {
        const aVal = (a.grade === undefined || a.grade === null) ? '' : a.grade;
        const bVal = (b.grade === undefined || b.grade === null) ? '' : b.grade;
        if (!isNaN(Number(aVal)) && !isNaN(Number(bVal))) {
          result = Number(aVal) - Number(bVal);
        } else {
          const va = String(aVal).toLowerCase();
          const vb = String(bVal).toLowerCase();
          if (va > vb) result = 1;
          if (va < vb) result = -1;
        }
      } else {
        const va = (a[f] || '').toString().toLowerCase();
        const vb = (b[f] || '').toString().toLowerCase();
        if (va > vb) result = 1;
        if (va < vb) result = -1;
      }

      // apply direction only on primary field
      if (f === primary && direction === 'desc') result *= -1;

      if (result !== 0) return result;
    }

    return 0;
  });

  createStudentList(sorted);
}

/* ---------------------------
   DOM building: student rows
   --------------------------- */

function createStudentList(list) {
  if (!list || list.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.textContent = 'No students found.';
    emptyMessage.className = UI_CLASSES.emptyMessage;
    if (els.studentsContainer) els.studentsContainer.appendChild(emptyMessage);
    return;
  }

  list.forEach((student, index) => {
    const row = document.createElement('div');
    row.className = UI_CLASSES.listRow;

    const nameWrapper = document.createElement('div');
    nameWrapper.className = UI_CLASSES.listNameRoleGradeActionWrapper;

    const name = document.createElement('div');
    name.className = UI_CLASSES.listName;
    name.textContent = `${student.lastName}, ${student.firstName}`;

    const grade = document.createElement('div');
    grade.className = UI_CLASSES.listRoleGrade;
    grade.textContent = (student.grade !== undefined && student.grade !== null) ? student.grade : '';

    nameWrapper.appendChild(name);
    nameWrapper.appendChild(grade);

    const parentsAndActions = document.createElement('div');
    parentsAndActions.className = UI_CLASSES.listChildrenParentsActionsWrapper;

    const parentsWrapper = document.createElement('div');
    parentsWrapper.className = UI_CLASSES.listChildrenParentsWrapper;

    if (student.parents && student.parents.length) {
      student.parents.forEach(p => {
        const pill = document.createElement('span');
        pill.className = UI_CLASSES.relationPill;
        pill.textContent = `${p.firstName} ${p.lastName}`;
        parentsWrapper.appendChild(pill);
      });
    } else {
      parentsWrapper.textContent = '—';
    }

    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = UI_CLASSES.listActionsWrapper;

    // Edit
    const editButton = document.createElement('button');
    editButton.className = UI_CLASSES.listActionButton;
    editButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="${UI_CLASSES.listActionsButtonIcon}" viewBox="0 0 640 640"><path fill="currentColor" d="M256.5 72C322.8 72 376.5 125.7 376.5 192C376.5 258.3 322.8 312 256.5 312C190.2 312 136.5 258.3 136.5 192C136.5 125.7 190.2 72 256.5 72zM226.7 368L286.1 368L287.6 368C274.7 394.8 279.8 426.2 299.1 447.5C278.9 469.8 274.3 503.3 289.7 530.9L312.2 571.3C313.1 572.9 314.1 574.5 315.1 576L78.1 576C61.7 576 48.4 562.7 48.4 546.3C48.4 447.8 128.2 368 226.7 368zM432.6 311.6C432.6 298.3 443.3 287.6 456.6 287.6L504.6 287.6C517.9 287.6 528.6 298.3 528.6 311.6L528.6 317.7C528.6 336.6 552.7 350.5 569.1 341.1L574.1 338.2C585.7 331.5 600.6 335.6 607.1 347.3L629.5 387.5C635.7 398.7 632.1 412.7 621.3 419.5L616.6 422.4C600.4 432.5 600.4 462.3 616.6 472.5L621.2 475.4C632 482.2 635.7 496.2 629.5 507.4L607 547.8C600.5 559.5 585.6 563.7 574 556.9L569.1 554C552.7 544.5 528.6 558.5 528.6 577.4L528.6 583.5C528.6 596.8 517.9 607.5 504.6 607.5L456.6 607.5C443.3 607.5 432.6 596.8 432.6 583.5L432.6 577.6C432.6 558.6 408.4 544.6 391.9 554.1L387.1 556.9C375.5 563.6 360.7 559.5 354.1 547.8L331.5 507.4C325.3 496.2 328.9 482.1 339.8 475.3L344.2 472.6C360.5 462.5 360.5 432.5 344.2 422.4L339.7 419.6C328.8 412.8 325.2 398.7 331.4 387.5L353.9 347.2C360.4 335.5 375.3 331.4 386.8 338.1L391.6 340.9C408.1 350.4 432.3 336.4 432.3 317.4L432.3 311.5zM532.5 447.8C532.5 419.1 509.2 395.8 480.5 395.8C451.8 395.8 428.5 419.1 428.5 447.8C428.5 476.5 451.8 499.8 480.5 499.8C509.2 499.8 532.5 476.5 532.5 447.8z"/></svg><span class="hidden md:inline">Edit</span>`;
    editButton.addEventListener('click', () => openStudentModalForEdit(student));

    // Delete
    const deleteButton = document.createElement('button');
    deleteButton.className = UI_CLASSES.listActionButton;
    deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="${UI_CLASSES.listActionsButtonIcon}" viewBox="0 0 640 640"><path fill="currentColor" d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z"/></svg><span class="hidden md:inline">Delete</span>`;
    deleteButton.addEventListener('click', () => confirmAndDeleteStudent(student));

    actionsWrapper.appendChild(editButton);
    actionsWrapper.appendChild(deleteButton);

    parentsAndActions.appendChild(parentsWrapper);
    parentsAndActions.appendChild(actionsWrapper);

    row.appendChild(nameWrapper);
    row.appendChild(parentsAndActions);

    if (els.studentsContainer) {
      els.studentsContainer.appendChild(row);
      if (index !== list.length - 1) {
        const hr = document.createElement('hr');
        hr.className = UI_CLASSES.listHr;
        els.studentsContainer.appendChild(hr);
      }
    }
  });
}

/* ---------------------------
   Create / Update / Delete flows
   --------------------------- */

async function saveStudent() {
  if (!els.studentsForm) return;
  const form = els.studentsForm;
  if (!form.reportValidity()) return;

  const payload = {
    lastName: form['last_name'].value.trim(),
    firstName: form['first_name'].value.trim(),
    grade: form['grade'] && form['grade'].value ? form['grade'].value.trim() : null
  };

  if (editingStudent) {
    const studentToUpdate = { id: editingStudent.id, ...payload };
    const updatedRow = await updateStudent(studentToUpdate);
    if (!updatedRow) {
      window.alert('Failed to update student.');
      return;
    }

    const idx = state.students.findIndex(s => s.id === editingStudent.id);
    if (idx !== -1) {
      state.students[idx].firstName = updatedRow.first_name ?? updatedRow.firstName ?? state.students[idx].firstName;
      state.students[idx].lastName = updatedRow.last_name ?? updatedRow.lastName ?? state.students[idx].lastName;
      state.students[idx].grade = updatedRow.grade !== undefined ? updatedRow.grade : state.students[idx].grade;
    }
  } else {
    const inserted = await insertStudent(payload);
    if (!inserted) {
      window.alert('Failed to create student.');
      return;
    }

    state.students.push({
      id: inserted.id,
      firstName: inserted.first_name,
      lastName: inserted.last_name,
      grade: inserted.grade,
      parents: []
    });
  }

  renderStudents();
  editingStudent = null;
  renderUsers();
  renderCheckIO();
  closeStudentModal();
}

/* ---------------------------
   Modal helpers
   --------------------------- */

function openStudentModal() {
  editingStudent = null;
  if (els.studentsForm) els.studentsForm.reset();
  if (els.studentsModal) els.studentsModal.classList.remove('hidden');
  setStudentModalTitle('Add Student');
}

function openStudentModalForEdit(student) {
  editingStudent = student;
  if (els.studentsForm) {
    els.studentsForm['first_name'].value = student.firstName || '';
    els.studentsForm['last_name'].value = student.lastName || '';
    if (els.studentsForm['grade']) els.studentsForm['grade'].value = student.grade || '';
  }
  setStudentModalTitle('Edit Student');
  if (els.studentsModal) els.studentsModal.classList.remove('hidden');
}

function closeStudentModal() {
  if (els.studentsModal) els.studentsModal.classList.add('hidden');
  if (els.studentsForm) els.studentsForm.reset();
}

function setStudentModalTitle(title) {
  if (els.studentsModalTitle) els.studentsModalTitle.textContent = title;
}

/* ---------------------------
   Delete student
   --------------------------- */

async function confirmAndDeleteStudent(student) {
  if (!confirm(`Are you sure you want to delete ${student.firstName} ${student.lastName}?`)) return;

  const ok = await deleteStudent(student.id);
  if (ok) {
    state.students = state.students.filter(s => s.id !== student.id);
    renderStudents();
  } else {
    console.error('Failed to delete student.');
  }
  renderCheckIO();
}

/* ---------------------------
   Exports
   --------------------------- */

export {
  createStudentList,
  confirmAndDeleteStudent
};