'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  displayName: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setDisplayName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayNameState] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('nexus_displayName');
    if (saved) setDisplayNameState(saved);
  }, []);

  const setDisplayName = (name: string) => {
    setDisplayNameState(name);
    localStorage.setItem('nexus_displayName', name);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!auth) {
        setLoading(false);
        return;
      }

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });

      return () => {
        unsubscribe();
      };
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const login = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase auth não inicializado');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase auth não inicializado');
    if (password.length < 8) {
      throw new Error('A senha deve ter pelo menos 8 caracteres');
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      throw new Error('A senha deve conter pelo menos uma letra maiúscula e um número');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Email inválido');
    }
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (!auth) throw new Error('Firebase auth não inicializado');
    await signOut(auth);
  };

  const loginWithGoogle = async () => {
    if (!auth) throw new Error('Firebase auth não inicializado');
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const resetPassword = async (email: string) => {
    if (!auth) throw new Error('Firebase auth não inicializado');
    await sendPasswordResetEmail(auth, email);
  };

  const value = {
    user,
    loading,
    displayName,
    login,
    signup,
    logout,
    loginWithGoogle,
    resetPassword,
    setDisplayName,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};