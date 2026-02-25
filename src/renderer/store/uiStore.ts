import { create } from 'zustand';

export type DrawerType = 'invoice' | 'expense' | 'product' | null;

interface UIState {
  sidebarCollapsed: boolean;
  isLoading: boolean;
  activeDrawer: DrawerType;
  notification: {
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setLoading: (loading: boolean) => void;
  openDrawer: (drawer: DrawerType) => void;
  closeDrawer: () => void;
  showNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  clearNotification: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  isLoading: false,
  activeDrawer: null,
  notification: null,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  setLoading: (loading) => set({ isLoading: loading }),

  openDrawer: (drawer) => set({ activeDrawer: drawer }),

  closeDrawer: () => set({ activeDrawer: null }),

  showNotification: (type, message) => {
    set({ notification: { type, message } });

    // Auto-clear after 5 seconds
    setTimeout(() => {
      set((state) => {
        if (state.notification?.message === message) {
          return { notification: null };
        }
        return state;
      });
    }, 5000);
  },

  clearNotification: () => set({ notification: null }),
}));
