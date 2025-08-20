import { selectRecords } from './api.js';
import { state } from './state.js';
import { els, el } from './dom.js';
import { UI_CLASSES } from './config.js';

/* ============================
       Initialize Picker
   ============================ */
export async function initStudentPicker({ forceRefresh = false } = {}) {
  if (state._pickerInit && !forceRefresh) return;
  state._pickerInit = true;

  // Fetch and cache students
  const { data, error } = await selectRecords('students', { selectFields: 'id, first_name, last_name' });
  state.allStudents = error ? [] : data || [];
  if (error) console.error('Failed to fetch students for picker:', error);

  const { studentPickerInput: input, studentSuggestions: suggestions, studentPicker: picker } = els;
  if (!input || !suggestions || !picker) return console.warn('Student picker elements missing.');

  // Debounced render
  const scheduleRender = (q) => {
    clearTimeout(state._pickerDebounce);
    state._pickerDebounce = setTimeout(() => renderStudentSuggestions(q), 150);
  };

  input.addEventListener('input', () => scheduleRender(input.value.trim().toLowerCase()));

  // Keyboard handling
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') return suggestions.classList.add('hidden');
    if (ev.key === 'Enter') {
      ev.preventDefault();
      const first = suggestions.querySelector('[data-student-id]');
      first?.click();
    }
  });

  // Click outside to hide suggestions
  document.addEventListener('click', (e) => {
    if (!picker.contains(e.target)) suggestions.classList.add('hidden');
  });
}

/* ============================
       Matching & Suggestions
   ============================ */
export function getMatchingStudents(query) {
  if (!query) return [];
  return state.allStudents
    .filter(s => !state.selectedStudents.some(sel => String(sel.id) === String(s.id)) &&
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(query))
    .slice(0, 20);
}

export function renderStudentSuggestions(query) {
  const { studentSuggestions: suggestions, studentPickerInput: input } = els;
  if (!suggestions || !input) return;

  suggestions.innerHTML = '';
  if (!query) return suggestions.classList.add('hidden');

  const matches = getMatchingStudents(query);

  matches.forEach((student, idx) => {
    const label = `${student.first_name} ${student.last_name}`;
    const div = el('div', { class: 'flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-gray-200', text: label });
    div.dataset.studentId = student.id;

    if (idx === 0) {
      div.appendChild(el('span', { class: 'text-gray-400 text-sm', text: 'Enter ⮐' }));
    }

    div.addEventListener('click', () => {
      if (!state.selectedStudents.some(s => String(s.id) === String(student.id))) {
        state.selectedStudents.push(student);
        renderSelectedStudents();
      }
      input.value = '';
      suggestions.classList.add('hidden');
      input.focus();
    });

    suggestions.appendChild(div);
  });

  suggestions.classList.remove('hidden');
}

/* ============================
       Pills / Selected Students
   ============================ */
export function createRemovablePill(label, onRemove) {
  const pill = el('span', { class: UI_CLASSES.pill, text: label });
  const removeBtn = el('button', { class: UI_CLASSES.removePillBtn, text: '×', type: 'button' });
  removeBtn.addEventListener('click', onRemove);
  pill.appendChild(removeBtn);
  return pill;
}

export function renderSelectedStudents() {
  const { studentPicker: picker, studentPickerInput: input } = els;
  if (!picker || !input) return;

  // remove previous pills
  picker.querySelectorAll('.student-pill').forEach(n => n.remove());

  state.selectedStudents.forEach(s => {
    const pill = createRemovablePill(`${s.first_name} ${s.last_name}`, () => {
      state.selectedStudents = state.selectedStudents.filter(x => String(x.id) !== String(s.id));
      renderSelectedStudents();
    });
    pill.classList.add('student-pill');
    picker.insertBefore(pill, input);
  });
}