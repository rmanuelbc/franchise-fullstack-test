export interface Franchise {
  id: number;
  name: string;
}

export interface Branch {
  id: number;
  franchiseId: number;
  name: string;
}

export interface Product {
  id: number;
  branchId: number;
  name: string;
  stock: number;
}

export interface TopStockProduct {
  branchId: number;
  branchName: string;
  productId: number;
  productName: string;
  stock: number;
}