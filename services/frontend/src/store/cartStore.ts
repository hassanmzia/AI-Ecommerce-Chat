import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  couponCode: string | null;
  discount: number;

  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
  setCoupon: (code: string | null, discount: number) => void;
}

const calculateTotals = (items: CartItem[]) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  return { totalItems, totalPrice };
};

const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      totalItems: 0,
      totalPrice: 0,
      couponCode: null,
      discount: 0,

      addItem: (item) =>
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.productId === item.productId
          );

          let newItems: CartItem[];

          if (existingIndex >= 0) {
            newItems = state.items.map((i, index) =>
              index === existingIndex
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            );
          } else {
            newItems = [...state.items, item];
          }

          return {
            items: newItems,
            ...calculateTotals(newItems),
          };
        }),

      removeItem: (itemId) =>
        set((state) => {
          const newItems = state.items.filter((i) => i.id !== itemId);
          return {
            items: newItems,
            ...calculateTotals(newItems),
          };
        }),

      updateQuantity: (itemId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            const newItems = state.items.filter((i) => i.id !== itemId);
            return {
              items: newItems,
              ...calculateTotals(newItems),
            };
          }

          const newItems = state.items.map((i) =>
            i.id === itemId ? { ...i, quantity } : i
          );
          return {
            items: newItems,
            ...calculateTotals(newItems),
          };
        }),

      clearCart: () =>
        set({
          items: [],
          totalItems: 0,
          totalPrice: 0,
          couponCode: null,
          discount: 0,
        }),

      setItems: (items) =>
        set({
          items,
          ...calculateTotals(items),
        }),

      setCoupon: (code, discount) =>
        set({
          couponCode: code,
          discount,
        }),
    }),
    {
      name: 'cart-storage',
    }
  )
);

export default useCartStore;
