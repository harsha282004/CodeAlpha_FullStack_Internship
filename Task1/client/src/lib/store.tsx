import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { authApi, clearToken, getToken, setToken, type Product, type User } from "@/lib/api";

export type { Product, User };
export type CartItem = Pick<Product, "slug" | "name" | "price" | "imageUrl" | "stock"> & { productId: string; quantity: number };

const CART_STORAGE_KEY = "shopsphere_cart";

function loadCart(): CartItem[] {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CartItem =>
        !!item &&
        typeof item === "object" &&
        typeof (item as CartItem).productId === "string" &&
        typeof (item as CartItem).quantity === "number" &&
        (item as CartItem).quantity > 0,
    );
  } catch {
    return [];
  }
}

type StoreValue = {
  cart: CartItem[];
  cartCount: number;
  user: User | null;
  authLoading: boolean;
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    setCart(loadCart());
    setCartHydrated(true);

    const token = getToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }

    authApi
      .me()
      .then((restoredUser) => setUser(restoredUser))
      .catch(() => {
        // Invalid/expired token - clear it silently rather than showing an error on load.
        clearToken();
        setUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    // Skip until the initial load-from-storage effect above has run - otherwise this
    // fires in the same commit with the pre-load `cart` value ([]) and clobbers whatever
    // was actually saved before this mount (most visible under StrictMode's double effects).
    if (!cartHydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // localStorage may be unavailable - cart just won't persist across reloads.
    }
  }, [cart, cartHydrated]);

  const addToCart = (product: Product, quantity = 1) => {
    setCart((items) => {
      const existing = items.find((item) => item.productId === product.id);
      const currentQuantity = existing?.quantity ?? 0;
      const maxAddable = Math.max(product.stock - currentQuantity, 0);
      const quantityToAdd = Math.min(quantity, maxAddable);

      if (quantityToAdd <= 0) {
        toast.error(`${product.name} is out of stock`);
        return items;
      }

      if (quantityToAdd < quantity) {
        toast.info(`Only ${quantityToAdd} more ${product.name} available - cart updated`);
      } else {
        toast.success(`${product.name} added to cart`);
      }

      if (existing) {
        return items.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + quantityToAdd, stock: product.stock } : item,
        );
      }
      return [
        ...items,
        { productId: product.id, slug: product.slug, name: product.name, price: product.price, imageUrl: product.imageUrl, quantity: quantityToAdd, stock: product.stock },
      ];
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    setCart((items) =>
      items.map((item) => {
        if (item.productId !== id) return item;
        const upperBound = Math.max(item.stock, 1);
        const clamped = Math.min(Math.max(Math.trunc(quantity) || 1, 1), upperBound);
        return { ...item, quantity: clamped };
      }),
    );
    toast.success("Quantity updated");
  };

  const removeFromCart = (id: string) => {
    setCart((items) => items.filter((item) => item.productId !== id));
    toast.success("Product removed");
  };

  const signIn = async (email: string, password: string) => {
    const { user: loggedInUser, token } = await authApi.login(email, password);
    setToken(token);
    setUser(loggedInUser);
  };

  const register = async (name: string, email: string, password: string) => {
    const { user: newUser, token } = await authApi.register(name, email, password);
    setToken(token);
    setUser(newUser);
  };

  const signOut = () => {
    clearToken();
    setUser(null);
    toast.success("Signed out");
  };

  const value = useMemo(
    () => ({
      cart,
      cartCount: cart.reduce((sum, item) => sum + item.quantity, 0),
      user,
      authLoading,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart: () => setCart([]),
      signIn,
      register,
      signOut,
    }),
    [cart, user, authLoading],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}

// Display-only conversion: the backend stores and calculates everything in USD;
// this fixed rate only controls how prices are formatted on screen.
const USD_TO_INR_RATE = 83;

export function money(usdValue: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    usdValue * USD_TO_INR_RATE,
  );
}
