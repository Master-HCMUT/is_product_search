import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { User, Mail, Shield } from 'lucide-react';
import { Header } from '../components/Header';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'shop_owner':
        return 'bg-purple-100 text-purple-800';
      case 'data_scientist':
        return 'bg-blue-100 text-blue-800';
      case 'user':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'shop_owner':
        return 'Shop Owner';
      case 'data_scientist':
        return 'Data Scientist';
      case 'user':
        return 'Customer';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Profile" />
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                {user.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user.name}</h2>
                <span className={`inline-block px-3 py-1 rounded-full text-xs mt-2 ${getRoleBadgeColor(user.role)}`}>
                  {getRoleLabel(user.role)}
                </span>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="font-medium">{user.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Email Address</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Shield className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Account Type</p>
                  <p className="font-medium">{getRoleLabel(user.role)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
