import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { Search, Plus, X, Phone, MapPin, Wallet, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { db, auth, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, where, doc, updateDoc, deleteDoc } from './db';

export default function Suppliers() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [supplierToDelete, setSupplierToDelete] = useState(null);

  // Suppliers List State
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Suppliers from Firebase
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'suppliers'), 
      where('userId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const suppData = [];
      snapshot.forEach((doc) => {
        suppData.push({ id: doc.id, ...doc.data() });
      });
      // Sort by createdAt desc manually to avoid needing a Firestore composite index
      suppData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setSuppliers(suppData);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!name || !phone) return;

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in to save a supplier.");
        return;
      }

      const data = {
        name,
        phone,
        address,
        userId: user.uid,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'suppliers', editingId), data);
      } else {
        await addDoc(collection(db, 'suppliers'), {
          ...data,
          balance: 0,
          createdAt: serverTimestamp()
        });
      }
      
      resetForm();
    } catch (error) {
      console.error("Error saving supplier: ", error);
      alert("Error saving supplier. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setAddress('');
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEdit = (supplier) => {
    setName(supplier.name);
    setPhone(supplier.phone);
    setAddress(supplier.address || '');
    setEditingId(supplier.id);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (supplier) => {
    setSupplierToDelete(supplier);
  };

  const confirmDelete = async () => {
    if (!supplierToDelete) return;
    try {
      await deleteDoc(doc(db, 'suppliers', supplierToDelete.id));
      setSupplierToDelete(null);
    } catch (error) {
      console.error("Error deleting supplier: ", error);
      alert("Failed to delete supplier.");
    }
  };

  const filteredSuppliers = suppliers.filter(sup => 
    sup.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    sup.phone.includes(searchTerm)
  );

  return (
    <Layout>
      <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        
        {/* Top Section */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
            <Search size={22} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search Suppliers by name or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field" 
              style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', fontSize: '1.1rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} 
            />
          </div>
          <button 
            className="btn-primary" 
            style={{ padding: '1rem 1.5rem', fontSize: '1.1rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)' }}
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={22} /> Add + Supplier
          </button>
        </div>

        {/* Suppliers List Area */}
        {suppliers.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.1rem' }}>No suppliers added yet. Click "Add + Supplier" to create one.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {filteredSuppliers.map((supplier) => (
              <div key={supplier.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'transform 0.2s', cursor: 'default' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', color: 'var(--text-main)' }}>{supplier.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <Phone size={14} /> {supplier.phone}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleEdit(supplier)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }} title="Edit"><Edit3 size={18} /></button>
                      <button onClick={() => handleDeleteClick(supplier)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem' }} title="Delete"><Trash2 size={18} /></button>
                    </div>
                  </div>

                {supplier.address && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', color: 'var(--text-muted)', fontSize: '0.85rem', backgroundColor: 'var(--bg-main)', padding: '0.75rem', borderRadius: '8px' }}>
                    <MapPin size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                    <span>{supplier.address}</span>
                  </div>
                )}
              </div>
            ))}
            
            {filteredSuppliers.length === 0 && suppliers.length > 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No suppliers match your search.
              </div>
            )}
          </div>
        )}

      </div>

      {/* Glassy Modal Form */}
      {isModalOpen && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass-panel" style={{ 
            width: '450px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem',
            backgroundColor: 'var(--bg-surface)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary)' }}>{editingId ? 'Edit Supplier' : 'Add New Supplier'}</h2>
              <button onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}>
                <X size={24} />
              </button>
            </div>

            <form style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onSubmit={handleSaveSupplier}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Supplier Name *</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field" 
                  placeholder="e.g., Ahsan Perfumers" 
                  required 
                  style={{ padding: '0.75rem 1rem' }} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Phone Number *</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field" 
                  placeholder="0300-XXXXXXX" 
                  required 
                  style={{ padding: '0.75rem 1rem' }} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Shop Address (Optional)</label>
                <textarea 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input-field" 
                  placeholder="Full address of the shop/company" 
                  rows="3" 
                  style={{ resize: 'none', padding: '0.75rem 1rem' }}
                ></textarea>
              </div>

              <button disabled={isLoading} type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', padding: '1rem', fontSize: '1rem', opacity: isLoading ? 0.7 : 1 }}>
                {isLoading ? 'Saving...' : 'Save Supplier'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {supplierToDelete && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass-panel" style={{ 
            width: '400px', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem',
            backgroundColor: 'var(--bg-surface)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
              <AlertTriangle size={32} />
            </div>
            
            <div>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem' }}>Delete Supplier?</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                Are you sure you want to delete <strong>{supplierToDelete.name}</strong>? This action cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '0.5rem' }}>
              <button 
                onClick={() => setSupplierToDelete(null)} 
                style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: '500', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                className="btn-primary"
                style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', backgroundColor: 'var(--danger)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
