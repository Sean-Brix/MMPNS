import { getTeachers } from './studentData';

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  weight: number;
}

export interface EvaluationRubric {
  id: string;
  name: string;
  description: string;
  criteria: RubricCriterion[];
  status: 'active' | 'draft';
  createdAt: string;
}

export interface TeacherEvaluation {
  id: string;
  teacherUsername: string;
  teacherName: string;
  rubricId: string;
  quarter: number;
  scores: Record<string, number>;
  comments: string;
  evaluatedAt: string;
  evaluatedBy: string;
}

export interface EvaluationTeacher {
  username: string;
  name: string;
  department: string;
  employeeId?: string;
}

export const STORAGE_KEY_RUBRICS = 'mmpns_principal_rubrics';
export const STORAGE_KEY_EVALS = 'mmpns_principal_evaluations';

export const DEFAULT_RUBRIC: EvaluationRubric = {
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

export const DEFAULT_EVALUATIONS: TeacherEvaluation[] = [
  {
    id: 'e1',
    teacherUsername: 'msantos',
    teacherName: 'Prof. Santos',
    rubricId: 'default-rubric',
    quarter: 2,
    scores: { c1: 4, c2: 5, c3: 4, c4: 4, c5: 5, c6: 4, c7: 3 },
    comments: 'Excellent tech integration. Continue professional development.',
    evaluatedAt: '2025-11-10',
    evaluatedBy: 'Sr. Catalina De Jesus',
  },
  {
    id: 'e2',
    teacherUsername: 'jreyes',
    teacherName: 'Prof. Reyes',
    rubricId: 'default-rubric',
    quarter: 2,
    scores: { c1: 5, c2: 4, c3: 4, c4: 5, c5: 4, c6: 3, c7: 4 },
    comments: 'Outstanding content knowledge. Improve parent engagement.',
    evaluatedAt: '2025-11-10',
    evaluatedBy: 'Sr. Catalina De Jesus',
  },
  {
    id: 'e3',
    teacherUsername: 'lgonzales',
    teacherName: 'Prof. Gonzales',
    rubricId: 'default-rubric',
    quarter: 2,
    scores: { c1: 4, c2: 5, c3: 5, c4: 4, c5: 4, c6: 5, c7: 4 },
    comments: 'Exceptional classroom management and student rapport.',
    evaluatedAt: '2025-11-11',
    evaluatedBy: 'Sr. Catalina De Jesus',
  },
  {
    id: 'e4',
    teacherUsername: 'rcruz',
    teacherName: 'Prof. Cruz',
    rubricId: 'default-rubric',
    quarter: 2,
    scores: { c1: 4, c2: 4, c3: 3, c4: 4, c5: 4, c6: 3, c7: 3 },
    comments: 'Solid teaching. Encourage more differentiated instruction.',
    evaluatedAt: '2025-11-11',
    evaluatedBy: 'Sr. Catalina De Jesus',
  },
  {
    id: 'e5',
    teacherUsername: 'amendiola',
    teacherName: 'Prof. Mendiola',
    rubricId: 'default-rubric',
    quarter: 2,
    scores: { c1: 3, c2: 4, c3: 4, c4: 3, c5: 3, c6: 4, c7: 3 },
    comments: 'Growing well as a new teacher. Needs mentoring in assessment design.',
    evaluatedAt: '2025-11-12',
    evaluatedBy: 'Sr. Catalina De Jesus',
  },
];

const FALLBACK_TEACHERS: EvaluationTeacher[] = [
  { username: 'msantos', name: 'Prof. Santos', department: 'Technology' },
  { username: 'jreyes', name: 'Prof. Reyes', department: 'Mathematics' },
  { username: 'lgonzales', name: 'Prof. Gonzales', department: 'English' },
  { username: 'rcruz', name: 'Prof. Cruz', department: 'Science' },
  { username: 'amendiola', name: 'Prof. Mendiola', department: 'Social Studies' },
];

const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const getEvaluationTeachers = (): EvaluationTeacher[] => {
  const teachers = getTeachers()
    .filter((teacher) => teacher.username && teacher.displayName)
    .map((teacher) => ({
      username: teacher.username,
      name: teacher.displayName,
      department: teacher.department || 'Faculty',
      employeeId: teacher.employeeId,
    }));

  return teachers.length > 0 ? teachers : FALLBACK_TEACHERS;
};

export const loadEvaluationRubrics = () => readJson<EvaluationRubric[]>(STORAGE_KEY_RUBRICS, [DEFAULT_RUBRIC]);

export const loadTeacherEvaluations = () => readJson<TeacherEvaluation[]>(STORAGE_KEY_EVALS, DEFAULT_EVALUATIONS);

export const saveEvaluationRubrics = (rubrics: EvaluationRubric[]) => {
  window.localStorage.setItem(STORAGE_KEY_RUBRICS, JSON.stringify(rubrics));
};

export const saveTeacherEvaluations = (evaluations: TeacherEvaluation[]) => {
  window.localStorage.setItem(STORAGE_KEY_EVALS, JSON.stringify(evaluations));
};

export const computeEvaluationOverall = (
  evaluation: TeacherEvaluation,
  rubric: EvaluationRubric | undefined,
) => {
  if (!rubric) return 0;

  let totalWeighted = 0;
  let totalWeight = 0;
  rubric.criteria.forEach((criterion) => {
    const score = evaluation.scores[criterion.id] || 0;
    totalWeighted += (score / criterion.maxScore) * criterion.weight;
    totalWeight += criterion.weight;
  });

  return totalWeight > 0 ? (totalWeighted / totalWeight) * 100 : 0;
};

export const getEvaluationRating = (pct: number) => {
  if (pct >= 90) return { label: 'Outstanding', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' };
  if (pct >= 80) return { label: 'Very Satisfactory', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' };
  if (pct >= 70) return { label: 'Satisfactory', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' };
  return { label: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' };
};

export const getLatestTeacherEvaluation = (
  evaluations: TeacherEvaluation[],
  teacherUsername: string,
) => [...evaluations]
  .filter((evaluation) => evaluation.teacherUsername === teacherUsername)
  .sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt))[0];

export const resolveEvaluationTeacherUsername = (
  session: {
    username?: string;
    displayName?: string;
    employeeId?: string;
  } | null,
  teachers = getEvaluationTeachers(),
) => {
  if (!session) return '';

  if (session.username && teachers.some((teacher) => teacher.username === session.username)) {
    return session.username;
  }

  if (session.employeeId) {
    const byEmployeeId = teachers.find((teacher) => teacher.employeeId === session.employeeId);
    if (byEmployeeId) return byEmployeeId.username;
  }

  const displayName = session.displayName?.toLowerCase().trim() || '';
  if (!displayName) return '';

  const byDisplayName = teachers.find((teacher) => teacher.name.toLowerCase() === displayName);
  if (byDisplayName) return byDisplayName.username;

  const byLastName = teachers.find((teacher) => {
    const lastName = teacher.name.toLowerCase().split(' ').filter(Boolean).pop();
    return Boolean(lastName && displayName.includes(lastName));
  });

  return byLastName?.username || '';
};
