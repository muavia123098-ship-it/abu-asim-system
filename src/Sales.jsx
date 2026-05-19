import React, { useState, useEffect, useRef } from 'react';
import Layout from './Layout';
import { 
  Search, ShoppingCart, Plus, Minus, Trash2, User, Phone, 
  CheckCircle, Printer, X, CreditCard, Banknote, Tag, 
  ChevronRight, Download, Receipt, Wallet, Image as ImageIcon,
  Wifi, WifiOff, ScanLine
} from 'lucide-react';
import { db, auth, collection, addDoc, onSnapshot, query, where, serverTimestamp, updateDoc, doc, deleteDoc, getDocs, runTransaction, getDoc } from './db';
import { toBlob } from 'html-to-image';
import { getFirebaseDb, getSessionId, generateSessionId } from './firebase';
import { ref, onValue, set, onDisconnect, off } from 'firebase/database';

export default function Sales() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState({ name: '', phone: '', id: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [saleCompleted, setSaleCompleted] = useState(null);
  
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [saleType, setSaleType] = useState('Physical');
  const [isCopying, setIsCopying] = useState(false);
  
  const invoiceRef = useRef(null);

  // ─── Scanner State ───
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('offline'); // offline, connected, linked
  const [sessionId, setSessionId] = useState('');
  const [lastScannedProduct, setLastScannedProduct] = useState(null);
  const lastBarcodeTimestamp = useRef(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    onSnapshot(query(collection(db, 'products'), where('userId', '==', user.uid)), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    onSnapshot(query(collection(db, 'customers'), where('userId', '==', user.uid)), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  // ─── Scanner Firebase Listener ───
  useEffect(() => {
    if (!scannerEnabled) return;

    const firebaseDb = getFirebaseDb();
    if (!firebaseDb) {
      setScannerStatus('offline');
      return;
    }

    const sid = getSessionId();
    setSessionId(sid);

    // Mark desktop as active
    const desktopRef = ref(firebaseDb, `sessions/${sid}/desktop_active`);
    set(desktopRef, true);
    onDisconnect(desktopRef).set(false);
    setScannerStatus('connected');

    // Listen for mobile heartbeat
    const mobileRef = ref(firebaseDb, `sessions/${sid}/mobile_active`);
    const mobileUnsub = onValue(mobileRef, (snap) => {
      if (snap.val() === true) {
        setScannerStatus('linked');
      } else {
        setScannerStatus('connected');
      }
    });

    // ★ CORE: Listen for incoming barcodes
    const barcodeRef = ref(firebaseDb, `sessions/${sid}/barcode`);
    const timestampRef = ref(firebaseDb, `sessions/${sid}/barcode_timestamp`);

    const barcodeUnsub = onValue(timestampRef, (snap) => {
      const ts = snap.val();
      if (!ts || ts <= lastBarcodeTimestamp.current) return;
      lastBarcodeTimestamp.current = ts;

      // Read the barcode value
      onValue(barcodeRef, (bSnap) => {
        const barcodeText = bSnap.val();
        if (!barcodeText) return;
        matchAndAddToCart(barcodeText);
      }, { onlyOnce: true });
    });

    return () => {
      set(desktopRef, false);
      off(mobileRef);
      off(timestampRef);
      setScannerStatus('offline');
    };
  }, [scannerEnabled, products]);

  // ─── Smart Product Matching (milliseconds) ───
  const matchAndAddToCart = (barcodeText) => {
    if (!barcodeText || products.length === 0) return;

    const text = barcodeText.toLowerCase().trim();
    // Try splitting by common delimiters: | , - _ /
    const parts = text.split(/[|\-_\/,;]+/).map(p => p.trim()).filter(Boolean);

    let bestMatch = null;
    let bestScore = 0;

    for (const product of products) {
      let score = 0;
      const pName = (product.name || '').toLowerCase();
      const pBrand = (product.brand || '').toLowerCase();
      const pVolume = String(product.volume || '').toLowerCase();
      const pSku = (product.sku || '').toLowerCase();

      // Exact SKU match = instant win
      if (pSku && (text === pSku || parts.includes(pSku))) {
        bestMatch = product;
        bestScore = 100;
        break;
      }

      // Check each part against product fields
      for (const part of parts) {
        if (pName.includes(part) || part.includes(pName)) score += 40;
        if (pBrand && (pBrand.includes(part) || part.includes(pBrand))) score += 30;
        if (pVolume && (part.includes(pVolume) || part === pVolume + 'ml')) score += 30;
      }

      // Also check full text contains
      if (text.includes(pName)) score += 20;
      if (pBrand && text.includes(pBrand)) score += 15;
      if (pVolume && text.includes(pVolume)) score += 15;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = product;
      }
    }

    if (bestMatch && bestScore >= 30) {
      addToCart(bestMatch);
      setLastScannedProduct({ name: bestMatch.name, time: Date.now() });
      // Auto-clear notification after 2s
      setTimeout(() => setLastScannedProduct(null), 2500);
    } else {
      alert(`⚠️ Barcode "${barcodeText}" se koi product match nahi hua. Product name, brand ya volume check karein.`);
    }
  };

  const isWalkIn = selectedCustomer.id === 'guest';

  const addToCart = (product) => {
    if (product.stock <= 0) return alert("Out of stock!");
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return alert("Insufficient stock!");
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        const prod = products.find(p => p.id === id);
        if (newQty > 0 && newQty <= prod.stock) return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  const total = subtotal - (parseFloat(discount) || 0);
  const cashReceived = isWalkIn ? total : (parseFloat(amountPaid) || 0);
  const balanceDue = total - cashReceived;

  const copyInvoice = async () => {
    if (!invoiceRef.current) return;
    setIsCopying(true);
    try {
      const blob = await toBlob(invoiceRef.current, { backgroundColor: '#ffffff', style: { color: '#000' } });
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      alert("Invoice copied!");
    } catch (err) { console.error(err); alert("Error copying."); }
    finally { setIsCopying(false); }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    // Validate that a customer is selected or "Walk-in" is clicked
    if (!selectedCustomer.id) {
      return alert("⚠️ Please select a Customer from the dropdown or click the 'Walk-in' button first.");
    }

    const user = auth.currentUser;
    if (!user) return;

    setIsProcessing(true);
    try {
      const profit = cart.reduce((sum, item) => sum + ((item.sellingPrice - item.costPrice) * item.quantity), 0) - (parseFloat(discount) || 0);
      
      // ATOMIC TRANSACTION
      await runTransaction(db, async (transaction) => {
        // 1. Prepare Doc Refs
        const saleRef = doc(collection(db, 'sales'));
        const paymentRef = doc(collection(db, 'payments'));
        const statsRef = doc(db, 'stats', user.uid);
        
        // 2. Checks & Reads
        const productUpdates = [];
        for (const item of cart) {
          const pRef = doc(db, 'products', item.id);
          const pDoc = await transaction.get(pRef);
          if (!pDoc.exists()) throw "Product not found!";
          if (pDoc.data().stock < item.quantity) throw `Insufficient stock for ${item.name}!`;
          productUpdates.push({ ref: pRef, newStock: pDoc.data().stock - item.quantity });
        }

        const statsDoc = await transaction.get(statsRef);

        // 3. Writes
        // Save Sale
        transaction.set(saleRef, {
          userId: user.uid,
          items: cart.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.sellingPrice, cost: i.costPrice })),
          subtotal,
          discount: parseFloat(discount) || 0,
          total,
          profit,
          customerName: selectedCustomer.name || 'Walk-in Customer',
          customerPhone: selectedCustomer.phone || 'Guest',
          customerId: selectedCustomer.id || null,
          paymentMethod,
          saleType,
          createdAt: serverTimestamp()
        });

        // Save Payment (If cash received)
        if (cashReceived > 0) {
          transaction.set(paymentRef, {
            userId: user.uid,
            customerId: selectedCustomer.id || null,
            customerPhone: selectedCustomer.phone || 'Guest',
            saleId: saleRef.id,
            amount: cashReceived,
            type: 'Sale Payment',
            method: paymentMethod,
            createdAt: serverTimestamp()
          });
        }

        // Update Stocks
        productUpdates.forEach(u => transaction.update(u.ref, { stock: u.newStock }));

        // Update Global Stats
        if (statsDoc.exists()) {
          transaction.update(statsRef, {
            totalSales: (statsDoc.data().totalSales || 0) + total,
            totalProfit: (statsDoc.data().totalProfit || 0) + profit,
            totalOrders: (statsDoc.data().totalOrders || 0) + 1
          });
        } else {
          transaction.set(statsRef, { totalSales: total, totalProfit: profit, totalOrders: 1 });
        }

        // 4. Update local state after success
        if (!isWalkIn) {
          setSaleCompleted({ 
            id: saleRef.id, 
            total, 
            amountPaid: cashReceived, 
            balanceDue, 
            customerName: selectedCustomer.name || 'Walk-in Customer',
            items: cart 
          });
        } else {
          // Sale completed silently for walk-in
        }
      });

      setCart([]); setDiscount(0); setAmountPaid(''); setSelectedCustomer({ name: '', phone: '', id: '' });
    } catch (err) {
      console.error(err);
      alert(typeof err === 'string' ? err : "Transaction failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* UI remains same as previous version but with new handleCheckout */}
        <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', borderRight: '1px solid var(--border-color)' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Create New Sale</h1>
              {/* Scanner Toggle */}
              <button 
                onClick={() => setScannerEnabled(!scannerEnabled)} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 1rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  backgroundColor: scannerEnabled ? 'rgba(34,197,94,0.15)' : 'var(--bg-surface)',
                  color: scannerEnabled ? '#22c55e' : 'var(--text-muted)',
                  fontWeight: '600', fontSize: '0.8rem', transition: 'all 0.2s'
                }}
              >
                <ScanLine size={18} />
                {scannerEnabled ? 'Scanner ON' : 'Scanner OFF'}
              </button>
            </div>

            {/* Scanner Status Bar */}
            {scannerEnabled && (
              <div style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.7rem 1rem', borderRadius: '10px', marginBottom: '1rem',
                background: scannerStatus === 'linked' ? 'rgba(34,197,94,0.08)' : 'rgba(212,175,55,0.08)',
                border: `1px solid ${scannerStatus === 'linked' ? 'rgba(34,197,94,0.3)' : 'rgba(212,175,55,0.3)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {scannerStatus === 'linked' ? <Wifi size={16} color="#22c55e" /> : <WifiOff size={16} color="var(--primary)" />}
                  <span style={{ fontSize: '0.8rem', fontWeight: '600', color: scannerStatus === 'linked' ? '#22c55e' : 'var(--primary)' }}>
                    {scannerStatus === 'linked' ? '📱 Mobile Scanner Connected' : scannerStatus === 'connected' ? '⏳ Waiting for Mobile...' : '❌ Offline'}
                  </span>
                </div>
                <div style={{ 
                  padding: '0.3rem 0.8rem', borderRadius: '6px', 
                  background: 'var(--bg-surface)', fontSize: '0.75rem', fontWeight: '700',
                  color: 'var(--primary)', letterSpacing: '1px'
                }}>
                  {sessionId}
                </div>
              </div>
            )}

            {/* Scan Success Toast */}
            {lastScannedProduct && (
              <div style={{ 
                padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1rem',
                background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                color: '#22c55e', fontSize: '0.8rem', fontWeight: '600',
                animation: 'fadeIn 0.3s ease'
              }}>
                ✅ Scanned: {lastScannedProduct.name} — Added to Cart!
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Search products..." className="input-field" style={{ width: '100%', paddingLeft: '3rem', borderRadius: '12px' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
              <div key={p.id} onClick={() => addToCart(p)} className="glass-panel" style={{ padding: '1.2rem', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '100px', height: '100px', backgroundColor: 'var(--bg-main)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={32} color="var(--text-muted)" />
                  )}
                </div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', marginTop: '0.5rem' }}>{p.name}</div>
                <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem' }}>PKR {p.sellingPrice}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: '450px', backgroundColor: 'var(--bg-surface)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
             <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Receipt size={20} /> Checkout</h2>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: 'var(--bg-main)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Customer</span>
                <button onClick={() => setSelectedCustomer({ name: 'Walk-in Customer', phone: 'Guest', id: 'guest' })} style={{ fontSize: '0.7rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '5px', cursor: 'pointer' }}>Walk-in</button>
              </div>
              <div style={{ position: 'relative' }}>
                <input className="input-field" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} placeholder="Search Name" value={selectedCustomer.name} onChange={e => setSelectedCustomer({ name: e.target.value, phone: '', id: '' })} />
                {selectedCustomer.name && selectedCustomer.id !== 'guest' && !customers.find(c => c.name === selectedCustomer.name) && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 10 }}>
                    {customers.filter(c => c.name.toLowerCase().includes(selectedCustomer.name.toLowerCase())).slice(0, 3).map(c => (
                      <div key={c.id} onClick={() => setSelectedCustomer({ name: c.name, phone: c.phone, id: c.id })} style={{ padding: '0.8rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>{c.name} ({c.phone})</div>
                    ))}
                  </div>
                )}
              </div>
              <input className="input-field" style={{ width: '100%', padding: '0.5rem' }} placeholder="Phone" value={selectedCustomer.phone} readOnly={selectedCustomer.id === 'guest'} onChange={e => setSelectedCustomer({...selectedCustomer, phone: e.target.value})} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-main)', padding: '0.75rem', borderRadius: '10px', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-color)' }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon size={18} color="var(--text-muted)" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{item.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>PKR {item.sellingPrice} x {item.quantity}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--bg-surface)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                      <Minus size={14} style={{ cursor: 'pointer' }} onClick={() => updateQuantity(item.id, -1)} />
                      <span>{item.quantity}</span>
                      <Plus size={14} style={{ cursor: 'pointer' }} onClick={() => updateQuantity(item.id, 1)} />
                    </div>
                    <Trash2 size={16} color="var(--danger)" style={{ cursor: 'pointer' }} onClick={() => setCart(cart.filter(i => i.id !== item.id))} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-main)', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
               <div>
                 <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Sale Type</div>
                 <div style={{ display: 'flex', gap: '0.3rem', backgroundColor: 'var(--bg-surface)', padding: '0.2rem', borderRadius: '8px' }}>
                    {['Physical', 'Online'].map(t => (
                      <button key={t} onClick={() => setSaleType(t)} style={{ flex: 1, padding: '0.4rem', fontSize: '0.7rem', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: saleType === t ? 'var(--primary)' : 'transparent', color: saleType === t ? 'white' : 'var(--text-muted)' }}>{t}</button>
                    ))}
                 </div>
               </div>
               <div>
                 <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Payment Method</div>
                 <div style={{ display: 'flex', gap: '0.3rem', backgroundColor: 'var(--bg-surface)', padding: '0.2rem', borderRadius: '8px' }}>
                    {['Cash', 'Bank'].map(m => (
                      <button key={m} onClick={() => setPaymentMethod(m)} style={{ flex: 1, padding: '0.4rem', fontSize: '0.7rem', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: paymentMethod === m ? 'var(--primary)' : 'transparent', color: paymentMethod === m ? 'white' : 'var(--text-muted)' }}>{m}</button>
                    ))}
                 </div>
               </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
               <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Discount</div><input type="number" className="input-field w-full" value={discount} onChange={e => setDiscount(e.target.value)} /></div>
               {!isWalkIn && (
                 <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Naqad Diye</div><input type="number" className="input-field w-full" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder={total} /></div>
               )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '1.2rem' }}><span>Total</span><span style={{ color: 'var(--primary)' }}>PKR {total}</span></div>
            <button disabled={cart.length === 0 || isProcessing} onClick={handleCheckout} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}>{isProcessing ? 'Processing...' : 'Complete Sale'}</button>
          </div>
        </div>

        {saleCompleted && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
             <div ref={invoiceRef} style={{ 
               width: '420px', 
               padding: '2rem', 
               backgroundColor: '#ffffff', 
               color: '#000000', 
               borderRadius: '16px',
               boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
               fontFamily: "'Plus Jakarta Sans', sans-serif"
             }}>
                <h2 style={{ textAlign: 'center', margin: '0 0 1rem 0', fontFamily: "'Outfit', sans-serif", fontWeight: '800', letterSpacing: '0.5px' }}>ABU ASIM INVOICE</h2>
                <div style={{ marginBottom: '1.2rem', fontSize: '0.9rem', color: '#000000', borderBottom: '1px solid #ddd', paddingBottom: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div><b>Customer:</b> {saleCompleted.customerName}</div>
                  <div><b>Date:</b> {new Date().toLocaleDateString('en-PK', { dateStyle: 'long' })}</div>
                </div>
                <table style={{ width: '100%', marginBottom: '1.2rem', fontSize: '0.85rem', color: '#000000', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #000000', textAlign: 'left' }}>
                      <th style={{ padding: '0.4rem 0' }}>Item</th>
                      <th style={{ padding: '0.4rem 0', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '0.4rem 0', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleCompleted.items.map((i, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px dashed #eee' }}>
                        <td style={{ padding: '0.4rem 0', fontWeight: '500' }}>{i.name}</td>
                        <td style={{ padding: '0.4rem 0', textAlign: 'center' }}>{i.quantity}</td>
                        <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: '700' }}>{((i.sellingPrice || i.price) * i.quantity).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ textAlign: 'right', borderTop: '1.5px solid #000000', paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.9rem', color: '#000000' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#444' }}>Total:</span><span>PKR {saleCompleted.total.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#444' }}>Received:</span><span>PKR {saleCompleted.amountPaid.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1rem', borderTop: '1px dashed #ddd', paddingTop: '0.3rem', marginTop: '0.2rem' }}>
                    <span>Baqaya:</span><span>PKR {saleCompleted.balanceDue.toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button disabled={isCopying} className="btn-primary" style={{ flex: 1, justifyContent: 'center', backgroundColor: '#25D366', color: '#ffffff !important' }} onClick={copyInvoice}>{isCopying ? '...' : 'WhatsApp'}</button>
                  <button onClick={() => setSaleCompleted(null)} style={{ flex: 1, backgroundColor: '#f1f1f1', color: '#000000', border: '1px solid #ddd', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
                </div>
             </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
