import React, { useState, useEffect, useRef } from 'react';
import Layout from './Layout';
import { Plus, Search, Trash2, DollarSign, Calendar, Tag, X, Loader2 } from 'lucide-react';
import { db, auth, collection, addDoc, onSnapshot, query, where, serverTimestamp, updateDoc, doc, deleteDoc, getDoc, setDoc, increment } from './db';

export default function Expenses() {
  const isMounted = useRef(true);
  const [expenses, setExpenses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [formData, setFormData] = useState({ title: '', amount: '', category: 'Rent' });

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
          setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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

      // 1. Add Expense Doc
      await addDoc(collection(db, 'expenses'), {
        ...formData,
        amount,
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      // 2. Update Global Stats
      const statsRef = doc(db, 'stats', user.uid);
      const statsSnap = await getDoc(statsRef);
      if (statsSnap.exists()) {
        await updateDoc(statsRef, { totalProfit: increment(-amount) });
      }

      if (isMounted.current) {
        setIsModalOpen(false);
        setFormData({ title: '', amount: '', category: 'Rent' });
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

  return (
    <Layout>
      <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>Expenses Management</h1>
            <p style={{ color: 'var(--text-muted)' }}>Track your business costs and overheads.</p>
          </div>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={20} /> Add Expense
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {(expenses || []).map(exp => (
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
          {expenses.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              No expenses recorded yet.
            </div>
          )}
        </div>

        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ width: '400px', padding: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Record Expense</h2>
                <X onClick={() => setIsModalOpen(false)} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} />
              </div>
              <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Expense Title</label>
                  <input required className="input-field w-full" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Electricity Bill" />
                </div>
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
