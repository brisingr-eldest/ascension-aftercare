/**
 * @param {elementId} id
 */
export const $ = id => document.getElementById(id);

/** ============================
       Cached Elements
============================ */
export const els = {
  // Login screen
  loginForm: $('login-form'),
  pinInput: $('pin-input'),
  loginError: $('login-error'),

  // Main screen
  mainScreen: $('main-screen'),
  loginScreen: $('login-screen'),
  userRoleDisplay: $('user-role-display'),
  logoutButton: $('logout-button'),

  // Headings
  usersHeading: $('users-heading'),
  studentsHeading: $('students-heading'),
  attendanceHeading: $('attendance-heading'),

  // Check-in / Check-out
  checkInList: $('check-in-list'),
  checkOutList: $('check-out-list'),
  checkInMsg: $('check-in-message'),
  checkOutMsg: $('check-out-message'),
  submitCheckIn: $('submit-check-in'),
  submitCheckOut: $('submit-check-out'),

  // Users
  addUserButton: $('add-user-button'),
  usersContainer: $('users-container'),
  userModal: $('user-modal'),
  userForm: $('user-form'),
  userCancelButton: $('user-cancel-button'),
  userModalTitle: $('user-modal-title'),

  // Students
  addStudentButton: $('add-student-button'),
  studentsContainer: $('students-container'),
  studentModal: $('student-modal'),
  studentForm: $('student-form'),
  studentCancelButton: $('student-cancel-button'),
  studentModalTitle: $('student-modal-title'),

  // Student picker
  studentPicker: $('student-picker'),
  studentPickerInput: $('student-picker-input'),
  studentSuggestions: $('student-suggestions'),

  // Attendance logs
  attendanceWrapper: $('attendance-wrapper'),
  attendanceFilters: $('attendance-filters'),
  attendanceSearch: $('attendance-search'),
  attendanceStart: $('attendance-start-date'),
  attendanceEnd: $('attendance-end-date'),
  attendanceAction: $('attendance-action'),
  downloadRaw: $('download-raw'),
  downloadCompressed: $('download-compressed'),
  bulkDeleteWrapper: $('attendance-bulk-delete-wrapper'),
  bulkDeleteLogsBtn: $('attendance-bulk-delete'),
  bulkDeleteLogsDate: $('attendance-bulk-delete-date'),

  // Sorts
  usersSort: $('users-sort'),
  studentsSort: $('students-sort'),
};

/** ============================
        Element Creator
============================ */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, val] of Object.entries(props || {})) {
    if (key === 'class') node.className = val;
    else if (key === 'text') node.textContent = val;
    else if (key === 'html') node.innerHTML = val;
    else node.setAttribute(key, val);
  }
  for (const c of children) if (c != null) node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return node;
}