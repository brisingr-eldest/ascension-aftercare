/** ============================ 
        UI CLASS MAP 
============================ */
export const UI_CLASSES = {
  /** List / check-in UI */
  selectAllListItem: 'flex items-center space-x-3 py-3 pr-3 cursor-pointer text-base rounded-lg hover:bg-gray-100 transition-colors duration-150 select-none',
  studentListItem: 'flex items-center space-x-3 p-3 cursor-pointer text-base rounded-lg hover:bg-gray-100 transition-colors duration-150 select-none',
  studentName: 'text-md font-medium',

  /** Checkbox / selectable list UI */
  checkboxInput: 'sr-only peer',
  checkboxBox: [
    'relative flex-shrink-0 w-7 h-7 md:w-6 md:h-6 rounded-lg border border-gray-300',
    'flex items-center justify-center transition-all duration-200',
    'peer-checked:bg-emerald-600 peer-checked:border-emerald-600',
    'hover:border-gray-400 hover:bg-gray-50',
    'shadow-sm',
    '[&>svg]:opacity-0 [&>svg]:scale-75 [&>svg]:transition-all [&>svg]:duration-200',
    'peer-checked:[&>svg]:opacity-100 peer-checked:[&>svg]:scale-100'
  ].join(' '),
  checkboxIcon: 'w-4 h-4 text-white stroke-2',

  /** Pills & picker */
  pill: 'inline-flex items-center px-3 py-1 rounded-full max-w-[14rem] text-xs font-medium bg-gray-100 text-gray-800 shadow-sm',
  removePillBtn: 'ml-2 text-gray-500 hover:text-red-500 transition-colors duration-150',

  /** Card / table layout */
  tableCard: [
    'bg-white rounded-xl shadow-md p-5 flex flex-col md:flex-row md:items-start md:gap-6',
    'transition-transform hover:scale-[1.01]'
  ].join(' '),
  cardContent: 'flex-1 flex flex-col md:flex-row md:items-center md:gap-4',
  studentCard: 'student-card',
  userCard: 'user-card',

  /** Content pieces */
  cardTableName: 'w-full md:w-1/4 text-lg font-semibold text-gray-900',
  cardTableItem: 'flex-1 min-w-0 text-gray-700',
  relationContainer: 'flex-1 min-w-0 flex flex-wrap gap-2 items-center',
  cardTablePrefix: 'font-semibold text-gray-800 mr-1',

  /** Actions */
  actionsContainer: 'w-full md:w-auto flex gap-3 justify-end mt-2 md:mt-0',
  editAction: 'mr-2 text-blue-500 hover:text-blue-600 transition-colors duration-150',
  deleteAction: 'text-red-500 hover:text-red-600 transition-colors duration-150',
  actionLink: 'font-medium',
};

/** ============================ 
        Messages / Constants 
============================ */
export const CHECKED_IN_EMPTY_MSG = 'All students are checked in.';
export const CHECKED_OUT_EMPTY_MSG = 'All students are checked out.';