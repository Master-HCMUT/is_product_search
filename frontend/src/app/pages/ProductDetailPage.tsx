import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Loader2,
  Package as PackageIcon,
  ShoppingBag,
  Star,
  Store,
} from 'lucide-react';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { getProduct, getSimilarProducts, type Product } from '../utils/api';

function getHighlights(product: Product) {
  return product.description
    .split(/\n|\. /)
    .map((part) => part.trim().replace(/\.$/, ''))
    .filter((part) => part.length > 18 && part.length < 160)
    .slice(0, 6);
}

function ProductImage({ product, className }: { product: Product; className?: string }) {
  return (
    <img
      src={product.image_url}
      alt={product.title}
      className={className}
      onError={(e) => {
        (e.target as HTMLImageElement).src =
          'https://via.placeholder.com/600x600?text=No+Image';
      }}
    />
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const found = await getProduct(id);
      setProduct(found);
      getSimilarProducts(id, 4)
        .then(setSimilarProducts)
        .catch(() => setSimilarProducts([]));
    } catch (err) {
      console.error('Failed to load product:', err);
      toast.error('Failed to load product details');
      setProduct(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <p className="text-center text-gray-500">Product not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
              <ProductImage product={product} className="h-full w-full object-cover" />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Store className="h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-600">{product.store}</p>
              </div>
              <h1 className="mb-4 text-3xl font-semibold leading-tight">{product.title}</h1>
              <div className="mb-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{product.average_rating}</span>
                  <span className="text-gray-400">({product.rating_number} reviews)</span>
                </div>
                <Badge variant="outline">{product.main_category}</Badge>
              </div>
              <p className="text-3xl font-semibold">${product.price.toFixed(2)}</p>
            </div>

            <div className="flex gap-3 border-y py-6">
              <Button
                className="flex-1 bg-black hover:bg-gray-800"
                size="lg"
                onClick={() => toast.success('Added to demo cart')}
              >
                <ShoppingBag className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => toast.success('Purchase demo complete')}
              >
                Purchase
              </Button>
            </div>

            <div>
              <h2 className="mb-3 font-medium">Key Features</h2>
              <div className="grid gap-2">
                {getHighlights(product).map((highlight) => (
                  <p key={highlight} className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                    {highlight}
                  </p>
                ))}
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="mb-3 font-medium">Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-600">Product ID</span>
                  <span className="font-medium">{product.id}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-600">Store</span>
                  <span className="font-medium">{product.store}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-600">Rating</span>
                  <span className="font-medium">{product.average_rating} / 5.0</span>
                </div>
              </div>
            </div>

            <Button variant="outline" className="w-full" size="lg" onClick={() => navigate('/shop')}>
              <PackageIcon className="mr-2 h-5 w-5" />
              Continue Shopping
            </Button>
          </div>
        </div>

        {similarProducts.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-xl font-semibold">Similar Products</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similarProducts.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer overflow-hidden border-gray-200 transition hover:shadow-lg"
                  onClick={() => navigate(`/product/${item.id}`)}
                >
                  <CardContent className="p-0">
                    <div className="aspect-square bg-gray-100">
                      <ProductImage product={item} className="h-full w-full object-cover" />
                    </div>
                    <div className="p-4">
                      <p className="mb-1 truncate text-xs text-gray-500">{item.store}</p>
                      <h3 className="line-clamp-2 min-h-12 font-medium">{item.title}</h3>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="font-semibold">${item.price.toFixed(2)}</span>
                        <span className="flex items-center gap-1 text-sm text-gray-600">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {item.average_rating}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
