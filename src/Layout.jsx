import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ShoppingBag, Package, Users, Truck, 
  FileText, ClipboardList, Settings as SettingsIcon,
  User, Box, TrendingUp, Activity, LogOut, Download
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from './db';


export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = auth.currentUser;
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    window.addEventListener('appinstalled', () => {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  return (
    <div className="flex h-screen w-full" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.85rem' }}>
      
      {/* Sidebar (Theme Responsive) */}
      <aside style={{ 
        width: '250px', 
        backgroundColor: 'var(--sidebar-bg)', 
        display: 'flex', 
        flexDirection: 'column', 
        flexShrink: 0, 
        color: 'var(--sidebar-text)',
        borderRight: '1px solid var(--sidebar-border)'
      }}>
        <div style={{ padding: '1.25rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--sidebar-border)' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '75px', height: '75px', objectFit: 'contain', filter: 'drop-shadow(0 0 5px rgba(212,175,55,0.4))' }} 
               onError={(e) => { e.target.style.display = 'none'; }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 0.1rem 0', color: 'var(--sidebar-text)', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Abu Asim</h2>
            <div style={{ 
              fontSize: '0.65rem', 
              color: '#d4af37', 
              fontWeight: '700',
              textTransform: 'uppercase', 
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}>MANAGEMENT SYSTEM</div>
          </div>
        </div>

        <nav className="no-scrollbar" style={{ padding: '1rem 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto' }}>
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={location.pathname === '/dashboard'} onClick={() => navigate('/dashboard')} />
          <NavItem icon={<Truck size={18} />} label="Suppliers" active={location.pathname === '/suppliers'} onClick={() => navigate('/suppliers')} />
          <NavItem icon={<Box size={18} />} label="Products" active={location.pathname === '/products'} onClick={() => navigate('/products')} />
          <NavItem icon={<ClipboardList size={18} />} label="Inventory" active={location.pathname === '/inventory'} onClick={() => navigate('/inventory')} />
          <NavItem icon={<TrendingUp size={18} />} label="Sales" active={location.pathname === '/sales'} onClick={() => navigate('/sales')} />
          <NavItem icon={<Users size={18} />} label="Credit Customers" active={location.pathname === '/customers'} onClick={() => navigate('/customers')} />
          <NavItem icon={<ShoppingBag size={18} />} label="Purchases" active={location.pathname === '/purchases'} onClick={() => navigate('/purchases')} />
          <NavItem icon={<FileText size={18} />} label="Expenses" active={location.pathname === '/expenses'} onClick={() => navigate('/expenses')} />
          <NavItem icon={<Activity size={18} />} label="Reports" active={location.pathname === '/reports'} onClick={() => navigate('/reports')} />
          <NavItem icon={<Users size={18} />} label="Employees" active={location.pathname === '/employees'} onClick={() => navigate('/employees')} />
          <NavItem icon={<SettingsIcon size={18} />} label="Settings" active={location.pathname === '/settings'} onClick={() => navigate('/settings')} />
          {showInstallBtn && (
            <div style={{ marginTop: 'auto', padding: '0.5rem' }}>
              <button 
                onClick={handleInstallClick}
                style={{ 
                  width: '100%', padding: '0.8rem', backgroundColor: 'var(--success)', color: 'white', 
                  border: 'none', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem', 
                  cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem'
                }}
              >
                <Download size={18} /> Install Abu Asim
              </button>
            </div>
          )}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--sidebar-border)' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="Profile" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--primary)' }} />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                  <User size={18} />
                </div>
              )}
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--sidebar-text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{currentUser?.displayName || 'Admin User'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--sidebar-text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{currentUser?.email || 'admin@abuasim.com'}</div>
              </div>
            </div>
            <button 
              onClick={() => {
                navigate('/');
              }} 
              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem', flexShrink: 0 }} 
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Topbar */}
        <header style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ visibility: 'hidden' }}>
             {/* Reserved for future topbar left content */}
          </div>
          
          <div className="flex items-center gap-6">
            {/* Theme toggle removed per user request */}
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>

      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ 
      display: 'flex',
      alignItems: 'center',
      gap: '0.85rem',
      width: '100%',
      padding: '0.85rem 1.1rem', 
      background: active ? 'var(--sidebar-active-bg)' : 'transparent', 
      color: active ? 'var(--primary)' : 'var(--sidebar-text-muted)', 
      border: active ? '1px solid var(--sidebar-active-border)' : '1px solid transparent', 
      borderLeft: active ? '4px solid var(--primary)' : '1px solid transparent',
      borderRadius: '14px', 
      cursor: 'pointer',
      textAlign: 'left',
      fontWeight: active ? '700' : '500',
      fontSize: '0.9rem',
      boxShadow: active ? '0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)' : 'none',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: active ? 'translateX(2px)' : 'none',
    }}
    onMouseOver={(e) => {
      if(!active) {
        e.currentTarget.style.color = 'var(--primary)';
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
        e.currentTarget.style.transform = 'translateX(4px)';
      }
    }}
    onMouseOut={(e) => {
      if(!active) {
        e.currentTarget.style.color = 'var(--sidebar-text-muted)';
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.borderColor = 'transparent';
        e.currentTarget.style.transform = 'none';
      }
    }}
    >
      <span style={{ 
        color: active ? 'var(--primary)' : 'inherit',
        transition: 'color 0.25s',
        display: 'flex',
        alignItems: 'center'
      }}>
        {icon}
      </span>
      <span style={{ 
        letterSpacing: '0.3px'
      }}>
        {label}
      </span>
    </button>
  );
}
