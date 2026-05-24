import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Search, CheckCircle, XCircle, Image as ImageIcon, Sparkles, Loader2, Brain } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { toast } from 'sonner';
import {
  getSearchLogs,
  analyzeSingleFeedback,
  analyzeBatchFeedback,
  type SearchLog,
  type SearchLogStats,
} from '../utils/api';

export default function SearchAnalysisPage() {
  const [searchLogs, setSearchLogs] = useState<SearchLog[]>([]);
  const [stats, setStats] = useState<SearchLogStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [analysisTitle, setAnalysisTitle] = useState('');

  useEffect(() => {
    loadSearchLogs();
  }, []);

  const loadSearchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await getSearchLogs(100);
      setSearchLogs(data.logs);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load search logs:', err);
      toast.error('Failed to load search logs. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeSingle = async (log: SearchLog) => {
    setIsAnalyzing(true);
    setAnalysisTitle(`Analysis: "${log.query}"`);
    setShowAnalysisDialog(true);
    setAnalysisResult('Analyzing with AI...');

    try {
      const result = await analyzeSingleFeedback(log);
      setAnalysisResult(result);
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setAnalysisResult(`Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeBatch = async () => {
    setIsBatchAnalyzing(true);
    setAnalysisTitle('Batch Feedback Analysis');
    setShowAnalysisDialog(true);
    setAnalysisResult('Analyzing all feedback with AI...');

    try {
      const result = await analyzeBatchFeedback();
      setAnalysisResult(result.analysis);
      toast.success(`Analyzed ${result.entries_analyzed} feedback entries`);
    } catch (err: any) {
      console.error('Batch analysis failed:', err);
      setAnalysisResult(`Batch analysis failed: ${err.message}`);
    } finally {
      setIsBatchAnalyzing(false);
    }
  };

  const filteredLogs = searchLogs.filter((log) => {
    const query = searchQuery.toLowerCase();
    return log.query.toLowerCase().includes(query);
  });

  const matchedCount = stats?.matched ?? 0;
  const mismatchedCount = stats?.mismatched ?? 0;
  const withFeedback = stats?.with_feedback ?? 0;

  const pieData = [
    { name: 'Matched', value: matchedCount, color: '#10b981' },
    { name: 'Mismatched', value: mismatchedCount, color: '#ef4444' },
  ];

  const textSearches = searchLogs.filter((log) => log.search_type === 'text').length;
  const imageSearches = searchLogs.filter((log) => log.search_type === 'image').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Search Analysis" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl mb-2">Search Log Analysis</h1>
            <p className="text-gray-600">Analyze user search patterns and match rates with AI</p>
          </div>
          <Button
            onClick={handleAnalyzeBatch}
            disabled={isBatchAnalyzing || searchLogs.length === 0}
            className="bg-black hover:bg-gray-800"
          >
            {isBatchAnalyzing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Brain className="w-4 h-4 mr-2" />
            )}
            Analyze All Feedback
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-500">Loading search logs...</span>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">Total Searches</CardTitle>
                  <Search className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">{searchLogs.length}</div>
                  <p className="text-xs text-gray-600 mt-1">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">Matched</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl text-green-600">{matchedCount}</div>
                  <p className="text-xs text-gray-600 mt-1">
                    {stats ? `${stats.success_rate.toFixed(0)}% success rate` : '0%'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">Mismatched</CardTitle>
                  <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl text-red-600">{mismatchedCount}</div>
                  <p className="text-xs text-gray-600 mt-1">
                    {searchLogs.length > 0 ? Math.round((mismatchedCount / searchLogs.length) * 100) : 0}% failure rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">With Feedback</CardTitle>
                  <Sparkles className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl text-blue-600">{withFeedback}</div>
                  <p className="text-xs text-gray-600 mt-1">
                    Text: {textSearches} | Image: {imageSearches}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Visualizations */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Match vs Mismatch Distribution</CardTitle>
                  <CardDescription>
                    Overall search success rate visualization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {searchLogs.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-gray-400">
                      No search data yet. Perform some searches first.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Search Insights</CardTitle>
                  <CardDescription>
                    Key findings from search log analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h3 className="font-medium text-green-800 mb-2">Search Performance</h3>
                      <p className="text-sm text-green-700">
                        {searchLogs.length > 0 
                          ? `${stats?.success_rate.toFixed(0)}% of searches return results`
                          : 'No search data available'}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="font-medium text-blue-800 mb-2">Feedback Coverage</h3>
                      <p className="text-sm text-blue-700">
                        {withFeedback > 0
                          ? `${withFeedback} searches have user feedback for analysis`
                          : 'No user feedback collected yet'}
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <h3 className="font-medium text-orange-800 mb-2">AI Analysis Available</h3>
                      <p className="text-sm text-orange-700">
                        Click "Analyze" on any row or "Analyze All" for batch insights powered by Gemini
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search Logs Table */}
            <Card>
              <CardHeader>
                <CardTitle>Search Log Details</CardTitle>
                <CardDescription>
                  Detailed view of all user search queries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Filter search logs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Query</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Results</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Feedback</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                            {searchLogs.length === 0
                              ? 'No search logs yet. Perform some searches to see data here.'
                              : 'No logs matching filter'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">{log.query}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {log.search_type === 'image' ? (
                                  <ImageIcon className="w-3 h-3 mr-1" />
                                ) : (
                                  <Search className="w-3 h-3 mr-1" />
                                )}
                                {log.search_type}
                              </Badge>
                            </TableCell>
                            <TableCell>{log.result_count} items</TableCell>
                            <TableCell>
                              {log.was_match ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Match
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Mismatch
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {log.feedback_text ? (
                                <span className="text-xs text-gray-600 max-w-[150px] truncate block">
                                  {log.feedback_text}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">No feedback</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">
                              {new Date(log.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAnalyzeSingle(log)}
                                disabled={isAnalyzing}
                              >
                                <Sparkles className="w-3 h-3 mr-1" />
                                Analyze
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Analysis Dialog */}
      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              {analysisTitle}
            </DialogTitle>
            <DialogDescription>
              AI-powered analysis using Gemini
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm max-w-none">
            {isAnalyzing || isBatchAnalyzing ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-3 text-gray-500">Analyzing with Gemini...</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                {analysisResult}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
