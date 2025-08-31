import { fetchRelations, fetchStudents, fetchUsers, insertUser, updateUser, getRelationsForParent, addRelations, removeRelations, deleteUser, getUserByPin } from "./api.js";
import { clearContainer, els } from "./dom.js";
import { UI_CLASSES } from "./ui.js";
import { state } from "./state.js";
import { renderStudents } from "./students.js";

let selectedChildren = [];
let dropdownVisible = false;
let editingUser = null

let pinValidationTimer = null;
let pinIsValid = true;
const PIN_LENGTH = 4;
let _checkPinNow = null;
let _resetPinValidation = null;


state.studentsSort = {
  field: 'lastName',
  direction: 'asc'
};

export async function initUsers() {
  const [users, students, relations] = await Promise.all([
    fetchUsers(),
    fetchStudents(),
    fetchRelations()
  ]);

  state.students = students;
  state.relations = relations;
  state.users = users;

  renderUsers();

  els.usersSort.addEventListener('change', () => {
    const [field, dir] = els.usersSort.value.split('-');
    state.studentsSort.field = field;
    state.studentsSort.direction = dir || 'asc';
    renderUsers();
  });

  els.usersAddButton.addEventListener('click', openUserModal);
  els.usersFormCancelButton.addEventListener('click', closeUserModal);
  els.usersModalOverlay.addEventListener('click', e => {
    if (e.target === els.usersModalOverlay) closeUserModal();
  });
  els.usersFormSaveButton.addEventListener('click', saveUser);

  setupChildrenPicker();
  setupPinValidation();
}

export async function renderUsers() {
  clearContainer(els.usersContainer);

  state.relations = await fetchRelations();

  // attach children on each render
  const studentMap = new Map(state.students.map(s => [s.id, s]));
  state.users.forEach(user => {
    const rels = state.relations.filter(r => r.parentId === user.id);
    user.children = rels.map(r => studentMap.get(r.studentId)).filter(Boolean);
  });

  const { field: selectedField, direction } = state.studentsSort;

  const sortedUsers = [...state.users].sort((a, b) => {
    const fields = ['lastName', 'firstName', 'role', 'children'];
    const primary = selectedField.startsWith('children') ? 'children' : selectedField;
    const sortFields = [primary, ...fields.filter(f => f !== primary)];

    for (const f of sortFields) {
      let result = 0;

      if (f === 'children') {
        const aHas = (a.children || []).length > 0;
        const bHas = (b.children || []).length > 0;

        if (selectedField === 'children-no') {
          result = (aHas === bHas) ? 0 : aHas ? 1 : -1;
        } else {
          result = (aHas === bHas) ? 0 : aHas ? -1 : 1;
        }
      } else {
        const valA = (a[f] || '').toString().toLowerCase();
        const valB = (b[f] || '').toString().toLowerCase();
        if (valA > valB) result = 1;
        if (valA < valB) result = -1;
      }

      if (f === primary && direction === 'desc') result *= -1;

      if (result !== 0) return result;
    }

    return 0;
  });

  createUserList(sortedUsers);
}

function createUserList(list) {
  if (list.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.textContent = 'No users found.'
    emptyMessage.className = UI_CLASSES.emptyMessage;

    els.usersContainer.appendChild(emptyMessage);
  }

  list.forEach((user, index) => {
    const row = document.createElement('div');
    row.className = UI_CLASSES.listRow;

    const nameAndRole = document.createElement('div');
    nameAndRole.className = UI_CLASSES.listNameRoleGradeActionWrapper;

    const name = document.createElement('div');
    name.textContent = `${user.lastName}, ${user.firstName}`;
    name.className = UI_CLASSES.listName;

    const role = document.createElement('div');
    role.textContent = user.role;
    role.className = UI_CLASSES.listRoleGrade;

    const childrenAndActions = document.createElement('div');
    childrenAndActions.className = UI_CLASSES.listChildrenParentsActionsWrapper;

    const childrenWrapper = document.createElement('div');
    if (user.children && user.children.length) {
      user.children.forEach(child => {
        const pill = document.createElement('span');
        pill.textContent = `${child.firstName} ${child.lastName}`;
        pill.className = UI_CLASSES.relationPill;
        childrenWrapper.appendChild(pill);
      });
    } else {
      childrenWrapper.textContent = '—';
    }
    childrenWrapper.className = UI_CLASSES.listChildrenParentsWrapper;

    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = UI_CLASSES.listActionsWrapper;

    const editButton = document.createElement('button');
    editButton.innerHTML =
      `<svg xmlns="http://www.w3.org/2000/svg" class="${UI_CLASSES.listActionsButtonIcon}" viewBox="0 0 640 640">
        <path fill="currentColor"
          d="M256.5 72C322.8 72 376.5 125.7 376.5 192C376.5 258.3 322.8 312 256.5 312C190.2 312 136.5 258.3 136.5 192C136.5 125.7 190.2 72 256.5 72zM226.7 368L286.1 368L287.6 368C274.7 394.8 279.8 426.2 299.1 447.5C278.9 469.8 274.3 503.3 289.7 530.9L312.2 571.3C313.1 572.9 314.1 574.5 315.1 576L78.1 576C61.7 576 48.4 562.7 48.4 546.3C48.4 447.8 128.2 368 226.7 368zM432.6 311.6C432.6 298.3 443.3 287.6 456.6 287.6L504.6 287.6C517.9 287.6 528.6 298.3 528.6 311.6L528.6 317.7C528.6 336.6 552.7 350.5 569.1 341.1L574.1 338.2C585.7 331.5 600.6 335.6 607.1 347.3L629.5 387.5C635.7 398.7 632.1 412.7 621.3 419.5L616.6 422.4C600.4 432.5 600.4 462.3 616.6 472.5L621.2 475.4C632 482.2 635.7 496.2 629.5 507.4L607 547.8C600.5 559.5 585.6 563.7 574 556.9L569.1 554C552.7 544.5 528.6 558.5 528.6 577.4L528.6 583.5C528.6 596.8 517.9 607.5 504.6 607.5L456.6 607.5C443.3 607.5 432.6 596.8 432.6 583.5L432.6 577.6C432.6 558.6 408.4 544.6 391.9 554.1L387.1 556.9C375.5 563.6 360.7 559.5 354.1 547.8L331.5 507.4C325.3 496.2 328.9 482.1 339.8 475.3L344.2 472.6C360.5 462.5 360.5 432.5 344.2 422.4L339.7 419.6C328.8 412.8 325.2 398.7 331.4 387.5L353.9 347.2C360.4 335.5 375.3 331.4 386.8 338.1L391.6 340.9C408.1 350.4 432.3 336.4 432.3 317.4L432.3 311.5zM532.5 447.8C532.5 419.1 509.2 395.8 480.5 395.8C451.8 395.8 428.5 419.1 428.5 447.8C428.5 476.5 451.8 499.8 480.5 499.8C509.2 499.8 532.5 476.5 532.5 447.8z" />
      </svg>
      <span class="hidden md:inline">Edit</span>
    `;
    editButton.className = UI_CLASSES.listActionButton;
    editButton.addEventListener('click', () => openUserModalForEdit(user));

    const deleteButton = document.createElement('button');
    deleteButton.innerHTML =
      `<svg xmlns="http://www.w3.org/2000/svg" class="${UI_CLASSES.listActionsButtonIcon}" viewBox="0 0 640 640">
        <path fill="currentColor"
          d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z" />
      </svg>
      <span class="hidden md:inline">Delete</span>
    `;
    deleteButton.className = UI_CLASSES.listActionButton;
    deleteButton.addEventListener('click', () => confirmAndDeleteUser(user));

    const hr = document.createElement('hr');
    hr.className = UI_CLASSES.listHr;


    nameAndRole.appendChild(name);
    nameAndRole.appendChild(role);
    actionsWrapper.appendChild(editButton);
    actionsWrapper.appendChild(deleteButton);
    childrenAndActions.appendChild(childrenWrapper);
    childrenAndActions.appendChild(actionsWrapper);
    row.appendChild(nameAndRole);
    row.appendChild(childrenAndActions);

    els.usersContainer.appendChild(row);

    if (index !== list.length - 1) els.usersContainer.appendChild(hr);

  });
}

function setupChildrenPicker() {
  const input = els.usersFormPickerInput;
  const dropdownList = els.usersFormPickerDropdownList;

  input.addEventListener('input', onChildrenInput);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = dropdownList.querySelector('li');
      if (first) {
        const sid = first.dataset.sid;
        const student = state.students.find(s => s.id === sid);
        if (student) selectStudent(student);
      }
    } else if (e.key === 'Backspace' && input.value === '') {
      if (selectedChildren.length > 0) {
        selectedChildren.pop();
        renderSelectedChildren();
        input.focus();
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      hideDropdown();
    }
  });

  document.addEventListener('click', (e) => {
    if (!els.usersFormPickerWrapper.contains(e.target) && !els.usersFormPickerDropdown.contains(e.target)) {
      hideDropdown();
    }
  });

  renderSelectedChildren();
  hideDropdown();
}

function onChildrenInput(e) {
  const q = e.target.value.trim().toLowerCase();
  if (!q) hideDropdown();

  const candidates = state.students
    .filter(s => !selectedChildren.some(sel => sel.id === s.id))
    .filter(s => {
      const full = `${s.firstName} ${s.lastName}`.toLowerCase();
      const rev = `${s.lastName} ${s.firstName}`.toLowerCase();
      return full.includes(q) || rev.includes(q);
    })
    .slice(0, 8);

  if (candidates.length) {
    renderDropdown(candidates);
    showDropdown();
  } else {
    renderDropdown([]);
    hideDropdown();
  }
}

function renderDropdown(list) {
  const container = els.usersFormPickerDropdownList;
  container.innerHTML = '';
  container.className = UI_CLASSES.usersFormPickerDropdownList;
  list.forEach((student, index) => {
    const li = document.createElement('li');
    li.className = UI_CLASSES.usersFormPickerDropdownListItem;
    li.textContent = `${student.firstName} ${student.lastName}`;
    li.dataset.sid = student.id;

    if (index === 0) {
      const enterSpan = document.createElement('span');
      enterSpan.textContent = 'Enter ⮐';
      enterSpan.className = UI_CLASSES.usersFormPickerDropdownListItemEnterIcon;
      li.appendChild(enterSpan);
    }
    li.addEventListener('click', () => selectStudent(student));
    container.appendChild(li);
  });
}

function showDropdown() {
  els.usersFormPickerDropdown.classList.remove('hidden');
  els.usersFormPickerWrapper.classList.remove('rounded-3xl');
  els.usersFormPickerWrapper.classList.remove('border-b-2');
  els.usersFormPickerWrapper.classList.add('rounded-t-3xl');
  dropdownVisible = true;
}

function hideDropdown() {
  els.usersFormPickerDropdown.classList.add('hidden');
  els.usersFormPickerWrapper.classList.remove('rounded-t-3xl');
  els.usersFormPickerWrapper.classList.add('border-b-2');
  els.usersFormPickerWrapper.classList.add('rounded-3xl');
  dropdownVisible = false;
}

function selectStudent(student) {
  if (selectedChildren.some(s => s.id === student.id)) return;

  selectedChildren.push(student);
  renderSelectedChildren();

  els.usersFormPickerInput.value = '';
  els.usersFormPickerInput.focus();

  renderDropdown([]);
  hideDropdown();
}

function renderSelectedChildren() {
  const container = els.usersFormPickerSelected;
  container.innerHTML = '';

  selectedChildren.forEach((student) => {
    const pill = document.createElement('div');
    pill.className = UI_CLASSES.relationPill;
    pill.innerHTML = `
      <span>${student.firstName} ${student.lastName}</span>
      <button type="button" class="${UI_CLASSES.usersFormPickerSelectedRemoveButton}">&times;</button>
    `;
    const btn = pill.querySelector('button');
    btn.addEventListener('click', () => {
      selectedChildren = selectedChildren.filter(s => s.id !== student.id);
      renderSelectedChildren();
    });
    container.appendChild(pill);
  });
}

async function saveUser() {
  const form = els.usersForm;
  if (!form.reportValidity()) return;

  // Build user object from form
  const payload = {
    lastName: form['last_name'].value.trim(),
    firstName: form['first_name'].value.trim(),
    role: form['role'].value,
    pin: form['pin'].value.trim(),
  };

  const pinValue = (form['pin'].value || '').trim();
  if (pinValue.length === PIN_LENGTH && /^\d+$/.test(pinValue)) {
    const excludeId = editingUser && editingUser.id ? editingUser.id : null;
    const { user: conflict, error } = await getUserByPin(pinValue, excludeId);
    if (error) {
      console.error('Pin check failed on save', error);
      // optionally continue (or abort). Here we abort to be safe.
      window.alert('Unable to validate PIN right now. Try again.');
      return;
    }
    if (conflict) {
      // show message and abort submit
      if (els.usersFormPinValidation) {
        els.usersFormPinValidation.textContent = 'PIN already in use.';
        els.usersFormPinValidation.classList.remove('hidden');
      }
      return;
    }
  }


  // save logic differs for create vs update
  if (editingUser) {
    // UPDATE flow
    const userToUpdate = {
      id: editingUser.id,
      ...payload
    };

    const updatedRow = await updateUser(userToUpdate);
    if (!updatedRow) {
      window.alert('Failed to update user.');
      return;
    }

    // relations diff
    const selectedIds = selectedChildren.map(s => s.id);
    const { ids: existingIds = [] } = await getRelationsForParent(editingUser.id);

    // compute sets
    const existingSet = new Set(existingIds);
    const desiredSet = new Set(selectedIds);

    const toAdd = selectedIds.filter(id => !existingSet.has(id));
    const toRemove = existingIds.filter(id => !desiredSet.has(id));

    // apply diffs
    if (toRemove.length) {
      const { error } = await removeRelations(editingUser.id, toRemove);
      if (error) console.error('removeRelations error', error);
    }
    if (toAdd.length) {
      const { error } = await addRelations(editingUser.id, toAdd);
      if (error) console.error('addRelations error', error);
    }

    // update client state
    const studentMap = new Map((state.students || []).map(s => [s.id, s]));
    const idx = state.users.findIndex(u => u.id === editingUser.id);
    if (idx !== -1) {
      state.users[idx].firstName = updatedRow.first_name;
      state.users[idx].lastName = updatedRow.last_name;
      state.users[idx].role = updatedRow.role;
      state.users[idx].pin = updatedRow.pin;
      state.users[idx].children = selectedIds.map(id => studentMap.get(id)).filter(Boolean);
    }

  } else {
    // CREATE flow
    const inserted = await insertUser(payload);
    if (!inserted) {
      window.alert('Failed to create user.');
      return;
    }

    // insert relations for new user
    const studentIds = selectedChildren.map(s => s.id);
    if (studentIds.length) {
      const { error } = await addRelations(inserted.id, studentIds);
      if (error) console.error('Failed to insert relations', error);
    }

    // update client state
    state.users.push({
      id: inserted.id,
      firstName: inserted.first_name,
      lastName: inserted.last_name,
      role: inserted.role,
      pin: inserted.pin,
      children: selectedChildren.slice()
    });
  }

  // finalize UI
  renderUsers();
  editingUser = null;
  setModalTitle('Add User'); // reset for future adds
  selectedChildren = [];
  renderSelectedChildren();
  renderStudents();
  closeUserModal();
}

// Helpers
function openUserModal() {
  editingUser = null;
  setModalTitle('Add User');
  if (els.usersForm) els.usersForm.reset();
  selectedChildren = [];
  renderSelectedChildren();

  // reset pin validation UI
  if (typeof _resetPinValidation === 'function') _resetPinValidation();

  if (els.usersModal) els.usersModal.classList.remove('hidden');
}

function openUserModalForEdit(user) {
  editingUser = user;
  if (els.usersForm) {
    els.usersForm['first_name'].value = user.firstName || '';
    els.usersForm['last_name'].value = user.lastName || '';
    els.usersForm['role'].value = user.role || '';
    els.usersForm['pin'].value = user.pin || '';
  }

  selectedChildren = (user.children || []).slice();
  renderSelectedChildren();

  // reset then re-check the PIN (will ignore the user itself via excludeId)
  if (typeof _resetPinValidation === 'function') _resetPinValidation();
  if (typeof _checkPinNow === 'function') _checkPinNow(els.usersFormPin.value || '');

  setModalTitle('Edit User');
  if (els.usersModal) els.usersModal.classList.remove('hidden');
}

function closeUserModal() {
  els.usersModal.classList.add('hidden');
  els.usersForm.reset();
  selectedChildren = [];
  renderSelectedChildren();
}

function setModalTitle(title) {
  els.usersModalTitle.textContent = title;
}

async function confirmAndDeleteUser(user) {
  if (!confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) return;

  const success = await deleteUser(user.id);
  if (success) {
    state.users = state.users.filter(u => u.id !== user.id);
    renderUsers(state.users);
  }
}

function setupPinValidation() {
  const pinInput = els.usersFormPin;
  const messageBox = els.usersFormPinValidation;
  const saveBtn = els.usersFormSaveButton;

  if (!pinInput || !messageBox || !saveBtn) {
    console.warn('Pin validation not wired: missing elements in els', { pinInput, messageBox, saveBtn });
    return;
  }

  function setPinValidationState(ok, reason = '') {
    pinIsValid = !!ok;
    if (ok) {
      messageBox.classList.add('hidden');
      saveBtn.removeAttribute('disabled');
    } else {
      messageBox.textContent = reason || 'PIN already in use.';
      messageBox.classList.remove('hidden');
      saveBtn.setAttribute('disabled', 'disabled');
    }
  }

  async function checkPinNow(pin) {
    console.debug('checkPinNow running for pin:', pin);
    // quick sanitization
    if (!pin || pin.length !== PIN_LENGTH || !/^\d+$/.test(pin)) {
      setPinValidationState(true);
      return true;
    }

    const excludeId = editingUser && editingUser.id ? editingUser.id : null;
    const { user, error } = await getUserByPin(pin, excludeId);

    if (error) {
      console.error('Pin check error', error);
      // be conservative: allow until save-time check
      setPinValidationState(true);
      return true;
    }

    if (user) {
      console.debug('pin in use by user:', user.id);
      setPinValidationState(false, 'PIN already in use.');
      return false;
    } else {
      setPinValidationState(true);
      return true;
    }
  }

  // wire events
  pinInput.addEventListener('input', (e) => {
    const v = e.target.value.trim();
    const digits = v.replace(/\D/g, '').slice(0, PIN_LENGTH);
    if (digits !== v) pinInput.value = digits;

    if (pinValidationTimer) clearTimeout(pinValidationTimer);
    pinValidationTimer = setTimeout(() => checkPinNow(digits), 250);
  });

  pinInput.addEventListener('blur', (e) => {
    const v = e.target.value.trim();
    if (pinValidationTimer) clearTimeout(pinValidationTimer);
    checkPinNow(v);
  });

  // expose module-scoped helpers so other functions can call them:
  _checkPinNow = checkPinNow;
  _resetPinValidation = function resetPinValidation() {
    setPinValidationState(true);
    // leave value intact so editing keeps prefilled value; remove message
    if (pinInput) pinInput.value = pinInput.value || '';
  };
}
