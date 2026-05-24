/**
 * API client for the Intelligent Product Search backend.
 * Handles all communication with FastAPI endpoints.
 */

const API_BASE = '/api';

// ============================================================================
// Types
// ============================================================================

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  average_rating: number;
  rating_number: number;
  image_url: string;
  store: string;
  main_category: string;
  similarity_score?: number;
}

export interface ProductMetadata {
  total: number;
  price: {
    min: number;
    max: number;
  };
  rating: {
    min: number;
    max: number;
  };
  category_intents: string[];
}

export interface SearchOptions {
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  category_intent?: string;
  limit?: number;
  offset?: number;
  skip_parse?: boolean;
}

export type SearchType = 'text' | 'clip_text' | 'image';

export interface SearchResult {
  products: Product[];
  search_params: Record<string, unknown>;
  total: number;
  has_more: boolean;
  search_id: string | null;
}

export interface SearchLog {
  id: string;
  query: string;
  search_type: string;
  result_ids: string[];
  result_count: number;
  feedback_text: string;
  was_match: boolean;
  has_feedback: boolean;
  timestamp: string;
  similarity_score?: number;
}

export interface SearchLogStats {
  total: number;
  matched: number;
  mismatched: number;
  with_feedback: number;
  success_rate: number;
}

// ============================================================================
// Product endpoints
// ============================================================================

export async function getProducts(limit = 20): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/products?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch products: ${res.statusText}`);
  const data = await res.json();
  return data.products;
}

export async function getProduct(productId: string): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${encodeURIComponent(productId)}`);
  if (!res.ok) throw new Error(`Failed to fetch product: ${res.statusText}`);
  return res.json();
}

export async function getProductMetadata(): Promise<ProductMetadata> {
  const res = await fetch(`${API_BASE}/products/metadata`);
  if (!res.ok) throw new Error(`Failed to fetch product metadata: ${res.statusText}`);
  return res.json();
}

export async function getSimilarProducts(
  productId: string,
  limit = 8
): Promise<Product[]> {
  const res = await fetch(
    `${API_BASE}/products/${encodeURIComponent(productId)}/similar?limit=${limit}`
  );
  if (!res.ok) throw new Error(`Failed to fetch similar products: ${res.statusText}`);
  const data = await res.json();
  return data.products;
}

// ============================================================================
// Search endpoints
// ============================================================================

export async function searchProducts(
  query: string,
  searchType: SearchType = 'text',
  options: SearchOptions = {}
): Promise<SearchResult> {
  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, search_type: searchType, ...options }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || 'Search failed');
  }
  return res.json();
}

export async function searchProductsByImage(
  image: File,
  options: SearchOptions = {}
): Promise<SearchResult> {
  const form = new FormData();
  form.append('image', image);
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, String(value));
    }
  });

  const res = await fetch(`${API_BASE}/search/image`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || 'Image search failed');
  }
  return res.json();
}

// ============================================================================
// Feedback endpoints
// ============================================================================

export async function submitFeedback(
  searchId: string,
  feedbackText: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ search_id: searchId, feedback_text: feedbackText }),
  });
  if (!res.ok) throw new Error(`Failed to submit feedback: ${res.statusText}`);
}

export async function getFeedbackLogs(
  limit = 100,
  withFeedbackOnly = false
): Promise<{ logs: SearchLog[]; total: number }> {
  const params = new URLSearchParams({
    limit: String(limit),
    with_feedback_only: String(withFeedbackOnly),
  });
  const res = await fetch(`${API_BASE}/feedback?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch feedback: ${res.statusText}`);
  return res.json();
}

// ============================================================================
// Data Scientist endpoints
// ============================================================================

export async function getSearchLogs(
  limit = 100
): Promise<{ logs: SearchLog[]; stats: SearchLogStats }> {
  const res = await fetch(`${API_BASE}/ds/search-logs?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch search logs: ${res.statusText}`);
  return res.json();
}

export async function analyzeSingleFeedback(
  feedbackEntry: SearchLog
): Promise<string> {
  const res = await fetch(`${API_BASE}/ds/analyze-single`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback_entry: feedbackEntry }),
  });
  if (!res.ok) throw new Error(`Analysis failed: ${res.statusText}`);
  const data = await res.json();
  return data.analysis;
}

export async function analyzeBatchFeedback(
  feedbackEntries?: SearchLog[]
): Promise<{ analysis: string; entries_analyzed: number }> {
  const res = await fetch(`${API_BASE}/ds/analyze-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      feedback_entries: feedbackEntries || null,
      fetch_recent: !feedbackEntries,
      limit: 50,
    }),
  });
  if (!res.ok) throw new Error(`Batch analysis failed: ${res.statusText}`);
  return res.json();
}

export async function searchSimilarQueries(
  query: string,
  limit = 10
): Promise<SearchLog[]> {
  const res = await fetch(`${API_BASE}/ds/similar-queries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
  });
  if (!res.ok)
    throw new Error(`Similar query search failed: ${res.statusText}`);
  const data = await res.json();
  return data.results;
}
