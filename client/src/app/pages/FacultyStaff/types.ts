export type StaffType = 'teaching' | 'non-teaching';

export type Department = string;

export interface StaffMember {
  id: number;
  name: string;
  role: string;
  department: Department;
  staffType: StaffType;
  img: string;
  bio: string;
  education: string;
  yearsAtMmpns: number;
  startedAtMmpns?: string;
  specialization?: string;
  motto?: string;
}
