import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Bug,
  Image as ImageIcon,
  Loader2,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  Upload,
  X,
} from 'lucide-react';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import {
  getProductMetadata,
  getSimilarProducts,
  searchProductsByImage,
  searchProducts,
  submitFeedback,
  type Product,
  type ProductMetadata,
  type SearchOptions,
  type SearchResult,
  type SearchType,
} from '../utils/api';

type CartItem = {
  product: Product;
  quantity: number;
};

const categoryChips = [
  { id: 'all', label: 'All', query: 'fashion essentials' },
  { id: 'women', label: 'Women', query: 'women fashion' },
  { id: 'men', label: 'Men', query: 'men fashion' },
  { id: 'shoes', label: 'Shoes', query: 'comfortable shoes' },
  { id: 'watches', label: 'Watches', query: 'watches' },
  { id: 'bags', label: 'Bags', query: 'bags handbags backpacks' },
  { id: 'jewelry', label: 'Jewelry', query: 'jewelry accessories' },
  { id: 'activewear', label: 'Activewear', query: 'activewear running workout' },
  { id: 'deals', label: 'Deals', query: 'affordable fashion under 25' },
  { id: 'top-rated', label: 'Top Rated', query: 'best rated fashion' },
];

const discoveryRails: Array<{
  id: string;
  title: string;
  query: string;
  options: SearchOptions;
}> = [
  { id: 'trending', title: 'Trending Finds', query: 'popular fashion accessories', options: {} },
  { id: 'deals', title: 'Under $25', query: 'affordable fashion', options: { max_price: 25 } },
  { id: 'top-rated', title: 'Top Rated Picks', query: 'quality fashion', options: { min_rating: 4.5 } },
  { id: 'shoes', title: 'Shoes Worth Trying', query: 'comfortable shoes sneakers sandals', options: { category_intent: 'shoes' } },
  { id: 'watches', title: 'Watches & Everyday Detail', query: 'watches wristwatch', options: { category_intent: 'watches' } },
  { id: 'bags', title: 'Bags For The Day', query: 'bags purse backpack handbag', options: { category_intent: 'bags' } },
];

const SEARCH_PAGE_SIZE = 100;

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`;
}

function getHighlights(product: Product) {
  return product.description
    .split(/\n|\. /)
    .map((part) => part.trim().replace(/\.$/, ''))
    .filter((part) => part.length > 18 && part.length < 150)
    .slice(0, 4);
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

export default function UserShopPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState<SearchType>('text');
  const [products, setProducts] = useState<Product[]>([]);
  const [metadata, setMetadata] = useState<ProductMetadata | null>(null);
  const [rails, setRails] = useState<Record<string, Product[]>>({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [minRating, setMinRating] = useState(0);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [showSearchDebug, setShowSearchDebug] = useState(false);
  const [lastSearchParams, setLastSearchParams] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [isHomeLoading, setIsHomeLoading] = useState(true);
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [isSimilarLoading, setIsSimilarLoading] = useState(false);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  const [uploadedImageName, setUploadedImageName] = useState('');

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const activeOptions = useMemo<SearchOptions>(() => {
    const options: SearchOptions = {
      category_intent: selectedCategory === 'all' ? undefined : selectedCategory,
      limit: SEARCH_PAGE_SIZE,
    };
    if (typeof maxPrice === 'number') options.max_price = maxPrice;
    if (minRating > 0) options.min_rating = minRating;
    return options;
  }, [maxPrice, minRating, selectedCategory]);

  useEffect(() => {
    loadHomepage();
  }, []);

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
      setSelectedCategory('all');
      performSearch(query, 'text', { category_intent: undefined });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedProduct) {
      setSimilarProducts([]);
      return;
    }

    setIsSimilarLoading(true);
    getSimilarProducts(selectedProduct.id, 12)
      .then(setSimilarProducts)
      .catch(() => setSimilarProducts([]))
      .finally(() => setIsSimilarLoading(false));
  }, [selectedProduct]);

  const loadHomepage = async () => {
    setIsHomeLoading(true);
    try {
      const [meta, railResults] = await Promise.all([
        getProductMetadata(),
        Promise.all(
          discoveryRails.map((rail) =>
            searchProducts(rail.query, 'text', {
              ...rail.options,
              limit: 8,
              skip_parse: true,
            })
          )
        ),
      ]);
      setMetadata(meta);
      setRails(
        discoveryRails.reduce<Record<string, Product[]>>((acc, rail, index) => {
          acc[rail.id] = railResults[index].products;
          return acc;
        }, {})
      );
      setProducts(railResults[0]?.products ?? []);
    } catch (err) {
      console.error('Failed to load storefront:', err);
      toast.error('Failed to load storefront. Is the backend running?');
    } finally {
      setIsHomeLoading(false);
    }
  };

  const performSearch = async (
    query: string,
    type: SearchType,
    overrides: SearchOptions = {},
    append = false
  ) => {
    const trimmedQuery = query.trim();
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setHasMoreResults(false);
    }
    setHasSearched(true);

    try {
      const result: SearchResult = await searchProducts(trimmedQuery, type, {
        ...activeOptions,
        offset: append ? products.length : 0,
        ...overrides,
      });
      setProducts((current) => {
        if (!append) return result.products;
        const seen = new Set(current.map((product) => product.id));
        return [
          ...current,
          ...result.products.filter((product) => !seen.has(product.id)),
        ];
      });
      setCurrentSearchId(result.search_id);
      setLastSearchParams(result.search_params);
      setHasMoreResults(result.has_more);
    } catch (err: any) {
      console.error('Search failed:', err);
      toast.error(err.message || 'Search failed');
      if (!append) {
        setProducts([]);
        setLastSearchParams(null);
      }
    } finally {
      if (append) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  const performImageSearch = async (
    file: File,
    overrides: SearchOptions = {},
    append = false
  ) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setHasMoreResults(false);
    }
    setHasSearched(true);

    try {
      const result = await searchProductsByImage(file, {
        ...activeOptions,
        offset: append ? products.length : 0,
        ...overrides,
      });
      setProducts((current) => {
        if (!append) return result.products;
        const seen = new Set(current.map((product) => product.id));
        return [
          ...current,
          ...result.products.filter((product) => !seen.has(product.id)),
        ];
      });
      setCurrentSearchId(result.search_id);
      setLastSearchParams(result.search_params);
      setHasMoreResults(result.has_more);
    } catch (err: any) {
      console.error('Image search failed:', err);
      toast.error(err.message || 'Image search failed');
      if (!append) {
        setProducts([]);
        setLastSearchParams(null);
      }
    } finally {
      if (append) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedCategory('all');
    if (searchType === 'image') {
      if (!uploadedImageFile) {
        fileInputRef.current?.click();
        return;
      }
      performImageSearch(uploadedImageFile, { category_intent: undefined });
      return;
    }
    performSearch(searchQuery, searchType, { category_intent: undefined });
  };

  const handleCategoryClick = (categoryId: string) => {
    const category = categoryChips.find((item) => item.id === categoryId);
    if (!category) return;
    setSelectedCategory(category.id);
    setSearchType('text');
    setSearchQuery(category.id === 'all' ? '' : category.query);
    performSearch(category.query, 'text', {
      category_intent: category.id === 'all' ? undefined : category.id,
      skip_parse: true,
    });
  };

  const handleLoadMore = () => {
    if (searchType === 'image' && uploadedImageFile) {
      performImageSearch(
        uploadedImageFile,
        {
          limit: SEARCH_PAGE_SIZE,
          offset: products.length,
        },
        true
      );
      return;
    }

    performSearch(
      searchQuery || 'fashion essentials',
      searchType === 'clip_text' ? 'clip_text' : 'text',
      {
        limit: SEARCH_PAGE_SIZE,
        offset: products.length,
      },
      true
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImageFile(file);
      setUploadedImageName(file.name);
      setSearchType('image');
      setSelectedCategory('all');
      performImageSearch(file, { category_intent: undefined });
    }
  };

  const handleSubmitFeedback = async () => {
    if (feedback.trim() && currentSearchId) {
      try {
        await submitFeedback(currentSearchId, feedback);
        toast.success('Thank you for your feedback!');
        setShowFeedbackDialog(false);
        setFeedback('');
      } catch (err) {
        console.error('Feedback submission failed:', err);
        toast.error('Failed to submit feedback');
      }
    }
  };

  const addToCart = (product: Product) => {
    setCart((current) => ({
      ...current,
      [product.id]: {
        product,
        quantity: (current[product.id]?.quantity ?? 0) + 1,
      },
    }));
    toast.success(`${product.title.slice(0, 48)} added to cart`);
  };

  const changeQuantity = (productId: string, delta: number) => {
    setCart((current) => {
      const item = current[productId];
      if (!item) return current;
      const nextQuantity = item.quantity + delta;
      if (nextQuantity <= 0) {
        const next = { ...current };
        delete next[productId];
        return next;
      }
      return { ...current, [productId]: { ...item, quantity: nextQuantity } };
    });
  };

  const checkout = () => {
    setCart({});
    setShowCart(false);
    toast.success('Purchase demo complete');
  };

  const renderProductCard = (product: Product, compact = false) => (
    <motion.div
      key={product.id}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="group h-full cursor-pointer overflow-hidden border-gray-200 transition hover:-translate-y-0.5 hover:shadow-lg"
        onClick={() => setSelectedProduct(product)}
      >
        <CardContent className="p-0">
          <div className="relative aspect-square bg-gray-100">
            <ProductImage
              product={product}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
            {product.similarity_score != null && product.similarity_score > 0 && (
              <Badge className="absolute left-3 top-3 bg-black/75 text-white">
                {(product.similarity_score * 100).toFixed(0)}% match
              </Badge>
            )}
            <Button
              size="sm"
              className="absolute bottom-3 right-3 bg-white text-black shadow-sm hover:bg-emerald-50"
              onClick={(event) => {
                event.stopPropagation();
                addToCart(product);
              }}
            >
              <ShoppingBag className="mr-1.5 h-4 w-4" />
              Add
            </Button>
          </div>
          <div className={compact ? 'p-3' : 'p-4'}>
            <p className="mb-1 truncate text-xs text-gray-500">{product.store}</p>
            <h3 className="line-clamp-2 min-h-12 font-medium leading-snug">
              {product.title}
            </h3>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-lg font-semibold">{formatPrice(product.price)}</p>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>{product.average_rating}</span>
                {!compact && (
                  <span className="text-gray-400">({product.rating_number})</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="border-b bg-[#f7f8f3]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-14">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-emerald-700">
              <Sparkles className="h-4 w-4" />
              AI-powered product discovery
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-gray-950 md:text-5xl">
              Find fashion products by saying what you actually mean.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-gray-600">
              Search by occasion, budget, rating, material, or style across the product catalog.
            </p>

            <form onSubmit={handleSearch} className="mt-8 rounded-lg border bg-white p-3 shadow-sm">
              <div className="mb-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={searchType === 'text' ? 'default' : 'outline'}
                  onClick={() => setSearchType('text')}
                  className={searchType === 'text' ? 'bg-black hover:bg-gray-800' : ''}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Text
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={searchType === 'clip_text' ? 'default' : 'outline'}
                  onClick={() => setSearchType('clip_text')}
                  className={searchType === 'clip_text' ? 'bg-black hover:bg-gray-800' : ''}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Visual Text
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={searchType === 'image' ? 'default' : 'outline'}
                  onClick={() => {
                    setSearchType('image');
                    fileInputRef.current?.click();
                  }}
                  className={searchType === 'image' ? 'bg-black hover:bg-gray-800' : ''}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Image
                </Button>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                {searchType !== 'image' ? (
                  <Input
                    type="text"
                    placeholder={
                      searchType === 'clip_text'
                        ? 'Try: red sneakers with white sole'
                        : 'Try: comfortable running shoes under $40'
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="min-h-11 flex-1"
                  />
                ) : (
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      value={uploadedImageName || 'Upload an image to search'}
                      readOnly
                      className="min-h-11 pr-10"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                )}
                <Button type="submit" className="min-h-11 bg-black hover:bg-gray-800" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Search
                </Button>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap gap-2">
              {['running shoes under $40', 'top rated watches', 'work bag for travel'].map(
                (prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    className="bg-white"
                    onClick={() => {
                      setSearchQuery(prompt);
                      setSelectedCategory('all');
                      setSearchType('text');
                      performSearch(prompt, 'text', { category_intent: undefined });
                    }}
                  >
                    {prompt}
                  </Button>
                )
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden h-[420px] grid-cols-2 grid-rows-2 gap-3 lg:grid xl:h-[460px]"
          >
            {(rails.trending ?? products).slice(0, 3).map((product, index) => (
              <div
                key={product.id}
                className={`min-h-0 overflow-hidden rounded-lg bg-white ${index === 0 ? 'row-span-2' : ''}`}
              >
                <ProductImage product={product} className="h-full w-full object-contain p-2" />
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {categoryChips.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                className={selectedCategory === category.id ? 'bg-black hover:bg-gray-800' : ''}
                onClick={() => handleCategoryClick(category.id)}
              >
                {category.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-end">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 sm:w-32">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </div>
            <label className="flex flex-1 flex-col gap-1 text-sm text-gray-600">
              Max price
              <Input
                type="number"
                min={metadata?.price.min ?? 0}
                max={metadata?.price.max ?? 1000}
                placeholder={
                  metadata ? `Up to $${Math.ceil(metadata.price.max)}` : 'Any price'
                }
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : '')}
                className="h-10"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm text-gray-600">
              Minimum rating
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="h-10 rounded-md border border-input bg-input-background px-3 text-sm"
              >
                <option value={0}>Any rating</option>
                <option value={3}>3.0+</option>
                <option value={4}>4.0+</option>
                <option value={4.5}>4.5+</option>
              </select>
            </label>
            <Button
              variant="outline"
              onClick={() => {
                if (searchType === 'image' && uploadedImageFile) {
                  performImageSearch(uploadedImageFile);
                  return;
                }
                performSearch(searchQuery || 'fashion essentials', searchType);
              }}
              disabled={isLoading}
            >
              Apply
            </Button>
            <Button variant="outline" onClick={() => setShowCart(true)} className="relative">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Cart
              {cartCount > 0 && (
                <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {hasSearched && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              Showing {products.length} result{products.length !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              {lastSearchParams && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSearchDebug((current) => !current)}
                >
                  <Bug className="mr-2 h-4 w-4" />
                  Debug
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowFeedbackDialog(true)}>
                Submit Feedback
              </Button>
            </div>
          </div>
        )}

        {showSearchDebug && lastSearchParams && (
          <div className="mb-6 rounded-lg border bg-gray-950 p-4 text-gray-100">
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-white/10 px-2 py-1">
                Parser: {String(lastSearchParams.parse_source ?? 'unknown')}
              </span>
              <span className="rounded-md bg-white/10 px-2 py-1">
                Retrieval: {String(lastSearchParams.retrieval_source ?? 'unknown')}
              </span>
            </div>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs leading-relaxed">
              {JSON.stringify(lastSearchParams, null, 2)}
            </pre>
          </div>
        )}

        {isLoading || isHomeLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-500">Searching with AI...</span>
          </div>
        ) : hasSearched ? (
          products.length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center text-gray-500">
              No products found matching your search.
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence>{products.map((product) => renderProductCard(product))}</AnimatePresence>
              </div>
              {hasMoreResults && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    className="min-w-40"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="space-y-10">
            {discoveryRails.map((rail) => {
              const railProducts = rails[rail.id] ?? [];
              if (railProducts.length === 0) return null;
              return (
                <section key={rail.id}>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">{rail.title}</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery(rail.query);
                        setSearchType('text');
                        setSelectedCategory(
                          typeof rail.options.category_intent === 'string'
                            ? rail.options.category_intent
                            : 'all'
                        );
                        performSearch(rail.query, 'text', {
                          ...rail.options,
                          skip_parse: true,
                        });
                      }}
                    >
                      View all
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {railProducts.slice(0, 4).map((product) => renderProductCard(product))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <Sheet open={Boolean(selectedProduct)} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selectedProduct && (
            <>
              <SheetHeader className="px-0 pt-0">
                <SheetTitle className="pr-8 text-xl">{selectedProduct.title}</SheetTitle>
                <SheetDescription>{selectedProduct.store}</SheetDescription>
              </SheetHeader>
              <div className="space-y-5">
                <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <ProductImage product={selectedProduct} className="h-full w-full object-cover" />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-2xl font-semibold">{formatPrice(selectedProduct.price)}</p>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span>{selectedProduct.average_rating}</span>
                    <span className="text-gray-400">({selectedProduct.rating_number})</span>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 font-medium">Highlights</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {getHighlights(selectedProduct).map((highlight) => (
                      <li key={highlight} className="rounded-md bg-gray-50 p-3">
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-black hover:bg-gray-800" onClick={() => addToCart(selectedProduct)}>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Add to Cart
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/product/${selectedProduct.id}`)}>
                    Full Detail
                  </Button>
                </div>
                <div>
                  <h3 className="mb-3 font-medium">Similar Products</h3>
                  {isSimilarLoading ? (
                    <div className="flex items-center py-6 text-sm text-gray-500">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Finding close matches...
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {similarProducts.map((product) => renderProductCard(product, true))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={showCart} onOpenChange={setShowCart}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Cart</SheetTitle>
            <SheetDescription>{cartCount} item{cartCount !== 1 ? 's' : ''}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-4">
            {cartItems.length === 0 ? (
              <p className="rounded-lg border border-dashed py-10 text-center text-gray-500">
                Your cart is empty.
              </p>
            ) : (
              cartItems.map((item) => (
                <div key={item.product.id} className="flex gap-3 border-b pb-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100">
                    <ProductImage product={item.product} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium">{item.product.title}</p>
                    <p className="mt-1 text-sm text-gray-600">{formatPrice(item.product.price)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => changeQuantity(item.product.id, -1)}>
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <Button size="sm" variant="outline" onClick={() => changeQuantity(item.product.id, 1)}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => changeQuantity(item.product.id, -item.quantity)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t p-4">
            <div className="mb-4 flex items-center justify-between font-medium">
              <span>Total</span>
              <span>{formatPrice(cartTotal)}</span>
            </div>
            <Button
              className="w-full bg-black hover:bg-gray-800"
              disabled={cartItems.length === 0}
              onClick={checkout}
            >
              Purchase Demo
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Search Feedback</DialogTitle>
            <DialogDescription>
              Help us improve your search experience by sharing your feedback.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Tell us about your search results..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitFeedback} className="bg-black hover:bg-gray-800">
                Submit Feedback
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
