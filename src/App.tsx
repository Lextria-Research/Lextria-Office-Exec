// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { HomeScreen } from './features/home/HomeScreen';
import { DispatchList } from './features/dispatches/DispatchList';
import { AddressBookView } from './features/dispatches/AddressBookView';
import { TimelineEventsPanel } from './features/dispatches/TimelineEventsPanel';
import { PettyCashView } from './features/petty-cash/PettyCashView';
import { CustodyView } from './features/custody/CustodyView';
import { ErrandsView } from './features/errands/ErrandsView';
import { ImportersView } from './features/importers/ImportersView';
import { IntegrationsView } from './features/admin/IntegrationsView';
import { LoginView } from './features/auth/LoginView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 mins
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginView />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<HomeScreen />} />
            <Route path="dispatches" element={<DispatchList />} />
            <Route path="batch" element={<DispatchList />} />
            <Route path="address-book" element={<AddressBookView />} />
            <Route path="timeline" element={<TimelineEventsPanel />} />
            <Route path="petty-cash" element={<PettyCashView />} />
            <Route path="custody" element={<CustodyView />} />
            <Route path="errands" element={<ErrandsView />} />
            <Route path="importers" element={<ImportersView />} />
            <Route path="admin/integrations" element={<IntegrationsView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
