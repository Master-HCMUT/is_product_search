import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { getModelMetrics, type ModelMetrics } from '../utils/mockData';
import { Activity } from 'lucide-react';

export default function ModelEvaluationPage() {
  const [metrics, setMetrics] = useState<ModelMetrics[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');

  useEffect(() => {
    const allMetrics = getModelMetrics().filter((m) => m.status === 'completed');
    setMetrics(allMetrics);
    if (allMetrics.length > 0) {
      setSelectedModel(allMetrics[allMetrics.length - 1].id);
    }
  }, []);

  const selectedModelData = metrics.find((m) => m.id === selectedModel);

  const performanceData = selectedModelData
    ? [
        { name: 'Accuracy', value: selectedModelData.accuracy * 100 },
        { name: 'Precision', value: selectedModelData.precision * 100 },
        { name: 'Recall', value: selectedModelData.recall * 100 },
        { name: 'F1 Score', value: selectedModelData.f1Score * 100 },
      ]
    : [];

  const trendData = metrics.map((m) => ({
    version: m.modelVersion,
    accuracy: m.accuracy * 100,
    precision: m.precision * 100,
    recall: m.recall * 100,
    f1Score: m.f1Score * 100,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Model Evaluation" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl mb-2">Model Evaluation Results</h1>
          <p className="text-gray-600">Analyze model performance metrics and trends</p>
        </div>

        {/* Model Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Model</CardTitle>
            <CardDescription>
              Choose a model to view detailed evaluation metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {metrics.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.modelVersion} - {new Date(model.trainingDate).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedModelData ? (
          <>
            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">Accuracy</CardTitle>
                  <Activity className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">{(selectedModelData.accuracy * 100).toFixed(2)}%</div>
                  <Badge className="mt-2 bg-green-100 text-green-800">Excellent</Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">Precision</CardTitle>
                  <Activity className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">{(selectedModelData.precision * 100).toFixed(2)}%</div>
                  <Badge className="mt-2 bg-blue-100 text-blue-800">Good</Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">Recall</CardTitle>
                  <Activity className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">{(selectedModelData.recall * 100).toFixed(2)}%</div>
                  <Badge className="mt-2 bg-purple-100 text-purple-800">Good</Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm">F1 Score</CardTitle>
                  <Activity className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl">{(selectedModelData.f1Score * 100).toFixed(2)}%</div>
                  <Badge className="mt-2 bg-orange-100 text-orange-800">Good</Badge>
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Visual breakdown of model performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#000000" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Model Comparison Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Model Performance Trends</CardTitle>
                <CardDescription>
                  Comparison across different model versions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="version" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="accuracy" stroke="#000000" strokeWidth={2} />
                    <Line type="monotone" dataKey="precision" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="recall" stroke="#8b5cf6" strokeWidth={2} />
                    <Line type="monotone" dataKey="f1Score" stroke="#f97316" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-gray-500">
                No model data available. Please train a model first.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
