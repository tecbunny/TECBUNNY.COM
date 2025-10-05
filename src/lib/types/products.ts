// Product system types for variants and options

export interface Product {
  id: string;
  handle: string; // Unique identifier like "del123", "mouse-m16"
  title: string;
  description?: string;
  vendor?: string;
  product_type?: string;
  tags?: string[];
  status: 'active' | 'archived' | 'draft';
  images?: ProductImage[];
  seo_title?: string;
  seo_description?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  options?: ProductOption[];
  variants?: ProductVariant[];
}

export interface ProductImage {
  id?: string;
  url: string;
  alt?: string;
  position?: number;
}

export interface ProductOption {
  id: string;
  product_id: string;
  name: string; // e.g., "Color", "Size", "Material"
  position: number;
  values: string[]; // e.g., ["Black", "White", "Blue"]
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  title?: string;
  sku?: string;
  barcode?: string;
  price: number;
  compare_at_price?: number;
  cost_per_item?: number;
  weight?: number;
  weight_unit?: string;
  inventory_quantity: number;
  inventory_policy: 'deny' | 'continue';
  fulfillment_service: string;
  requires_shipping: boolean;
  taxable: boolean;
  option1?: string; // Value for first option
  option2?: string; // Value for second option  
  option3?: string; // Value for third option
  image_id?: string;
  position: number;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ProductImportRow {
  handle: string;
  title: string;
  description?: string;
  vendor?: string;
  product_type?: string;
  tags?: string;
  entry_type?: 'product' | 'variant'; // Optional field to distinguish
  variant_title?: string;
  variant_sku?: string;
  variant_barcode?: string;
  variant_price?: number;
  variant_compare_price?: number;
  variant_cost?: number;
  variant_weight?: number;
  variant_inventory?: number;
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  option3_name?: string;
  option3_value?: string;
  image_urls?: string;
  status?: string;
}

export interface ProductFormData {
  handle: string;
  title: string;
  description: string;
  vendor: string;
  product_type: string;
  tags: string[];
  status: 'active' | 'archived' | 'draft';
  images: ProductImage[];
  seo_title: string;
  seo_description: string;
  options: {
    name: string;
    values: string[];
  }[];
  variants: {
    title: string;
    sku: string;
    barcode: string;
    price: number;
    compare_at_price: number;
    cost_per_item: number;
    weight: number;
    inventory_quantity: number;
    option1: string;
    option2: string;
    option3: string;
  }[];
}

export interface ProductSearchFilters {
  query?: string;
  vendor?: string;
  product_type?: string;
  status?: string;
  tags?: string[];
  price_min?: number;
  price_max?: number;
  inventory_min?: number;
  sort_by?: 'title' | 'price' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}
