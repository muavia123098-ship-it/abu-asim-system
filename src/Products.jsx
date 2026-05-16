import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { 
  Search, Plus, X, Box, Tag, DollarSign, Package, 
  AlertTriangle, Edit3, Trash2, Filter, Image as ImageIcon,
  FlaskConical, Briefcase, BarChart2, Upload
} from 'lucide-react';
import { db, auth, collection, addDoc, onSnapshot, query, where, serverTimestamp, updateDoc, doc, deleteDoc } from './db';

export default function Products() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Perfume',
    brand: '',
    costPrice: '',
    sellingPrice: '',
    stock: '',
    minStock: '5',
    sku: '',
    volume: '',
    imageUrl: ''
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, 'products'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  const resetForm = () => {
    setFormData({
      name: '', category: 'Perfume', brand: '', costPrice: '',
      sellingPrice: '', stock: '', minStock: '5', sku: '',
      volume: '', imageUrl: ''
    });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleOpenEdit = (product) => {
    setFormData(product);
    setEditingId(product.id);
    setIsModalOpen(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400; // Resize to max 400px to save local storage space
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setFormData({ ...formData, imageUrl: dataUrl });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    setIsLoading(true);
    try {
      const data = {
        ...formData,
        costPrice: parseFloat(formData.costPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        stock: parseInt(formData.stock),
        minStock: parseInt(formData.minStock),
        userId: user.uid,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), data);
      } else {
        await addDoc(collection(db, 'products'), { ...data, createdAt: serverTimestamp() });
      }
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Error saving product");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Layout>
      <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)' }}>Fragrance Inventory</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Detailed management of your perfumes, oils, and attars.</p>
          </div>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)} style={{ padding: '0.8rem 1.5rem', borderRadius: '12px' }}>
            <Plus size={20} /> Add New Fragrance
          </button>
        </div>

        {/* Filters & Search */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by name, brand or SKU..." 
              className="input-field"
              style={{ width: '100%', paddingLeft: '3rem', borderRadius: '12px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="input-field" style={{ width: '180px', borderRadius: '12px' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option>All</option>
            {[...new Set(products.map(p => p.category))].filter(Boolean).map(cat => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Product Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
          {filteredProducts.map(product => {
            const margin = product.sellingPrice - product.costPrice;
            const marginPercent = ((margin / product.sellingPrice) * 100).toFixed(1);
            
            return (
              <div key={product.id} className="glass-panel" style={{ padding: '1rem', transition: 'all 0.2s', position: 'relative' }}>
                <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1rem' }}>
                  <div style={{ width: '60px', height: '60px', backgroundColor: 'var(--bg-main)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {product.imageUrl ? <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={24} color="var(--text-muted)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.brand || 'No Brand'}</div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</h3>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '0.3rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                      <span>{product.volume}ml</span> | <span>{product.sku || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.5rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Purchase</div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Rs {product.costPrice}</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.5rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sale</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.85rem' }}>Rs {product.sellingPrice}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Stock Status</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 'bold', fontSize: '0.8rem', color: product.stock <= product.minStock ? 'var(--danger)' : 'var(--success)' }}>
                      <Package size={14} /> {product.stock} units
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Profit Margin</div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--success)' }}>{marginPercent}%</div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleOpenEdit(product)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}><Edit3 size={16} /></button>
                  <button onClick={() => handleDelete(product.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.2rem' }}><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ width: '600px', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h2 style={{ margin: 0 }}>{editingId ? 'Edit Product' : 'Add New Fragrance'}</h2>
                <X onClick={resetForm} style={{ cursor: 'pointer' }} />
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Product Name *</label>
                    <input required className="input-field w-full" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Oudh Intense" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Brand</label>
                    <input className="input-field w-full" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} placeholder="e.g. Abu Asim" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.2rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Category</label>
                    <input 
                      list="category-list" 
                      className="input-field w-full" 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})} 
                      placeholder="Select or type category"
                    />
                    <datalist id="category-list">
                      <option value="Perfume" />
                      <option value="Oud" />
                      <option value="Attar" />
                      <option value="Bakhoor" />
                      {[...new Set(products.map(p => p.category))].filter(cat => !['Perfume', 'Oud', 'Attar', 'Bakhoor'].includes(cat)).map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Volume (ml)</label>
                    <input className="input-field w-full" value={formData.volume} onChange={e => setFormData({...formData, volume: e.target.value})} placeholder="e.g. 100" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>SKU Code</label>
                    <input className="input-field w-full" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="e.g. OUD-001" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Cost Price (PKR)</label>
                    <input required type="number" className="input-field w-full" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Sale Price (PKR)</label>
                    <input required type="number" className="input-field w-full" value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Current Stock</label>
                    <input required type="number" className="input-field w-full" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Low Stock Alert At</label>
                    <input required type="number" className="input-field w-full" value={formData.minStock} onChange={e => setFormData({...formData, minStock: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Product Image (URL or Upload from Device)</label>
                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <input className="input-field" style={{ flex: 1 }} value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} placeholder="Paste URL or click Upload..." />
                    <label className="btn-primary" style={{ padding: '0 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px', margin: 0 }}>
                      <Upload size={16} /> Upload Image
                      <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
                    </label>
                  </div>
                  {formData.imageUrl && formData.imageUrl.startsWith('data:image') && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--success)', marginTop: '0.4rem' }}>✓ Image loaded successfully</div>
                  )}
                </div>

                <button type="submit" disabled={isLoading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem', marginTop: '1rem' }}>
                  {isLoading ? 'Saving...' : editingId ? 'Update Product' : 'Add Product'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
