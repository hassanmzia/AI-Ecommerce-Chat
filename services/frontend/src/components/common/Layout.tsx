import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout() {
  const location = useLocation();

  // Chat page uses full height with no footer
  const isChatPage = location.pathname === '/chat';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className={isChatPage ? 'flex-1 flex' : 'flex-1'}>
        <Outlet />
      </main>
      {!isChatPage && <Footer />}
    </div>
  );
}
