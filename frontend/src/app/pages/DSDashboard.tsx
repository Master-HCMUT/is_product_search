import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Brain, TrendingUp, Activity, Search, Loader2 } from 'lucide-react';
import { getSearchLogs, type SearchLogStats } from '../utils/api';

export default function DSDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SearchLogStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await getSearchLogs(100);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Data Scientist Dashboard" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl mb-2">Data Scientist Dashboard</h1>
          <p className="text-gray-600">Analyze search performance and feedback with AI</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">Search Engine</CardTitle>
                  <Brain className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">Superlinked</div>
                  <p className="text-xs text-gray-600 mt-1">
                    MiniLM-L6-v2 embeddings
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">Total Searches</CardTitle>
                  <Search className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">{stats?.total ?? 0}</div>
                  <p className="text-xs text-gray-600 mt-1">
                    {stats?.with_feedback ?? 0} with feedback
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">Success Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">{(stats?.success_rate ?? 0).toFixed(1)}%</div>
                  <p className="text-xs text-gray-600 mt-1">
                    Successful matches
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">System Status</CardTitle>
                  <Activity className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    All services operational
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Model Evaluation</CardTitle>
                  <CardDescription>
                    Evaluate search model performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/ds/model-evaluation')}
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    View Evaluation Results
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Search Analytics</CardTitle>
                  <CardDescription>
                    Analyze user search patterns with AI-powered insights
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full bg-black hover:bg-gray-800"
                    onClick={() => navigate('/ds/search-analysis')}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Analyze Search Logs
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/ds/search-analysis')}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Performance Metrics
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Search Performance Summary */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Search Performance Summary</CardTitle>
                <CardDescription>
                  Real-time analysis of search query performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Matched Searches</span>
                    <Badge className="bg-green-100 text-green-800">{stats?.matched ?? 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Mismatched Searches</span>
                    <Badge variant="destructive">{stats?.mismatched ?? 0}</Badge>
                  </div>
                  <div className="pt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${stats?.success_rate ?? 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-600">
                      <span>Mismatch: {stats?.mismatched ?? 0}</span>
                      <span>Match: {stats?.matched ?? 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
