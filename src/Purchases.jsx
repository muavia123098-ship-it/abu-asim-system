import React, { useState, useEffect, useRef } from 'react';
import Layout from './Layout';
import { 
  ShoppingBag, Plus, Search, Filter, Calendar, 
  Truck, Package, DollarSign, X, CheckCircle2, Trash2, ChevronDown, ImageIcon
} from 'lucide-react';
import { db, auth, collection, addDoc, onSnapshot, query, where, serverTimestamp, updateDoc, doc, increment, writeBatch } from './db';

export default function Purchases() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Multi-Item Form State
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [cartItems, setCartItems] = useState([]);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
const [billPurchase, setBillPurchase] = useState(null);
const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  
  // Search/Suggest State
  const [supplierSearch, setSupplierSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [currentItem, setCurrentItem] = useState({ quantity: '', costPrice: '' });
  const [selectedProduct, setSelectedProduct] = useState(null);

  const supplierRef = useRef(null);
  const productRef = useRef(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('All');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const qPurch = query(collection(db, 'purchases'), where('userId', '==', user.uid));
    const unsubPurch = onSnapshot(qPurch, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPurchases(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });

    const qSupp = query(collection(db, 'suppliers'), where('userId', '==', user.uid));
    const unsubSupp = onSnapshot(qSupp, (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qProd = query(collection(db, 'products'), where('userId', '==', user.uid));
    const unsubProd = onSnapshot(qProd, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubPurch(); unsubSupp(); unsubProd(); };
  }, []);

  // Handle outside click for suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (supplierRef.current && !supplierRef.current.contains(event.target)) setShowSupplierSuggestions(false);
      if (productRef.current && !productRef.current.contains(event.target)) setShowProductSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addToCart = () => {
    if (!selectedProduct || !currentItem.quantity || !currentItem.costPrice) return;
    
    const newItem = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      imageUrl: selectedProduct.imageUrl,
      quantity: parseInt(currentItem.quantity),
      costPrice: parseFloat(currentItem.costPrice),
      total: parseInt(currentItem.quantity) * parseFloat(currentItem.costPrice)
    };

    setCartItems([...cartItems, newItem]);
    setSelectedProduct(null);
    setProductSearch('');
    setShowProductSuggestions(false);
    setCurrentItem({ quantity: '', costPrice: '' });
  };

  const removeFromCart = (index) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const handleCompletePurchase = async () => {
    const user = auth.currentUser;
    if (!user || !selectedSupplier || cartItems.length === 0) return;

    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      const totalPurchaseAmount = cartItems.reduce((sum, item) => sum + item.total, 0);

      // 1. Create Purchase Records & Update Stock
      for (const item of cartItems) {
        // Record individual purchase entry
        const purchaseRef = doc(collection(db, 'purchases'));
        batch.set(purchaseRef, {
          supplierId: selectedSupplier.id,
          supplierName: selectedSupplier.name,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          costPrice: item.costPrice,
          totalCost: item.total,
          date: purchaseDate,
          userId: user.uid,
          createdAt: serverTimestamp()
        });

        // Increase Product Stock & Update Cost Price
        const productRef = doc(db, 'products', item.productId);
        batch.update(productRef, {
          stock: increment(item.quantity),
          costPrice: item.costPrice
        });
      }

      // 2. Handle Payment & Dues
      const paid = parseFloat(amountPaid) || 0;
      const dues = Math.max(0, totalPurchaseAmount - paid);

      if (paid > 0) {
        const paymentRef = doc(collection(db, 'payments'));
        batch.set(paymentRef, {
          userId: user.uid,
          supplierId: selectedSupplier.id,
          supplierName: selectedSupplier.name,
          amount: paid,
          type: 'Adaigi', // Supplier Payment
          method: paymentMethod,
          createdAt: serverTimestamp()
        });
      }

      // Update Supplier Balance (only by unpaid amount)
      const supplierRef = doc(db, 'suppliers', selectedSupplier.id);
      batch.update(supplierRef, {
        balance: increment(dues)
      });

      await batch.commit();
      
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Error recording purchase");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedSupplier(null);
    setSupplierSearch('');
    setCartItems([]);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setSelectedProduct(null);
    setProductSearch('');
    setCurrentItem({ quantity: '', costPrice: '' });
    setAmountPaid('');
    setPaymentMethod('Cash');
  };

  const filteredSuppliers = suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()));
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = p.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSupplier = filterSupplier === 'All' || p.supplierId === filterSupplier;
    return matchesSearch && matchesSupplier;
  });

  return (
    <Layout>
      <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>Stock Purchases</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem' }}>Log multiple stock arrivals in a single session.</p>
          </div>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={20} /> New Multi-Product Purchase
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" placeholder="Search purchases..." className="input-field" 
              style={{ width: '100%', paddingLeft: '2.8rem', borderRadius: '12px' }}
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="input-field" style={{ width: '200px', borderRadius: '12px' }} value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}>
            <option value="All">All Suppliers</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <th style={{ padding: '1rem' }}>DATE</th>
                <th style={{ padding: '1rem' }}>PRODUCT</th>
                <th style={{ padding: '1rem' }}>SUPPLIER</th>
                <th style={{ padding: '1rem' }}>QUANTITY</th>
                <th style={{ padding: '1rem' }}>COST</th>
                <th style={{ padding: '1rem' }}>TOTAL</th>
<th style={{ padding: '1rem' }}>BILL</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                  <td style={{ padding: '1.2rem 1rem' }}><Calendar size={14} color="var(--text-muted)" /> {p.date}</td>
                  <td style={{ padding: '1.2rem 1rem' }}><strong>{p.productName}</strong></td>
                  <td style={{ padding: '1.2rem 1rem' }}><Truck size={14} color="var(--primary)" /> {p.supplierName}</td>
                  <td style={{ padding: '1.2rem 1rem' }}><span style={{ backgroundColor: 'var(--bg-main)', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>+{p.quantity}</span></td>
                  <td style={{ padding: '1.2rem 1rem' }}>PKR {p.costPrice}</td>
                  <td style={{ padding: '1.2rem 1rem', fontWeight: 'bold', color: 'var(--primary)' }}>PKR {p.totalCost}</td>
<td style={{ padding: '1.2rem 1rem' }}>
  <button className="btn-primary" onClick={() => { setBillPurchase(p); setIsBillModalOpen(true); }}>Bill</button>
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
            <div className="glass-panel" style={{ width: '900px', maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0 }}>Multi-Product Purchase</h2>
                <X onClick={() => setIsModalOpen(false)} style={{ cursor: 'pointer' }} />
              </div>

              <div style={{ padding: '2rem', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                {/* Left Side: Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div ref={supplierRef} style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Supplier</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        className="input-field w-full" 
                        placeholder={selectedSupplier ? selectedSupplier.name : "Type to search supplier..."}
                        value={supplierSearch}
                        onChange={(e) => { setSupplierSearch(e.target.value); setShowSupplierSuggestions(true); }}
                      />
                      <Search size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    </div>
                    {showSupplierSuggestions && supplierSearch.length > 0 && (
                      <div style={{ 
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, 
                        marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', 
                        padding: '0.5rem', backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)'
                      }}>
                        {filteredSuppliers.map(s => (
                          <div 
                            key={s.id} 
                            onClick={() => { setSelectedSupplier(s); setSupplierSearch(''); setShowSupplierSuggestions(false); }}
                            style={{ padding: '0.75rem', cursor: 'pointer', borderRadius: '8px', transition: '0.2s' }}
                            onMouseOver={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                            onMouseOut={e => e.target.style.backgroundColor = 'transparent'}
                          >
                            <div style={{ fontWeight: '600' }}>{s.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.contact}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>Add Products</h4>
                    <div ref={productRef} style={{ position: 'relative', marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Product Name</label>
                      <input 
                        className="input-field w-full" 
                        placeholder={selectedProduct ? selectedProduct.name : "Type to search product..."}
                        value={productSearch}
                        onChange={(e) => { setProductSearch(e.target.value); setShowProductSuggestions(true); }}
                      />
                      {showProductSuggestions && productSearch.length > 0 && (
                        <div style={{ 
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, 
                          marginTop: '0.5rem', maxHeight: '250px', overflowY: 'auto', 
                          padding: '0.5rem', backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)'
                        }}>
                          {filteredProducts.map(p => (
                            <div 
                              key={p.id} 
                              onClick={() => { 
                                setSelectedProduct(p); 
                                setProductSearch(''); 
                                setShowProductSuggestions(false);
                                setCurrentItem({ ...currentItem, costPrice: p.costPrice || '' });
                              }}
                              style={{ padding: '0.6rem', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                              onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--bg-main)', overflow: 'hidden' }}>
                                {p.imageUrl ? <img src={p.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={16} opacity={0.3} /></div>}
                              </div>
                              <div>
                                <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{p.name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stock: {p.stock} | PKR {p.costPrice || 0}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quantity</label>
                        <input type="number" className="input-field w-full" value={currentItem.quantity} onChange={e => setCurrentItem({...currentItem, quantity: e.target.value})} placeholder="0" />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unit Cost</label>
                        <input type="number" className="input-field w-full" value={currentItem.costPrice} onChange={e => setCurrentItem({...currentItem, costPrice: e.target.value})} placeholder="0" />
                      </div>
                    </div>

                    <button 
                      onClick={addToCart}
                      disabled={!selectedProduct || !currentItem.quantity}
                      className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <Plus size={18} /> Add to Purchase List
                    </button>
                  </div>
                </div>

                {/* Right Side: List & Total */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '2rem' }}>
                  <div style={{ flex: 1, overflowY: 'auto', minHeight: '300px' }}>
                    <h4 style={{ margin: '0 0 1rem 0' }}>Purchase List</h4>
                    {cartItems.length === 0 ? (
                      <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '2px dashed var(--border-color)', borderRadius: '15px' }}>
                        No items added yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {cartItems.map((item, idx) => (
                          <div key={idx} className="glass-panel" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '12px' }}>
                             <div style={{ width: '36px', height: '36px', borderRadius: '6px', overflow: 'hidden' }}>
                               {item.imageUrl ? <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={14} style={{ margin: '11px', opacity: 0.3 }} />}
                             </div>
                             <div style={{ flex: 1 }}>
                               <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{item.productName}</div>
                               <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.quantity} x {item.costPrice}</div>
                             </div>
                             <div style={{ fontWeight: 'bold' }}>PKR {item.total}</div>
                             <Trash2 size={16} color="var(--danger)" style={{ cursor: 'pointer' }} onClick={() => removeFromCart(idx)} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.5rem', borderRadius: '20px', marginTop: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payment Method</label>
                        <div style={{ display: 'flex', gap: '0.3rem', backgroundColor: 'var(--bg-surface)', padding: '0.2rem', borderRadius: '8px' }}>
                          {['Cash', 'Bank'].map(m => (
                            <button key={m} onClick={() => setPaymentMethod(m)} style={{ flex: 1, padding: '0.4rem', fontSize: '0.7rem', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: paymentMethod === m ? 'var(--primary)' : 'transparent', color: paymentMethod === m ? 'white' : 'var(--text-muted)' }}>{m}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Amount Paid</label>
                        <input type="number" className="input-field w-full" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder="0" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total Payable:</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)' }}>PKR {cartItems.reduce((s, i) => s + i.total, 0).toLocaleString()}</span>
                    </div>
                    <button 
                      onClick={handleCompletePurchase}
                      disabled={isLoading || cartItems.length === 0 || !selectedSupplier}
                      className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1.2rem', fontSize: '1rem' }}
                    >
                      {isLoading ? 'Processing...' : 'Confirm & Log Purchase'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
{isBillModalOpen && billPurchase && (
  <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
    <div className="glass-panel" style={{ width: '500px', maxWidth: '100%', backgroundColor: 'var(--bg-main)', padding: '2rem', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Purchase Bill</h2>
        <X onClick={() => setIsBillModalOpen(false)} style={{ cursor: 'pointer' }} />
      </div>
      <div style={{ marginTop: '1rem' }}>
        <p><strong>Supplier:</strong> {billPurchase.supplierName}</p>
        <p><strong>Product:</strong> {billPurchase.productName}</p>
        <p><strong>Quantity:</strong> {billPurchase.quantity}</p>
        <p><strong>Unit Cost:</strong> PKR {billPurchase.costPrice}</p>
        <p><strong>Total:</strong> PKR {billPurchase.totalCost}</p>
        <p><strong>Amount Paid:</strong> PKR {billPurchase.amountPaid || 0}</p>
        <p><strong>Due:</strong> PKR {Math.max(0, billPurchase.totalCost - (billPurchase.amountPaid || 0))}</p>
      </div>
      <button className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} onClick={() => window.print()}>Print</button>
    </div>
  </div>
)}
    </Layout>
  );
}
