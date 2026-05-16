import React, { useState, useEffect, useRef } from 'react';
import Layout from './Layout';
import { Plus, Search, Trash2, DollarSign, Calendar, Tag, X, Loader2 } from 'lucide-react';
import { db, auth, collection, addDoc, onSnapshot, query, where, serverTimestamp, updateDoc, doc, deleteDoc, getDoc, setDoc, increment } from './db';

export default function Expenses() {
  const isMounted = useRef(true);
  const [expenses, setExpenses] = useState([]);
  const [modalType, setModalType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [formData, setFormData] = useState({ title: '', amount: '', category: 'Rent', month: '' });
  const [filterTab, setFilterTab] = useState('daily');

  useEffect(() => {
    isMounted.current = true;
    const user = auth.currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Use query for security and userId isolation
    const q = query(collection(db, 'expenses'), where('userId', '==', user.uid));
    
    const unsub = onSnapshot(q, 
      (snapshot) => {
        if (isMounted.current) {
          const loadedExp = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => {
            const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
            const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
            return bTime - aTime;
          });
          setExpenses(loadedExp);
          setIsLoading(false);
        }
      },
      (error) => {
        console.error("Expenses Listener Error:", error);
        if (isMounted.current) setIsLoading(false);
      }
    );

    return () => {
      isMounted.current = false;
      unsub(); // Cleanup listener to prevent "Internal Assertion Failed"
    };
  }, []);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    setIsActionLoading(true);
    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount)) throw "Invalid amount";

      let expenseDate = serverTimestamp();
      if (modalType === 'monthly' && formData.month) {
        const [year, month] = formData.month.split('-');
        // Save as the 1st of the selected month
        expenseDate = new Date(parseInt(year), parseInt(month) - 1, 1).getTime();
      }

      // 1. Add Expense Doc
      await addDoc(collection(db, 'expenses'), {
        title: formData.title,
        amount,
        category: formData.category,
        type: modalType,
        userId: user.uid,
        createdAt: expenseDate
      });

      // 2. Update Global Stats
      const statsRef = doc(db, 'stats', user.uid);
      const statsSnap = await getDoc(statsRef);
      if (statsSnap.exists()) {
        await updateDoc(statsRef, { totalProfit: increment(-amount) });
      }

      if (isMounted.current) {
        setModalType(null);
        setFormData({ title: '', amount: '', category: 'Rent', month: '' });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save expense. Please check your connection.");
    } finally {
      if (isMounted.current) setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' }}>
          <Loader2 className="animate-spin" size={48} color="#d4af37" />
        </div>
      </Layout>
    );
  }

  const getFilteredExpenses = () => {
    const now = new Date();
    return expenses.filter(exp => {
      if (!exp.createdAt || !exp.createdAt.toDate) return true; // Pending expenses always show
      const expDate = exp.createdAt.toDate();
      if (filterTab === 'daily') {
        return expDate.getDate() === now.getDate() &&
               expDate.getMonth() === now.getMonth() &&
               expDate.getFullYear() === now.getFullYear();
      } else if (filterTab === 'monthly') {
        return expDate.getMonth() === now.getMonth() &&
               expDate.getFullYear() === now.getFullYear();
      }
      return true; // 'all'
    });
  };

  const filteredExpenses = getFilteredExpenses();
  const totalFilteredAmount = filteredExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <Layout>
      <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>Expenses Management</h1>
            <p style={{ color: 'var(--text-muted)' }}>Track your business costs and overheads.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-primary" onClick={() => { setModalType('daily'); setFormData({...formData, month: ''}); }}>
              <Plus size={20} /> Daily Expense
            </button>
            <button className="btn-primary" onClick={() => { setModalType('monthly'); setFormData({...formData, month: new Date().toISOString().substring(0,7)}); }} style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}>
              <Plus size={20} /> Monthly Expense
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setFilterTab('daily')}
              style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: filterTab === 'daily' ? 'var(--primary)' : 'transparent', color: filterTab === 'daily' ? '#000' : 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}
            >
              Daily Expenses
            </button>
            <button 
              onClick={() => setFilterTab('monthly')}
              style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: filterTab === 'monthly' ? 'var(--primary)' : 'transparent', color: filterTab === 'monthly' ? '#000' : 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}
            >
              Monthly Expenses
            </button>
            <button 
              onClick={() => setFilterTab('all')}
              style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: filterTab === 'all' ? 'var(--primary)' : 'transparent', color: filterTab === 'all' ? '#000' : 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}
            >
              All Expenses
            </button>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', padding: '0.6rem 1.2rem', backgroundColor: 'rgba(212, 175, 55, 0.1)', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
            Total: <span style={{ color: 'var(--danger)' }}>PKR {totalFilteredAmount.toLocaleString()}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {(filteredExpenses || []).map(exp => (
            <div key={exp?.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                  <Tag size={14} color="var(--primary)" />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{exp?.category}</span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{exp?.title}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  {exp?.createdAt?.toDate ? exp.createdAt.toDate().toLocaleDateString() : 'Pending...'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--danger)' }}>- PKR {exp?.amount?.toLocaleString()}</div>
              </div>
            </div>
          ))}
          {filteredExpenses.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              No expenses recorded yet.
            </div>
          )}
        </div>

        {modalType && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ width: '400px', padding: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>{modalType === 'monthly' ? 'Record Monthly Expense' : 'Record Daily Expense'}</h2>
                <X onClick={() => setModalType(null)} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} />
              </div>
              <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Expense Title</label>
                  <input required className="input-field w-full" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder={modalType === 'monthly' ? "e.g. Shop Rent" : "e.g. Electricity Bill"} />
                </div>
                {modalType === 'monthly' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Select Month</label>
                    <input type="month" required className="input-field w-full" value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} />
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Amount (PKR)</label>
                  <input type="number" required className="input-field w-full" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Category</label>
                  <select className="input-field w-full" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option>Rent</option>
                    <option>Utilities</option>
                    <option>Salary</option>
                    <option>Marketing</option>
                    <option>Other</option>
                  </select>
                </div>
                <button type="submit" disabled={isActionLoading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem', marginTop: '1rem' }}>
                  {isActionLoading ? 'Saving...' : 'Save Expense'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
