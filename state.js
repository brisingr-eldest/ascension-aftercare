import { fetchStudents, selectRecords } from './api.js';

export const state = {
  role: null,
  userId: null,
  userName: null,
  parentId: null,
  currentEdit: { userId: null, studentId: null },
  allStudents: [],
  allUsers: [],
  studentById: {},
  userById: {},
  selectedStudents: [],
  _pickerInit: false,
  _pickerDebounce: null
};

export async function ensureStudentCache() {
  const students = await fetchStudents();
  state.allStudents = students;
  state.studentById = Object.fromEntries(
    (students || []).map(s => [s.id, s])
  );
}

export async function ensureUserCache() {
  const { data: users = [] } = await selectRecords('users', { selectFields: 'id, first_name, last_name' });
  state.allUsers = users;
  state.userById = Object.fromEntries(users.map(u => [u.id, u]));
}
