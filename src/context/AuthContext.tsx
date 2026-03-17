
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '@/types';
import { apiClient } from '@/services/api';

// API Response Interfaces
interface ApiUser {
  id: number | string;
  email: string;
  username?: string;
  name?: string;
  phoneNumber?: string;
  phone?: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
}

interface VerifyResponse {
  valid: boolean;
  user: ApiUser;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const mapApiUserToUser = useCallback((apiUser: ApiUser): User => {
    return {
      id: String(apiUser.id),
      name: apiUser.username || apiUser.name || apiUser.email,
      email: apiUser.email,
      phone: apiUser.phoneNumber || apiUser.phone || '',
    };
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (!apiClient.isAuthenticated()) {
          setIsLoading(false);
          return;
        }

        const response = await apiClient.get<VerifyResponse>('/auth/verify');
        if (response.valid && response.user) {
          const mappedUser = mapApiUserToUser(response.user);
          localStorage.setItem('chamaUser', JSON.stringify(mappedUser));
          setUser(mappedUser);
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        localStorage.removeItem('chamaUser');
        apiClient.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [mapApiUserToUser]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiClient.post<AuthResponse>(
        '/auth/login',
        { email, password }
      );

      apiClient.setTokens(response.accessToken, response.refreshToken);

      const mappedUser = mapApiUserToUser(response.user);
      localStorage.setItem('chamaUser', JSON.stringify(mappedUser));
      setUser(mappedUser);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, phone: string, password: string) => {
    try {
      setIsLoading(true);
      const usernameFromName = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .slice(0, 12);
      const usernameFromEmail = email.split('@')[0]?.toLowerCase() || 'user';
      const username = (usernameFromName || usernameFromEmail || 'user').slice(0, 20);

      const response = await apiClient.post<AuthResponse>(
        '/auth/register',
        {
          email,
          password,
          username,
        }
      );

      apiClient.setTokens(response.accessToken, response.refreshToken);

      const mappedUser = mapApiUserToUser({
        ...response.user,
        name,
        phone,
      });
      localStorage.setItem('chamaUser', JSON.stringify(mappedUser));
      setUser(mappedUser);
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('chamaUser');
    apiClient.logout();
    setUser(null);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      login, 
      signup, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
