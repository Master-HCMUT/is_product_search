import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Package, Plus, Users, Search, Activity } from 'lucide-react';
import { getDSAccounts } from '../utils/mockData';
import {
  getProductMetadata,
  getSearchLogs as getBackendSearchLogs,
  type ProductMetadata,
  type SearchLogStats,
} from '../utils/api';

export default function ShopOwnerDashboard() {
  const navigate = useNavigate();
  const [metadata, setMetadata] = useState<ProductMetadata | null>(null);
  const [searchStats, setSearchStats] = useState<SearchLogStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    dsAccounts: 0,
    totalSearches: 0,
    successfulSearches: 0,
    successRate: 0,
  });

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      const dsAccounts = getDSAccounts();
      try {
        const [catalogMetadata, searchLogData] = await Promise.all([
          getProductMetadata(),
          getBackendSearchLogs(500),
        ]);
        setMetadata(catalogMetadata);
        setSearchStats(searchLogData.stats);
        setStats({
          totalProducts: catalogMetadata.total,
          dsAccounts: dsAccounts.filter((account) => account.isActive).length,
          totalSearches: searchLogData.stats.total,
          successfulSearches: searchLogData.stats.matched,
          successRate: searchLogData.stats.success_rate,
        });
      } catch (error) {
        console.error('Failed to load owner dashboard:', error);
        setStats((current) => ({
          ...current,
          dsAccounts: dsAccounts.filter((account) => account.isActive).length,
        }));
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Shop Owner Dashboard" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl mb-2">Shop Owner Dashboard</h1>
          <p className="text-gray-600">Manage your products, inventory, and data science team</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Total Products</CardTitle>
              <Package className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stats.totalProducts}</div>
              <p className="text-xs text-gray-600 mt-1">
                {metadata ? `$${Math.round(metadata.price.min)}-${Math.round(metadata.price.max)}` : 'Indexed catalog'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Total Searches</CardTitle>
              <Search className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stats.totalSearches}</div>
              <p className="text-xs text-gray-600 mt-1">
                Customer search logs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Success Rate</CardTitle>
              <Activity className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stats.successRate.toFixed(1)}%</div>
              <p className="text-xs text-gray-600 mt-1">
                Searches with results
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">DS Accounts</CardTitle>
              <Users className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{stats.dsAccounts}</div>
              <p className="text-xs text-gray-600 mt-1">
                Active data scientists
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Management</CardTitle>
              <CardDescription>
                Manage your product catalog and inventory
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full bg-black hover:bg-gray-800"
                onClick={() => navigate('/owner/products/new')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Product
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/owner/products')}
              >
                <Package className="w-4 h-4 mr-2" />
                Manage Products
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>
                Manage data scientist accounts and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full bg-black hover:bg-gray-800"
                onClick={() => navigate('/owner/ds-accounts/new')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add DS Account
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/owner/ds-accounts')}
              >
                <Users className="w-4 h-4 mr-2" />
                Manage DS Accounts
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Search Performance */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Search Performance</CardTitle>
            <CardDescription>
              Overview of customer search activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Searches</span>
                <Badge variant="secondary">{stats.totalSearches}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Successful Searches</span>
                <Badge className="bg-green-100 text-green-800">{stats.successfulSearches}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Failed Searches</span>
                <Badge variant="destructive">{stats.totalSearches - stats.successfulSearches}</Badge>
              </div>
              <div className="pt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${stats.totalSearches > 0 ? (stats.successfulSearches / stats.totalSearches) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {stats.totalSearches > 0
                    ? `${Math.round((stats.successfulSearches / stats.totalSearches) * 100)}% success rate`
                    : isLoading ? 'Loading search data...' : 'No search data available'}
                </p>
                {searchStats && (
                  <p className="text-xs text-gray-500 mt-1">
                    {searchStats.with_feedback} searches have customer feedback.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
