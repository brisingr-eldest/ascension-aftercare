import { fetchRelations, fetchStudents, updateStudentsIOStatus } from './api.js';
import { createLog, loadAndRenderAttendanceLogs } from './attendance.js';
import { els, clearContainer } from './dom.js';
import { state } from './state.js';
import { hide, show, UI_CLASSES } from './ui.js';

/**
 * Initializes the Check-In/Check-Out interface.
 *
 * - Fetches the latest student list from Supabase.
 * - Updates the local state with fetched students.
 * - Renders the initial Check-In/Check-Out view.
 * - Attaches event listeners for toggling student IO status.
 *
 * @async
 * @function initCheckIO
 * @returns {Promise<void>} Resolves once initialization is complete.
 */
export async function initCheckIO(role = null, parentId = null) {
  state.userRole = role;
  state.userId = parentId;


  state.students = await fetchStudents();
  state.students = state.students;

  state.relations = await fetchRelations();

  if (!Array.isArray(state.students) || state.students.length === 0) {
    state.students = await fetchStudents();
  }
  if (!Array.isArray(state.relations) || state.relations.length === 0) {
    state.relations = await fetchRelations();
  }


  renderCheckIO();

  // Event wiring
  els.checkedInContainer.addEventListener('click', () => {
    const hasCheckedBoxes = els.checkedInContainer.querySelectorAll('input[type="checkbox"]:checked').length > 0;
    if (hasCheckedBoxes) show(els.checkOutButton); else hide(els.checkOutButton);
  });

  els.checkedOutContainer.addEventListener('click', () => {
    const hasCheckedBoxes = els.checkedOutContainer.querySelectorAll('input[type="checkbox"]:checked').length > 0;
    if (hasCheckedBoxes) show(els.checkInButton); else hide(els.checkInButton);
  });

  els.checkInButton.addEventListener('click', () => toggleCheckIO(els.checkedOutContainer, true));
  els.checkOutButton.addEventListener('click', () => toggleCheckIO(els.checkedInContainer, false));
}

/**
 * Renders the Check-In and Check-Out lists.
 *
 * - Clears the existing DOM containers for checked-in and checked-out students.
 * - Separates students from `state.students` into two groups:
 *   - `checkedIn` (students with `checkedIn: true`)
 *   - `checkedOut` (students with `checkedIn: false`)
 * - Rebuilds the lists in their respective containers via {@link createIOList}.
 *
 * @function renderCheckIO
 * @returns {void}
 */
export function renderCheckIO() {
  clearContainer(els.checkedInContainer);
  clearContainer(els.checkedOutContainer);

  // prefer the full set if present
  const students = state.students || state.students || [];

  let checkedIn = students
    .filter(s => s.checkedIn)
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));

  let checkedOut = students
    .filter(s => !s.checkedIn)
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));

  // Parents see ONLY their children in the "checked-in" list
  if (state.userRole === 'parent' && state.userId) {
    const childIds = new Set(getChildIdsForParent(state.userId));
    checkedIn = checkedIn.filter(s => childIds.has(s.id));
  }

  createIOList(checkedIn, els.checkedInContainer);
  createIOList(checkedOut, els.checkedOutContainer);

  hide(els.checkInButton);
  hide(els.checkOutButton);
}


/**
 * Populate a container with a rendered list of students.
 * 
 * For each student in `list`:
 * - Creates a row container (`div`) styled with {@link UI_CLASSES.checkIOListRow}.
 * - Adds a hidden checkbox input bound to the student's ID.
 * - Adds a custom SVG-based checkbox with {@link UI_CLASSES.checkIOSVGCheckbox}.
 * - Adds a text span with the student's name (`lastName`, `firstName`) with {@link UI_CLASSES.checkIOStudentName}.
 * - Appends the assembled row to the given `container`.
 * 
 * @function createIOList
 * @param {Array<{id: string, firstName: string, lastName: string}>} list An array of student objects to render.
 * @param {HTMLElement} container DOM container in which to place the generated student list rows.
 * @returns {void}
 */
function createIOList(list, container) {
  if (!list || list.length === 0) {
    const emptyMessage = document.createElement('div');
    if (container.id === 'checked-out-container') {
      emptyMessage.textContent = 'All students checked in.';
    } else if (container.id === 'checked-in-container') {
      emptyMessage.textContent = 'All students checked out.';
    } else {
      emptyMessage.textContent = 'No students.';
    }

    emptyMessage.className = UI_CLASSES.emptyMessage;
    container.appendChild(emptyMessage);
    return;
  }

  list.forEach(student => {
    const div = document.createElement('label');
    div.className = UI_CLASSES.checkIOListRow;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = UI_CLASSES.checkIOHiddenCheckbox;
    checkbox.dataset.studentId = student.id;

    if (student.parentId) checkbox.dataset.parentId = student.parentId;
    else if (student.parent_id) checkbox.dataset.parentId = student.parent_id;
    else if (student.parents && student.parents.length) checkbox.dataset.parentId = student.parents[0]; // fallback

    const box = document.createElement('span');
    box.className = UI_CLASSES.checkIOSVGWrapper;
    box.innerHTML = `
      <svg class="${UI_CLASSES.checkIOSVGCheckbox}" viewBox="0 0 640 640" focusable="false">
        <path fill="currentColor" d="M530.8 134.1C545.1 144.5 548.3 164.5 537.9 178.8L281.9 530.8C276.4 538.4 267.9 543.1 258.5 543.9C249.1 544.7 240 541.2 233.4 534.6L105.4 406.6C92.9 394.1 92.9 373.8 105.4 361.3C117.9 348.8 138.2 348.8 150.7 361.3L252.2 462.8L486.2 141.1C496.6 126.8 516.6 123.6 530.9 134z"/>
      </svg>
    `;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = `${student.lastName}, ${student.firstName}`;
    nameSpan.className = UI_CLASSES.checkIOStudentName;

    div.appendChild(checkbox);
    div.appendChild(box);
    div.appendChild(nameSpan);

    container.appendChild(div);
  });
}

/**
 * Toggles the check-in status of selected students.
 * 
 * - Reads all checked checkboxes from the given container.
 * - Extracts their `studentId` values.
 * - Updates the `checkedIn` status in local state.
 * - Persists the update to Supabase via {@link updateStudentsIOStatus}.
 * - Re-renders the Check-In/Check-Out lists.
 * 
 * @async
 * @function toggleCheckIO
 * @param {HTMLElement} container The DOM container whose selected students should be toggled.
 * @param {boolean} newStatus The new check-in status to apply (`true` = check in, `false` = check out).
 * @returns {Promise<void>} Resolves when updates and re-rendering are complete.
 */
async function toggleCheckIO(container, newStatus) {
  const selected = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'));
  if (selected.length === 0) return;

  const ids = selected.map(cb => cb.dataset.studentId);

  (state.students || []).forEach(s => { if (ids.includes(s.id)) s.checkedIn = newStatus; });
  if (Array.isArray(state.students)) {
    state.students.forEach(s => { if (ids.includes(s.id)) s.checkedIn = newStatus; });
  }

  await updateStudentsIOStatus(ids, newStatus);

  // Re-render using the current filtered view
  renderCheckIO();

  const performedBy = state.parentId || state.userId;
  await createLog({
    students: ids,
    action: newStatus ? 'in' : 'out',
    performedBy
  });

  loadAndRenderAttendanceLogs();
}

function getChildIdsForParent(parentId) {
  if (!Array.isArray(state.relations) || !parentId) return [];
  return state.relations
    .filter(r => (r.parentId || r.parent_id) === parentId)
    .map(r => r.studentId || r.student_id);
}
