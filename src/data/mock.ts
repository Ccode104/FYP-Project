export interface Assignment {
  id: string
  title: string
  dueDate?: string
  submitted?: boolean
}

export interface Course {
  id: string
  title: string
  description: string
  assignmentsPast: Assignment[]
  assignmentsPresent: Assignment[]
  pyq: { id: string; title: string; url: string }[]
  notes: { id: string; title: string; url: string }[]
}

export const courses: Course[] = [
  {
    id: 'c1',
    title: 'Mathematics 101',
    description: 'Intro to Algebra and Calculus',
    assignmentsPast: [
      { id: 'p1', title: 'Algebra Worksheet', submitted: true },
      { id: 'p2', title: 'Derivatives Basics', submitted: true },
    ],
    assignmentsPresent: [
      { id: 'a1', title: 'Integrals Assignment', dueDate: '2025-10-30' },
    ],
    pyq: [
      { id: 'pyq1', title: 'Midterm 2023', url: '#' },
      { id: 'pyq2', title: 'Final 2024', url: '#' },
    ],
    notes: [
      { id: 'n1', title: 'Lecture 1 Notes', url: '#' },
      { id: 'n2', title: 'Lecture 2 Notes', url: '#' },
    ],
  },
  {
    id: 'c2',
    title: 'Physics 201',
    description: 'Mechanics and Thermodynamics',
    assignmentsPast: [
      { id: 'p3', title: 'Kinematics Problems', submitted: true },
    ],
    assignmentsPresent: [
      { id: 'a2', title: 'Energy and Work', dueDate: '2025-11-05' },
    ],
    pyq: [
      { id: 'pyq3', title: 'Thermo 2022', url: '#' },
    ],
    notes: [
      { id: 'n3', title: 'Thermo Cheatsheet', url: '#' },
    ],
  },
]
