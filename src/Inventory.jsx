import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { 
  Package, Search, Filter, AlertTriangle, CheckCircle2, 
  XCircle, ArrowDown, ArrowUp, RefreshCw 
} from 'lucide-react';
import { db, auth, collection, onSnapshot, query, where } from './db';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, 'products'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  const getStatus = (stock, minStock) => {
    if (stock <= 0) return { label: 'Out of Stock', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: <XCircle size={14} /> };
    if (stock <= minStock) return { label: 'Low Stock', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: <AlertTriangle size={14} /> };
    return { label: 'In Stock', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: <CheckCircle2 size={14} /> };
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const status = getStatus(p.stock, p.minStock).label;
    const matchesFilter = filterStatus === 'All' || status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <Layout>
      <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>Stock Inventory</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem' }}>Real-time monitoring of all fragrance items.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <div className="glass-panel" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
              <ArrowUp size={16} /> <span>Stock Added: Today</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search items by name..." 
              className="input-field" 
              style={{ width: '100%', paddingLeft: '2.8rem', borderRadius: '12px' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="input-field" style={{ width: '180px', borderRadius: '12px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option>All</option>
            <option>In Stock</option>
            <option>Low Stock</option>
            <option>Out of Stock</option>
          </select>
        </div>

        {/* Inventory List */}
        <div className="glass-panel" style={{ padding: '1rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <th style={{ padding: '1rem' }}>PRODUCT NAME</th>
                <th style={{ padding: '1rem' }}>CURRENT STOCK</th>
                <th style={{ padding: '1rem' }}>MIN. LEVEL</th>
                <th style={{ padding: '1rem' }}>STATUS</th>
                <th style={{ padding: '1rem' }}>INVENTORY HEALTH</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const status = getStatus(p.stock, p.minStock);
                const progress = Math.min((p.stock / (p.minStock * 5)) * 100, 100);
                
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem', transition: 'background 0.2s' }}>
                    <td style={{ padding: '1.2rem 1rem' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.brand} | {p.volume}ml</div>
                    </td>
                    <td style={{ padding: '1.2rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '1rem' }}>
                         <Package size={16} color="var(--text-muted)" /> {p.stock}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1rem', color: 'var(--text-muted)' }}>{p.minStock}</td>
                    <td style={{ padding: '1.2rem 1rem' }}>
                      <div style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.4rem', 
                        padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
                        color: status.color, backgroundColor: status.bg, width: 'fit-content'
                      }}>
                        {status.icon} {status.label}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1rem' }}>
                       <div style={{ width: '150px', height: '8px', backgroundColor: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${progress}%`, backgroundColor: status.color, transition: 'width 0.5s ease-out' }}></div>
                       </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RefreshCw size={32} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                    <p>No inventory data found matching your filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </Layout>
  );
}
