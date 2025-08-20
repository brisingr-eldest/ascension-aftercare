import { supabase } from './supabase.js';
import { state } from './state.js'

const OPERATORS = { // q: "query", k: "key", v: "value"
  eq: (q, k, v) => q.eq(k, v),
  neq: (q, k, v) => q.neq(k, v),
  gt: (q, k, v) => q.gt(k, v),
  gte: (q, k, v) => q.gte(k, v),
  lt: (q, k, v) => q.lt(k, v),
  lte: (q, k, v) => q.lte(k, v),
  like: (q, k, v) => q.like(k, v)
};

export function applyFilters(query, filters) {
  return Object.entries(filters).reduce((q, [key, condition]) => {
    if (Array.isArray(condition)) return q.in(key, condition);
    if (condition && typeof condition === 'object' && 'op' in condition && 'value' in condition) {
      const fn = OPERATORS[condition.op];
      if (!fn) throw new Error(`Unknown filter op: ${condition.op}`);
      return fn(q, key, condition.value);
    }
    return q.eq(key, condition);
  }, query);
}

export async function selectRecords(table, { selectFields = '*', filters = {}, single = false } = {}) {
  let query = supabase.from(table).select(selectFields);
  query = applyFilters(query, filters);
  if (single) query = query.single();
  const { data, error } = await query;
  if (error) console.error(`Failed to fetch from ${table}`, { filters, error });
  return { data, error };
}

export async function insertRecords(table, records) {
  const { data, error } = await supabase.from(table).insert(records).select();
  if (error) console.error(`Failed to insert into ${table}:`, error);
  return { data, error };
}

export async function updateRecords(table, updates, filters = {}) {
  const { data, error } = await applyFilters(supabase.from(table).update(updates), filters);
  if (error) console.error(`Failed to update ${table}:`, error);
  return { data, error };
}

export async function deleteRecords(table, filters = {}) {
  const { data, error } = await applyFilters(supabase.from(table).delete(), filters);
  if (error) console.error(`Failed to delete from ${table}:`, error);
  return { data, error };
}

export const usersAPI = {
  create: payload => insertRecords('users', [payload]),
  update: (id, payload) => updateRecords('users', payload, { id })
};

export const studentsAPI = {
  create: payload => insertRecords('students', [payload]),
  update: (id, payload) => updateRecords('students', payload, { id })

}

async function getParentStudentIds(parentId) {
  const { data: rels, error } = await selectRecords('students_parents', { filters: { parent_id: parentId } });
  if (error) { console.error('Failed reading students_parents', error); return []; }
  return rels.map(r => r.student_id) || [];
}

export async function fetchStudents({ checked_in = null } = {}) {
  const filters = {};
  if (typeof checked_in === 'boolean') filters.checked_in = checked_in;

  if (state.role === 'parent' && state.parentId) {
    const ids = await getParentStudentIds(state.parentId);
    if (!ids.length) return [];
    filters.id = ids;
  }

  const { data, error } = await selectRecords('students', { selectFields: 'id, first_name, last_name, checked_in, grade', filters });
  if (error) return [];
  return data;
}