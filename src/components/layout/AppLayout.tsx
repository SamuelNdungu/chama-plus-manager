
import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, 
  Users, 
  DollarSign, 
  Calendar, 
  Landmark, 
  FileText, 
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  AlertCircle,
  TrendingUp,
  Wallet,
  PieChart,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { useChama } from '@/context/ChamaContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
}

const AppLayout = ({ children, title }: AppLayoutProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { chama } = useChama();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutGrid size={20} /> },
    { name: 'Members', path: '/members', icon: <Users size={20} /> },
    { name: 'Contributions', path: '/contributions', icon: <DollarSign size={20} /> },
    { name: 'Arrears', path: '/arrears', icon: <AlertCircle size={20} /> },
    { name: 'Investments', path: '/investments', icon: <TrendingUp size={20} /> },
    { name: 'Loans', path: '/loans', icon: <Wallet size={20} /> },
    { name: 'Meetings', path: '/meetings', icon: <Calendar size={20} /> },
    { name: 'Assets', path: '/assets', icon: <Landmark size={20} /> },
    { name: 'Net Worth', path: '/net-worth', icon: <PieChart size={20} /> },
    { name: 'Documents', path: '/documents', icon: <FileText size={20} /> },
    { name: 'Reports', path: '/reports', icon: <BarChart3 size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          className="bg-white"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white transform transition-transform duration-200 ease-in-out shadow-lg
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:relative lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-center">
              <h1 className="text-2xl font-bold text-chama-purple">ChamaPlus</h1>
            </div>
            {chama && (
              <p className="text-sm text-center text-gray-600 mt-2 truncate">
                {chama.name}
              </p>
            )}
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <a 
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false);
                    }} 
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer text-gray-700 hover:text-chama-purple"
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* User profile */}
          <div className="p-4 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-gray-100">
                  <Avatar>
                    <AvatarImage src="" alt={user?.name} />
                    <AvatarFallback className="bg-chama-purple text-white">
                      {(user?.name?.substring(0, 2) || "US").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <ChevronDown size={16} className="text-gray-500" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="px-6 py-4">
            <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
          </div>
        </header>
        
        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
