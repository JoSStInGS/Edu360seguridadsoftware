import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { normalizeRoles, getUserData } from '@/services/auth';

interface UserData {
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  roles: string[];
  centerId: string | null;
  centerName: string | null;
  mepEmail: string | null;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAuthenticated: boolean;
  needsMepEmail: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isAuthenticated: false,
  needsMepEmail: false,
});

const ALLOWED_ROLES = ['professor', 'parent'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const data = await getUserData(firebaseUser.uid);
        const roles = normalizeRoles(data);

        if (roles.some((r) => ALLOWED_ROLES.includes(r))) {
          setUser(firebaseUser);
          setUserData({
            email: (data?.email as string) ?? firebaseUser.email,
            displayName:
              (data?.displayName as string) ?? firebaseUser.displayName,
            photoURL: (data?.photoURL as string) ?? firebaseUser.photoURL,
            roles,
            centerId: (data?.centerId as string) ?? null,
            centerName: (data?.centerName as string) ?? null,
            mepEmail: (data?.mepEmail as string) ?? null,
          });
        } else {
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

  const needsMepEmail = !!user && !!userData && !userData.mepEmail;

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        isAuthenticated: !!user && !!userData,
        needsMepEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
