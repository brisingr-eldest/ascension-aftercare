import { initAttendance } from "./attendance.js";
import { initLogin } from "./login.js"
import { initStudents } from "./students.js";
import { initUsers } from "./users.js";

document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initUsers();
  initStudents();
  initAttendance();
});