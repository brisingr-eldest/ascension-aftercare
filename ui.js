export const UI_CLASSES = {
  // Checkin/Checkout
  checkIOListRow: 'flex items-center h-12 py-3 pl-1 cursor-pointer rounded-3xl text-base space-x-2 select-none transition-colors duration-150 hover:bg-gray-100',
  checkIOHiddenCheckbox: 'hidden peer',
  checkIOSVGWrapper: [
    'relative flex-shrink-0 w-6 h-6',
    'flex items-center justify-center',
    'rounded-full border border-gray-300',
    'shadow-sm',
    'transition-all duration-150',
    'hover:border-gray-600',
    'peer-checked:bg-emerald-600 peer-checked:border-emerald-600',
    '[&svg]:opacity-0 [&svg]:scale-75 [&svg]:transition-all [&svg]:duration-200',
    'peer-checked:[&svg]:opacity-100 peer-checked:[&svg]:scale-100'
  ].join(' '),
  checkIOSVGCheckbox: 'w-4 h-4 text-white stroke-3',
  checkIOStudentName: 'text-lg font-medium',

  // User Management
  usersFormPickerDropdownList: 'p-2',
  usersFormPickerDropdownListItem: 'flex items-center justify-between px-3 py-2 rounded-full cursor-pointer hover:bg-gray-100',
  usersFormPickerDropdownListItemEnterIcon: 'text-sm text-gray-400',
  usersFormPickerSelectedRemoveButton: 'ml-1 text-gray-600',

  // Attendance Logs
  attendanceListRow: 'group flex flex-col gap-y-4 justify-between px-4 py-2 rounded-3xl transition-colors duration-150 md:flex-row md:hover:bg-gray-100',
  attendanceListActionWrapper: 'flex justify-end w-1/3 md:justify-center',
  attendanceListActionPill: 'min-w-12 rounded-full py-1 text-sm text-center',
  attendanceListTimestamp: 'w-1/2',
  attendanceListPerformedBy: 'flex justify-end self-end w-1/2 before:content-["By:"] before:mr-1 before:font-medium md:self-center md:before:content-[""]',

  // Generic
  listRow: 'group flex flex-col gap-y-4 justify-between p-2 pl-4 rounded-3xl transition-colors duration-150 md:flex-row md:hover:bg-gray-100',
  listNameRoleGradeActionWrapper: 'flex justify-start items-center gap-4 w-full md:justify-between md:gap-0 md:w-1/3',
  listName: 'w-fit text-lg font-medium md:w-full',
  listRoleGrade: 'w-1/3 italic text-left text-gray-500',
  listChildrenParentsActionsWrapper: 'flex justify-between items-center w-full md:w-2/3',
  listChildrenParentsWrapper: 'flex justify-start gap-2 flex-wrap w-full',
  listActionsWrapper: 'flex gap-2 self-end',
  listActionsButtonIcon: 'w-5 h-5 stroke-3',
  listActionButton: 'flex items-center justify-center w-full h-8 px-3 gap-2 rounded-2xl transition-all duration-150 hover:bg-gray-200 lg:opacity-0 lg:pointer-events-none lg:group-hover:opacity-100 lg:group-hover:pointer-events-auto',

  emptyMessage: 'p-3 italic',
  relationPill: 'px-2 py-1 text-sm rounded-full bg-gray-100 truncate transition-colors duration-150 group-hover:bg-gray-200',
  listHr: 'm-0 p-0 md:hidden'
};


// UI Helper functions
/**
 * Makes a DOM element visible by removing the Tailwind `hidden` class.
 *
 * @function show
 * @param {HTMLElement} element The element to show.
 * @returns {void}
 */
export function show(element) {
  element.classList.remove('hidden');
}

/**
 * Makes a DOM element invisible by adding the Tailwind `hidden` class.
 *
 * @function hide
 * @param {HTMLElement} element The element to hide.
 * @returns {void}
 */
export function hide(element) {
  element.classList.add('hidden');
}