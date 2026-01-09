import React from 'react';
import { TradeProvider } from '../entities/trade';
import { AppRouter } from './routers';

const App: React.FC = () => {
  return (
    <TradeProvider>
      <AppRouter />
    </TradeProvider>
  );
};

App.displayName = 'App';

export default App;