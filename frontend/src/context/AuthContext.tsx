import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// 1. Define the shape of our memory bank
interface AuthContextType {
  token: string | null;
  username: string | null;
  role: string | null;
  login: (token: string, username: string, role: string) => void;
  logout: () => void;
}

// 2. Create the Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Create the Provider (This wraps around our app)
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Initialize state from localStorage so we survive page refreshes!
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  const [role, setRole] = useState<string | null>(localStorage.getItem('role'));

  // The function to call when a user successfully logs in
  const login = (newToken: string, newUsername: string, newRole: string) => {
    setToken(newToken);
    setUsername(newUsername);
    setRole(newRole);
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    localStorage.setItem('role', newRole);
  };

  // The function to call when a user clicks 'Sign Out'
  const logout = () => {
    setToken(null);
    setUsername(null);
    setRole(null);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
  };

  return (
    <AuthContext.Provider value={{ token, username, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 4. Create a custom hook to easily access this memory bank from anywhere
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};