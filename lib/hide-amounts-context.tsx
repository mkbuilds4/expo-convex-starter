import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HIDE_AMOUNTS_KEY = '@fulus/hide-amounts';

type HideAmountsContextValue = {
  hideAmounts: boolean;
  setHideAmounts: (value: boolean) => void;
};

const HideAmountsContext = createContext<HideAmountsContextValue | null>(null);

export function HideAmountsProvider({ children }: { children: ReactNode }) {
  const [hideAmounts, setHideAmountsState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(HIDE_AMOUNTS_KEY).then((stored) => {
      setHideAmountsState(stored === 'true');
    });
  }, []);

  const setHideAmounts = useCallback((value: boolean) => {
    setHideAmountsState(value);
    AsyncStorage.setItem(HIDE_AMOUNTS_KEY, value ? 'true' : 'false');
  }, []);

  return (
    <HideAmountsContext.Provider value={{ hideAmounts, setHideAmounts }}>
      {children}
    </HideAmountsContext.Provider>
  );
}

export function useHideAmounts(): HideAmountsContextValue {
  const ctx = useContext(HideAmountsContext);
  if (!ctx) {
    return {
      hideAmounts: false,
      setHideAmounts: () => {},
    };
  }
  return ctx;
}
