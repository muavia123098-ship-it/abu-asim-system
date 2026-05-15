import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { 
  Users, UserPlus, Shield, DollarSign, Trash2, Edit3, 
  Search, CheckCircle, X, BadgeCheck, UserCog 
} from 'lucide-react';
import { db, auth, collection, addDoc, onSnapshot, query, where, serverTimestamp, updateDoc, doc, deleteDoc } from './db';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({ name: '', role: 'Staff', salary: '', phone: '' });
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

  const handleEdit = (emp) => {
    setFormData({ name: emp.name, role: emp.role, salary: emp.salary, phone: emp.phone });
    setEditingId(emp.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      await deleteDoc(doc(db, 'employees', id));
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
          <button className="btn-primary" onClick={() => { setEditingId(null); setFormData({ name: '', role: 'Staff', salary: '', phone: '' }); setIsModalOpen(true); }}>
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
              <div style={{ position: 'absolute', top: 0, right: 0, padding: '0.5rem 1rem', backgroundColor: emp.role === 'Admin' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: emp.role === 'Admin' ? 'white' : 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 'bold', borderBottomLeftRadius: '12px' }}>
                {emp.role.toUpperCase()}
              </div>
              
              <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '56px', height: '56px', backgroundColor: 'var(--bg-main)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  {emp.role === 'Admin' ? <Shield size={28} /> : <Users size={28} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{emp.name}</h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{emp.phone || 'No Phone'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '0.8rem', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>MONTHLY SALARY</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--success)' }}>PKR {parseFloat(emp.salary).toLocaleString()}</div>
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
                    <input required type="number" className="input-field w-full" placeholder="PKR" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Phone Number</label>
                  <input className="input-field w-full" placeholder="03xx xxxxxxx" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
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

      </div>
    </Layout>
  );
}
