import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { 
  TrendingUp, DollarSign, ShoppingCart, Package, Users, 
  ArrowUpRight, ArrowDownRight, Calendar, Filter,
  MoreVertical, RefreshCw, AlertCircle, CheckCircle2, Wallet
} from 'lucide-react';
import { db, auth, collection, onSnapshot, query, where, doc, getDocs, orderBy, limit } from './db';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';

export default function Dashboard() {
  const [period, setPeriod] = useState('daily'); // daily, monthly, yearly
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [stats, setStats] = useState({
    totalSales: 0,
    grossProfit: 0,
    totalExpenses: 0,
    totalOrders: 0,
    totalCustomers: 0,
    lowStockCount: 0,
    totalStockValue: 0,
    totalPurchases: 0,
    totalAllPurchases: 0,
    totalCashSales: 0,
    totalCashSalesForPeriod: 0,
    totalAllExpenses: 0,
    totalDue: 0,
    totalAllSalesProfit: 0,
    totalPeriodSalesProfit: 0
  });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    let startDate, endDate;
    if (period === 'daily') {
      const [y, m, d] = selectedDate.split('-').map(Number);
      startDate = new Date(y, m - 1, d, 0, 0, 0, 0);
      endDate = new Date(y, m - 1, d, 23, 59, 59, 999);
    } else if (period === 'monthly') {
      startDate = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
      endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
    } else {
      startDate = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
      endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
    }

    const unsubSales = onSnapshot(query(collection(db, 'sales'), where('userId', '==', user.uid)), (snapshot) => {
      const allSales = snapshot.docs.map(doc => ({ ...doc.data(), date: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date() }));
      
      const filteredSales = allSales.filter(s => s.date >= startDate && s.date <= endDate);
      
      const totalRevenue = filteredSales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
      const allSalesProfit = allSales.reduce((sum, s) => sum + (parseFloat(s.profit) || 0), 0);
      const periodSalesProfit = filteredSales.reduce((sum, s) => sum + (parseFloat(s.profit) || 0), 0);
      
      setStats(prev => ({
        ...prev,
        totalSales: totalRevenue,
        totalOrders: filteredSales.length,
        totalAllSalesProfit: allSalesProfit,
        totalPeriodSalesProfit: periodSalesProfit
      }));

      setRecentSales(filteredSales.sort((a,b) => b.date - a.date).slice(0, 5));

      // Top Products
      const productCounts = {};
      filteredSales.forEach(s => {
        s.items.forEach(item => {
          productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
        });
      });
      setTopProducts(Object.entries(productCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 5));

      // Chart Data
      const chartItems = [];
      if (period === 'daily') {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(startDate);
          d.setDate(d.getDate() - i);
          chartItems.push({ name: days[d.getDay()], date: d.toDateString(), amount: 0 });
        }
        allSales.forEach(s => {
          const item = chartItems.find(c => c.date === s.date.toDateString());
          if (item) item.amount += s.total;
        });
      } else if (period === 'monthly') {
        for (let i = 1; i <= endDate.getDate(); i += 5) {
          chartItems.push({ name: `Day ${i}`, day: i, amount: 0 });
        }
        filteredSales.forEach(s => {
          const item = chartItems.find(c => s.date.getDate() >= c.day && s.date.getDate() < c.day + 5);
          if (item) item.amount += s.total;
        });
      } else {
        months.forEach((m, i) => {
          chartItems.push({ name: m.slice(0, 3), month: i, amount: 0 });
        });
        filteredSales.forEach(s => {
          const item = chartItems.find(c => c.month === s.date.getMonth());
          if (item) item.amount += s.total;
        });
      }
      setSalesData(chartItems);
    });

    const unsubProducts = onSnapshot(query(collection(db, 'products'), where('userId', '==', user.uid)), (snapshot) => {
      const products = snapshot.docs.map(doc => doc.data());
      const low = products.filter(p => p.stock > 0 && p.stock <= p.minStock);
      const out = products.filter(p => p.stock <= 0);
      
      const stockValue = products.reduce((sum, p) => {
        const qty = parseFloat(p.stock) || 0;
        const cost = parseFloat(p.costPrice) || 0;
        return sum + (qty > 0 ? qty * cost : 0);
      }, 0);

      setStats(prev => ({ ...prev, lowStockCount: low.length + out.length, totalStockValue: stockValue }));
      setLowStockProducts([
        ...out.map(p => ({ name: p.name, stock: p.stock, status: 'out' })),
        ...low.map(p => ({ name: p.name, stock: p.stock, status: 'low' }))
      ]);
    });

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), where('userId', '==', user.uid)), (snapshot) => {
      const allExpenses = snapshot.docs.map(doc => ({ ...doc.data(), date: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date() }));
      const filteredExpenses = allExpenses.filter(e => e.date >= startDate && e.date <= endDate);
      const totalExp = filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      setStats(prev => ({ ...prev, totalExpenses: totalExp }));
    });

    const unsubCustomers = onSnapshot(query(collection(db, 'customers'), where('userId', '==', user.uid)), (snapshot) => {
      setStats(prev => ({ ...prev, totalCustomers: snapshot.size }));
      setLoading(false);
    });

    const unsubPurchases = onSnapshot(query(collection(db, 'purchases'), where('userId', '==', user.uid)), (snapshot) => {
      const allPurchases = snapshot.docs.map(doc => {
        const data = doc.data();
        let pDate = new Date();
        if (data.date) {
          const [y, m, d] = data.date.split('-').map(Number);
          pDate = new Date(y, m - 1, d);
        } else if (data.createdAt?.toDate) {
          pDate = data.createdAt.toDate();
        }
        return { ...data, pDate };
      });
      const filteredPurchases = allPurchases.filter(p => p.pDate >= startDate && p.pDate <= endDate);
      const totalPurch = filteredPurchases.reduce((sum, p) => sum + (parseFloat(p.totalCost) || 0), 0);
      const totalAllPurch = allPurchases.reduce((sum, p) => sum + (parseFloat(p.totalCost) || 0), 0);
      setStats(prev => ({ ...prev, totalPurchases: totalPurch, totalAllPurchases: totalAllPurch }));
    });

    // PERIOD CASH SALES & DUE AMOUNT
    const unsubPaymentsForPeriod = onSnapshot(query(collection(db, 'payments'), where('userId', '==', user.uid), where('method', '==', 'Cash')), (snapshot) => {
      const allPayments = snapshot.docs.map(doc => ({ ...doc.data(), date: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date() }));
      const filteredPayments = allPayments.filter(p => p.date >= startDate && p.date <= endDate);
      
      const totalCashForPeriod = filteredPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const totalAllCashSales = allPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      
      setStats(prev => ({ 
        ...prev, 
        totalCashSalesForPeriod: totalCashForPeriod, 
        totalCashSales: totalAllCashSales 
      }));
    });

    const unsubAllExpenses = onSnapshot(query(collection(db, 'expenses'), where('userId', '==', user.uid)), (snapshot) => {
      const allExpenses = snapshot.docs.map(doc => ({ ...doc.data(), date: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date() }));
      const filteredExpenses = allExpenses.filter(e => e.date >= startDate && e.date <= endDate);
      const totalExp = filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      const totalAllExp = allExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      
      setStats(prev => ({ ...prev, totalExpenses: totalExp, totalAllExpenses: totalAllExp }));
    });

    return () => { unsubSales(); unsubProducts(); unsubCustomers(); unsubExpenses(); unsubPurchases(); unsubPaymentsForPeriod(); unsubAllExpenses(); };
  }, [period, selectedDate, selectedMonth, selectedYear]);

  const getFinancials = () => {
    // 1. Calculate Global Cash in Hand
    const globalCashInHand = stats.totalCashSales - stats.totalAllExpenses - stats.totalStockValue;

    // 2. Calculate Overall Net Profit
    const overallNetProfit = stats.totalAllSalesProfit - stats.totalAllExpenses;

    // 3. Calculate Period Net Profit (Daily, Monthly, or Yearly)
    let periodNetProfit = stats.totalPeriodSalesProfit - stats.totalExpenses;

    // 4. Apply the user's rule: if global cash in hand is less than overall net profit, we adjust net profit
    if (globalCashInHand < overallNetProfit) {
      const diff = overallNetProfit - globalCashInHand;
      periodNetProfit = periodNetProfit - diff;
    }

    return {
      cashInHand: globalCashInHand,
      netProfit: periodNetProfit
    };
  };

  return (
    <Layout>
      <div style={{ padding: '2rem', flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-main)' }} className="no-scrollbar">
        
        {/* Header with Selectors */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Business Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
              Showing data for {period === 'daily' ? selectedDate : period === 'monthly' ? `${months[selectedMonth]} ${selectedYear}` : selectedYear}
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.8rem' }}>
            <div className="glass-panel" style={{ display: 'flex', padding: '0.3rem', borderRadius: '12px' }}>
              {['Daily', 'Monthly', 'Yearly'].map(t => (
                <button 
                  key={t}
                  onClick={() => setPeriod(t.toLowerCase())}
                  style={{ 
                    padding: '0.6rem 1.2rem', border: 'none', borderRadius: '10px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '700',
                    backgroundColor: period === t.toLowerCase() ? 'var(--primary)' : 'transparent',
                    color: period === t.toLowerCase() ? '#1a1a1a' : 'var(--text-muted)',
                    transition: '0.2s',
                    boxShadow: period === t.toLowerCase() ? '0 2px 8px rgba(212,175,55,0.4)' : 'none'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {period === 'daily' && <input type="date" className="input-field" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />}
              {period === 'monthly' && (
                <>
                  <select className="input-field" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                    {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                  <select className="input-field" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </>
              )}
              {period === 'yearly' && (
                <select className="input-field" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ gridColumn: 'span 7', backgroundColor: '#111111', color: 'white', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.4rem' }}>Total Revenue</div>
                <div style={{ fontSize: '2.8rem', fontWeight: '800', color: 'white' }}>
                  PKR {stats.totalSales.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.3rem' }}>
                  {stats.totalOrders} orders · {period === 'daily' ? selectedDate : period === 'monthly' ? `${months[selectedMonth]} ${selectedYear}` : selectedYear}
                </div>
              </div>
              <div style={{ backgroundColor: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)', padding: '0.8rem', borderRadius: '16px' }}>
                <TrendingUp color="var(--primary)" size={22} />
              </div>
            </div>
            
            <div style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d4af37" stopOpacity={0.35}/>
                      <stop offset="60%" stopColor="#d4af37" stopOpacity={0.08}/>
                      <stop offset="100%" stopColor="#d4af37" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e1e1e', 
                      border: '1px solid rgba(212,175,55,0.3)', 
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '0.85rem',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                    }}
                    formatter={(value) => [`PKR ${value.toLocaleString()}`, 'Revenue']}
                    cursor={{ stroke: 'rgba(212,175,55,0.2)', strokeWidth: 1 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#d4af37" 
                    fill="url(#dashSales)" 
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#d4af37', stroke: '#111', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ 
              padding: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              borderLeft: '5px solid #22c55e', backgroundColor: 'rgba(34, 197, 94, 0.05)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <Wallet size={20} color="#22c55e" />
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Cash in Hand</div>
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#22c55e' }}>
                PKR {getFinancials().cashInHand.toLocaleString()}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '5px solid #f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <AlertCircle size={20} color="#f59e0b" />
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Due Amount</div>
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#f59e0b' }}>
                PKR {(stats.totalSales - stats.totalCashSalesForPeriod).toLocaleString()}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '5px solid var(--primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <Users size={20} color="var(--primary)" />
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>VIP Customers</div>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>{stats.totalCustomers}</div>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', backgroundColor: 'var(--primary)', color: '#1a1a1a', flex: 1, position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '1rem', fontWeight: '600', opacity: 0.7 }}>Net Profit</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0.5rem 0' }}>
                PKR {getFinancials().netProfit.toLocaleString()}
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>Sales Profit - Expenses (Adjusted for Stock)</p>
            </div>
          </div>

          <div className="glass-panel" style={{ gridColumn: 'span 3', padding: '1.5rem', borderBottom: `4px solid ${stats.lowStockCount > 0 ? 'var(--danger)' : 'var(--info)'}`, backgroundColor: stats.lowStockCount > 0 ? 'rgba(239,68,68,0.05)' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              {stats.lowStockCount > 0 && <AlertCircle size={14} color="var(--danger)" />}
              Low Stock
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: stats.lowStockCount > 0 ? 'var(--danger)' : undefined }}>{stats.lowStockCount} Items</div>
            {lowStockProducts.slice(0, 3).map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginTop: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{p.name}</span>
                <span style={{
                  padding: '0.1rem 0.5rem', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.7rem',
                  backgroundColor: p.status === 'out' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                  color: p.status === 'out' ? '#ef4444' : '#f59e0b'
                }}>
                  {p.status === 'out' ? 'Out' : `${p.stock} left`}
                </span>
              </div>
            ))}
          </div>

          <div className="glass-panel" style={{ gridColumn: 'span 3', padding: '1.5rem', borderBottom: '4px solid #a855f7' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Top Running Items</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.8rem' }}>Sabse zyada bikne wale items (is period mein)</div>
            {topProducts.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Is period mein koi sale nahi</div>
            ) : topProducts.slice(0, 3).map(p => (
              <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{p.name}</span>
                <span style={{ fontWeight: 'bold', backgroundColor: 'rgba(168,85,247,0.15)', color: '#a855f7', padding: '0.1rem 0.6rem', borderRadius: '10px', fontSize: '0.78rem' }}>{p.count} sold</span>
              </div>
            ))}
          </div>

          <div className="glass-panel" style={{ gridColumn: 'span 3', padding: '1.5rem', borderBottom: '4px solid var(--danger)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Expenses</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>PKR {stats.totalExpenses.toLocaleString()}</div>
          </div>

          <div className="glass-panel" style={{ gridColumn: 'span 3', padding: '1.5rem', borderBottom: '4px solid #3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Package size={14} color="#3b82f6" />
              Current Stock Value
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-main)' }}>PKR {stats.totalStockValue.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.4' }}>
              Shop mein mojood total items ki purchase value
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
