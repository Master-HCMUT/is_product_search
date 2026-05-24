import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { getDSAccounts, saveDSAccounts, type DSAccount } from '../utils/mockData';
import { toast } from 'sonner';

export default function AddDSAccountPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const accounts = getDSAccounts();
    
    // Check if email already exists
    if (accounts.some((a) => a.email === formData.email)) {
      toast.error('An account with this email already exists');
      return;
    }

    const newAccount: DSAccount = {
      id: (accounts.length + 2).toString(), // Simple ID generation
      name: formData.name,
      email: formData.email,
      createdAt: new Date().toISOString().split('T')[0],
      isActive: true,
    };

    saveDSAccounts([...accounts, newAccount]);
    toast.success('DS account created successfully');
    navigate('/owner/ds-accounts');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Add DS Account" />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/owner/ds-accounts')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Accounts
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Add New Data Scientist Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                  required
                />
                <p className="text-sm text-gray-500">
                  This will be used for login credentials
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/owner/ds-accounts')}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-black hover:bg-gray-800">
                  Create Account
                </Button>
              </div>
            </form>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The default password for new accounts is "ds123". 
                Please ask the user to change it after first login.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
