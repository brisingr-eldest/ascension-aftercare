// attendance.js
// Handles attendance logs: recording, querying, rendering, CSV export, and bulk cleanup.

import { insertRecords, selectRecords, deleteRecords } from './api.js';
import { $, el, els } from './dom.js';
import { UI_CLASSES } from './config.js';
import { listFilters, applyFiltersAndSort } from './filters.js';
import { state } from './state.js';

const feedContainer = $('attendance-container');
let currentRenderedLogs = [];
let _deleteListenerAttached = false;

/** ============================
       Core API
============================ */
export const attendanceAPI = {
  /** Log a student in/out */
  async log(studentId, action, performedBy) {
    if (!['in', 'out'].includes(action)) throw new Error(`Invalid action: ${action}`);
    const record = {
      student_id: studentId,
      action,
      performed_by: performedBy,
      timestamp: new Date().toISOString()
    };
    const { data, error } = await insertRecords('attendance_logs', [record]);
    if (error) throw error;
    return data?.[0] ?? null;
  },

  /** Retrieve attendance logs optionally filtered by studentId and date range */
  async getLogs({ studentId = null, startDate = null, endDate = null } = {}) {
    const { data: rows = [], error } = await selectRecords('attendance_logs', {
      selectFields: 'id, student_id, action, timestamp, performed_by',
      filters: studentId ? { student_id: studentId } : {}
    });
    if (error) return { data: [], error };

    const filtered = rows.filter(r => {
      if (!r.timestamp) return false;
      const utcDate = new Date(r.timestamp).toISOString().slice(0, 10);
      if (startDate && utcDate < startDate) return false;
      if (endDate && utcDate > endDate) return false;
      return true;
    });

    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return { data: filtered, error: null };
  },

  /** Delete a single log */
  async deleteLog(logId) {
    if (!logId) throw new Error("Missing logId");
    const { error } = await deleteRecords('attendance_logs', { id: logId });
    if (error) throw error;
    return true;
  },

  /** Delete all logs before a specific date (YYYY-MM-DD) */
  async deleteLogsBefore(dateStr) {
    if (!dateStr) throw new Error("Missing cutoff date");
    const cutoffIso = `${dateStr}T23:59:59Z`;
    const { error } = await deleteRecords('attendance_logs', {
      timestamp: { op: 'lt', value: cutoffIso }
    });
    if (error) throw error;
    return true;
  }
};

/** ============================
       Rendering
============================ */

/** Render attendance logs to the feed container */
export async function renderAttendanceFeed() {
  if (!feedContainer) return;

  // Read filters from UI
  const search = $('attendance-search')?.value.trim().toLowerCase() || '';
  const startDate = $('attendance-start-date')?.value || null;
  const endDate = $('attendance-end-date')?.value || null;
  const action = $('attendance-action')?.value || null;

  listFilters.attendance.search = search;
  listFilters.attendance.startDate = startDate;
  listFilters.attendance.endDate = endDate;
  listFilters.attendance.action = action;

  const { data: logs = [] } = await attendanceAPI.getLogs({ startDate, endDate });

  if (!logs.length) {
    feedContainer.innerHTML = '<div class="text-gray-500">No attendance logs found.</div>';
    return;
  }

  state.studentById ||= {};
  state.userById ||= {};

  // which student ids are missing from state?
  const missingStudentIds = [...new Set(
    logs.map(l => l.student_id).filter(id => id && !state.studentById[id])
  )];
  if (missingStudentIds.length) {
    const { data: students = [] } = await selectRecords('students', {
      selectFields: 'id, first_name, last_name, grade, checked_in',
      filters: { id: missingStudentIds }   // arrays -> .in(...) via your applyFilters
    });
    students.forEach(s => { state.studentById[s.id] = s; });
  }

  // which performer ids are missing from state?
  const missingUserIds = [...new Set(
    logs.map(l => l.performed_by).filter(id => id && !state.userById[id])
  )];
  if (missingUserIds.length) {
    const { data: users = [] } = await selectRecords('users', {
      selectFields: 'id, first_name, last_name',
      filters: { id: missingUserIds }
    });
    users.forEach(u => { state.userById[u.id] = u; });
  }

  // Filtering and sorting
  const fieldMap = {
    student_name: l => {
      const s = state.studentById[l.student_id];
      return s ? `${s.first_name} ${s.last_name}` : 'Unknown';
    },
    action: l => l.action,
    timestamp: l => l.timestamp
  };
  const filteredLogs = applyFiltersAndSort(logs, listFilters.attendance, fieldMap);
  currentRenderedLogs = filteredLogs;

  // Helper to render a single log
  const renderLogItem = (log) => {
    const student = state.studentById[log.student_id];
    const performer = state.userById[log.performed_by];
    const studentName = student ? `${student.first_name} ${student.last_name}` : 'Unknown';
    const performedByName = performer ? `${performer.first_name ?? ''} ${performer.last_name ?? ''}`.trim() : 'Unknown';
    const timestamp = new Date(log.timestamp).toLocaleString();
    const action = log.action.toUpperCase();
    const actionColor = action === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

    return el('div', {
      class: `${UI_CLASSES.attendanceFeedItem} grid grid-cols-2 gap-2 items-center py-2 md:grid-cols-5`,
      html: `
        <span class="${UI_CLASSES.studentName} font-semibold">${studentName}</span>
        <span class="justify-self-start px-2 py-[0.5] rounded text-sm font-medium ${actionColor}">${action}</span>
        <span class="text-sm text-gray-500">${timestamp}</span>
        <span class="text-sm text-gray-600 italic">${performedByName}</span>
        <button data-log-id="${log.id}" class="text-red-500 hover:underline text-sm hidden md:inline-block">Delete</button>
      `
    });
  };

  // Render all logs
  const fragment = document.createDocumentFragment();
  filteredLogs.forEach(log => fragment.appendChild(renderLogItem(log)));
  feedContainer.innerHTML = '';
  feedContainer.appendChild(fragment);
}

/** Refresh feed and attach delete listener once */
export async function refreshAttendanceFeed() {
  await renderAttendanceFeed();
  if (!feedContainer || _deleteListenerAttached) return;
  _deleteListenerAttached = true;

  feedContainer.addEventListener('click', async ev => {
    const btn = ev.target.closest && ev.target.closest('button[data-log-id]');
    if (!btn) return;
    const logId = btn.dataset.logId;
    if (!logId) return;

    if (!confirm('Are you sure you want to delete this attendance log?')) return;

    try {
      await attendanceAPI.deleteLog(logId);
      await renderAttendanceFeed();
    } catch (err) {
      console.error('Failed to delete log', err);
      alert('Failed to delete log. See console for details.');
    }
  });
}

/** ============================
       CSV Export
============================ */
function csvEscape(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

/** Download currently rendered logs as CSV */
export function downloadCurrentAttendanceCsv() {
  const rows = currentRenderedLogs || [];
  if (!rows.length) {
    alert('No logs available to export.');
    return;
  }

  const headers = ['Name', 'Action', 'Timestamp', 'Performed By'];
  const lines = [headers.map(csvEscape).join(',')];

  rows.forEach(l => {
    const s = state.studentById[l.student_id];
    const studentName = s ? `${s.first_name} ${s.last_name}` : 'Unknown';
    const u = state.userById[l.performed_by];
    const performerName = u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : 'Unknown';
    const ts = new Date(l.timestamp).toLocaleString();
    lines.push([studentName, l.action, ts, performerName].map(csvEscape).join(','));
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const s = listFilters.attendance.startDate || 'all';
  const e = listFilters.attendance.endDate || 'all';
  a.download = `attendance_${s}_${e}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

/** Download compressed in/out CSV */
export function downloadCompressedAttendanceCsv(graceMinutes = 0) {
  const logs = currentRenderedLogs || [];
  if (!logs.length) {
    alert("No logs available to export.");
    return;
  }

  // Helper: format student name
  const getStudentName = id => {
    const s = state.studentById[id];
    return s ? `${s.first_name} ${s.last_name}` : 'Unknown';
  };

  // Helper: calculate billable hours
  const calcBillableHours = (start, end, grace = 5) => {
    if (!end) return "Error";
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s) || isNaN(e) || e <= s) return "Error";

    // Anchor to half-hour blocks
    const startBlock = new Date(s);
    startBlock.setMinutes(s.getMinutes() < 30 ? 30 : 30, 0, 0);
    if (s.getMinutes() < 30) startBlock.setHours(startBlock.getHours() - 1);
    startBlock.setMinutes(startBlock.getMinutes() + grace);

    const endBlock = new Date(e);
    endBlock.setMinutes(e.getMinutes() > 30 ? 30 : 30, 0, 0);
    if (e.getMinutes() <= 30) endBlock.setHours(endBlock.getHours());
    else endBlock.setHours(endBlock.getHours() + 1);
    endBlock.setMinutes(endBlock.getMinutes() - grace);

    let hours = 0;
    let cursor = new Date(startBlock);
    while (cursor <= endBlock) {
      hours++;
      cursor.setHours(cursor.getHours() + 1);
    }
    return hours;
  };

  // Group logs by student
  const grouped = logs.reduce((acc, log) => {
    if (!acc[log.student_id]) acc[log.student_id] = [];
    acc[log.student_id].push(log);
    return acc;
  }, {});

  // Build compressed in/out pairs
  const compressed = Object.entries(grouped).flatMap(([studentId, entries]) => {
    entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    let inTime = null;
    const pairs = [];

    for (const e of entries) {
      if (e.action === 'in') inTime = new Date(e.timestamp);
      else if (e.action === 'out' && inTime) {
        pairs.push({ student_name: getStudentName(studentId), in: inTime, out: new Date(e.timestamp) });
        inTime = null;
      }
    }

    // Handle student never checked out
    if (inTime) pairs.push({ student_name: getStudentName(studentId), in: inTime, out: null });
    return pairs;
  });

  // Build CSV
  const headers = ["Name", "In Timestamp", "Out Timestamp", "Hours"];
  const rows = compressed.map(c => [
    c.student_name,
    c.in.toLocaleString(),
    c.out ? c.out.toLocaleString() : "",
    calcBillableHours(c.in, c.out, graceMinutes)
  ]);

  const csvContent = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = el("a", { href: url, download: 'attendance_compressed.csv' });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** ============================
       Bulk Cleanup
============================ */
export async function bulkCleanupAttendance(cutoffDate) {
  if (!cutoffDate) {
    alert("Please select a cutoff date.");
    return;
  }

  // Fetch logs strictly before or on the cutoff
  const { data: logs = [] } = await attendanceAPI.getLogs({ endDate: cutoffDate });
  if (!logs.length) {
    alert(`No logs to delete up to and including ${cutoffDate}.`);
    return;
  }

  // Offer export before deletion
  if (confirm(`There are ${logs.length} logs up to and including ${cutoffDate}. Export them before deleting?`)) {
    const previousLogs = currentRenderedLogs;
    currentRenderedLogs = logs;
    try {
      downloadCurrentAttendanceCsv();
    } finally {
      currentRenderedLogs = previousLogs;
    }
  }

  // Confirm deletion
  if (!confirm(`Delete ${logs.length} logs up to and including ${cutoffDate}? This cannot be undone.`)) return;

  try {
    await attendanceAPI.deleteLogsBefore(cutoffDate);
    await refreshAttendanceFeed();
    alert('Logs deleted successfully.');
  } catch (err) {
    console.error('Bulk cleanup failed', err);
    alert('Failed to delete logs. See console for details.');
  }
}

/** ============================
       Event Handlers
============================ */
export function handleDownloadCompressed() {
  downloadCompressedAttendanceCsv(5);
}

export async function handleBulkCleanup() {
  const cutoff = els.bulkDeleteLogsDate?.value;
  await bulkCleanupAttendance(cutoff);
}