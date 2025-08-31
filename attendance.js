import { insertAttendanceLogs, fetchAttendanceLogs, deleteAttendanceLogs } from './api.js';
import { UI_CLASSES } from './ui.js';
import { els } from './dom.js';

/**
 * Call this on page load to wire controls and perform initial fetch.
 * loadAndRenderAttendanceLogs is intentionally separate and exported.
 */
export function initAttendance() {
  if (!els.attendanceContainer) {
    console.warn('Attendance logs container not found (#attendance-logs-container)');
    return;
  }

  // wire controls
  const reload = () => loadAndRenderAttendanceLogs({
    sort: els.attendanceSort ? els.attendanceSort.value : undefined,
    start: els.attendanceStart && els.attendanceStart.value ? els.attendanceStart.value : null,
    end: els.attendanceEnd && els.attendanceEnd.value ? els.attendanceEnd.value : null,
    container: els.attendanceContainer
  });

  if (els.attendanceSort) els.attendanceSort.addEventListener('change', reload);
  if (els.attendanceStart) els.attendanceStart.addEventListener('change', reload);
  if (els.attendanceEnd) els.attendanceEnd.addEventListener('change', reload);

  if (els.attendanceDownload) {
    els.attendanceDownload.addEventListener('click', async () => {
      // fetch whatever is currently visible (same query as reload) and download CSV
      const sort = els.attendanceSort ? els.attendanceSort.value : 'timestamp-desc';
      const start = els.attendanceStart && els.attendanceStart.value ? els.attendanceStart.value : null;
      const end = els.attendanceEnd && els.attendanceEnd.value ? els.attendanceEnd.value : null;
      const logs = await fetchAttendanceLogs({
        columns: '*, students(first_name,last_name), users(first_name,last_name)',
        start,
        end,
        sort
      });
      downloadCSV(logs || []);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.altKey && els.attendanceDangerZone) {
      els.attendanceDangerZone.classList.remove('hidden');
    }
  });
  document.addEventListener('keyup', (e) => {
    if (!e.altKey && els.attendanceDangerZone) {
      els.attendanceDangerZone.classList.add('hidden');
    }
  });

  window.addEventListener('blur', () => {
    els.attendanceDangerZone.classList.add('hidden');
  });

  // Delete logs handler
  if (els.attendanceDeleteButton) {
    els.attendanceDeleteButton.addEventListener('click', async () => {
      // Step 1: Offer download
      const downloadFirst = confirm("Would you like to download the logs before deleting?");
      if (downloadFirst) {
        const logs = await fetchAttendanceLogs({
          columns: '*, students(first_name,last_name), users(first_name,last_name)',
          sort: 'timestamp-asc' // oldest → newest
        });
        downloadCSV(logs || []);
      }

      // Step 2: Confirm destructive action
      const confirmDelete = confirm(
        "Are you sure you want to delete ALL attendance logs?\n\n⚠️ This cannot be undone."
      );
      if (!confirmDelete) return;

      try {
        await deleteAttendanceLogs();
        alert("All logs deleted successfully.");
        reload();
      } catch (err) {
        console.error(err);
        alert("Failed to delete logs.");
      }
    });
  }

  // initial load
  reload();
}

/**
 * Create attendance logs for one or more students.
 *
 * @param {Object} opts
 * @param {Array<string|Object>} opts.students Array of student ids OR student objects {id, firstName, lastName}
 * @param {'in'|'out'} opts.action
 * @param {string|Object} opts.performedBy user id or user object {id, firstName, lastName}
 * @returns {Promise<{success:boolean, result:any}>}
 */
export async function createLog({ students = [], action, performedBy }) {

  if (!students || students.length === 0) return { success: true, result: null };

  const performerId = (typeof performedBy === 'object' && performedBy !== null) ? (performedBy.id || performedBy.userId) : performedBy;
  const ts = new Date().toISOString();

  const rows = students.map(s => {
    const studentId = (typeof s === 'object') ? (s.id || s.studentId) : s;
    return {
      student_id: studentId,
      action,
      timestamp: ts,
      performed_by: performerId
    };
  });

  const { data, error } = await insertAttendanceLogs(rows);
  if (error) {
    console.error('Failed to create attendance logs:', error);
    return { success: false, result: error };
  }
  return { success: true, result: data };
}

/**
 * Public function to (re)load and render logs into the DOM.
 * Separated so other modules can call it when needed.
 *
 * @param {Object} opts
 * @param {string} [opts.sort] same values as the sort select (e.g. 'timestamp-desc')
 * @param {string|null} [opts.start] ISO date (or yyyy-mm-dd)
 * @param {string|null} [opts.end] ISO date (or yyyy-mm-dd)
 * @param {HTMLElement|null} [opts.container] DOM element to render into (falls back to #attendance-logs-container)
 */
export async function loadAndRenderAttendanceLogs({ sort, start = null, end = null, container = null } = {}) {
  const cont = container || document.getElementById('attendance-logs-container');
  if (!cont) {
    console.warn('Attendance logs container not found (#attendance-logs-container)');
    return;
  }

  const logs = await fetchAttendanceLogs({
    columns: '*, students(first_name,last_name), users(first_name,last_name)',
    start,
    end,
    sort: sort || 'timestamp-desc'
  });

  renderAttendanceList(logs, cont);
}



/**
 * Renders an array of attendance log rows into the provided container.
 * Each row rendered like your users list: top-level row, left name+action, right timestamp+performedBy,
 * and <hr> between rows.
 *
 * Expected row shape (common possibilities):
 * - r.students: { first_name, last_name }
 * - r.users: { first_name, last_name }
 * - r.student_first_name / r.student_last_name
 * - r.timestamp or r._timestampISO
 * - r.action
 */
function renderAttendanceList(list, containerElem) {
  containerElem.innerHTML = '';

  if (!list || list.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.textContent = 'No attendance logs found.';
    emptyMessage.className = UI_CLASSES.emptyMessage;
    containerElem.appendChild(emptyMessage);
    return;
  }

  list.forEach((r, index) => {
    const row = document.createElement('div');
    row.className = UI_CLASSES.attendanceListRow;

    const nameAndAction = document.createElement('div');
    nameAndAction.className = UI_CLASSES.listNameRoleGradeActionWrapper;

    const name = document.createElement('div');
    name.textContent = formatNameFromRow(r);
    name.className = UI_CLASSES.listName;

    const action = document.createElement('div');
    action.className = UI_CLASSES.attendanceListActionWrapper;

    const actionPill = document.createElement('span');
    if (r.action.toString() === 'in') {
      actionPill.className = `${UI_CLASSES.attendanceListActionPill} bg-green-100 text-green-700`;
    } else {
      actionPill.className = `${UI_CLASSES.attendanceListActionPill} bg-red-100 text-red-700`;
    }
    actionPill.textContent = (r.action).toString().toUpperCase();

    const childrenAndActions = document.createElement('div');
    childrenAndActions.className = UI_CLASSES.listChildrenParentsActionsWrapper;

    const timestampWrapper = document.createElement('div');
    const tsISO = r.timestamp;
    timestampWrapper.textContent = new Date(tsISO).toLocaleString();
    timestampWrapper.className = UI_CLASSES.attendanceListTimestamp;

    const performedByWrapper = document.createElement('div');
    performedByWrapper.className = UI_CLASSES.attendanceListPerformedBy;
    performedByWrapper.textContent = formatPerformerFromRow(r);

    // assemble
    action.appendChild(actionPill);
    nameAndAction.appendChild(name);
    nameAndAction.appendChild(action);
    childrenAndActions.appendChild(timestampWrapper);
    childrenAndActions.appendChild(performedByWrapper);

    row.appendChild(nameAndAction);
    row.appendChild(childrenAndActions);

    containerElem.appendChild(row);

    // separator
    if (index !== list.length - 1) {
      const hr = document.createElement('hr');
      hr.className = UI_CLASSES.listHr;
      containerElem.appendChild(hr);
    }
  });
}

/* ---------- small helpers ---------- */

function formatNameFromRow(r) {
  if (r.students && (r.students.last_name || r.students.first_name)) {
    const last = r.students.last_name || '';
    const first = r.students.first_name || '';
    return `${last}${first ? ', ' + first : ''}`.trim();
  }
  if (r.student_last_name || r.student_first_name) {
    return `${r.student_last_name || ''}${r.student_first_name ? ', ' + r.student_first_name : ''}`.trim();
  }
  if (r.student_name) return r.student_name;
  return r.student_id || 'Unknown';
}

function formatPerformerFromRow(r) {
  if (r.users && (r.users.last_name || r.users.first_name)) {
    const last = r.users.last_name || '';
    const first = r.users.first_name || '';
    return `${last}${first ? ', ' + first : ''}`.trim();
  }
  if (r.performed_by_name) return r.performed_by_name;
  if (r.performed_by) return r.performed_by;
  return '—';
}

function downloadCSV(logs) {
  if (!logs || logs.length === 0) return;

  const rows = [['Last Name', 'First Name', 'Action', 'Timestamp (local)', 'Performed By Last Name', 'Performed By First Name']];

  logs.forEach(r => {
    const lastName = r.students.last_name;
    const firstName = r.students.first_name;
    const tsISO = r.timestamp;
    const tsLocal = tsISO ? new Date(tsISO).toLocaleString() : '';
    const performerLastName = r.users.last_name;
    const performerFirstName = r.users.first_name;
    rows.push([lastName, firstName, r.action, tsLocal, performerLastName, performerFirstName]);
  });

  const csv = rows.map(r => r.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}