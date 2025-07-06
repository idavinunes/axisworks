import { Outlet } from 'react-router-dom';
import Header from './Header';

const Layout = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;