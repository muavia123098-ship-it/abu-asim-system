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
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [filteredData, setFilteredData] = useState({ 
    sales: 0, purchases: 0, expenses: 0, profit: 0, 
    orders: 0, productsSold: 0, cashSales: 0, creditSales: 0,
    avgOrder: 0, totalItems: 0
  });
  const [chartData, setChartData] = useState([]);
  const [showSlip, setShowSlip] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [filteredLists, setFilteredLists] = useState({ sales: [], expenses: [], payments: [] });
  
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

    const unsubProducts = onSnapshot(query(collection(db, 'products'), where('userId', '==', user.uid)), (snapshot) => {
      setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubCustomers = onSnapshot(query(collection(db, 'customers'), where('userId', '==', user.uid)), (snapshot) => {
      setCustomers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPayments = onSnapshot(query(collection(db, 'payments'), where('userId', '==', user.uid)), (snapshot) => {
      setPayments(snapshot.docs.map(d => ({ ...d.data(), date: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date() })));
    });

    return () => {
      unsubSales();
      unsubPurchases();
      unsubExpenses();
      unsubProducts();
      unsubCustomers();
      unsubPayments();
    };
  }, []);

  useEffect(() => {
    calculateStats();
  }, [period, selectedDate, selectedMonth, selectedYear, sales, purchases, expenses, payments]);

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
    const fExpenses = expenses.filter(e => {
      const inRange = e.date >= startDate && e.date <= endDate;
      if (!inRange) return false;
      if (period === 'Daily' && e.type === 'monthly') return false;
      return true;
    });
    const fPayments = payments.filter(p => p.date >= startDate && p.date <= endDate);

    const totalSales = fSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalPurchases = fPurchases.reduce((sum, p) => sum + (p.totalCost || 0), 0);
    const totalExpenses = fExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    
    // Calculate period payments
    const cashSales = fPayments.filter(p => p.method === 'Cash').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const bankSales = fPayments.filter(p => p.method === 'Bank').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalPayments = fPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const creditSales = Math.max(0, totalSales - totalPayments);

    const periodSalesProfit = fSales.reduce((sum, s) => sum + (s.profit || 0), 0);
    const profit = periodSalesProfit - totalExpenses;

    const orders = fSales.length;
    const totalItems = fSales.reduce((sum, s) => sum + (s.items?.reduce((iq, item) => iq + (item.quantity || 0), 0) || 0), 0);
    const avgOrder = orders > 0 ? totalSales / orders : 0;

    setFilteredData({ 
      sales: totalSales, purchases: totalPurchases, expenses: totalExpenses, profit, 
      orders, productsSold: fSales.reduce((sum, s) => sum + (s.items?.length || 0), 0),
      cashSales, creditSales, avgOrder, totalItems
    });
    setFilteredLists({ sales: fSales, expenses: fExpenses, payments: fPayments });

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

  const renderSlipDetails = () => {
    const { sales, expenses, payments: fPaymentsList } = filteredLists;
    const fPayments = fPaymentsList || [];

    const onlineSales = sales.filter(s => s.saleType === 'Online');
    const physicalSales = sales.filter(s => s.saleType !== 'Online');

    const cashSalesAmount = fPayments.filter(p => p.method === 'Cash').reduce((sum, p) => sum + (p.amount || 0), 0);
    const bankSalesAmount = fPayments.filter(p => p.method === 'Bank').reduce((sum, p) => sum + (p.amount || 0), 0);

    let topProductsByCategory = [];
    let vipDebts = [];

    if (period === 'Monthly') {
      vipDebts = customers.filter(c => (c.balance || 0) > 0).sort((a,b) => b.balance - a.balance);
      
      const categorySales = {};
      sales.forEach(s => {
        (s.items || []).forEach(item => {
          const prod = products.find(p => p.id === item.id);
          const cat = prod?.category || 'Other';
          if (!categorySales[cat]) categorySales[cat] = {};
          if (!categorySales[cat][item.name]) categorySales[cat][item.name] = 0;
          categorySales[cat][item.name] += item.quantity;
        });
      });

      topProductsByCategory = Object.entries(categorySales).map(([cat, itemsObj]) => {
        const sortedItems = Object.entries(itemsObj)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        return { category: cat, items: sortedItems };
      }).filter(catObj => catObj.items.length > 0);
    }

    if (period === 'Yearly') {
      const yearlyMonthlyStats = months.map((mName, idx) => {
        const mSales = sales.filter(s => s.date.getMonth() === idx);
        const mExpenses = expenses.filter(e => e.date.getMonth() === idx);
        const mSalesTotal = mSales.reduce((sum, s) => sum + s.total, 0);
        const mExpTotal = mExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const mProfit = mSales.reduce((sum, s) => sum + (s.profit || 0), 0) - mExpTotal;
        return { name: mName, sales: mSalesTotal, expenses: mExpTotal, profit: mProfit };
      }).filter(m => m.sales > 0 || m.expenses > 0);

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', color: '#000000' }}>
          {yearlyMonthlyStats.length > 0 ? (
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: '800', borderBottom: '1.5px solid #000', paddingBottom: '0.3rem', marginBottom: '0.6rem', color: '#000000', letterSpacing: '0.5px' }}>📅 MONTHLY BREAKDOWN</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem 1rem' }}>
                {yearlyMonthlyStats.map(m => (
                  <div key={m.name} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px dashed #ccc', paddingBottom: '0.3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '700', color: '#000000' }}>
                      <span>{m.name}</span>
                      <span style={{ color: m.profit >= 0 ? '#166534' : '#d32f2f', fontWeight: '700' }}>PKR {m.profit.toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#111', display: 'flex', justifyContent: 'space-between', marginTop: '0.15rem' }}>
                      <span>Rev: {m.sales.toLocaleString()}</span>
                      <span>Exp: {m.expenses.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#444', fontSize: '0.8rem', padding: '1rem 0' }}>No records found for this year.</div>
          )}

          <div style={{ borderTop: '2px dashed #000', paddingTop: '0.8rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#000000' }}>
              <span style={{ fontWeight: '500' }}>Total Cash Revenue</span>
              <span style={{ fontWeight: '700' }}>{cashSalesAmount.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#000000' }}>
              <span style={{ fontWeight: '500' }}>Total Bank/Online Revenue</span>
              <span style={{ fontWeight: '700' }}>{bankSalesAmount.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#000000' }}>
              <span style={{ fontWeight: '500' }}>Total Expenses</span>
              <span style={{ color: '#d32f2f', fontWeight: '700' }}>-{filteredData.expenses.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', marginTop: '0.5rem', backgroundColor: '#f0fdf4', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1.5px solid #dcfce7' }}>
              <span style={{ color: '#166534', fontWeight: '800' }}>Net Profit</span>
              <span style={{ color: '#166534', fontWeight: '900' }}>PKR {filteredData.profit.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%', color: '#000000' }}>
        {physicalSales.length > 0 && (
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: '800', borderBottom: '1.5px solid #000', paddingBottom: '0.3rem', marginBottom: '0.6rem', color: '#000000', letterSpacing: '0.5px' }}>🛒 PHYSICAL SALES</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem 1rem' }}>
              {physicalSales.map(s => (
                <div key={s.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px dashed #ccc', paddingBottom: '0.3rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '700', color: '#000000' }}>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                      {s.customerName} {s.customerId && s.customerId !== 'guest' ? '⭐' : ''}
                    </span>
                    <span style={{ whiteSpace: 'nowrap' }}>{s.total.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#111', display: 'flex', justifyContent: 'space-between', marginTop: '0.15rem' }}>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '150px' }}>
                      {s.items?.map(i => `${i.name} x${i.quantity}`).join(', ')}
                    </span>
                    <span style={{ fontWeight: '600' }}>{s.paymentMethod === 'Cash' ? 'Cash' : 'Bank'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {onlineSales.length > 0 && (
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: '800', borderBottom: '1.5px solid #000', paddingBottom: '0.3rem', marginBottom: '0.6rem', color: '#000000', letterSpacing: '0.5px' }}>📦 ONLINE ORDERS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem 1rem' }}>
              {onlineSales.map(s => (
                <div key={s.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px dashed #ccc', paddingBottom: '0.3rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '700', color: '#000000' }}>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                      {s.customerName}
                    </span>
                    <span style={{ whiteSpace: 'nowrap' }}>{s.total.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#111', display: 'flex', justifyContent: 'space-between', marginTop: '0.15rem' }}>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '150px' }}>
                      {s.items?.map(i => `${i.name} x${i.quantity}`).join(', ')}
                    </span>
                    <span style={{ fontWeight: '600' }}>{s.paymentMethod === 'Cash' ? 'Cash' : 'Bank'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {expenses.length > 0 && (
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: '800', borderBottom: '1.5px solid #d32f2f', paddingBottom: '0.3rem', marginBottom: '0.6rem', color: '#d32f2f', letterSpacing: '0.5px' }}>📉 EXPENSES</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem' }}>
              {expenses.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderBottom: '1px dashed #fca5a5', paddingBottom: '0.2rem' }}>
                  <span style={{ color: '#111', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '170px' }}>{e.title}</span>
                  <span style={{ color: '#d32f2f', fontWeight: '700' }}>-{parseFloat(e.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {period === 'Monthly' && vipDebts.length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '800', borderBottom: '1.5px solid #b45309', paddingBottom: '0.3rem', marginBottom: '0.6rem', color: '#b45309', letterSpacing: '0.5px' }}>📒 VIP OUTSTANDING (QARZA)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem' }}>
              {vipDebts.map(vip => (
                <div key={vip.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderBottom: '1px dashed #fed7aa', paddingBottom: '0.2rem' }}>
                  <span style={{ color: '#111', fontWeight: '700' }}>{vip.name}</span>
                  <span style={{ color: '#b45309', fontWeight: '800' }}>{vip.balance.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {period === 'Monthly' && topProductsByCategory.length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '800', borderBottom: '1.5px solid #1d4ed8', paddingBottom: '0.3rem', marginBottom: '0.6rem', color: '#1d4ed8', letterSpacing: '0.5px' }}>🏆 TOP 3 PRODUCTS (THIS MONTH)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem 1.2rem' }}>
              {topProductsByCategory.map(catData => (
                <div key={catData.category} style={{ borderBottom: '1px dashed #bfdbfe', paddingBottom: '0.4rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#1d4ed8', marginBottom: '0.2rem', textTransform: 'uppercase' }}>{catData.category}</div>
                  {catData.items.map(([name, qty]) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.15rem' }}>
                      <span style={{ color: '#111' }}>{name}</span>
                      <span style={{ color: '#1d4ed8', fontWeight: '700' }}>{qty} sold</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {sales.length === 0 && expenses.length === 0 && (
          <div style={{ textAlign: 'center', color: '#444', fontSize: '0.8rem', padding: '1rem 0' }}>No records found for this period.</div>
        )}

        <div style={{ borderTop: '2px dashed #000', paddingTop: '0.8rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#000000' }}>
            <span style={{ fontWeight: '500' }}>Total Cash Revenue</span>
            <span style={{ fontWeight: '700' }}>{cashSalesAmount.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#000000' }}>
            <span style={{ fontWeight: '500' }}>Total Bank/Online Revenue</span>
            <span style={{ fontWeight: '700' }}>{bankSalesAmount.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#000000' }}>
            <span style={{ fontWeight: '500' }}>Total Expenses</span>
            <span style={{ color: '#d32f2f', fontWeight: '700' }}>-{filteredData.expenses.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', marginTop: '0.5rem', backgroundColor: '#f0fdf4', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1.5px solid #dcfce7' }}>
            <span style={{ color: '#166534', fontWeight: '800' }}>Net Profit</span>
            <span style={{ color: '#166534', fontWeight: '900' }}>PKR {filteredData.profit.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  };

  let canShowMonthlySlip = true; // User requested to allow monthly slip at any date
  let canShowYearlySlip = false;
  const today = new Date();

  if (period === 'Yearly') {
    if (selectedYear < today.getFullYear()) {
      canShowYearlySlip = true;
    } else if (selectedYear === today.getFullYear()) {
      // User requested yearly slip button to be visible anytime during the last month (December)
      if (today.getMonth() === 11) {
        canShowYearlySlip = true;
      }
    }
  }

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
              {(period === 'Daily' || (period === 'Monthly' && canShowMonthlySlip) || (period === 'Yearly' && canShowYearlySlip)) && (
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

        {/* Detailed Summary Slip Modal */}
        {showSlip && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, overflowY: 'auto', padding: '2rem 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100%' }}>
              <div ref={slipRef} style={{ 
                width: '580px', 
                backgroundColor: '#ffffff', 
                borderRadius: '16px', 
                padding: '1.75rem', 
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)', 
                color: '#000000', 
                margin: 'auto',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}>
                <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
                  <img src="/logo.png" style={{ width: '60px', height: 'auto', marginBottom: '0.5rem', objectFit: 'contain' }} />
                  <h2 style={{ fontSize: '1.1rem', margin: 0, letterSpacing: '1px', fontWeight: '800' }}>ABU ASIM</h2>
                  <div style={{ fontSize: '0.65rem', color: '#956e36', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 'bold' }}>Perfumery</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '900', marginTop: '0.8rem' }}>
                    {period === 'Daily' ? new Date(selectedDate).toLocaleDateString('en-PK', { dateStyle: 'full' }) : period + ' Report'}
                  </div>
                </div>
                
                {renderSlipDetails()}

              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', marginBottom: '2rem' }}>
                <button onClick={() => setShowSlip(false)} className="btn-primary" style={{ backgroundColor: '#333', border: '1px solid #555', color: '#fff' }}>Discard</button>
                <button onClick={copySlip} className="btn-primary" style={{ backgroundColor: '#956e36' }}>
                  {copySuccess ? <Check size={18} /> : <Copy size={18} />} {copySuccess ? 'Copied' : 'Share'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
