import { create } from 'zustand';

interface UIState {
  walletAddress: string | null;
  funderAddress: string | null;
  selectedMarketId: string | null;
  isDarkMode: boolean;
  isSimulatorOpen: boolean;
  selectedOrderIndex: number | null;
  setWalletAddress: (address: string | null) => void;
  setFunderAddress: (address: string | null) => void;
  setSelectedMarketId: (marketId: string | null) => void;
  toggleDarkMode: () => void;
  setIsSimulatorOpen: (isOpen: boolean) => void;
  setSelectedOrderIndex: (index: number | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  walletAddress: localStorage.getItem('walletAddress') || null,
  funderAddress: localStorage.getItem('funderAddress') || null,
  selectedMarketId: null,
  isDarkMode: localStorage.getItem('darkMode') === 'true',
  isSimulatorOpen: false,
  selectedOrderIndex: null,
  
  setWalletAddress: (address) => {
    if (address) {
      localStorage.setItem('walletAddress', address);
    } else {
      localStorage.removeItem('walletAddress');
    }
    set({ walletAddress: address });
  },

  setFunderAddress: (address) => {
    if (address) {
      localStorage.setItem('funderAddress', address);
    } else {
      localStorage.removeItem('funderAddress');
    }
    set({ funderAddress: address });
  },
  
  setSelectedMarketId: (marketId) => set({ selectedMarketId: marketId }),
  
  toggleDarkMode: () => set((state) => {
    const newMode = !state.isDarkMode;
    localStorage.setItem('darkMode', String(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { isDarkMode: newMode };
  }),
  
  setIsSimulatorOpen: (isOpen) => set({ isSimulatorOpen: isOpen }),
  
  setSelectedOrderIndex: (index) => set({ selectedOrderIndex: index }),
}));
