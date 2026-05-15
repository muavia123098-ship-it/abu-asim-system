import React, { useState, useEffect, useRef } from 'react';
import Layout from './Layout';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
  Wallet, Calendar, Download, Filter, ChevronDown, 
  FileText, ArrowUpRight, ArrowDownRight, Copy, X, Check, Award, PieChart, Tag, CreditCard, ChevronLeft, ChevronRight
} from 'lucide-react';
import { db, auth, collection, query, where, onSnapshot, getDocs } from './db';
import { toBlob } from 'html-to-image';

export default function Reports() {
  const [period, setPeriod] = useState('Daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [filteredData, setFilteredData] = useState({ 
    sales: 0, purchases: 0, expenses: 0, profit: 0, 
    orders: 0, productsSold: 0, cashSales: 0, creditSales: 0,
    avgOrder: 0, totalItems: 0
  });
  const [chartData, setChartData] = useState([]);
  const [showSlip, setShowSlip] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const slipRef = useRef(null);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubSales = onSnapshot(query(collection(db, 'sales'), where('userId', '==', user.uid)), (snapshot) => {
      setSales(snapshot.docs.map(d => ({ ...d.data(), date: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date() })));
    });
    
    const unsubPurchases = onSnapshot(query(collection(db, 'purchases'), where('userId', '==', user.uid)), (snapshot) => {
      setPurchases(snapshot.docs.map(d => ({ ...d.data(), date: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date() })));
    });

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), where('userId', '==', user.uid)), (snapshot) => {
      setExpenses(snapshot.docs.map(d => ({ ...d.data(), date: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date() })));
    });

    return () => {
      unsubSales();
      unsubPurchases();
      unsubExpenses();
    };
  }, []);

  useEffect(() => {
    calculateStats();
  }, [period, selectedDate, selectedMonth, selectedYear, sales, purchases, expenses]);

  const calculateStats = () => {
    let startDate, endDate;

    if (period === 'Daily') {
      startDate = new Date(selectedDate);
      startDate.setHours(0,0,0,0);
      endDate = new Date(selectedDate);
      endDate.setHours(23,59,59,999);
    } else if (period === 'Monthly') {
      startDate = new Date(selectedYear, selectedMonth, 1);
      endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
    } else {
      startDate = new Date(selectedYear, 0, 1);
      endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
    }

    const fSales = sales.filter(s => s.date >= startDate && s.date <= endDate);
    const fPurchases = purchases.filter(p => p.date >= startDate && p.date <= endDate);
    const fExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);

    const totalSales = fSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const cashSales = fSales.filter(s => s.paymentMethod === 'Cash').reduce((sum, s) => sum + (s.total || 0), 0);
    const totalPurchases = fPurchases.reduce((sum, p) => sum + (p.totalCost || 0), 0);
    const totalExpenses = fExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const profit = fSales.reduce((sum, s) => sum + (s.profit || 0), 0) - totalExpenses;
    const orders = fSales.length;
    const totalItems = fSales.reduce((sum, s) => sum + (s.items?.reduce((iq, item) => iq + (item.quantity || 0), 0) || 0), 0);
    const avgOrder = orders > 0 ? totalSales / orders : 0;

    setFilteredData({ 
      sales: totalSales, purchases: totalPurchases, expenses: totalExpenses, profit, 
      orders, productsSold: fSales.reduce((sum, s) => sum + (s.items?.length || 0), 0),
      cashSales, creditSales: totalSales - cashSales, avgOrder, totalItems
    });

    // Chart Data logic
    const data = [];
    if (period === 'Daily') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(startDate);
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString([], { weekday: 'short' });
        const dSales = sales.filter(s => s.date?.toDateString() === d.toDateString()).reduce((sum, s) => sum + s.total, 0);
        const dExpenses = expenses.filter(e => e.date?.toDateString() === d.toDateString()).reduce((sum, e) => sum + parseFloat(e.amount), 0);
        data.push({ name: label, sales: dSales, expenses: dExpenses });
      }
    } else if (period === 'Monthly') {
      for (let i = 1; i <= endDate.getDate(); i += 5) {
        const d = new Date(selectedYear, selectedMonth, i);
        const label = `Day ${i}`;
        const dSales = sales.filter(s => s.date.getMonth() === selectedMonth && s.date.getDate() >= i && s.date.getDate() < i + 5).reduce((sum, s) => sum + s.total, 0);
        data.push({ name: label, sales: dSales });
      }
    } else {
      months.forEach((m, i) => {
        const mSales = sales.filter(s => s.date.getFullYear() === selectedYear && s.date.getMonth() === i).reduce((sum, s) => sum + s.total, 0);
        data.push({ name: m.slice(0, 3), sales: mSales });
      });
    }
    setChartData(data);
  };

  const copySlip = async () => {
    if (!slipRef.current) return;
    try {
      const blob = await toBlob(slipRef.current, { backgroundColor: '#ffffff', pixelRatio: 3 });
      const item = new ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) { alert("Copy failed."); }
  };

  return (
    <Layout>
      <div style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
        
        {/* Advanced Filter Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800' }}>{period} Performance</h1>
            <p style={{ color: 'var(--text-muted)' }}>Historical data for {period === 'Daily' ? selectedDate : period === 'Monthly' ? `${months[selectedMonth]} ${selectedYear}` : selectedYear}</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
            <div className="glass-panel" style={{ display: 'flex', padding: '0.3rem', gap: '0.3rem', borderRadius: '12px' }}>
              {['Daily', 'Monthly', 'Yearly'].map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{ 
                  padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  backgroundColor: period === p ? 'var(--primary)' : 'transparent',
                  color: period === p ? 'white' : 'var(--text-muted)',
                  fontWeight: '600', transition: '0.3s'
                }}>{p}</button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {period === 'Daily' && (
                <input type="date" className="input-field" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              )}
              {period === 'Monthly' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select className="input-field" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                    {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                  <select className="input-field" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              )}
              {period === 'Yearly' && (
                <select className="input-field" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
              {period === 'Daily' && (
                <button className="btn-primary" onClick={() => setShowSlip(true)} style={{ padding: '0.7rem 1rem' }}>
                  <Award size={18} /> Slip
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Summary Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', borderBottom: '4px solid var(--primary)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Revenue</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>PKR {filteredData.sales.toLocaleString()}</div>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem', borderBottom: '4px solid #a855f7' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Items Sold</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{filteredData.totalItems} Units</div>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem', borderBottom: '4px solid var(--danger)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Expenses</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>PKR {filteredData.expenses.toLocaleString()}</div>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem', borderBottom: '4px solid var(--success)', backgroundColor: 'rgba(34, 197, 94, 0.05)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Net Profit</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--success)' }}>PKR {filteredData.profit.toLocaleString()}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 2rem 0', fontSize: '1.2rem' }}>Revenue Trend ({period})</h3>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#666'}} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="var(--primary)" fill="url(#colorSales)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* VIP Summary Slip Modal */}
        {showSlip && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div ref={slipRef} style={{ width: '300px', backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', color: '#000' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
                <img src="/logo.png" style={{ width: '60px', height: 'auto', marginBottom: '0.5rem', objectFit: 'contain' }} />
                <h2 style={{ fontSize: '1.1rem', margin: 0, letterSpacing: '1px', fontWeight: '800' }}>ABU ASIM</h2>
                <div style={{ fontSize: '0.65rem', color: '#956e36', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 'bold' }}>Perfumery</div>
                <div style={{ fontSize: '0.75rem', fontWeight: '900', marginTop: '0.8rem' }}>{new Date(selectedDate).toLocaleDateString('en-PK', { dateStyle: 'full' })}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#666' }}>Sales</span>
                  <span style={{ fontWeight: 'bold' }}>PKR {filteredData.sales.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#666' }}>Cash</span>
                  <span style={{ color: '#956e36', fontWeight: 'bold' }}>PKR {filteredData.cashSales.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#666' }}>Expenses</span>
                  <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>PKR {filteredData.expenses.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#666' }}>Orders</span>
                  <span style={{ fontWeight: 'bold' }}>{filteredData.orders}</span>
                </div>
                <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                  <div style={{ color: '#166534', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Profit</div>
                  <div style={{ color: '#166534', fontSize: '1.4rem', fontWeight: '900' }}>PKR {filteredData.profit.toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button onClick={() => setShowSlip(false)} className="btn-primary" style={{ backgroundColor: 'transparent', border: '1px solid #444', color: '#888' }}>Discard</button>
              <button onClick={copySlip} className="btn-primary" style={{ backgroundColor: '#956e36' }}>
                {copySuccess ? <Check size={18} /> : <Copy size={18} />} {copySuccess ? 'Copied' : 'Share'}
              </button>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
