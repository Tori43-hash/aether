import React from 'react';
import { TradeProvider } from '../entities/trades';
import { AuthProvider } from '../features/auth';
import { AppRouter } from './routers';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <TradeProvider>
        <AppRouter />
      </TradeProvider>
    </AuthProvider>
  );
};

App.displayName = 'App';

export default App;