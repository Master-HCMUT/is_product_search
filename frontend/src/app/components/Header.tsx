import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { LogOut, Package, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (user?.role === 'shop_owner') return '/owner/dashboard';
    if (user?.role === 'data_scientist') return '/ds/dashboard';
    return '/';
  };

  return (
    <header className="bg-black text-white border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(getDashboardPath())}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Package className="w-6 h-6" />
              <span className="text-xl font-semibold tracking-tight">LUXE</span>
            </button>
            {title && (
              <>
                <span className="text-gray-500">/</span>
                <span className="text-sm text-gray-300">{title}</span>
              </>
            )}
          </div>

          <nav className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {user?.role === 'user' && (
                  <Button
                    variant="ghost"
                    className="text-white hover:bg-gray-800"
                    onClick={() => navigate('/')}
                  >
                    Shop
                  </Button>
                )}
                {user?.role === 'shop_owner' && (
                  <>
                    <Button
                      variant="ghost"
                      className="text-white hover:bg-gray-800"
                      onClick={() => navigate('/owner/products')}
                    >
                      Products
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-white hover:bg-gray-800"
                      onClick={() => navigate('/owner/ds-accounts')}
                    >
                      DS Accounts
                    </Button>
                  </>
                )}
                {user?.role === 'data_scientist' && (
                  <>
                    <Button
                      variant="ghost"
                      className="text-white hover:bg-gray-800"
                      onClick={() => navigate('/ds/search-analysis')}
                    >
                      Search Analysis
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-white hover:bg-gray-800"
                      onClick={() => navigate('/ds/model-evaluation')}
                    >
                      Evaluation
                    </Button>
                  </>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-white hover:bg-gray-800">
                      <User className="w-4 h-4 mr-2" />
                      {user?.name}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div>
                        <p className="text-sm">{user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="w-4 h-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  className="text-white hover:bg-gray-800 border border-gray-700"
                  onClick={handleLogout}
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                className="text-white hover:bg-gray-800"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
