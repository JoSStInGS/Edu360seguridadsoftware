import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserRole, getUserData } from '@/services/auth';

interface UserData {
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: string | null;
  centerId: string | null;
  centerName: string | null;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const role = await getUserRole(firebaseUser.uid);

        if (role === 'professor') {
          setUser(firebaseUser);
          const data = await getUserData(firebaseUser.uid);
          setUserData({
            email: (data?.email as string) ?? firebaseUser.email,
            displayName:
              (data?.displayName as string) ?? firebaseUser.displayName,
            photoURL: (data?.photoURL as string) ?? firebaseUser.photoURL,
            role: role,
            centerId: (data?.centerId as string) ?? null,
            centerName: (data?.centerName as string) ?? null,
          });
        } else {
          // No es profesor, no autenticar
          setUser(null);
          setUserData(null);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        isAuthenticated: !!user && !!userData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
