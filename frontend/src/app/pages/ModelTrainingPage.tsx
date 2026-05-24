import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { Brain, Play, CheckCircle } from 'lucide-react';
import { getModelMetrics, saveModelMetrics, type ModelMetrics } from '../utils/mockData';
import { toast } from 'sonner';

export default function ModelTrainingPage() {
  const [metrics, setMetrics] = useState<ModelMetrics[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [modelVersion, setModelVersion] = useState('');

  useEffect(() => {
    const allMetrics = getModelMetrics();
    setMetrics(allMetrics);
    
    // Check if there's a training in progress
    const trainingModel = allMetrics.find((m) => m.status === 'training');
    if (trainingModel) {
      setIsTraining(true);
      simulateTraining(trainingModel.id);
    }
  }, []);

  const simulateTraining = (modelId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setTrainingProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        completeTraining(modelId);
      }
    }, 1000);
  };

  const completeTraining = (modelId: string) => {
    const updatedMetrics = metrics.map((m) => {
      if (m.id === modelId) {
        return {
          ...m,
          status: 'completed' as const,
          accuracy: 0.92 + Math.random() * 0.05,
          precision: 0.90 + Math.random() * 0.05,
          recall: 0.88 + Math.random() * 0.05,
          f1Score: 0.89 + Math.random() * 0.05,
        };
      }
      return m;
    });
    
    setMetrics(updatedMetrics);
    saveModelMetrics(updatedMetrics);
    setIsTraining(false);
    setTrainingProgress(0);
    toast.success('Model training completed successfully!');
  };

  const handleStartTraining = () => {
    if (!modelVersion.trim()) {
      toast.error('Please enter a model version');
      return;
    }

    const newModel: ModelMetrics = {
      id: Date.now().toString(),
      modelVersion: modelVersion,
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      trainingDate: new Date().toISOString().split('T')[0],
      status: 'training',
    };

    const updatedMetrics = [...metrics, newModel];
    setMetrics(updatedMetrics);
    saveModelMetrics(updatedMetrics);
    
    setIsTraining(true);
    simulateTraining(newModel.id);
    toast.success('Training started...');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Model Training" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl mb-2">Model Training & Fine-tuning</h1>
          <p className="text-gray-600">Train and optimize your search ML models</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Training Control */}
          <Card>
            <CardHeader>
              <CardTitle>Start New Training</CardTitle>
              <CardDescription>
                Configure and initiate model training
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="version">Model Version</Label>
                <Input
                  id="version"
                  placeholder="e.g., v1.3.0"
                  value={modelVersion}
                  onChange={(e) => setModelVersion(e.target.value)}
                  disabled={isTraining}
                />
              </div>

              {isTraining && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Training Progress</span>
                    <span className="font-medium">{trainingProgress}%</span>
                  </div>
                  <Progress value={trainingProgress} className="w-full" />
                </div>
              )}

              <Button
                className="w-full bg-black hover:bg-gray-800"
                onClick={handleStartTraining}
                disabled={isTraining}
              >
                {isTraining ? (
                  <>
                    <Brain className="w-4 h-4 mr-2 animate-pulse" />
                    Training in Progress...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Training
                  </>
                )}
              </Button>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-2">Training Configuration</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Dataset Size</span>
                    <span className="font-medium">10,000 samples</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Epochs</span>
                    <span className="font-medium">50</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Batch Size</span>
                    <span className="font-medium">32</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Learning Rate</span>
                    <span className="font-medium">0.001</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Training History */}
          <Card>
            <CardHeader>
              <CardTitle>Training History</CardTitle>
              <CardDescription>
                Previous training sessions and results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.length === 0 ? (
                  <p className="text-center text-gray-500 py-6">
                    No training history available
                  </p>
                ) : (
                  metrics.slice().reverse().map((model) => (
                    <div
                      key={model.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{model.modelVersion}</span>
                        <Badge
                          variant={
                            model.status === 'completed'
                              ? 'default'
                              : model.status === 'training'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {model.status === 'completed' && (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          )}
                          {model.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 mb-3">
                        {new Date(model.trainingDate).toLocaleDateString()}
                      </div>
                      {model.status === 'completed' && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-600">Accuracy:</span>
                            <span className="font-medium ml-1">
                              {(model.accuracy * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Precision:</span>
                            <span className="font-medium ml-1">
                              {(model.precision * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Recall:</span>
                            <span className="font-medium ml-1">
                              {(model.recall * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">F1 Score:</span>
                            <span className="font-medium ml-1">
                              {(model.f1Score * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
