export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  isActive: boolean;
  isNewArrival: boolean;
  stock: number;
  createdAt: string;
  suggestedByDS?: boolean;
}

export interface SearchLog {
  id: string;
  userId: string;
  query: string;
  searchType: 'text' | 'image';
  results: string[];
  timestamp: string;
  wasMatch: boolean;
  userFeedback?: string;
}

export interface ModelMetrics {
  id: string;
  modelVersion: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingDate: string;
  status: 'training' | 'completed' | 'failed';
}

export interface DSAccount {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  isActive: boolean;
}

// Initialize mock data in localStorage
export function initializeMockData() {
  if (!localStorage.getItem('products')) {
    const products: Product[] = [
      {
        id: '1',
        name: 'Alpha Bravo Backpack',
        category: 'Backpacks',
        price: 395,
        image: 'https://images.unsplash.com/photo-1682316967717-16b32a406559?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXNpZ25lciUyMGJhY2twYWNrJTIwbGVhdGhlcnxlbnwxfHx8fDE3NzU0OTA3NzF8MA&ixlib=rb-4.1.0&q=80&w=1080',
        description: 'Premium leather backpack with laptop compartment',
        isActive: true,
        isNewArrival: true,
        stock: 15,
        createdAt: '2026-03-15',
        suggestedByDS: false,
      },
      {
        id: '2',
        name: 'International Carry-On',
        category: 'Luggage',
        price: 695,
        image: 'https://images.unsplash.com/photo-1731952161702-3c15716ce06e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXJyeSUyMG9uJTIwbHVnZ2FnZSUyMGNhYmlufGVufDF8fHx8MTc3NTQ5MDc3M3ww&ixlib=rb-4.1.0&q=80&w=1080',
        description: 'Expandable carry-on with TSA lock',
        isActive: true,
        isNewArrival: false,
        stock: 8,
        createdAt: '2026-02-10',
        suggestedByDS: false,
      },
      {
        id: '3',
        name: 'Executive Briefcase',
        category: 'Briefcases',
        price: 545,
        image: 'https://images.unsplash.com/photo-1770844063638-19e37f8c42eb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGJyaWVmY2FzZSUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NzU0OTA3NzJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
        description: 'Professional briefcase with organizational pockets',
        isActive: true,
        isNewArrival: false,
        stock: 12,
        createdAt: '2026-01-20',
        suggestedByDS: true,
      },
      {
        id: '4',
        name: 'Meridian Duffle',
        category: 'Duffles',
        price: 425,
        image: 'https://images.unsplash.com/photo-1772506715023-7e1586e2f4aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBiYWclMjBkdWZmbGV8ZW58MXx8fHwxNzc1NDkwNzcyfDA&ixlib=rb-4.1.0&q=80&w=1080',
        description: 'Spacious duffle with adjustable strap',
        isActive: true,
        isNewArrival: true,
        stock: 20,
        createdAt: '2026-03-25',
        suggestedByDS: false,
      },
      {
        id: '5',
        name: 'V4 Extended Trip Packing Case',
        category: 'Luggage',
        price: 895,
        image: 'https://images.unsplash.com/photo-1613255347963-408b0deb3633?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwc3VpdGNhc2UlMjB0cmF2ZWx8ZW58MXx8fHwxNzc1NDkwNzcxfDA&ixlib=rb-4.1.0&q=80&w=1080',
        description: 'Large capacity suitcase with 4-wheel system',
        isActive: true,
        isNewArrival: false,
        stock: 5,
        createdAt: '2026-01-05',
        suggestedByDS: false,
      },
      {
        id: '6',
        name: 'Voyageur Compact Carry-On',
        category: 'Luggage',
        price: 575,
        image: 'https://images.unsplash.com/photo-1673505705678-6d3cda1d69da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBsdWdnYWdlJTIwYmxhY2t8ZW58MXx8fHwxNzc1NDkwNzcxfDA&ixlib=rb-4.1.0&q=80&w=1080',
        description: 'Lightweight carry-on with premium finish',
        isActive: false,
        isNewArrival: false,
        stock: 0,
        createdAt: '2025-12-10',
        suggestedByDS: false,
      },
    ];
    localStorage.setItem('products', JSON.stringify(products));
  }

  if (!localStorage.getItem('searchLogs')) {
    const searchLogs: SearchLog[] = [
      {
        id: '1',
        userId: '3',
        query: 'black backpack',
        searchType: 'text',
        results: ['1'],
        timestamp: '2026-04-05T10:30:00',
        wasMatch: true,
      },
      {
        id: '2',
        userId: '3',
        query: 'carry on luggage',
        searchType: 'text',
        results: ['2', '6'],
        timestamp: '2026-04-05T11:15:00',
        wasMatch: true,
        userFeedback: 'Great results!',
      },
      {
        id: '3',
        userId: '3',
        query: 'red suitcase',
        searchType: 'text',
        results: [],
        timestamp: '2026-04-05T14:20:00',
        wasMatch: false,
      },
      {
        id: '4',
        userId: '3',
        query: 'business bag',
        searchType: 'image',
        results: ['3'],
        timestamp: '2026-04-06T09:45:00',
        wasMatch: true,
      },
    ];
    localStorage.setItem('searchLogs', JSON.stringify(searchLogs));
  }

  if (!localStorage.getItem('modelMetrics')) {
    const modelMetrics: ModelMetrics[] = [
      {
        id: '1',
        modelVersion: 'v1.0.0',
        accuracy: 0.87,
        precision: 0.85,
        recall: 0.82,
        f1Score: 0.83,
        trainingDate: '2026-03-01',
        status: 'completed',
      },
      {
        id: '2',
        modelVersion: 'v1.1.0',
        accuracy: 0.91,
        precision: 0.89,
        recall: 0.88,
        f1Score: 0.88,
        trainingDate: '2026-03-20',
        status: 'completed',
      },
      {
        id: '3',
        modelVersion: 'v1.2.0',
        accuracy: 0.0,
        precision: 0.0,
        recall: 0.0,
        f1Score: 0.0,
        trainingDate: '2026-04-06',
        status: 'training',
      },
    ];
    localStorage.setItem('modelMetrics', JSON.stringify(modelMetrics));
  }

  if (!localStorage.getItem('dsAccounts')) {
    const dsAccounts: DSAccount[] = [
      {
        id: '2',
        email: 'ds@shop.com',
        name: 'Data Scientist',
        createdAt: '2026-01-01',
        isActive: true,
      },
    ];
    localStorage.setItem('dsAccounts', JSON.stringify(dsAccounts));
  }
}

// Helper functions for data management
export function getProducts(): Product[] {
  const data = localStorage.getItem('products');
  return data ? JSON.parse(data) : [];
}

export function saveProducts(products: Product[]) {
  localStorage.setItem('products', JSON.stringify(products));
}

export function getSearchLogs(): SearchLog[] {
  const data = localStorage.getItem('searchLogs');
  return data ? JSON.parse(data) : [];
}

export function saveSearchLogs(logs: SearchLog[]) {
  localStorage.setItem('searchLogs', JSON.stringify(logs));
}

export function getModelMetrics(): ModelMetrics[] {
  const data = localStorage.getItem('modelMetrics');
  return data ? JSON.parse(data) : [];
}

export function saveModelMetrics(metrics: ModelMetrics[]) {
  localStorage.setItem('modelMetrics', JSON.stringify(metrics));
}

export function getDSAccounts(): DSAccount[] {
  const data = localStorage.getItem('dsAccounts');
  return data ? JSON.parse(data) : [];
}

export function saveDSAccounts(accounts: DSAccount[]) {
  localStorage.setItem('dsAccounts', JSON.stringify(accounts));
}
