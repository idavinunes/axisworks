import { Outlet } from 'react-router-dom';
import Header from './Header';
import { Sidebar } from './Sidebar';

const Layout = () => {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:p-6 bg-muted/40">
          <Outlet />
        </main>
        <footer className="p-4 text-center text-sm text-muted-foreground">
          Developed with ❤️ by Axisnetworks
        </footer>
      </div>
    </div>
  );
};

export default Layout;