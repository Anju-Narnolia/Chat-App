import { User, Task, Contact, Attendance } from './types';

export const users: User[] = [
  { id: 'user-1', name: 'Alice Johnson', image: 'https://placehold.co/100x100.png', email: 'alice@example.com', role: 'user' },
  { id: 'user-2', name: 'Bob Williams', image: 'https://placehold.co/100x100.png', email: 'bob@example.com', role: 'user' },
  { id: 'user-3', name: 'Charlie Brown', image: 'https://placehold.co/100x100.png', email: 'charlie@example.com', role: 'user' },
  { id: 'user-4', name: 'Diana Prince', image: 'https://placehold.co/100x100.png', email: 'diana@example.com', role: 'user' },
];

export const tasks: Task[] = [
  {
    id: 'task-1',
    title: 'Implement user authentication flow',
    status: 'In Progress',
    label: 'Features',
    priority: 'High',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 3)),
    assignee: users[0],
  },
  {
    id: 'task-2',
    title: 'Design the main dashboard UI',
    status: 'Todo',
    label: 'UI',
    priority: 'High',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 5)),
    assignee: users[1],
  },
  {
    id: 'task-3',
    title: 'Fix login button CSS bug on mobile',
    status: 'Backlog',
    label: 'Bugs',
    priority: 'Medium',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
    assignee: users[0],
  },
  {
    id: 'task-4',
    title: 'Setup documentation for the new API',
    status: 'Done',
    label: 'Documentation',
    priority: 'Low',
    dueDate: new Date(new Date().setDate(new Date().getDate() - 2)),
    assignee: users[2],
  },
    {
    id: 'task-5',
    title: 'Refactor chat component state management',
    status: 'In Progress',
    label: 'Features',
    priority: 'Medium',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 10)),
    assignee: users[3],
  },
  {
    id: 'task-6',
    title: 'Add loading spinners for data fetching',
    status: 'Canceled',
    label: 'UI',
    priority: 'Low',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 4)),
    assignee: users[1],
  },
];

export const contacts: Contact[] = [
  { id: 'contact-1', name: 'Admin', image: 'https://placehold.co/100x100.png', online: true, role: 'admin' },
  ...users.map((user, i) => ({
    id: `contact-${user.id}`,
    name: user.name,
    image: user.image,
    online: i % 2 === 0,
    role: 'user'
  })),
];


export const attendance: Attendance[] = users.flatMap(user => 
  Array.from({ length: 30 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const randomStatus = Math.random();
    let status: Attendance['status'];

    if (randomStatus < 0.8) status = 'Present';
    else if (randomStatus < 0.9) status = 'Late';
    else if (randomStatus < 0.95) status = 'Half-day';
    else status = 'Absent';
    
    return { 
        id: `att-${user.id}-${i}`,
        userId: user.id,
        date, 
        status
    };
}));
