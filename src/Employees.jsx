import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { 
  Users, UserPlus, Shield, DollarSign, Trash2, Edit3, 
  Search, CheckCircle, X, BadgeCheck, UserCog, Upload, Image as ImageIcon, AlertTriangle
} from 'lucide-react';
import { db, auth, collection, addDoc, onSnapshot, query, where, serverTimestamp, updateDoc, doc, deleteDoc } from './db';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({ name: '', role: 'Staff', salary: '', phone: '', imageUrl: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, 'employees'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    setIsLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'employees', editingId), formData);
      } else {
        await addDoc(collection(db, 'employees'), {
          ...formData,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setFormData({ name: '', role: 'Staff', salary: '', phone: '' });
      setEditingId(null);
    } catch (err) { console.error(err); alert("Error saving employee"); }
    finally { setIsLoading(false); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
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

  const handleEdit = (emp) => {
    setFormData({ name: emp.name, role: emp.role, salary: emp.salary, phone: emp.phone, imageUrl: emp.imageUrl || '' });
    setEditingId(emp.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    setEmployeeToDelete(id);
  };

  const confirmDelete = async () => {
    if (employeeToDelete) {
      await deleteDoc(doc(db, 'employees', employeeToDelete));
      setEmployeeToDelete(null);
    }
  };

  return (
    <Layout>
      <div style={{ padding: '2rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800' }}>Staff Management</h1>
            <p style={{ color: 'var(--text-muted)' }}>Manage your team and their access roles.</p>
          </div>
          <button className="btn-primary" onClick={() => { setEditingId(null); setFormData({ name: '', role: 'Staff', salary: '', phone: '', imageUrl: '' }); setIsModalOpen(true); }}>
            <UserPlus size={20} /> Add Employee
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="glass-panel" style={{ padding: '1.2rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" placeholder="Search by name or role..." className="input-field" 
              style={{ width: '100%', paddingLeft: '3rem', borderRadius: '10px' }} 
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ padding: '0.6rem 1rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Total Team: <b>{employees.length}</b>
            </div>
          </div>
        </div>

        {/* Employees Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.role.toLowerCase().includes(searchTerm.toLowerCase())).map(emp => (
            <div key={emp.id} className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ 
                position: 'absolute', top: 0, right: 0, padding: '0.5rem 1rem', 
                backgroundColor: emp.role === 'Admin' ? '#d4af37' : '#6b7280', 
                color: emp.role === 'Admin' ? 'black' : 'white', 
                fontSize: '0.7rem', fontWeight: 'bold', borderBottomLeftRadius: '12px' 
              }}>
                {emp.role.toUpperCase()}
              </div>
              
              <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ 
                  width: '84px', 
                  height: '84px', 
                  backgroundColor: 'rgba(0, 0, 0, 0.25)', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'var(--primary)', 
                  overflow: 'hidden',
                  border: '2.5px solid var(--primary)',
                  boxShadow: '0 6px 16px rgba(212, 175, 55, 0.18)',
                  flexShrink: 0
                }}>
                  {emp.imageUrl ? (
                    <img src={emp.imageUrl} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    emp.role === 'Admin' ? <Shield size={36} /> : <Users size={36} />
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{emp.name}</h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{emp.phone || 'No Phone'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '0.8rem', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>MONTHLY SALARY</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                    {emp.role === 'Admin' ? 'N/A (Owner)' : `PKR ${parseFloat(emp.salary).toLocaleString()}`}
                  </div>
                </div>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '0.8rem', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>ACCESS STATUS</div>
                  <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                    <BadgeCheck size={14} color="var(--primary)" /> Active
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button onClick={() => handleEdit(emp)} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '0.6rem', fontSize: '0.85rem', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-main)' }}>
                  <Edit3 size={16} /> Edit
                </button>
                <button onClick={() => handleDelete(emp.id)} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '0.6rem', fontSize: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                  <Trash2 size={16} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ width: '450px', padding: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ margin: 0 }}>{editingId ? 'Edit Employee' : 'Add New Employee'}</h2>
                <X onClick={() => setIsModalOpen(false)} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} />
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Employee Name</label>
                  <input required className="input-field w-full" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Role</label>
                    <select className="input-field w-full" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={{ appearance: 'none' }}>
                      <option value="Staff">Staff</option>
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Monthly Salary</label>
                    <input required={formData.role !== 'Admin'} type="number" className="input-field w-full" placeholder={formData.role === 'Admin' ? 'Optional' : 'PKR'} value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Phone Number</label>
                  <input className="input-field w-full" placeholder="03xx xxxxxxx" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Profile Image (URL or Upload)</label>
                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <input className="input-field" style={{ flex: 1 }} placeholder="Paste image URL..." value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
                    <label className="btn-primary" style={{ padding: '0 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px', margin: 0 }}>
                      <Upload size={16} /> Upload
                      <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                   <button type="submit" disabled={isLoading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}>
                     {isLoading ? 'Processing...' : (editingId ? 'Update Details' : 'Register Employee')}
                   </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Custom Delete Confirmation Modal */}
      {employeeToDelete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="glass-panel" style={{ width: '420px', padding: '2.5rem', textAlign: 'center', border: '1px solid var(--danger)' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--danger)' }}>
              <AlertTriangle size={36} />
            </div>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.6rem', fontWeight: '800', color: 'white' }}>Remove Staff?</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>
              Kya aap waqai is staff member ko delete karna chahte hain? Isse unka <strong style={{ color: '#ef4444' }}>record aur details permanent delete</strong> ho jayengi. Yeh action wapas nahi liya ja sakta.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setEmployeeToDelete(null)}
                style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: '600' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{ flex: 1.2, padding: '1rem', borderRadius: '14px', backgroundColor: 'var(--danger)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '800', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}
              >
                Haan, Delete Karo!
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}
