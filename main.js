import { initStudentPicker } from './picker.js';
import { initEvents } from './events.js';

/** ===============================
               Boot            
=============================== */
document.addEventListener('DOMContentLoaded', () => {
  initEvents();
  initStudentPicker(); // populate allStudents cache
});