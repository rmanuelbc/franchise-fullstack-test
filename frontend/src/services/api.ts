import type { Branch, Franchise, Product, TopStockProduct } from '../../types/franchise';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5206/api';

export interface LoginResponse {
  accessToken: string;
  expiresAtUtc: string;
}

let accessToken: string | null = null;

export function setAccessToken(token: string) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

async function authorizedFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(url, { ...init, headers });
  if (response.status === 401 && accessToken) {
    clearAccessToken();
    window.dispatchEvent(new Event('auth-expired'));
  }

  return response;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.errors) {
        const firstKey = Object.keys(errorData.errors)[0];
        if (firstKey && errorData.errors[firstKey]?.length > 0) {
          errorMessage = errorData.errors[firstKey][0];
        }
      }
    } catch {
      // Keep default status message if response is not JSON
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const franchiseApi = {
  login: (username: string, password: string): Promise<LoginResponse> =>
    fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then(handleResponse<LoginResponse>),

  // Franchises
  getFranchises: (): Promise<Franchise[]> =>
    authorizedFetch(`${API_BASE_URL}/franchises`).then(handleResponse<Franchise[]>),

  createFranchise: (name: string): Promise<Franchise> =>
    authorizedFetch(`${API_BASE_URL}/franchises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(handleResponse<Franchise>),

  updateFranchiseName: (franchiseId: number, name: string): Promise<Franchise> =>
    authorizedFetch(`${API_BASE_URL}/franchises/${franchiseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(handleResponse<Franchise>),

  deleteFranchise: (franchiseId: number): Promise<void> =>
    authorizedFetch(`${API_BASE_URL}/franchises/${franchiseId}`, {
      method: 'DELETE',
    }).then(handleResponse<void>),

  getTopStockProducts: (franchiseId: number): Promise<TopStockProduct[]> =>
    authorizedFetch(`${API_BASE_URL}/franchises/${franchiseId}/top-stock-products`).then(
      handleResponse<TopStockProduct[]>
    ),

  // Branches
  getBranches: (franchiseId: number): Promise<Branch[]> =>
    authorizedFetch(`${API_BASE_URL}/franchises/${franchiseId}/branches`).then(handleResponse<Branch[]>),

  createBranch: (franchiseId: number, name: string): Promise<Branch> =>
    authorizedFetch(`${API_BASE_URL}/franchises/${franchiseId}/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(handleResponse<Branch>),

  updateBranchName: (branchId: number, name: string): Promise<Branch> =>
    authorizedFetch(`${API_BASE_URL}/branches/${branchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(handleResponse<Branch>),

  deleteBranch: (branchId: number): Promise<void> =>
    authorizedFetch(`${API_BASE_URL}/branches/${branchId}`, {
      method: 'DELETE',
    }).then(handleResponse<void>),

  // Products
  getProducts: (branchId: number): Promise<Product[]> =>
    authorizedFetch(`${API_BASE_URL}/branches/${branchId}/products`).then(handleResponse<Product[]>),

  createProduct: (branchId: number, name: string, stock: number): Promise<Product> =>
    authorizedFetch(`${API_BASE_URL}/branches/${branchId}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, stock }),
    }).then(handleResponse<Product>),

  updateProductStock: (productId: number, stock: number): Promise<Product> =>
    authorizedFetch(`${API_BASE_URL}/products/${productId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock }),
    }).then(handleResponse<Product>),

  updateProductName: (productId: number, name: string): Promise<Product> =>
    authorizedFetch(`${API_BASE_URL}/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(handleResponse<Product>),

  deleteProduct: (branchId: number, productId: number): Promise<void> =>
    authorizedFetch(`${API_BASE_URL}/branches/${branchId}/products/${productId}`, {
      method: 'DELETE',
    }).then(handleResponse<void>),
};
