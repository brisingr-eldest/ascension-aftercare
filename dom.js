// Helpers
/**
 * Shorthand for `document.getElementById`.
 *
 * @function $
 * @param {string} id The element ID to look up.
 * @returns {HTMLElement | null} The matching element, or `null` if not found.
 */
export const $ = id => document.getElementById(id);

/**
 * Shorthand for `document.querySelectorAll`.
 *
 * @function $$
 * @param {string} selector A valid CSS selector string.
 * @returns {NodeListOf<HTMLElement>} A live NodeList of all matching elements.
 */
export const $$ = selector => document.querySelectorAll(selector);

/**
 * Clears all child content from a container element.
*
* This sets the container's `innerHTML` to an empty string, effectively removing all child nodes.
*
 * @function clearContainer
 * @param {HTMLElement} container - The DOM element to be cleared.
 * @returns {void}
 */
export function clearContainer(container) {
  container.innerHTML = '';
}

export const els = {
  // Login
  loginScreen: $('login-screen'),
  loginError: $('login-error'),
  loginForm: $('login-form'),
  pinInput: $('pin-input'),
  mainScreen: $('main-screen'),
  adminSection: $('admin-section'),

  // Role
  userRoleDisplay: $('user-role-display'),

  // Checkin/Checkout
  checkInCard: $('checked-out'),
  checkOutCard: $('checked-in'),
  checkedInContainer: $('checked-in-container'),
  checkedOutContainer: $('checked-out-container'),
  checkOutButton: $('check-out-button'),
  checkInButton: $('check-in-button'),


  // User Management
  usersContainer: $('users-container'),
  usersAddButton: $('add-user-button'),
  usersSort: $('user-sort'),

  usersModal: $('user-modal'),
  usersModalOverlay: $('user-modal-overlay'),
  usersModalTitle: $('user-modal-title'),
  usersForm: $('user-form'),
  usersFormPickerWrapper: $('user-children-wrapper'),
  usersFormPickerSelected: $('user-children-selected'),
  usersFormPickerInput: $('user-children-input'),
  usersFormPickerDropdown: $('user-children-dropdown'),
  usersFormPickerDropdownList: $('user-children-dropdown-list'),
  usersFormCancelButton: $('user-cancel-button'),
  usersFormSaveButton: $('user-save-button'),


  // Student Roster
  studentsContainer: $('student-container'),
  studentsSort: $('student-sort'),
  studentsAddButton: $('add-student-button'),

  studentsModal: $('student-modal'),
  studentsModalOverlay: $('student-modal-overlay'),
  studentsForm: $('student-form'),
  studentsFormCancelButton: $('student-cancel-button'),
  studentsFormSaveButton: $('student-save-button'),
  studentsModalTitle: $('student-modal-title'),

  attendanceContainer: $('attendance-logs-container'),
  attendanceSort: $('attendance-logs-sort'),
  attendanceStart: $('attendance-logs-start'),
  attendanceEnd: $('attendance-logs-end'),
  attendanceDownload: $('download-logs-button'),
  attendanceDangerZone: $('danger-zone'),
  attendanceDeleteButton: $('delete-logs-button'),


};