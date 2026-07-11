export interface User {
  id: number;
  email: string;
  name: string;
  tag: string;
  role: 'student' | 'teacher';
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  tag: string;
  role: 'student' | 'teacher';    
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UpdateRoleData {
  role: 'student' | 'teacher';
}

export interface AuthResponse {
    id: number;
    name: string;
    email: string;
    tag: string;
    role: 'student' | 'teacher';
}
