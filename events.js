import { els } from './dom.js';
import { handleLogin, handleLogout } from './auth.js';
import { handleCheckIn, handleCheckOut, syncCheckButtons } from './lists.js';
import { openModal, closeModal, submitUserForm, submitStudentForm } from './modals.js';
import {
  renderAttendanceFeed,
  downloadCurrentAttendanceCsv,
  handleDownloadCompressed,
  handleBulkCleanup
} from './attendance.js';
import { loadStudentsCards, loadUsersCards } from './loaders.js';



export function initEvents() {
  EVENT_BINDINGS.forEach(b => b.el?.addEventListener(b.event, b.handler));
}



const EVENT_BINDINGS = [
  // ====================
  // Login / Logout
  // ====================
  { el: els.loginForm, event: 'submit', handler: handleLogin },
  { el: els.logoutButton, event: 'click', handler: handleLogout },


  // ====================
  // Check-in / Check-out
  // ====================
  { el: els.submitCheckIn, event: 'click', handler: handleCheckIn },
  { el: els.submitCheckOut, event: 'click', handler: handleCheckOut },
  {
    el: document,
    event: 'change',
    handler: e => {
      if (e.target.matches('#check-in-list input[type="checkbox"], #check-out-list input[type="checkbox"]')) {
        syncCheckButtons();
      }
    }
  },


  // ====================
  // Headings
  // ====================
  { el: els.usersHeading, event: 'click', handler: () => { [els.usersSort, els.usersContainer].forEach(el => { el.classList.toggle('hidden'); }); } },
  { el: els.studentsHeading, event: 'click', handler: () => { [els.studentsSort, els.studentsContainer].forEach(el => { el.classList.toggle('hidden'); }); } },
  { el: els.attendanceHeading, event: 'click', handler: () => { [els.attendanceWrapper, els.attendanceFilters, els.bulkDeleteWrapper].forEach(el => { el.classList.toggle('hidden'); }); } },


  // ====================
  // User Modal
  // ====================
  { el: els.addUserButton, event: 'click', handler: () => openModal('user') },
  { el: els.userCancelButton, event: 'click', handler: () => closeModal('user') },
  { el: els.userForm, event: 'submit', handler: submitUserForm },


  // ====================
  // Student Modal
  // ====================
  { el: els.addStudentButton, event: 'click', handler: () => openModal('student') },
  { el: els.studentCancelButton, event: 'click', handler: () => closeModal('student') },
  { el: els.studentForm, event: 'submit', handler: submitStudentForm },


  // ====================
  // Attendance
  // ====================
  { el: els.attendanceSearch, event: 'input', handler: renderAttendanceFeed },
  { el: els.attendanceStart, event: 'input', handler: renderAttendanceFeed },
  { el: els.attendanceEnd, event: 'input', handler: renderAttendanceFeed },
  { el: els.attendanceAction, event: 'change', handler: renderAttendanceFeed },
  { el: els.downloadRaw, event: 'click', handler: downloadCurrentAttendanceCsv },
  { el: els.downloadCompressed, event: 'click', handler: handleDownloadCompressed },
  { el: els.bulkDeleteLogsBtn, event: 'click', handler: handleBulkCleanup },


  // ====================
  // Sort Dropdowns
  // ====================
  { el: els.usersSort, event: 'change', handler: loadUsersCards },
  { el: els.studentsSort, event: 'change', handler: loadStudentsCards },
];