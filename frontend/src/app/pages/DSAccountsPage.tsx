import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Plus, Power } from 'lucide-react';
import { getDSAccounts, saveDSAccounts, type DSAccount } from '../utils/mockData';
import { toast } from 'sonner';

export default function DSAccountsPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<DSAccount[]>([]);

  useEffect(() => {
    setAccounts(getDSAccounts());
  }, []);

  const toggleAccountStatus = (accountId: string) => {
    const updatedAccounts = accounts.map((a) =>
      a.id === accountId ? { ...a, isActive: !a.isActive } : a
    );
    setAccounts(updatedAccounts);
    saveDSAccounts(updatedAccounts);
    toast.success('Account status updated');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="DS Account Management" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl mb-2">Data Scientist Accounts</h1>
            <p className="text-gray-600">Manage data scientist team members</p>
          </div>
          <Button
            className="bg-black hover:bg-gray-800"
            onClick={() => navigate('/owner/ds-accounts/new')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add DS Account
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {account.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-sm text-gray-500">ID: {account.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{account.email}</TableCell>
                    <TableCell>
                      {new Date(account.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.isActive ? 'default' : 'secondary'}>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={account.isActive ? 'destructive' : 'default'}
                        size="sm"
                        onClick={() => toggleAccountStatus(account.id)}
                      >
                        <Power className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {accounts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No DS accounts found
          </div>
        )}
      </div>
    </div>
  );
}
