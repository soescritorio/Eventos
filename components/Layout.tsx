import React from 'react';
import { AppSettings } from '../types';
import { LogOut, LayoutDashboard, Calendar, Settings as SettingsIcon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  settings: AppSettings;
  isAdmin: boolean;
  onLogout?: () => void;
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  settings, 
  isAdmin, 
  onLogout,
  currentPage,
  onNavigate 
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="shadow-sm bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center cursor-pointer gap-3"
            onClick={() => onNavigate && onNavigate('home')}
          >
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
            ) : (
              <div 
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md"
                style={{ backgroundColor: settings.primaryColor }}
              >
                {settings.appName.substring(0, 1)}
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-800 hidden sm:block">{settings.appName}</h1>
          </div>

          <nav className="flex items-center gap-4">
            {isAdmin ? (
              <>
                 <button 
                  onClick={() => onNavigate?.('admin-events')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${currentPage === 'admin-events' ? 'bg-gray-100 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <Calendar size={18} />
                  <span className="hidden sm:inline">Eventos</span>
                </button>
                <button 
                  onClick={() => onNavigate?.('admin-settings')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${currentPage === 'admin-settings' ? 'bg-gray-100 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <SettingsIcon size={18} />
                  <span className="hidden sm:inline">Configurações</span>
                </button>
                <button 
                  onClick={onLogout}
                  className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <LogOut size={18} />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </>
            ) : (
              <button 
                onClick={() => onNavigate?.('login')}
                className="text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                Área do Organizador
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-grow">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} {settings.appName}. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};
