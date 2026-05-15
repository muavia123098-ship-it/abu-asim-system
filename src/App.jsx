import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import Suppliers from './Suppliers';
import Products from './Products';
import Inventory from './Inventory';
import Purchases from './Purchases';
import Sales from './Sales';
import Customers from './Customers';
import Expenses from './Expenses';
import Reports from './Reports';
import Employees from './Employees';
import Settings from './Settings';
import SplashScreen from './SplashScreen';
import ErrorBoundary from './ErrorBoundary';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ErrorBoundary>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <div style={{ opacity: showSplash ? 0 : 1, visibility: showSplash ? 'hidden' : 'visible', transition: 'opacity 0.5s ease-in', height: '100vh', width: '100vw' }}>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/products" element={<Products />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Router>
      </div>
    </ErrorBoundary>
  );
}

export default App;
