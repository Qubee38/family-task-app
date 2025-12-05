export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (data: RegisterData) => Promise<void>;
  signIn: (data: LoginData) => Promise<void>;
  signOut: () => Promise<void>;
}