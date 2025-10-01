export type UserRole = 'manufacturer' | 'supplier' | 'pharmacist' | 'admin';

export interface DemoUser {
  username: string;
  password: string; // demo only, plain text
  role: UserRole;
  entityName: string;
}

export const demoUsers: DemoUser[] = [
  { username: 'mfg1', password: 'demo123', role: 'manufacturer', entityName: 'PharmaCorp Manufacturing' },
  { username: 'sup1', password: 'demo123', role: 'supplier', entityName: 'LogiSupply Ltd' },
  { username: 'phm1', password: 'demo123', role: 'pharmacist', entityName: 'City Pharmacy' },
  { username: 'admin', password: 'admin123', role: 'admin', entityName: 'PharmaTrust Admin' }
];

export function findDemoUser(username: string): DemoUser | undefined {
  return demoUsers.find(u => u.username === username);
}
