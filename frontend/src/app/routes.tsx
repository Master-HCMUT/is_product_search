import { createBrowserRouter, Navigate } from 'react-router';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import UserShopPage from './pages/UserShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ShopOwnerDashboard from './pages/ShopOwnerDashboard';
import ProductManagementPage from './pages/ProductManagementPage';
import AddEditProductPage from './pages/AddEditProductPage';
import DSAccountsPage from './pages/DSAccountsPage';
import AddDSAccountPage from './pages/AddDSAccountPage';
import DSDashboard from './pages/DSDashboard';
// ModelTrainingPage removed — training happens externally
import ModelEvaluationPage from './pages/ModelEvaluationPage';
import SearchAnalysisPage from './pages/SearchAnalysisPage';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'shop_owner') {
      return <Navigate to="/owner/dashboard" replace />;
    } else if (user.role === 'data_scientist') {
      return <Navigate to="/ds/dashboard" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

// Role-based redirect component
function RoleBasedRedirect() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'shop_owner') {
    return <Navigate to="/owner/dashboard" replace />;
  } else if (user?.role === 'data_scientist') {
    return <Navigate to="/ds/dashboard" replace />;
  } else {
    return <Navigate to="/shop" replace />;
  }
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },
  // User/Customer Routes
  {
    path: '/shop',
    element: (
      <ProtectedRoute allowedRoles={['user']}>
        <UserShopPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: <RoleBasedRedirect />,
  },
  {
    path: '/product/:id',
    element: (
      <ProtectedRoute allowedRoles={['user']}>
        <ProductDetailPage />
      </ProtectedRoute>
    ),
  },
  // Shop Owner Routes
  {
    path: '/owner/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['shop_owner']}>
        <ShopOwnerDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/owner/products',
    element: (
      <ProtectedRoute allowedRoles={['shop_owner']}>
        <ProductManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/owner/products/new',
    element: (
      <ProtectedRoute allowedRoles={['shop_owner']}>
        <AddEditProductPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/owner/products/:id/edit',
    element: (
      <ProtectedRoute allowedRoles={['shop_owner']}>
        <AddEditProductPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/owner/ds-accounts',
    element: (
      <ProtectedRoute allowedRoles={['shop_owner']}>
        <DSAccountsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/owner/ds-accounts/new',
    element: (
      <ProtectedRoute allowedRoles={['shop_owner']}>
        <AddDSAccountPage />
      </ProtectedRoute>
    ),
  },
  // Data Scientist Routes
  {
    path: '/ds/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['data_scientist']}>
        <DSDashboard />
      </ProtectedRoute>
    ),
  },

  {
    path: '/ds/model-evaluation',
    element: (
      <ProtectedRoute allowedRoles={['data_scientist']}>
        <ModelEvaluationPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/ds/search-analysis',
    element: (
      <ProtectedRoute allowedRoles={['data_scientist']}>
        <SearchAnalysisPage />
      </ProtectedRoute>
    ),
  },
  // Catch all
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
