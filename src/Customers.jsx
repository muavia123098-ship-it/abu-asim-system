import React, { useState, useEffect, useRef } from 'react';
import Layout from './Layout';
import { 
  Users, UserPlus, Search, Phone, History, Wallet, X, Trash2,
  CheckCircle2, AlertTriangle, Receipt, ArrowUpRight, ArrowDownRight,
  Loader2
} from 'lucide-react';
import { db, auth, collection, addDoc, onSnapshot, query, where, serverTimestamp, updateDoc, doc, getDocs, orderBy, deleteDoc } from './db';

export default function Customers() {
  const isMounted = useRef(true);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSales, setCustomerSales] = useState([]);
  const [customerPayments, setCustomerPayments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ totalSpent: 0, totalPaid: 0, currentDues: 0 });
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [receiveAmount, setReceiveAmount] = useState('');
  const [customerToDelete, setCustomerToDelete] = useState(null);

  useEffect(() => {
    isMounted.current = true;
    const user = auth.currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }

    const unsub = onSnapshot(query(collection(db, 'customers'), where('userId', '==', user.uid)), 
      (snapshot) => {
        if (isMounted.current) {
          setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setIsLoading(false);
        }
      },
      (error) => {
        console.error("Firestore error:", error);
        if (isMounted.current) setIsLoading(false);
      }
    );

    return () => {
      isMounted.current = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (selectedCustomer && isMounted.current) {
      const totalSpent = (customerSales || []).reduce((sum, s) => sum + (parseFloat(s?.total) || 0), 0);
      const totalPaid = (customerPayments || []).reduce((sum, p) => sum + (parseFloat(p?.amount) || 0), 0);
      const currentDues = totalSpent - totalPaid;
      
      setStats({ totalSpent, totalPaid, currentDues });

      if (Math.abs((selectedCustomer?.balance || 0) - currentDues) > 0.01) {
        updateDoc(doc(db, 'customers', selectedCustomer.id), { balance: currentDues }).catch(e => console.error("Sync error", e));
      }
    }
  }, [customerSales, customerPayments]);

  const fetchCustomerLedger = async (customer) => {
    if (!customer?.id) return;
    const user = auth.currentUser;
    if (!user) return;
    
    setIsActionLoading(true);
    try {
      setSelectedCustomer(customer);
      const qSales = query(collection(db, 'sales'), where('userId', '==', user.uid), where('customerPhone', '==', customer.phone));
      const qPayments = query(collection(db, 'payments'), where('userId', '==', user.uid), where('customerPhone', '==', customer.phone));

      const [sSnap, pSnap] = await Promise.all([getDocs(qSales), getDocs(qPayments)]);
      
      if (isMounted.current) {
        setCustomerSales(sSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        setCustomerPayments(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (err) {
      console.error(err);
      alert("Error loading customer data.");
    } finally {
      if (isMounted.current) setIsActionLoading(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    setIsActionLoading(true);
    try {
      await addDoc(collection(db, 'customers'), {
        ...formData,
        userId: user.uid,
        balance: 0,
        createdAt: serverTimestamp()
      });

      if (isMounted.current) {
        setIsModalOpen(false);
        setFormData({ name: '', phone: '', address: '' });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add customer. Please check your connection.");
    } finally {
      if (isMounted.current) setIsActionLoading(false);
    }
  };

  const handleReceivePayment = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!selectedCustomer?.id || !receiveAmount || !user) return;
    
    setIsActionLoading(true);
    try {
      const amount = parseFloat(receiveAmount);
      await addDoc(collection(db, 'payments'), {
        customerId: selectedCustomer.id,
        customerPhone: selectedCustomer.phone,
        amount: amount,
        userId: user.uid,
        type: 'Wasooli',
        method: 'Cash',
        createdAt: serverTimestamp()
      });

      await fetchCustomerLedger(selectedCustomer);
      if (isMounted.current) {
        setIsReceiveModalOpen(false);
        setReceiveAmount('');
      }
    } catch (err) {
      console.error(err);
      alert("Error recording payment.");
    } finally {
      if (isMounted.current) setIsActionLoading(false);
    }
  };

  const handleDeleteCustomer = (id) => {
    setCustomerToDelete(id);
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      setIsActionLoading(true);
      await deleteDoc(doc(db, 'customers', customerToDelete));
      if (isMounted.current) {
        setSelectedCustomer(null);
        setCustomerToDelete(null);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete customer.");
    } finally {
      if (isMounted.current) setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return <Layout><div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' }}><Loader2 className="animate-spin" size={48} color="#d4af37" /></div></Layout>;
  }

  return (
    <Layout>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', borderRight: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>Credit Customers</h1>
            <button className="btn-primary" onClick={() => setIsModalOpen(true)}><UserPlus size={20} /> New Customer</button>
          </div>
          
          <div style={{ position: 'relative', marginBottom: '2rem' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Search..." className="input-field" style={{ width: '100%', paddingLeft: '2.8rem' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}>
            {(customers || []).filter(c => (c?.name || '').toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
              <div key={c?.id} onClick={() => fetchCustomerLedger(c)} className="glass-panel" style={{ padding: '1.2rem', cursor: 'pointer', border: selectedCustomer?.id === c?.id ? '2px solid var(--primary)' : '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                   <div style={{ fontWeight: 'bold' }}>{c?.name}</div>
                   {(c?.balance || 0) > 0 && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 'bold' }}>PKR {c?.balance?.toLocaleString()}</div>}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{c?.phone}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: '450px', backgroundColor: 'var(--bg-surface)', padding: '2rem', overflowY: 'auto', position: 'relative' }}>
          {isActionLoading && <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" color="#d4af37" /></div>}
          
          {selectedCustomer ? (
            <div>
              <div style={{ position: 'relative', textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ margin: 0 }}>{selectedCustomer?.name}</h2>
                <p style={{ color: 'var(--text-muted)' }}>{selectedCustomer?.phone}</p>
                <button onClick={() => handleDeleteCustomer(selectedCustomer.id)} style={{ position: 'absolute', right: 0, top: 0, background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.2rem' }} title="Delete Customer">
                  <Trash2 size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>TOTAL SPENT</span>
                  <span style={{ fontWeight: 'bold' }}>PKR {stats?.totalSpent?.toLocaleString()}</span>
                </div>
                <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>TOTAL PAID</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>PKR {stats?.totalPaid?.toLocaleString()}</span>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', border: '1px solid var(--danger)' }}>
                  <span style={{ fontWeight: 'bold' }}>CURRENT DUES</span>
                  <span style={{ fontWeight: 'bold', fontSize: '1.4rem', color: 'var(--danger)' }}>PKR {stats?.currentDues?.toLocaleString()}</span>
                </div>
              </div>

              <button onClick={() => setIsReceiveModalOpen(true)} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: '2rem', backgroundColor: 'var(--success)' }}>
                <Wallet size={18} /> Receive Payment
              </button>

              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Transaction History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {(customerSales || []).map(sale => {
                  const salePayments = (customerPayments || []).filter(p => p?.saleId === sale?.id).reduce((sum, p) => sum + (parseFloat(p?.amount) || 0), 0);
                  const pending = (sale?.total || 0) - salePayments;
                  return (
                    <div key={sale?.id} className="glass-panel" style={{ padding: '1rem', backgroundColor: 'var(--bg-main)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        <span>SALE #{sale?.id?.slice(-6).toUpperCase()}</span>
                        <span>{sale?.createdAt?.toDate ? sale.createdAt.toDate().toLocaleDateString() : 'Pending...'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Bill Amount:</span>
                        <span style={{ fontWeight: 'bold' }}>PKR {sale?.total?.toLocaleString()}</span>
                      </div>
                      {pending > 0 && <div style={{ textAlign: 'right', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.4rem' }}>Pending: PKR {pending?.toLocaleString()}</div>}
                      {pending <= 0 && <div style={{ textAlign: 'right', color: 'var(--success)', fontSize: '0.75rem', marginTop: '0.4rem' }}>Paid</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Select a credit customer.</div>
          )}
        </div>

        {/* Add Customer Modal */}
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ width: '400px', padding: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>New Credit Customer</h2>
                <X onClick={() => setIsModalOpen(false)} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} />
              </div>
              <form onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Customer Name</label>
                  <input required className="input-field w-full" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Ali Ahmed" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Phone Number</label>
                  <input required className="input-field w-full" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="03XXXXXXXXX" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Address (Optional)</label>
                  <input className="input-field w-full" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="City, Area" />
                </div>
                <button type="submit" disabled={isActionLoading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem', marginTop: '1rem' }}>
                  {isActionLoading ? 'Saving...' : 'Add Customer'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Receive Payment Modal */}
        {isReceiveModalOpen && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ width: '400px', padding: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Wasooli (Payment)</h2>
                <X onClick={() => setIsReceiveModalOpen(false)} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} />
              </div>
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', color: 'var(--success)' }}>
                <div style={{ fontSize: '0.8rem' }}>Remaining Dues:</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>PKR {stats.currentDues?.toLocaleString()}</div>
              </div>
              <form onSubmit={handleReceivePayment} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Received Amount (PKR)</label>
                  <input type="number" required className="input-field w-full" value={receiveAmount} onChange={e => setReceiveAmount(e.target.value)} placeholder="0.00" />
                </div>
                <button type="submit" disabled={isActionLoading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem', marginTop: '1rem', backgroundColor: 'var(--success)' }}>
                  {isActionLoading ? 'Recording...' : 'Receive & Update'}
                </button>
              </form>
            </div>
          </div>
        )}
        {customerToDelete && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ width: '400px', padding: '2.5rem', textAlign: 'center' }}>
              <AlertTriangle size={48} color="var(--danger)" style={{ margin: '0 auto 1rem auto' }} />
              <h2 style={{ margin: '0 0 1rem 0' }}>Delete Customer?</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                Are you sure you want to delete this customer? This action cannot be undone, but their past sales history will remain.
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => setCustomerToDelete(null)} 
                  disabled={isActionLoading}
                  style={{ flex: 1, padding: '1rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteCustomer} 
                  disabled={isActionLoading}
                  style={{ flex: 1, padding: '1rem', backgroundColor: 'var(--danger)', border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {isActionLoading ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

