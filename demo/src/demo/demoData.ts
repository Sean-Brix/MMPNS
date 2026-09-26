/**
 * Static demo dataset
 * ───────────────────
 * Single source of truth for every piece of content shown in this portfolio
 * build. The real application loads this data from Firebase / the REST API;
 * the demo serves it from here instead so the whole site runs without a
 * backend. Everything is deterministic — the same data appears on every
 * visit.
 */

import { staffMembers } from '../app/pages/FacultyStaff/data';
import { alumniProfiles } from '../app/pages/AlumniGallery/data';

/* ═══════════════════ Deterministic PRNG (stable codes across sessions) ═══ */

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const makeStudentCode = (rng: () => number) =>
  Array.from({ length: 8 }, () => CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)]).join('');

const makeSystemIdRaw = (rng: () => number) =>
  Array.from({ length: 12 }, () => String(Math.floor(rng() * 10))).join('');

/** Matches the production formatter: 12 raw digits chunked in pairs joined by "0". */
export const formatSystemId = (rawId: string) => (rawId.match(/.{2}/g) || []).join('0');

/* ═══════════════════ Date helpers (demo stays "alive" on any day) ═══════ */

const DAY_MS = 24 * 60 * 60 * 1000;

export const daysAgoIso = (days: number, hour = 8, minute = 0) => {
  const d = new Date(Date.now() - days * DAY_MS);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

export const daysAheadIso = (days: number, hour = 17, minute = 0) => {
  const d = new Date(Date.now() + days * DAY_MS);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

export const manilaDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

/* ═══════════════════ Demo accounts ═══════════════════ */

export interface DemoAccount {
  uid: string;
  role: string;
  username: string;
  status: 'active' | 'inactive';
  displayName: string;
  initials: string;
  createdAt: string;
  lastLogin: string | null;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  contactNumber?: string;
  department?: string;
  position?: string;
  employeeId?: string;
  // Student fields
  studentCode?: string;
  systemIdRaw?: string;
  systemId?: string;
  lrn?: string;
  gradeLevel?: string;
  section?: string;
  gender?: string;
  dateOfBirth?: string;
  guardianName?: string;
  guardianContact?: string;
  guardianRelationship?: string;
  province?: string;
  city?: string;
  address?: string;
  noOfSiblings?: number;
  monthlyFamilyIncome?: number;
  gwa?: number;
  honorsStatus?: string | null;
  academicStatus?: string;
  photoUrl?: string;
}

const initialsOf = (displayName: string) =>
  displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

interface StaffSeed {
  uid: string;
  role: string;
  username: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  contactNumber: string;
  department?: string;
  position?: string;
  employeeId?: string;
  displayNameOverride?: string;
}

const STAFF_SEEDS: StaffSeed[] = [
  {
    uid: 'demo-superadmin', role: 'superadmin', username: 'superadmin',
    firstName: 'MMPNS', lastName: 'Developer', email: 'developer@mmpns.demo',
    contactNumber: '0917 555 0100', position: 'System Developer',
    displayNameOverride: 'MMPNS Developer',
  },
  {
    uid: 'demo-admin', role: 'admin', username: 'lfernandez',
    firstName: 'Liza', middleName: 'D', lastName: 'Fernandez', email: 'admin@mmpns.demo',
    contactNumber: '0917 555 0101', position: 'System Administrator', employeeId: 'MMPNS-A-2018-002',
  },
  {
    uid: 'demo-principal', role: 'principal', username: 'principal',
    firstName: 'Maria Pia', middleName: 'S', lastName: 'Alvarez', email: 'principal@mmpns.demo',
    contactNumber: '0917 555 0102', position: 'School Principal', employeeId: 'MMPNS-P-2015-001',
    displayNameOverride: 'Sr. Maria Pia S. Alvarez',
  },
  {
    uid: 'demo-registrar', role: 'registrar', username: 'gsalcedo',
    firstName: 'Grace', middleName: 'P', lastName: 'Salcedo', email: 'registrar@mmpns.demo',
    contactNumber: '0917 555 0103', position: 'School Registrar', employeeId: 'MMPNS-R-2017-004',
  },
  {
    uid: 'demo-librarian', role: 'librarian', username: 'nramirez',
    firstName: 'Noel', middleName: 'B', lastName: 'Ramirez', email: 'library@mmpns.demo',
    contactNumber: '0917 555 0104', position: 'Head Librarian', employeeId: 'MMPNS-L-2019-006',
  },
  {
    uid: 'demo-security', role: 'security', username: 'rdizon',
    firstName: 'Ramon', middleName: 'C', lastName: 'Dizon', email: 'security@mmpns.demo',
    contactNumber: '0917 555 0105', position: 'Security Officer', employeeId: 'MMPNS-S-2020-009',
  },
  {
    uid: 'demo-teacher-msantos', role: 'teacher', username: 'msantos',
    firstName: 'Maricel', middleName: 'D', lastName: 'Santos', email: 'msantos@mmpns.demo',
    contactNumber: '0917 555 0110', department: 'JHS', position: 'Mathematics Teacher', employeeId: 'MMPNS-T-2019-014',
  },
  {
    uid: 'demo-teacher-jreyes', role: 'teacher', username: 'jreyes',
    firstName: 'Jonathan', middleName: 'P', lastName: 'Reyes', email: 'jreyes@mmpns.demo',
    contactNumber: '0917 555 0111', department: 'JHS', position: 'Mathematics Teacher', employeeId: 'MMPNS-T-2016-008',
  },
  {
    uid: 'demo-teacher-lgonzales', role: 'teacher', username: 'lgonzales',
    firstName: 'Liwayway', middleName: 'G', lastName: 'Gonzales', email: 'lgonzales@mmpns.demo',
    contactNumber: '0917 555 0112', department: 'JHS', position: 'English Teacher', employeeId: 'MMPNS-T-2018-011',
  },
  {
    uid: 'demo-teacher-rcruz', role: 'teacher', username: 'rcruz',
    firstName: 'Rodel', middleName: 'M', lastName: 'Cruz', email: 'rcruz@mmpns.demo',
    contactNumber: '0917 555 0113', department: 'JHS', position: 'Science Teacher', employeeId: 'MMPNS-T-2017-010',
  },
  {
    uid: 'demo-teacher-amendiola', role: 'teacher', username: 'amendiola',
    firstName: 'Anna Marie', middleName: 'F', lastName: 'Mendiola', email: 'amendiola@mmpns.demo',
    contactNumber: '0917 555 0114', department: 'Elementary', position: 'Grade 6 Adviser', employeeId: 'MMPNS-T-2021-019',
  },
  {
    uid: 'demo-teacher-pdelacruz', role: 'teacher', username: 'pdelacruz',
    firstName: 'Patricia', middleName: 'L', lastName: 'Dela Cruz', email: 'pdelacruz@mmpns.demo',
    contactNumber: '0917 555 0115', department: 'Kindergarten', position: 'Kindergarten Teacher', employeeId: 'MMPNS-T-2020-016',
  },
  {
    uid: 'demo-teacher-vbautista', role: 'teacher', username: 'vbautista',
    firstName: 'Victor', middleName: 'S', lastName: 'Bautista', email: 'vbautista@mmpns.demo',
    contactNumber: '0917 555 0116', department: 'Elementary', position: 'MAPEH Teacher', employeeId: 'MMPNS-T-2022-021',
  },
];

const staffToAccount = (seed: StaffSeed, index: number): DemoAccount => {
  const displayName =
    seed.displayNameOverride ||
    [seed.firstName, seed.middleName ? `${seed.middleName[0]}.` : null, seed.lastName].filter(Boolean).join(' ');
  return {
    uid: seed.uid,
    role: seed.role,
    username: seed.username,
    status: 'active',
    displayName,
    initials: initialsOf(displayName),
    createdAt: new Date(2025, 5, 2 + index, 9, 0, 0).toISOString(),
    lastLogin: daysAgoIso(index % 3, 7, 45),
    firstName: seed.firstName,
    middleName: seed.middleName,
    lastName: seed.lastName,
    email: seed.email,
    contactNumber: seed.contactNumber,
    department: seed.department,
    position: seed.position,
    employeeId: seed.employeeId,
  };
};

/* ── Student roster ── */

const FIRST_NAMES_M = [
  'Miguel', 'Joshua', 'Gabriel', 'Rafael', 'Andres', 'Paolo', 'Marco', 'Angelo',
  'Nathan', 'Carlo', 'Diego', 'Emilio', 'Lorenzo', 'Mateo', 'Santino', 'Julio',
  'Ramon', 'Vicente', 'Enzo', 'Felipe', 'Jacinto', 'Isagani', 'Elias', 'Basilio',
  'Crisostomo', 'Amado', 'Bastian', 'Benigno',
];

const FIRST_NAMES_F = [
  'Sofia', 'Isabella', 'Andrea', 'Bianca', 'Camille', 'Danielle', 'Erika', 'Francesca',
  'Gabriela', 'Hannah', 'Ysabel', 'Jasmine', 'Katrina', 'Luisa', 'Margarita', 'Nadia',
  'Olivia', 'Patricia', 'Regina', 'Samantha', 'Teresa', 'Angelica', 'Corazon', 'Dalisay',
  'Amihan', 'Ligaya', 'Marikit', 'Maria',
];

const LAST_NAMES = [
  'Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres',
  'Castillo', 'Villanueva', 'Ramos', 'Aquino', 'Navarro', 'Salazar', 'Domingo', 'Fernandez',
  'Lopez', 'Gonzales', 'Perez', 'Rivera', 'Aguilar', 'Pascual', 'Santiago', 'Soriano',
  'Valdez', 'Dizon', 'Estrada', 'Flores', 'Galang', 'Ignacio', 'Javier', 'Lim',
  'Natividad', 'Olivares', 'Panganiban', 'Quizon', 'Rosales', 'Sison', 'Tan', 'Uy',
  'Velasco', 'Zamora', 'Alonzo', 'Beltran', 'Cabrera', 'Del Rosario', 'Magbanua', 'Padilla',
  'Roxas', 'Salonga', 'Trinidad', 'Villamor', 'Yap', 'Abad', 'Buenaventura', 'Concepcion',
];

const BARANGAYS = [
  'Multinational Village', 'BF Homes', 'Moonwalk', 'San Antonio Valley', 'Better Living',
  'Marcelo Green', 'Sun Valley', 'Merville', 'Don Bosco', 'San Isidro',
];

const OCCUPATIONS = [
  'Office Employee', 'Nurse', 'OFW - Engineer', 'Small Business Owner', 'Public School Teacher',
  'Driver', 'Accountant', 'Seafarer', 'Call Center Agent', 'Government Employee',
];

/** Grade/section groups mirror the production roster layout. */
export const DEMO_GRADE_SECTIONS: { gradeLevel: string; section: string }[] = [
  { gradeLevel: 'Grade 6', section: 'Section A' },
  { gradeLevel: 'Grade 7', section: 'Section A' },
  { gradeLevel: 'Grade 7', section: 'Section B' },
  { gradeLevel: 'Grade 8', section: 'Section A' },
  { gradeLevel: 'Grade 8', section: 'Section B' },
  { gradeLevel: 'Grade 9', section: 'Section A' },
  { gradeLevel: 'Grade 10', section: 'Section A' },
];

const STUDENTS_PER_SECTION = 8;

const buildStudents = (): DemoAccount[] => {
  const rng = mulberry32(20260415);
  const students: DemoAccount[] = [];
  const usedNames = new Set<string>();

  DEMO_GRADE_SECTIONS.forEach((group, groupIndex) => {
    const gradeNumber = Number(group.gradeLevel.replace(/\D/g, ''));
    for (let i = 0; i < STUDENTS_PER_SECTION; i += 1) {
      const overall = groupIndex * STUDENTS_PER_SECTION + i;
      const gender: 'M' | 'F' = i % 2 === 0 ? 'F' : 'M';
      const pool = gender === 'F' ? FIRST_NAMES_F : FIRST_NAMES_M;

      let firstName = pool[(overall * 3 + groupIndex) % pool.length];
      let lastName = LAST_NAMES[(overall * 5 + 3) % LAST_NAMES.length];
      while (usedNames.has(`${firstName} ${lastName}`)) {
        lastName = LAST_NAMES[(LAST_NAMES.indexOf(lastName) + 7) % LAST_NAMES.length];
      }
      usedNames.add(`${firstName} ${lastName}`);

      const middle = LAST_NAMES[(overall * 11 + 17) % LAST_NAMES.length];
      const displayName = `${firstName} ${middle[0]}. ${lastName}`;
      const studentCode = makeStudentCode(rng);
      const systemIdRaw = makeSystemIdRaw(rng);
      const birthYear = 2026 - (gradeNumber + 6);
      const gwa = 84 + ((overall * 7) % 13);
      const guardianFirst = gender === 'M'
        ? FIRST_NAMES_F[(overall * 13 + 5) % FIRST_NAMES_F.length]
        : FIRST_NAMES_M[(overall * 13 + 5) % FIRST_NAMES_M.length];

      students.push({
        uid: `demo-student-${String(overall + 1).padStart(3, '0')}`,
        role: 'student',
        username: studentCode,
        status: 'active',
        displayName,
        initials: initialsOf(`${firstName} ${lastName}`),
        createdAt: new Date(2025, 5, 9 + (overall % 15), 8 + (overall % 6), 15).toISOString(),
        lastLogin: overall % 4 === 0 ? daysAgoIso(overall % 6, 16, 20) : null,
        firstName,
        middleName: middle,
        lastName,
        email: `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}@student.mmpns.demo`,
        studentCode,
        systemIdRaw,
        systemId: formatSystemId(systemIdRaw),
        lrn: `4066${String(10000000 + overall * 3571).slice(0, 8)}`,
        gradeLevel: group.gradeLevel,
        section: group.section,
        gender,
        dateOfBirth: `${birthYear}-${String((overall % 12) + 1).padStart(2, '0')}-${String((overall % 27) + 1).padStart(2, '0')}`,
        guardianName: `${guardianFirst} ${lastName}`,
        guardianContact: `0917 ${String(4200000 + overall * 137).slice(0, 3)} ${String(4200000 + overall * 137).slice(3, 7)}`,
        guardianRelationship: gender === 'M' ? 'Mother' : 'Father',
        province: 'Metro Manila',
        city: 'Parañaque City',
        address: `${(overall % 90) + 10} ${BARANGAYS[overall % BARANGAYS.length]}, Parañaque City`,
        noOfSiblings: overall % 4,
        monthlyFamilyIncome: 18000 + (overall % 8) * 6500,
        gwa,
        honorsStatus: gwa >= 93 ? 'With High Honors' : gwa >= 90 ? 'With Honors' : null,
        academicStatus: overall % 17 === 8 ? 'at-risk' : overall % 11 === 5 ? 'watch' : 'regular',
      });
    }
  });

  return students;
};

export const DEMO_STUDENT_ACCOUNTS: DemoAccount[] = buildStudents();
export const DEMO_STAFF_ACCOUNTS: DemoAccount[] = STAFF_SEEDS.map(staffToAccount);
export const DEMO_ACCOUNTS: DemoAccount[] = [...DEMO_STAFF_ACCOUNTS, ...DEMO_STUDENT_ACCOUNTS];

/** The account each portal signs in with automatically. */
export const DEMO_ACCOUNT_BY_ROLE: Record<string, DemoAccount> = {
  superadmin: DEMO_STAFF_ACCOUNTS[0],
  admin: DEMO_STAFF_ACCOUNTS[1],
  principal: DEMO_STAFF_ACCOUNTS[2],
  registrar: DEMO_STAFF_ACCOUNTS[3],
  librarian: DEMO_STAFF_ACCOUNTS[4],
  security: DEMO_STAFF_ACCOUNTS[5],
  teacher: DEMO_STAFF_ACCOUNTS[6],
  student: DEMO_STUDENT_ACCOUNTS.find((s) => s.gradeLevel === 'Grade 7' && s.section === 'Section A') || DEMO_STUDENT_ACCOUNTS[0],
};

/* ═══════════════════ students table (registrar / principal roster) ═══════ */

const studentToRecord = (account: DemoAccount) => ({
  id: account.uid,
  studentId: account.studentCode,
  lrn: account.lrn,
  firstName: account.firstName,
  lastName: account.lastName,
  middleName: account.middleName,
  displayName: account.displayName,
  gender: account.gender,
  dateOfBirth: account.dateOfBirth,
  gradeLevel: account.gradeLevel,
  section: account.section,
  guardianName: account.guardianName,
  guardianContact: account.guardianContact,
  guardianRelationship: account.guardianRelationship,
  guardianEmail: `${(account.guardianName || '').toLowerCase().replace(/[^a-z]+/g, '.')}@gmail.com`,
  guardianOccupation: OCCUPATIONS[Number(account.uid.replace(/\D/g, '')) % OCCUPATIONS.length],
  address: account.address,
  email: account.email,
  enrollmentDate: account.createdAt,
  yearEnrolled: 2025,
  previousSchool: null,
  academicStatus: account.academicStatus,
  honorsStatus: account.honorsStatus,
  gwa: account.gwa,
  remarks: null,
  status: 'active',
  batch: '2025-2026',
});

/* ═══════════════════ teachers table ═══════════════════ */

interface DemoAssignment {
  subjectId: string;
  subjectName: string;
  yearLevel: string;
  section: string;
  schedule: string;
}

const TEACHER_ASSIGNMENTS: Record<string, DemoAssignment[]> = {
  msantos: [
    { subjectId: 'math', subjectName: 'Mathematics', yearLevel: 'Grade 7', section: 'Section A', schedule: 'MWF 8:00–9:00 AM' },
    { subjectId: 'math', subjectName: 'Mathematics', yearLevel: 'Grade 7', section: 'Section B', schedule: 'MWF 9:00–10:00 AM' },
    { subjectId: 'science', subjectName: 'Science', yearLevel: 'Grade 8', section: 'Section A', schedule: 'TTh 10:00–11:30 AM' },
    { subjectId: 'ict', subjectName: 'ICT', yearLevel: 'Grade 8', section: 'Section B', schedule: 'Fri 1:00–3:00 PM' },
  ],
  jreyes: [
    { subjectId: 'math', subjectName: 'Mathematics', yearLevel: 'Grade 8', section: 'Section A', schedule: 'MWF 10:00–11:00 AM' },
    { subjectId: 'math', subjectName: 'Mathematics', yearLevel: 'Grade 8', section: 'Section B', schedule: 'MWF 1:00–2:00 PM' },
    { subjectId: 'math', subjectName: 'Mathematics', yearLevel: 'Grade 9', section: 'Section A', schedule: 'TTh 8:00–9:30 AM' },
  ],
  lgonzales: [
    { subjectId: 'english', subjectName: 'English', yearLevel: 'Grade 7', section: 'Section A', schedule: 'MWF 10:00–11:00 AM' },
    { subjectId: 'english', subjectName: 'English', yearLevel: 'Grade 7', section: 'Section B', schedule: 'MWF 2:00–3:00 PM' },
    { subjectId: 'english', subjectName: 'English', yearLevel: 'Grade 10', section: 'Section A', schedule: 'TTh 1:00–2:30 PM' },
  ],
  rcruz: [
    { subjectId: 'science', subjectName: 'Science', yearLevel: 'Grade 9', section: 'Section A', schedule: 'MWF 8:00–9:00 AM' },
    { subjectId: 'science', subjectName: 'Science', yearLevel: 'Grade 10', section: 'Section A', schedule: 'TTh 10:00–11:30 AM' },
    { subjectId: 'filipino', subjectName: 'Filipino', yearLevel: 'Grade 8', section: 'Section B', schedule: 'MWF 3:00–4:00 PM' },
  ],
  amendiola: [
    { subjectId: 'ap', subjectName: 'Araling Panlipunan', yearLevel: 'Grade 6', section: 'Section A', schedule: 'MWF 8:00–9:00 AM' },
    { subjectId: 'esp', subjectName: 'ESP', yearLevel: 'Grade 6', section: 'Section A', schedule: 'TTh 9:00–10:00 AM' },
    { subjectId: 'mapeh', subjectName: 'MAPEH', yearLevel: 'Grade 6', section: 'Section A', schedule: 'Fri 10:00 AM–12:00 NN' },
  ],
  pdelacruz: [],
  vbautista: [
    { subjectId: 'mapeh', subjectName: 'MAPEH', yearLevel: 'Grade 7', section: 'Section A', schedule: 'TTh 2:00–3:30 PM' },
    { subjectId: 'tle', subjectName: 'TLE', yearLevel: 'Grade 7', section: 'Section B', schedule: 'Fri 8:00–10:00 AM' },
  ],
};

const buildTeachersTable = () =>
  DEMO_STAFF_ACCOUNTS.filter((account) => account.role === 'teacher').map((account) => ({
    uid: account.uid,
    username: account.username,
    displayName: account.displayName,
    department: account.department,
    employeeId: account.employeeId,
    assignments: TEACHER_ASSIGNMENTS[account.username] || [],
  }));

/* ═══════════════════ Teacher portal store (grading data) ═══════════════ */

interface DemoActivity {
  id: string;
  subjectId: string;
  quarterId: number;
  type: 'written' | 'performance' | 'quarterly';
  title: string;
  maxScore: number;
}

const defaultActivities = (subjectId: string, quarterId: number): DemoActivity[] => [
  { id: `${subjectId}-q${quarterId}-ww1`, subjectId, quarterId, type: 'written', title: 'Written Work 1', maxScore: 30 },
  { id: `${subjectId}-q${quarterId}-ww2`, subjectId, quarterId, type: 'written', title: 'Written Work 2', maxScore: 50 },
  { id: `${subjectId}-q${quarterId}-ww3`, subjectId, quarterId, type: 'written', title: 'Written Work 3', maxScore: 25 },
  { id: `${subjectId}-q${quarterId}-pt1`, subjectId, quarterId, type: 'performance', title: 'Performance Task 1', maxScore: 40 },
  { id: `${subjectId}-q${quarterId}-pt2`, subjectId, quarterId, type: 'performance', title: 'Performance Task 2', maxScore: 50 },
  { id: `${subjectId}-q${quarterId}-qa1`, subjectId, quarterId, type: 'quarterly', title: 'Quarterly Assessment', maxScore: 100 },
];

/** Classes the demo teacher (msantos) opens in the Teacher Portal. */
export const DEMO_TEACHER_CLASSES: { subjectId: string; yearLevel: string }[] = [
  { subjectId: 'math', yearLevel: 'Grade 7' },
  { subjectId: 'science', yearLevel: 'Grade 8' },
  { subjectId: 'ict', yearLevel: 'Grade 8' },
];

const portalStudentsForYear = (yearLevel: string) =>
  DEMO_STUDENT_ACCOUNTS.filter((s) => s.gradeLevel === yearLevel).map((s) => ({
    id: s.uid,
    name: `${s.lastName}, ${s.firstName} ${s.middleName ? `${s.middleName[0]}.` : ''}`.trim(),
    gender: s.gender,
    yearLevel,
  }));

const buildTeacherPortalStore = () => {
  const rng = mulberry32(20260701);
  const studentsByYear: Record<string, ReturnType<typeof portalStudentsForYear>> = {
    'Grade 7': portalStudentsForYear('Grade 7'),
    'Grade 8': portalStudentsForYear('Grade 8'),
  };

  const classes: Record<string, { activities: DemoActivity[]; grades: { studentId: string; activityId: string; score: number | null }[] }> = {};

  DEMO_TEACHER_CLASSES.forEach(({ subjectId, yearLevel }) => {
    for (let quarter = 1; quarter <= 3; quarter += 1) {
      const activities = defaultActivities(subjectId, quarter);
      const grades: { studentId: string; activityId: string; score: number | null }[] = [];

      studentsByYear[yearLevel].forEach((student, studentIndex) => {
        // Per-student ability band keeps computed grades realistic — mostly
        // passing marks with a few strugglers, like a plausible class card.
        const ability = 0.8 + ((studentIndex * 23) % 21) / 100;
        activities.forEach((activity) => {
          const wobble = (rng() - 0.5) * 0.12;
          const ratio = Math.min(1, Math.max(0.55, ability + wobble));
          grades.push({
            studentId: student.id,
            activityId: activity.id,
            score: Math.round(activity.maxScore * ratio),
          });
        });
      });

      classes[`${subjectId}-${yearLevel}-q${quarter}`] = { activities, grades };
    }
  });

  return { classes, studentsByYear };
};

/* ═══════════════════ Library ═══════════════════ */

interface DemoBookSeed {
  title: string;
  author: string;
  publisher: string;
  edition: string;
  isbn: string;
  callNo: string;
  copies: number;
}

const BOOK_SEEDS: DemoBookSeed[] = [
  { title: 'Noli Me Tangere', author: 'Rizal, Jose', publisher: 'Anvil Publishing', edition: 'Deluxe', isbn: '978-971-27-1234-1', callNo: 'FIL 899.211 R48', copies: 4 },
  { title: 'El Filibusterismo', author: 'Rizal, Jose', publisher: 'Anvil Publishing', edition: 'Deluxe', isbn: '978-971-27-1234-2', callNo: 'FIL 899.211 R49', copies: 4 },
  { title: 'Florante at Laura', author: 'Baltazar, Francisco', publisher: 'Rex Book Store', edition: 'Annotated', isbn: '978-971-23-4567-3', callNo: 'FIL 899.211 B21', copies: 3 },
  { title: 'Ibong Adarna', author: 'Anonymous', publisher: 'Vibal Group', edition: 'Illustrated', isbn: '978-971-07-8910-4', callNo: 'FIL 398.2 IB6', copies: 3 },
  { title: 'Mathematics for the 21st Century Learner 7', author: 'Oronce, Orlando', publisher: 'Rex Book Store', edition: '2nd', isbn: '978-971-23-8001-5', callNo: 'MATH 510 OR6', copies: 6 },
  { title: 'Science Links 8', author: 'Madriaga, Estrellita', publisher: 'Rex Book Store', edition: '3rd', isbn: '978-971-23-8102-6', callNo: 'SCI 500 M26', copies: 6 },
  { title: 'English Communication Arts and Skills 7', author: 'Lapid, Milagros', publisher: 'Phoenix Publishing', edition: '4th', isbn: '978-971-06-3203-7', callNo: 'ENG 428 L31', copies: 5 },
  { title: 'Filipino sa Makabagong Panahon 8', author: 'Villanueva, Corazon', publisher: 'DIWA Learning Systems', edition: '2nd', isbn: '978-971-46-2304-8', callNo: 'FIL 499.211 V71', copies: 5 },
  { title: 'Kasaysayan ng Pilipinas', author: 'Agoncillo, Teodoro', publisher: 'C&E Publishing', edition: '8th', isbn: '978-971-98-4405-9', callNo: 'HIS 959.9 AG7', copies: 4 },
  { title: 'MAPEH in Action 9', author: 'Santiago, Lucia', publisher: 'Rex Book Store', edition: '2nd', isbn: '978-971-23-8506-0', callNo: 'MAPEH 700 SA5', copies: 4 },
  { title: 'Technology and Livelihood Education 10', author: 'Dela Peña, Roberto', publisher: 'Vibal Group', edition: '1st', isbn: '978-971-07-9607-1', callNo: 'TLE 600 D37', copies: 4 },
  { title: 'Introduction to Computer Programming', author: 'Garcia, Manuel', publisher: 'C&E Publishing', edition: '3rd', isbn: '978-971-98-4708-2', callNo: 'ICT 005.1 G21', copies: 3 },
  { title: 'The Little Prince', author: 'de Saint-Exupéry, Antoine', publisher: 'Harcourt', edition: 'Translated', isbn: '978-0-15-601219-5', callNo: 'FIC S13', copies: 2 },
  { title: 'Charlotte\'s Web', author: 'White, E.B.', publisher: 'HarperCollins', edition: 'Reissue', isbn: '978-0-06-440055-8', callNo: 'FIC W58', copies: 2 },
];

const buildBooks = () => {
  const rng = mulberry32(20260210);
  let accessionCounter = 1;
  return BOOK_SEEDS.map((seed, index) => {
    const bookId = String(10000000 + Math.floor(rng() * 89999999));
    const accessions = Array.from({ length: seed.copies }, () => `2025-${String(accessionCounter++).padStart(4, '0')}`);
    return {
      id: `bk_demo_${String(index + 1).padStart(3, '0')}`,
      bookId,
      title: seed.title,
      author: seed.author,
      publisher: seed.publisher,
      edition: seed.edition,
      isbn: seed.isbn,
      callNo: seed.callNo,
      copies: seed.copies,
      accessions,
      createdAt: new Date(2025, 6, 14 + index, 10, 0, 0).toISOString(),
    };
  });
};

const DEMO_BOOKS = buildBooks();

const circulationStudent = (account: DemoAccount) => ({
  uid: account.uid,
  systemId: account.systemId,
  studentId: account.studentCode,
  displayName: account.displayName,
  initials: account.initials,
  firstName: account.firstName,
  middleName: account.middleName,
  lastName: account.lastName,
  lrn: account.lrn,
  gradeLevel: account.gradeLevel,
  section: account.section,
  status: 'active',
  guardianName: account.guardianName,
  emergencyContactName: account.guardianName,
  emergencyContactNumber: account.guardianContact,
});

const circulationBook = (bookIndex: number, copyNumber: number, status: string, borrowedAt: string, dueAt: string, returnedAt: string | null) => {
  const book = DEMO_BOOKS[bookIndex];
  return {
    id: `${book.id}-c${copyNumber}`,
    bookId: book.bookId,
    barcode: `${book.bookId} c${copyNumber}`,
    copyNumber,
    accession: book.accessions[copyNumber - 1],
    title: book.title,
    author: book.author,
    callNo: book.callNo,
    isbn: book.isbn,
    status,
    borrowedAt,
    dueAt,
    returnedAt,
    updatedAt: returnedAt || borrowedAt,
  };
};

const buildCirculation = () => {
  const s = DEMO_STUDENT_ACCOUNTS;
  const records = [
    {
      id: 'circ_demo_001', status: 'borrowed',
      borrowedAt: daysAgoIso(2, 9, 40), dueAt: daysAheadIso(5, 17, 0), approvedAt: daysAgoIso(2, 9, 40),
      approvedBy: 'Noel B. Ramirez', returnedAt: null, updatedAt: daysAgoIso(2, 9, 40),
      student: circulationStudent(s[10]),
      books: [circulationBook(0, 1, 'borrowed', daysAgoIso(2, 9, 40), daysAheadIso(5, 17, 0), null)],
    },
    {
      id: 'circ_demo_002', status: 'borrowed',
      borrowedAt: daysAgoIso(1, 13, 15), dueAt: daysAheadIso(6, 17, 0), approvedAt: daysAgoIso(1, 13, 15),
      approvedBy: 'Noel B. Ramirez', returnedAt: null, updatedAt: daysAgoIso(1, 13, 15),
      student: circulationStudent(s[19]),
      books: [
        circulationBook(4, 2, 'borrowed', daysAgoIso(1, 13, 15), daysAheadIso(6, 17, 0), null),
        circulationBook(6, 1, 'borrowed', daysAgoIso(1, 13, 15), daysAheadIso(6, 17, 0), null),
      ],
    },
    {
      id: 'circ_demo_003', status: 'not_returned',
      borrowedAt: daysAgoIso(12, 10, 5), dueAt: daysAgoIso(3, 17, 0), approvedAt: daysAgoIso(12, 10, 5),
      approvedBy: 'Noel B. Ramirez', returnedAt: null, updatedAt: daysAgoIso(12, 10, 5),
      student: circulationStudent(s[27]),
      books: [circulationBook(2, 1, 'not_returned', daysAgoIso(12, 10, 5), daysAgoIso(3, 17, 0), null)],
    },
    {
      id: 'circ_demo_004', status: 'returned',
      borrowedAt: daysAgoIso(9, 8, 50), dueAt: daysAgoIso(2, 17, 0), approvedAt: daysAgoIso(9, 8, 50),
      approvedBy: 'Noel B. Ramirez', returnedAt: daysAgoIso(4, 14, 30), updatedAt: daysAgoIso(4, 14, 30),
      student: circulationStudent(s[33]),
      books: [circulationBook(5, 3, 'returned', daysAgoIso(9, 8, 50), daysAgoIso(2, 17, 0), daysAgoIso(4, 14, 30))],
    },
    {
      id: 'circ_demo_005', status: 'returned',
      borrowedAt: daysAgoIso(15, 11, 25), dueAt: daysAgoIso(8, 17, 0), approvedAt: daysAgoIso(15, 11, 25),
      approvedBy: 'Noel B. Ramirez', returnedAt: daysAgoIso(9, 9, 10), updatedAt: daysAgoIso(9, 9, 10),
      student: circulationStudent(s[41]),
      books: [circulationBook(8, 1, 'returned', daysAgoIso(15, 11, 25), daysAgoIso(8, 17, 0), daysAgoIso(9, 9, 10))],
    },
    {
      id: 'circ_demo_006', status: 'late_returned',
      borrowedAt: daysAgoIso(20, 9, 5), dueAt: daysAgoIso(13, 17, 0), approvedAt: daysAgoIso(20, 9, 5),
      approvedBy: 'Noel B. Ramirez', returnedAt: daysAgoIso(10, 15, 45), updatedAt: daysAgoIso(10, 15, 45),
      student: circulationStudent(s[6]),
      books: [circulationBook(12, 1, 'late_returned', daysAgoIso(20, 9, 5), daysAgoIso(13, 17, 0), daysAgoIso(10, 15, 45))],
    },
    {
      id: 'circ_demo_007', status: 'borrowed',
      borrowedAt: daysAgoIso(0, 8, 20), dueAt: daysAheadIso(7, 17, 0), approvedAt: daysAgoIso(0, 8, 20),
      approvedBy: 'Noel B. Ramirez', returnedAt: null, updatedAt: daysAgoIso(0, 8, 20),
      student: circulationStudent(s[48]),
      books: [circulationBook(9, 2, 'borrowed', daysAgoIso(0, 8, 20), daysAheadIso(7, 17, 0), null)],
    },
    {
      id: 'circ_demo_008', status: 'returned',
      borrowedAt: daysAgoIso(6, 12, 40), dueAt: daysAheadIso(1, 17, 0), approvedAt: daysAgoIso(6, 12, 40),
      approvedBy: 'Noel B. Ramirez', returnedAt: daysAgoIso(1, 10, 5), updatedAt: daysAgoIso(1, 10, 5),
      student: circulationStudent(s[15]),
      books: [circulationBook(13, 2, 'returned', daysAgoIso(6, 12, 40), daysAheadIso(1, 17, 0), daysAgoIso(1, 10, 5))],
    },
  ];

  return { records, returnNotifications: [] };
};

const buildEntryLogs = () => {
  const s = DEMO_STUDENT_ACCOUNTS;
  const dayKey = (offset: number) => manilaDateKey(new Date(Date.now() - offset * DAY_MS));

  const log = (idx: number, student: DemoAccount, dayOffset: number, inH: number, inM: number, outH: number | null, outM: number | null) => ({
    id: `libentry_demo_${String(idx).padStart(3, '0')}`,
    date: dayKey(dayOffset),
    student: circulationStudent(student),
    timeInAt: daysAgoIso(dayOffset, inH, inM),
    timeOutAt: outH === null ? null : daysAgoIso(dayOffset, outH, outM || 0),
    status: outH === null ? 'inside' : 'timed_out',
    scanCount: outH === null ? 1 : 2,
    lastScanAt: outH === null ? daysAgoIso(dayOffset, inH, inM) : daysAgoIso(dayOffset, outH, outM || 0),
    createdAt: daysAgoIso(dayOffset, inH, inM),
    updatedAt: outH === null ? daysAgoIso(dayOffset, inH, inM) : daysAgoIso(dayOffset, outH, outM || 0),
    timeInBy: 'Noel B. Ramirez',
    timeOutBy: outH === null ? undefined : 'Noel B. Ramirez',
  });

  const logs = [
    log(1, s[3], 0, 7, 42, null, null),
    log(2, s[22], 0, 9, 10, null, null),
    log(3, s[37], 0, 10, 25, null, null),
    log(4, s[11], 0, 8, 5, 9, 15),
    log(5, s[29], 0, 9, 55, 11, 5),
    log(6, s[44], 0, 12, 30, 13, 10),
    log(7, s[8], 1, 8, 12, 9, 40),
    log(8, s[16], 1, 10, 5, 11, 55),
    log(9, s[35], 1, 13, 20, 14, 45),
    log(10, s[50], 1, 14, 10, 15, 30),
    log(11, s[5], 2, 7, 55, 8, 50),
    log(12, s[26], 2, 9, 35, 10, 40),
    log(13, s[40], 2, 12, 15, 13, 5),
  ];

  return { logs };
};

/* ═══════════════════ Calendar / subjects / school years / settings ══════ */

const DEMO_CALENDAR_EVENTS = [
  { id: 'ev1', title: 'Q3 Grading Period Ends', date: '2026-02-20', type: 'deadline', description: 'All Q3 grades must be submitted', assignedTo: 'teachers', createdBy: 'principal', color: '#ef4444', priority: 'high' },
  { id: 'ev2', title: 'Q4 Grading Period Starts', date: '2026-02-23', type: 'academic', description: '4th Quarter classes begin', assignedTo: 'all', createdBy: 'principal', color: '#3b82f6', priority: 'medium' },
  { id: 'ev3', title: 'Faculty Meeting', date: '2026-03-06', time: '3:00 PM', type: 'meeting', description: 'Monthly faculty meeting', location: 'Conference Room', assignedTo: 'teachers', createdBy: 'principal', color: '#8b5cf6', priority: 'medium' },
  { id: 'ev4', title: 'Science Fair', date: '2026-03-13', type: 'event', description: 'Annual school science fair', location: 'School Gymnasium', assignedTo: 'all', createdBy: 'principal', color: '#f59e0b', priority: 'medium' },
  { id: 'ev5', title: 'Report Card Distribution', date: '2026-03-20', type: 'academic', description: 'Q3 report cards released', assignedTo: 'teachers', createdBy: 'principal', color: '#3b82f6', priority: 'high' },
  { id: 'ev6', title: 'MAPEH Week Preparation', date: '2026-03-16', type: 'task', description: 'Prepare materials for MAPEH week', assignedTo: ['amendiola'], createdBy: 'principal', color: '#185C20', priority: 'medium' },
  { id: 'ev7', title: 'Math Olympiad Coaching', date: '2026-03-18', time: '2:00 PM', type: 'task', description: 'Prepare students for regional Math Olympiad', assignedTo: ['jreyes'], createdBy: 'principal', color: '#185C20', priority: 'high' },
  { id: 'ev8', title: 'ICT Lab Inventory', date: '2026-03-25', type: 'task', description: 'Complete ICT lab equipment inventory', assignedTo: ['msantos'], createdBy: 'principal', color: '#185C20', priority: 'low' },
  { id: 'ev9', title: 'Holy Week Break', date: '2026-03-30', endDate: '2026-04-03', type: 'holiday', description: 'No classes - Holy Week', assignedTo: 'all', createdBy: 'principal', color: '#10b981', priority: 'low' },
  { id: 'ev10', title: 'Parent-Teacher Conference', date: '2026-03-27', time: '9:00 AM', type: 'meeting', description: 'End-of-Q3 parent-teacher conferences', location: 'Respective Classrooms', assignedTo: 'teachers', createdBy: 'principal', color: '#8b5cf6', priority: 'high' },
  { id: 'ev11', title: 'Grade Submission Deadline', date: '2026-04-03', type: 'deadline', description: 'Final Q4 grades must be encoded', assignedTo: 'teachers', createdBy: 'principal', color: '#ef4444', priority: 'high' },
  { id: 'ev12', title: 'Reading Program Update', date: '2026-03-14', type: 'task', description: 'Submit reading program progress report', assignedTo: ['lgonzales'], createdBy: 'principal', color: '#185C20', priority: 'medium' },
  { id: 'ev13', title: 'Science Lab Safety Check', date: '2026-03-19', type: 'task', description: 'Conduct quarterly safety inspection', assignedTo: ['rcruz'], createdBy: 'principal', color: '#185C20', priority: 'medium' },
];

const DEMO_MASTER_SUBJECTS = [
  { id: 'math', name: 'Mathematics', type: 'major', weights: { writtenWork: 30, performanceTask: 50, quarterlyAssessment: 20 } },
  { id: 'science', name: 'Science', type: 'major', weights: { writtenWork: 30, performanceTask: 50, quarterlyAssessment: 20 } },
  { id: 'english', name: 'English', type: 'major', weights: { writtenWork: 30, performanceTask: 50, quarterlyAssessment: 20 } },
  { id: 'filipino', name: 'Filipino', type: 'major', weights: { writtenWork: 30, performanceTask: 50, quarterlyAssessment: 20 } },
  { id: 'ap', name: 'Araling Panlipunan', type: 'minor', weights: { writtenWork: 30, performanceTask: 50, quarterlyAssessment: 20 } },
  { id: 'mapeh', name: 'MAPEH', type: 'minor', weights: { writtenWork: 20, performanceTask: 60, quarterlyAssessment: 20 } },
  { id: 'esp', name: 'ESP', type: 'minor', weights: { writtenWork: 30, performanceTask: 50, quarterlyAssessment: 20 } },
  { id: 'tle', name: 'TLE', type: 'minor', weights: { writtenWork: 20, performanceTask: 60, quarterlyAssessment: 20 } },
  { id: 'ict', name: 'ICT', type: 'minor', weights: { writtenWork: 20, performanceTask: 60, quarterlyAssessment: 20 } },
];

const DEMO_SCHOOL_YEARS = [
  {
    id: 'sy-2025-2026',
    startYear: '2025',
    endYear: '2026',
    status: 'active',
    quarters: [
      { id: 1, label: '1st Quarter', startDate: '2025-06-05', endDate: '2025-08-22', isLocked: true },
      { id: 2, label: '2nd Quarter', startDate: '2025-08-25', endDate: '2025-11-14', isLocked: true },
      { id: 3, label: '3rd Quarter', startDate: '2025-11-17', endDate: '2026-02-20', isLocked: false },
      { id: 4, label: '4th Quarter', startDate: '2026-02-23', endDate: '2026-04-03', isLocked: false },
    ],
    events: [],
  },
  {
    id: 'sy-2024-2025',
    startYear: '2024',
    endYear: '2025',
    status: 'archived',
    quarters: [
      { id: 1, label: '1st Quarter', startDate: '2024-06-06', endDate: '2024-08-23', isLocked: true },
      { id: 2, label: '2nd Quarter', startDate: '2024-08-26', endDate: '2024-11-15', isLocked: true },
      { id: 3, label: '3rd Quarter', startDate: '2024-11-18', endDate: '2025-02-21', isLocked: true },
      { id: 4, label: '4th Quarter', startDate: '2025-02-24', endDate: '2025-04-04', isLocked: true },
    ],
    events: [],
  },
];

const DEMO_SETTINGS = {
  schoolName: 'Madre Maria Pia Notari School',
  schoolAddress: '#70 Timothy St., Multinational Village, Parañaque City',
  contactEmail: 'mmpns.official@gmail.com',
  contactNumber: '(02) 8821-1234',
  currentSchoolYear: '2025-2026',
  securityKiosk: {
    scanMode: 'time_in',
    autoSwitchEnabled: true,
    timeInAt: '06:00',
    timeOutAt: '15:00',
  },
};

/* ═══════════════════ Evaluations ═══════════════════ */

const DEMO_RUBRIC = {
  id: 'default-rubric',
  name: 'DepEd Teaching Performance Rubric',
  description: 'Standard teacher evaluation criteria based on DepEd competency framework',
  criteria: [
    { id: 'c1', name: 'Content Knowledge & Pedagogy', description: 'Mastery of subject matter and effective teaching strategies', maxScore: 5, weight: 20 },
    { id: 'c2', name: 'Learning Environment', description: 'Creating a safe, inclusive, and engaging classroom', maxScore: 5, weight: 15 },
    { id: 'c3', name: 'Learner Diversity', description: 'Addressing diverse learning needs and styles', maxScore: 5, weight: 15 },
    { id: 'c4', name: 'Curriculum Planning', description: 'Effective lesson planning and curriculum development', maxScore: 5, weight: 15 },
    { id: 'c5', name: 'Assessment & Reporting', description: 'Fair assessment practices and timely grade submission', maxScore: 5, weight: 15 },
    { id: 'c6', name: 'Community & Engagement', description: 'Parent communication and school event participation', maxScore: 5, weight: 10 },
    { id: 'c7', name: 'Professional Growth', description: 'Continuous learning, certifications, and collaboration', maxScore: 5, weight: 10 },
  ],
  status: 'active',
  createdAt: '2025-06-01',
};

const evaluationFor = (id: string, username: string, quarter: number, scores: Record<string, number>, comments: string, evaluatedAt: string) => {
  const teacher = DEMO_STAFF_ACCOUNTS.find((account) => account.username === username);
  return {
    id,
    teacherUsername: username,
    teacherName: teacher?.displayName || username,
    rubricId: 'default-rubric',
    quarter,
    scores,
    comments,
    evaluatedAt,
    evaluatedBy: 'Sr. Maria Pia S. Alvarez',
  };
};

const DEMO_EVALUATIONS = [
  evaluationFor('e1', 'msantos', 2, { c1: 4, c2: 5, c3: 4, c4: 4, c5: 5, c6: 4, c7: 3 }, 'Excellent tech integration. Continue professional development.', '2025-11-10'),
  evaluationFor('e2', 'jreyes', 2, { c1: 5, c2: 4, c3: 4, c4: 5, c5: 4, c6: 3, c7: 4 }, 'Outstanding content knowledge. Improve parent engagement.', '2025-11-10'),
  evaluationFor('e3', 'lgonzales', 2, { c1: 4, c2: 5, c3: 5, c4: 4, c5: 4, c6: 5, c7: 4 }, 'Exceptional classroom management and student rapport.', '2025-11-11'),
  evaluationFor('e4', 'rcruz', 2, { c1: 4, c2: 4, c3: 3, c4: 4, c5: 4, c6: 3, c7: 3 }, 'Solid teaching. Encourage more differentiated instruction.', '2025-11-11'),
  evaluationFor('e5', 'amendiola', 2, { c1: 3, c2: 4, c3: 4, c4: 3, c5: 3, c6: 4, c7: 3 }, 'Growing well as a new teacher. Needs mentoring in assessment design.', '2025-11-12'),
  evaluationFor('e6', 'msantos', 1, { c1: 4, c2: 4, c3: 4, c4: 4, c5: 4, c6: 4, c7: 3 }, 'Consistent performance across all areas.', '2025-08-15'),
  evaluationFor('e7', 'jreyes', 1, { c1: 5, c2: 4, c3: 3, c4: 4, c5: 4, c6: 3, c7: 4 }, 'Strong start to the year. Watch pacing for slower learners.', '2025-08-15'),
  evaluationFor('e8', 'vbautista', 2, { c1: 4, c2: 4, c3: 4, c4: 3, c5: 4, c6: 4, c7: 4 }, 'Energetic MAPEH sessions. Submit lesson plans earlier.', '2025-11-13'),
];

/* ═══════════════════ News feed (replaces the Facebook Graph API) ════════ */

export interface DemoNewsItem {
  id: string;
  title: string;
  category: 'Announcement' | 'Event' | 'Activity';
  date: string;
  excerpt: string;
  image: string;
  media: { type: 'photo' | 'video'; src: string; videoSrc?: string }[];
  likes: string;
  commentsCount: string;
  url?: string;
}

export const DEMO_NEWS_POSTS: DemoNewsItem[] = [
  {
    id: 'news-demo-1',
    title: 'MMPNS Intramurals 2025: Opening of the Sports Festival',
    category: 'Event',
    date: 'November 24, 2025',
    excerpt: 'The annual MMPNS Intramurals officially opened with a colorful parade of athletes, cheer squads, and the lighting of the symbolic torch. Four team colors will battle it out across basketball, volleyball, chess, and track events all week long. 🏅\n\nCongratulations to all our young athletes — play hard, play fair, and enjoy the games!',
    image: '/images/student_life/intrmurals.png',
    media: [
      { type: 'photo', src: '/images/student_life/intrmurals.png' },
      { type: 'photo', src: '/images/student_life/basketball.png' },
    ],
    likes: '214',
    commentsCount: '38',
  },
  {
    id: 'news-demo-2',
    title: 'Earthquake and Fire Safety Drill Conducted Campus-Wide',
    category: 'Announcement',
    date: 'January 15, 2026',
    excerpt: 'In coordination with the Parañaque City Disaster Risk Reduction and Management Office, MMPNS conducted its quarterly earthquake and fire safety drill this morning. Students from Kindergarten to Grade 10 practiced the duck-cover-hold protocol and evacuated to the designated assembly areas in under six minutes.\n\nThank you to our safety marshals and the BFP Parañaque for guiding our learners!',
    image: '/images/student_life/fireSafety.png',
    media: [{ type: 'photo', src: '/images/student_life/fireSafety.png' }],
    likes: '167',
    commentsCount: '21',
  },
  {
    id: 'news-demo-3',
    title: 'MMPNS Glee Club Brings Home the Gold at the Diocesan Choir Festival',
    category: 'Activity',
    date: 'December 12, 2025',
    excerpt: 'Our very own MMPNS Glee Club was awarded FIRST PLACE at the Diocesan Schools Choir Festival held at San Andres Parish! 🎶✨\n\nTheir winning piece, a medley of Filipino Christmas carols, moved the judges and the audience alike. Congratulations to our young singers and to their coach — you make the whole MMPNS family proud!',
    image: '/images/student_life/glee_club.png',
    media: [{ type: 'photo', src: '/images/student_life/glee_club.png' }],
    likes: '342',
    commentsCount: '57',
  },
  {
    id: 'news-demo-4',
    title: 'Art Guild Exhibit: "Kulay ng Pananampalataya" Now Open',
    category: 'Activity',
    date: 'February 6, 2026',
    excerpt: 'The MMPNS Art Guild opens its annual exhibit, "Kulay ng Pananampalataya," featuring watercolor, acrylic, and mixed-media works by students from Grades 4 to 10. The exhibit runs until the end of the month at the school lobby.\n\nDrop by and support our young artists! 🎨',
    image: '/images/student_life/art_guild.png',
    media: [{ type: 'photo', src: '/images/student_life/art_guild.png' }],
    likes: '198',
    commentsCount: '26',
  },
  {
    id: 'news-demo-5',
    title: 'Kindergarten Family Day: Learning Begins with Love',
    category: 'Event',
    date: 'October 17, 2025',
    excerpt: 'Our youngest Notarians welcomed their families for a morning of games, storytelling, and art activities at the Kindergarten Family Day. Thank you to all the parents and guardians who joined — your presence is the best gift to your little learners. 💛💚',
    image: '/images/homepage/kindergarten.png',
    media: [{ type: 'photo', src: '/images/homepage/kindergarten.png' }],
    likes: '256',
    commentsCount: '44',
  },
  {
    id: 'news-demo-6',
    title: 'Enrollment for S.Y. 2026–2027 Opens This March',
    category: 'Announcement',
    date: 'February 20, 2026',
    excerpt: 'Enrollment for School Year 2026–2027 opens on March 2, 2026 for Kindergarten, Elementary, and Junior High School. Early bird discounts await families who complete enrollment before April 30.\n\nVisit the Registrar\'s Office (Mon–Fri, 7:30 AM–4:30 PM) or check the Admissions page of our website for requirements.',
    image: '/images/academic_programs/institutional_quality.png',
    media: [{ type: 'photo', src: '/images/academic_programs/institutional_quality.png' }],
    likes: '289',
    commentsCount: '63',
  },
];

/* ═══════════════════ Table seeds (mirrors the cloud database) ═══════════ */

export const DEMO_TABLE_SEEDS: Record<string, unknown> = {
  students: { students: DEMO_STUDENT_ACCOUNTS.map(studentToRecord) },
  teachers: { teachers: buildTeachersTable() },
  teacher_records: {},
  student_registrations: { students: [] },
  master_subjects: { subjects: DEMO_MASTER_SUBJECTS },
  teacher_portal: buildTeacherPortalStore(),
  calendar: { events: DEMO_CALENDAR_EVENTS },
  school_years: { school_years: DEMO_SCHOOL_YEARS },
  settings: DEMO_SETTINGS,
  evaluation_rubrics: { rubrics: [DEMO_RUBRIC] },
  teacher_evaluations: { evaluations: DEMO_EVALUATIONS },
  books: { books: DEMO_BOOKS },
  library_circulation: buildCirculation(),
  library_entry_logs: buildEntryLogs(),
  faculty: { staff: staffMembers },
  alumni: { alumni: alumniProfiles },
  pages: {},
};

/* ═══════════════════ Seed snapshots (Developer tools "add sample") ══════ */

export const DEMO_SEED_SNAPSHOTS: Record<string, unknown> = {
  alumni: { alumni: alumniProfiles },
  faculty: { staff: staffMembers },
  schoolYears: { school_years: DEMO_SCHOOL_YEARS },
  events: { heroSlides: [] },
};

/* ═══════════════════ Attendance (deterministic per date) ════════════════ */

export interface DemoAttendanceRecord {
  id: string;
  date: string;
  studentUid: string;
  systemId: string;
  displayName: string;
  gradeLevel?: string;
  section?: string;
  status: 'present';
  firstScanAt: string;
  lastScanAt: string;
  timeOutAt?: string | null;
  scanCount: number;
  timeInScanCount?: number;
  timeOutScanCount?: number;
  lastScanMode?: 'time_in' | 'time_out';
}

export interface DemoAttendanceSummary {
  date: string;
  totalStudents: number;
  present: number;
  absent: number;
  attendanceRate: number;
  byGrade: Record<string, number>;
  records: DemoAttendanceRecord[];
}

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const isWeekendDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, (month || 1) - 1, day || 1)).getUTCDay();
  return weekday === 0 || weekday === 6;
};

const atTimeIso = (dateKey: string, hour: number, minute: number) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, hour, minute, 0, 0).toISOString();
};

/** Builds the same attendance sheet for a given date on every visit. */
export const buildDemoAttendanceSummary = (dateKey: string): DemoAttendanceSummary => {
  const students = DEMO_STUDENT_ACCOUNTS;
  const totalStudents = students.length;

  if (isWeekendDateKey(dateKey)) {
    return { date: dateKey, totalStudents, present: 0, absent: totalStudents, attendanceRate: 0, byGrade: {}, records: [] };
  }

  const daySeed = hashString(dateKey);
  const rng = mulberry32(daySeed);
  const absentCount = 2 + (daySeed % 5); // 2–6 absentees per school day
  const absentIndexes = new Set<number>();
  while (absentIndexes.size < absentCount) {
    absentIndexes.add(Math.floor(rng() * totalStudents));
  }

  const nowMs = Date.now();
  const isToday = dateKey === manilaDateKey();
  const currentHour = new Date(nowMs).getHours();

  const records: DemoAttendanceRecord[] = [];
  const byGrade: Record<string, number> = {};

  students.forEach((student, index) => {
    if (absentIndexes.has(index)) {
      return;
    }

    const minuteOffset = (hashString(`${dateKey}-${student.uid}`) % 55);
    const firstScanAt = atTimeIso(dateKey, 6, 35 + Math.floor(minuteOffset / 3));
    const hasTimedOut = !isToday || currentHour >= 16;
    const timeOutAt = hasTimedOut ? atTimeIso(dateKey, 15, 5 + (minuteOffset % 50)) : null;

    records.push({
      id: `att_${dateKey}_${student.uid}`,
      date: dateKey,
      studentUid: student.uid,
      systemId: student.systemId || '',
      displayName: student.displayName,
      gradeLevel: student.gradeLevel,
      section: student.section,
      status: 'present',
      firstScanAt,
      lastScanAt: timeOutAt || firstScanAt,
      timeOutAt,
      scanCount: hasTimedOut ? 2 : 1,
      timeInScanCount: 1,
      timeOutScanCount: hasTimedOut ? 1 : 0,
      lastScanMode: hasTimedOut ? 'time_out' : 'time_in',
    });

    const grade = student.gradeLevel || 'Unassigned';
    byGrade[grade] = (byGrade[grade] || 0) + 1;
  });

  const present = records.length;
  return {
    date: dateKey,
    totalStudents,
    present,
    absent: totalStudents - present,
    attendanceRate: totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0,
    byGrade,
    records,
  };
};
