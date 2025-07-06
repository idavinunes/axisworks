import { useSession } from '@/contexts/SessionContext';
import { Navigate, Outlet } from 'react-router-dom';
import { ReactNode, useEffect } from 'react';
import { Skeleton } from './ui/skeleton';
import { showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children?: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { session, profile, loading } = useSession();

  useEffect(() => {
    if (!loading && session && profile?.status === 'pending') {
      showError("Sua conta está pendente de aprovação. Contate um administrador.");
      supabase.auth.signOut();
    }
  }, [session, profile, loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[300px]" />
          <Skeleton className="h-4 w-[250px]" />
        </div>
      </div>
    );
  }

  if (!session || profile?.status !== 'active') {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;