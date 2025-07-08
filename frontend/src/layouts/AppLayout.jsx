import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const sidebarLinks = [
  { to: '/admin', label: 'Assessment' },
  { to: '/libraries', label: 'Libraries' },
  { to: '/settings', label: 'Settings' },
];

const AppLayout = ({ children }) => {
  const location = useLocation();
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-teal-500 to-teal-700 text-white flex flex-col py-8 px-4 rounded-tr-3xl rounded-br-3xl shadow-lg">
        <div className="mb-10 text-3xl font-bold tracking-wide flex items-center gap-2">
          <span>Talent</span>
          <span className="text-white">Pulse</span>
        </div>
        <nav className="flex-1">
          {sidebarLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`block py-3 px-4 my-2 rounded-lg transition-colors duration-200 font-semibold ${location.pathname.startsWith(link.to) ? 'bg-white text-teal-700' : 'hover:bg-teal-600'}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="bg-white rounded-2xl shadow-md p-8 min-h-[80vh]">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout; 