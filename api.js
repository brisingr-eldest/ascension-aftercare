import { supabase } from './supabase.js';

/* ============================================================================
 * Type Definitions
 * ==========================================================================*/

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} role
 * @property {string} pin
 */

/**
 * @typedef {Object} Relation
 * @property {string} studentId
 * @property {string} parentId
 */

/* ============================================================================
 * Generic API Helpers
 * ==========================================================================*/

/**
 * Run a SELECT query.
 */
async function apiSelect(table, { columns = '*' } = {}) {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) console.error(`Failed to fetch from ${table}:`, error);
  return { data, error };
}

/**
 * Run an UPDATE query.
 */
async function apiUpdate(table, update, whereFn) {
  let query = supabase.from(table).update(update);
  if (whereFn) query = whereFn(query);
  const { data, error } = await query.select();
  if (error) console.error(`Failed to update ${table}:`, error);
  return { data, error };
}

/**
 * Run an INSERT query.
 */
async function apiInsert(table, insertion) {
  const { data, error } = await supabase.from(table).insert(insertion).select();
  if (error) console.error(`Failed to insert into ${table}:`, error);
  return { data, error };
}

/**
 * Run a DELETE query.
 */
async function apiDelete(table, condition) {
  let query = supabase.from(table).delete();
  for (const [key, value] of Object.entries(condition)) {
    query = Array.isArray(value) ? query.in(key, value) : query.eq(key, value);
  }
  const { error } = await query;
  if (error) console.error(`Failed to delete from ${table}:`, error);
  return { error };
}

/** Convenience: return the first row or null */
function firstRow(data) {
  return data && data[0] ? data[0] : null;
}

/* ============================================================================
 * Students
 * ==========================================================================*/

export async function fetchStudents() {
  const { data, error } = await apiSelect('students');
  if (error || !data) return [];
  return data.map(r => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    grade: r.grade,
    checkedIn: r.checked_in
  }));
}

export async function updateStudentsIOStatus(ids, newStatus) {
  if (!ids.length) return { data: null, error: null };
  return apiUpdate('students', { checked_in: newStatus }, q => q.in('id', ids));
}

export async function updateStudent(student) {
  const { data, error } = await apiUpdate(
    'students',
    {
      first_name: student.firstName,
      last_name: student.lastName,
      grade: student.grade
    },
    q => q.eq('id', student.id)
  );
  return error ? null : firstRow(data);
}

export async function insertStudent(student) {
  const { data, error } = await apiInsert('students', [{
    first_name: student.firstName,
    last_name: student.lastName,
    grade: student.grade
  }]);
  return error ? null : firstRow(data);
}

export async function deleteStudent(studentId) {
  const { error } = await apiDelete('students', { id: studentId });
  return !error;
}

/* ============================================================================
 * Users
 * ==========================================================================*/

export async function fetchUsers() {
  const { data, error } = await apiSelect('users');
  if (error || !data) return [];
  return data.map(r => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    role: r.role,
    pin: r.pin
  }));
}

export async function updateUser(user) {
  const { data, error } = await apiUpdate(
    'users',
    {
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,
      pin: user.pin
    },
    q => q.eq('id', user.id)
  );
  return error ? null : firstRow(data);
}

export async function insertUser(user) {
  const { data, error } = await apiInsert('users', [{
    first_name: user.firstName,
    last_name: user.lastName,
    role: user.role,
    pin: user.pin
  }]);
  return error ? null : firstRow(data);
}

export async function deleteUser(userId) {
  const { error } = await apiDelete('users', { id: userId });
  return !error;
}

/* ============================================================================
 * Relations (students ↔ parents)
 * ==========================================================================*/

export async function fetchRelations() {
  const { data, error } = await apiSelect('students_parents');
  if (error || !data) return [];
  return data.map(r => ({
    studentId: r.student_id,
    parentId: r.parent_id
  }));
}

export async function getRelationsForParent(parentId) {
  const { data, error } = await supabase
    .from('students_parents')
    .select('student_id')
    .eq('parent_id', parentId);

  return error
    ? { ids: [], error }
    : { ids: data.map(r => r.student_id), error: null };
}

export async function addRelations(parentId, studentIds) {
  if (!studentIds?.length) return { data: null, error: null };
  const rows = studentIds.map(sid => ({ parent_id: parentId, student_id: sid }));
  return apiInsert('students_parents', rows);
}

export async function removeRelations(parentId, studentIds) {
  if (!studentIds?.length) return { error: null };
  return apiDelete('students_parents', { parent_id: parentId, student_id: studentIds });
}

/* ============================================================================
 * Attendance
 * ==========================================================================*/

export async function insertAttendanceLogs(rows) {
  if (!rows?.length) return { data: null, error: null };
  return apiInsert('attendance_logs', rows);
}

/**
 * Fetch attendance logs. Accepts an options object for client-side filtering and sorting.
 *
 * @param {Object} [opts]
 * @param {string} [opts.columns='*'] Postgrest select columns.
 * @param {string|null} [opts.start] ISO date string or null to filter start (inclusive).
 * @param {string|null} [opts.end] ISO date string or null to filter end (inclusive).
 * @param {string} [opts.sort='timestamp-desc'] dropdown value from UI (see mapping below)
 * @returns {Promise<Array>} array of log rows
 *
 * Expected dropdown values:
 * - 'firstName-asc' | 'firstName-desc'
 * - 'lastName-asc'  | 'lastName-desc'
 * - 'timestamp-asc' | 'timestamp-desc'
 * - 'performedBy-asc' | 'performedBy-desc'
 * - 'action-in' | 'action-out'
 */
export async function fetchAttendanceLogs({
  columns = '*, students(first_name,last_name), users(first_name,last_name)',
  start = null,
  end = null,
  sort = 'timestamp-desc'
} = {}) {
  const { data, error } = await apiSelect('attendance_logs', { columns });
  if (error || !data) return [];

  // Normalize timestamp into a prefixed property used by sorting
  const parsed = (data || []).map(r => {
    const ts = r.timestamp || r.created_at || r.inserted_at || null;
    return Object.assign({}, r, { _timestampISO: ts });
  });

  let filtered = parsed;

  // Date filtering
  if (start) {
    const startMs = new Date(start).getTime();
    filtered = filtered.filter(r => {
      const t = r._timestampISO ? new Date(r._timestampISO).getTime() : NaN;
      return !isNaN(t) && t >= startMs;
    });
  }
  if (end) {
    const endMs = new Date(end).getTime();
    const maybeEnd = (end.length === 10) ? (endMs + 24 * 60 * 60 * 1000 - 1) : endMs;
    filtered = filtered.filter(r => {
      const t = r._timestampISO ? new Date(r._timestampISO).getTime() : NaN;
      return !isNaN(t) && t <= maybeEnd;
    });
  }

  // If sort indicates action filter (e.g. 'in' or 'out' in your original select),
  // treat those as filters and remove any rows that don't match.
  if (sort === 'in' || sort === 'action-in') {
    filtered = filtered.filter(r => String(r.action).toLowerCase() === 'in');
    // set fallback sort to timestamp-desc
    sort = 'timestamp-desc';
  } else if (sort === 'out' || sort === 'action-out') {
    filtered = filtered.filter(r => String(r.action).toLowerCase() === 'out');
    sort = 'timestamp-desc';
  }

  // Map dropdown value to primary field + direction
  // primary will be one of: 'timestamp', 'lastName', 'firstName', 'performed', 'action'
  let primaryField = 'timestamp';
  let primaryDir = 'desc'; // default

  switch ((sort || '').toString()) {
    case 'timestamp-asc':
      primaryField = 'timestamp'; primaryDir = 'asc'; break;
    case 'timestamp-desc':
      primaryField = 'timestamp'; primaryDir = 'desc'; break;

    case 'lastName-asc':
      primaryField = 'lastName'; primaryDir = 'asc'; break;
    case 'lastName-desc':
      primaryField = 'lastName'; primaryDir = 'desc'; break;

    case 'firstName-asc':
      primaryField = 'firstName'; primaryDir = 'asc'; break;
    case 'firstName-desc':
      primaryField = 'firstName'; primaryDir = 'desc'; break;

    case 'performedBy-asc':
      primaryField = 'performed'; primaryDir = 'asc'; break;
    case 'performedBy-desc':
      primaryField = 'performed'; primaryDir = 'desc'; break;

    case 'action-asc':
      primaryField = 'action'; primaryDir = 'asc'; break;
    case 'action-desc':
      primaryField = 'action'; primaryDir = 'desc'; break;

    // accept short forms, too
    case 'firstName': case 'firstName-asc': primaryField = 'firstName'; primaryDir = 'asc'; break;
    case 'lastName': case 'lastName-asc': primaryField = 'lastName'; primaryDir = 'asc'; break;
  }

  // Base order (fallback chain)
  const baseOrder = ['timestamp', 'lastName', 'firstName', 'performed', 'action'];

  // Build the actual comparator chain:
  // 1) primary (selected)
  // 2) then the remaining fields in baseOrder keeping the original relative sequence
  const primaryIndex = baseOrder.indexOf(primaryField);
  const chainFields = [
    // place primary first
    baseOrder[primaryIndex],
    // then all other fields in base order excluding the primary
    ...baseOrder.filter((_, i) => i !== primaryIndex)
  ];

  // Create comparator factory for each field (returns a function (a,b) => number)
  const cmpFactory = {
    timestamp: (dir = 'desc') => (a, b) => {
      const at = a._timestampISO ? new Date(a._timestampISO).getTime() : NaN;
      const bt = b._timestampISO ? new Date(b._timestampISO).getTime() : NaN;
      if (isNaN(at) && isNaN(bt)) return 0;
      if (isNaN(at)) return dir === 'asc' ? -1 : 1;
      if (isNaN(bt)) return dir === 'asc' ? 1 : -1;
      return dir === 'asc' ? at - bt : bt - at;
    },
    lastName: (dir = 'asc') => (a, b) => {
      const an = String(a.students?.last_name || a.student_last_name || '').toLowerCase();
      const bn = String(b.students?.last_name || b.student_last_name || '').toLowerCase();
      return dir === 'asc' ? an.localeCompare(bn) : bn.localeCompare(an);
    },
    firstName: (dir = 'asc') => (a, b) => {
      const an = String(a.students?.first_name || a.student_first_name || '').toLowerCase();
      const bn = String(b.students?.first_name || b.student_first_name || '').toLowerCase();
      return dir === 'asc' ? an.localeCompare(bn) : bn.localeCompare(an);
    },
    performed: (dir = 'asc') => (a, b) => {
      const anLast = String(a.users?.last_name || '').toLowerCase();
      const bnLast = String(b.users?.last_name || '').toLowerCase();
      if (anLast !== bnLast) return dir === 'asc' ? anLast.localeCompare(bnLast) : bnLast.localeCompare(anLast);
      const anFirst = String(a.users?.first_name || '').toLowerCase();
      const bnFirst = String(b.users?.first_name || '').toLowerCase();
      return dir === 'asc' ? anFirst.localeCompare(bnFirst) : bnFirst.localeCompare(anFirst);
    },
    action: (dir = 'asc') => (a, b) => {
      const an = String(a.action || '').toLowerCase();
      const bn = String(b.action || '').toLowerCase();
      return dir === 'asc' ? an.localeCompare(bn) : bn.localeCompare(an);
    }
  };

  // Build an array of comparator functions according to chainFields.
  const comps = chainFields.map((field, idx) => {
    // Use primaryDir only for the first element; fallbacks use sensible defaults:
    if (idx === 0) {
      // primary direction
      const dir = primaryDir;
      return cmpFactory[field](dir);
    }
    // fallback directions:
    if (field === 'timestamp') return cmpFactory.timestamp('desc'); // keep timestamp fallback desc
    if (field === 'lastName') return cmpFactory.lastName('asc');
    if (field === 'firstName') return cmpFactory.firstName('asc');
    if (field === 'performed') return cmpFactory.performed('asc');
    if (field === 'action') return cmpFactory.action('asc');
    // default
    return (a, b) => 0;
  });

  // final comparator that applies chain
  filtered.sort((a, b) => {
    for (let c of comps) {
      const res = c(a, b);
      if (res !== 0) return res;
    }
    return 0;
  });

  return filtered;
}

export async function deleteAttendanceLogs() {
  const { error } = await supabase
    .from('attendance_logs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // dummy WHERE clause
  return { error };
}