import { usePrivy } from '@privy-io/react-auth';
import { useMemo } from 'react';

export function useAuth() {
  const {
    ready,
    authenticated,
    user,
    login,
    logout,
    getAccessToken,
  } = usePrivy();

  const authUser = useMemo(() => {
    if (!user) return null;

    return {
      id: user.id,
      email: user.email?.address,
      wallet: user.wallet?.address,
    };
  }, [user]);

  return {
    isLoading: !ready,
    isAuthenticated: authenticated,
    user: authUser,
    login,
    logout,
    getAccessToken,
  };
}

export function useAuthToken() {
  const { getAccessToken, authenticated } = usePrivy();

  const getToken = async (): Promise<string | null> => {
    if (!authenticated) return null;
    try {
      return await getAccessToken();
    } catch {
      return null;
    }
  };

  return { getToken, isAuthenticated: authenticated };
}
