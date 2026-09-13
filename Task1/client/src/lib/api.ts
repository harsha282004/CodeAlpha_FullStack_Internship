// Thin, typed wrapper around the real Task1 Express/Prisma backend.
// No mock data, no simulated responses - every function here hits a real endpoint.

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:5000/api";
const TOKEN_KEY = "shopsphere_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage may be unavailable (private browsing) - session just won't persist.
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as Record<string, string>) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("Unable to reach the server. Check your connection and try again.", 0);
  }

  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;

  if (!response.ok) {
    const message = payload?.error?.message ?? "Something went wrong. Please try again.";
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

// ---------- Types (mirroring the actual backend response shapes) ----------

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  imageUrl: string;
  createdAt: string;
};

export type ProductListResult = {
  products: Product[];
  meta: { total: number; count: number; page: number; limit: number; totalPages: number };
};

export type Role = "customer" | "admin";
export type User = { id: string; name: string; email: string; role: Role; createdAt: string };

export type ShippingAddress = {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type OrderStatusValue = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

export type Order = {
  id: string;
  status: OrderStatusValue;
  total: number;
  shippingAddress: ShippingAddress;
  createdAt: string;
  items: OrderItem[];
};

export type AdminOrder = Order & { customer: { id: string; name: string; email: string } };

export type AdminStats = { products: number; orders: number; pendingOrders: number; users: number };

// A raw product/order straight off the wire has Decimal fields serialized as strings.
function normalizeProduct(raw: Product & { price: number | string }): Product {
  return { ...raw, price: Number(raw.price) };
}

function normalizeOrderItem(raw: OrderItem & { unitPrice: number | string; subtotal: number | string }): OrderItem {
  return { ...raw, unitPrice: Number(raw.unitPrice), subtotal: Number(raw.subtotal) };
}

function normalizeOrder<T extends Order & { total: number | string }>(raw: T): T {
  return { ...raw, total: Number(raw.total), items: raw.items.map(normalizeOrderItem) };
}

// ---------- Auth ----------

export const authApi = {
  async register(name: string, email: string, password: string) {
    const data = await request<{ user: User; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    return data;
  },
  async login(email: string, password: string) {
    const data = await request<{ user: User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return data;
  },
  async me() {
    const data = await request<{ user: User }>("/auth/me");
    return data.user;
  },
};

// ---------- Products ----------

export const productsApi = {
  async list(params: { search?: string; category?: string; page?: number; limit?: number } = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.category) query.set("category", params.category);
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    const data = await request<ProductListResult>(`/products${qs ? `?${qs}` : ""}`);
    return { ...data, products: data.products.map(normalizeProduct) };
  },
  async get(slug: string) {
    const data = await request<{ product: Product }>(`/products/${encodeURIComponent(slug)}`);
    return normalizeProduct(data.product);
  },
  async create(payload: Omit<Product, "id" | "createdAt">) {
    const data = await request<{ product: Product }>("/products", { method: "POST", body: JSON.stringify(payload) });
    return normalizeProduct(data.product);
  },
  async update(id: string, payload: Partial<Omit<Product, "id" | "createdAt">>) {
    const data = await request<{ product: Product }>(`/products/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return normalizeProduct(data.product);
  },
  async remove(id: string) {
    await request<undefined>(`/products/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};

// ---------- Customer orders ----------

export const ordersApi = {
  async create(payload: { shippingAddress: ShippingAddress; items: { productId: string; quantity: number }[] }) {
    const data = await request<{ order: Order }>("/orders", { method: "POST", body: JSON.stringify(payload) });
    return normalizeOrder(data.order);
  },
  async list() {
    const data = await request<{ orders: Order[] }>("/orders");
    return data.orders.map(normalizeOrder);
  },
  async get(id: string) {
    const data = await request<{ order: Order }>(`/orders/${encodeURIComponent(id)}`);
    return normalizeOrder(data.order);
  },
};

// ---------- Admin ----------

export const adminApi = {
  async stats() {
    const data = await request<{ stats: AdminStats }>("/admin/stats");
    return data.stats;
  },
  async listOrders() {
    const data = await request<{ orders: AdminOrder[] }>("/admin/orders");
    return data.orders.map(normalizeOrder);
  },
  async updateOrderStatus(id: string, status: OrderStatusValue) {
    const data = await request<{ order: AdminOrder }>(`/admin/orders/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    return normalizeOrder(data.order);
  },
  async listUsers() {
    const data = await request<{ users: User[] }>("/admin/users");
    return data.users;
  },
};

export { ApiError };
