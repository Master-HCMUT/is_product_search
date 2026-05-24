import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { ArrowLeft } from 'lucide-react';
import { getProducts, saveProducts, type Product } from '../utils/mockData';
import { toast } from 'sonner';

export default function AddEditProductPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    image: '',
    description: '',
    stock: '',
    isActive: true,
    isNewArrival: false,
    suggestedByDS: false,
  });

  useEffect(() => {
    if (isEditMode && id) {
      const products = getProducts();
      const product = products.find((p) => p.id === id);
      if (product) {
        setFormData({
          name: product.name,
          category: product.category,
          price: product.price.toString(),
          image: product.image,
          description: product.description,
          stock: product.stock.toString(),
          isActive: product.isActive,
          isNewArrival: product.isNewArrival,
          suggestedByDS: product.suggestedByDS || false,
        });
      }
    }
  }, [id, isEditMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const products = getProducts();
    const productData: Product = {
      id: isEditMode ? id! : Date.now().toString(),
      name: formData.name,
      category: formData.category,
      price: parseFloat(formData.price),
      image: formData.image,
      description: formData.description,
      stock: parseInt(formData.stock),
      isActive: formData.isActive,
      isNewArrival: formData.isNewArrival,
      suggestedByDS: formData.suggestedByDS,
      createdAt: isEditMode
        ? products.find((p) => p.id === id)?.createdAt || new Date().toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    };

    if (isEditMode) {
      const updatedProducts = products.map((p) => (p.id === id ? productData : p));
      saveProducts(updatedProducts);
      toast.success('Product updated successfully');
    } else {
      saveProducts([...products, productData]);
      toast.success('Product added successfully');
    }

    navigate('/owner/products');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title={isEditMode ? 'Edit Product' : 'Add Product'} />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/owner/products')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Products
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? 'Edit Product' : 'Add New Product'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Luggage, Backpacks, Briefcases"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity *</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Image URL *</Label>
                <Input
                  id="image"
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  required
                />
                {formData.image && (
                  <div className="mt-2">
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isActive">Active Status</Label>
                    <p className="text-sm text-gray-500">
                      Make this product visible to customers
                    </p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isNewArrival">New Arrival</Label>
                    <p className="text-sm text-gray-500">
                      Mark as a new arrival product
                    </p>
                  </div>
                  <Switch
                    id="isNewArrival"
                    checked={formData.isNewArrival}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isNewArrival: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="suggestedByDS">Suggested by Data Scientist</Label>
                    <p className="text-sm text-gray-500">
                      Mark this product as AI-recommended
                    </p>
                  </div>
                  <Switch
                    id="suggestedByDS"
                    checked={formData.suggestedByDS}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, suggestedByDS: checked })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/owner/products')}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-black hover:bg-gray-800">
                  {isEditMode ? 'Update Product' : 'Add Product'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
