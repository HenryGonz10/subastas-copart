import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const empty = {
  itemTypes: [],
  makes: [],
  models: [],
  transmissions: [],
  fuelTypes: [],
  driveTrains: [],
  damageLevels: [],
};

const CatalogContext = createContext({ catalogs: empty, loading: true, reload: () => {} });

export function CatalogProvider({ children }) {
  const [catalogs, setCatalogs] = useState(empty);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(
    () =>
      api
        .catalogs()
        .then(setCatalogs)
        .catch(() => {})
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return <CatalogContext.Provider value={{ catalogs, loading, reload }}>{children}</CatalogContext.Provider>;
}

export const useCatalogs = () => useContext(CatalogContext);
