import { useSession } from '@/contexts/SessionContext';
import { Navigate, Outlet } from 'react-router-dom';
import { ReactNode } from 'react';
import { Skeleton } from './ui/skeleton';

interface ProtectedRouteProps {
  children?: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { session, loading } = useSession();

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

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;