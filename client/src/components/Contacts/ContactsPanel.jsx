import { useState, useEffect } from 'react';

const API = '/api/contacts';

export default function ContactsPanel() {
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [form, setForm] = useState({ name: '', company: '', role: '', email: '', notes: '' });
  const [attrs, setAttrs] = useState([{ key: '', value: '' }]);

  const fetchContacts = async (p = 1, q = '') => {
    setLoading(true);
    try {
      const res = await fetch(`${API}?page=${p}&limit=20&search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setContacts(data.contacts || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts(1, '');
  }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    fetchContacts(1, e.target.value);
  };

  const handleCreate = async () => {
    if (!form.name) return alert('Name is required');
    const attributes = {};
    attrs.forEach(({ key, value }) => { if (key) attributes[key] = value; });
    await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, attributes }),
    });
    setForm({ name: '', company: '', role: '', email: '', notes: '' });
    setAttrs([{ key: '', value: '' }]);
    setShowForm(false);
    fetchContacts(page, search);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this contact?')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    setSelected(null);
    fetchContacts(page, search);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportMsg('Importing...');
    const text = await file.text();
    const res = await fetch(`${API}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: text,
    });
    const data = await res.json();
    setImportMsg(`✅ Imported ${data.imported} contacts`);
    fetchContacts(1, '');
    setTimeout(() => setImportMsg(''), 4000);
  };

  return (
    <div style={{
      width: '100%', height: '100%', backgroundColor: '#1e1e2e',
      color: '#cdd6f4', display: 'flex', flexDirection: 'column',
      fontFamily: 'sans-serif', fontSize: '14px', overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid #313244', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>👥 Contacts ({total})</span>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #313244' }}>
        <input
          value={search}
          onChange={handleSearch}
          placeholder="Search contacts..."
          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #45475a', background: '#313244', color: '#cdd6f4', boxSizing: 'border-box' }}
        />
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #313244', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => { setShowForm(!showForm); setSelected(null); }}
          style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#89b4fa', color: '#1e1e2e', cursor: 'pointer', fontWeight: 'bold' }}>
          + Add
        </button>
        <label style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#a6e3a1', color: '#1e1e2e', cursor: 'pointer', fontWeight: 'bold' }}>
          📥 Import CSV
          <input type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} />
        </label>
        {importMsg && <span style={{ color: '#a6e3a1', alignSelf: 'center' }}>{importMsg}</span>}
      </div>

      {/* Create Form */}
      {showForm && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #313244', background: '#181825' }}>
          {['name', 'company', 'role', 'email', 'notes'].map((field) => (
            <input key={field} placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              style={{ width: '100%', padding: '6px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #45475a', background: '#313244', color: '#cdd6f4', boxSizing: 'border-box' }}
            />
          ))}
          <div style={{ marginBottom: '6px', fontWeight: 'bold', color: '#89b4fa' }}>Extra Attributes</div>
          {attrs.map((attr, i) => (
            <div key={i} style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
              <input placeholder="Key" value={attr.key}
                onChange={(e) => { const a = [...attrs]; a[i].key = e.target.value; setAttrs(a); }}
                style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid #45475a', background: '#313244', color: '#cdd6f4' }}
              />
              <input placeholder="Value" value={attr.value}
                onChange={(e) => { const a = [...attrs]; a[i].value = e.target.value; setAttrs(a); }}
                style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid #45475a', background: '#313244', color: '#cdd6f4' }}
              />
            </div>
          ))}
          <button onClick={() => setAttrs([...attrs, { key: '', value: '' }])}
            style={{ marginBottom: '8px', background: 'none', border: '1px solid #45475a', color: '#cdd6f4', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>
            + Attribute
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleCreate}
              style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#89b4fa', color: '#1e1e2e', cursor: 'pointer', fontWeight: 'bold' }}>
              Save
            </button>
            <button onClick={() => setShowForm(false)}
              style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#45475a', color: '#cdd6f4', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Contact List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {loading && <div style={{ padding: '16px', textAlign: 'center', color: '#6c7086' }}>Loading...</div>}
        {!loading && contacts.length === 0 && (
          <div style={{ padding: '16px', textAlign: 'center', color: '#6c7086' }}>No contacts found</div>
        )}
        {contacts.map((c) => (
          <div key={c._id} onClick={() => { setSelected(c); setShowForm(false); }}
            style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #313244',
              background: selected?._id === c._id ? '#313244' : 'transparent' }}>
            <div style={{ fontWeight: 'bold', color: '#cdd6f4' }}>{c.name}</div>
            <div style={{ color: '#6c7086', fontSize: '12px' }}>{c.company}{c.role ? ` · ${c.role}` : ''}</div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #313244', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => fetchContacts(page - 1, search)} disabled={page <= 1}
          style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid #45475a', background: '#313244', color: '#cdd6f4', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>
          ← Prev
        </button>
        <span style={{ color: '#6c7086' }}>{page} / {totalPages}</span>
        <button onClick={() => fetchContacts(page + 1, search)} disabled={page >= totalPages}
          style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid #45475a', background: '#313244', color: '#cdd6f4', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>
          Next →
        </button>
      </div>

      {/* Detail View */}
      {selected && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#1e1e2e', padding: '16px', overflowY: 'auto', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>Contact Detail</span>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#cdd6f4', cursor: 'pointer', fontSize: '18px' }}>✕</button>
          </div>
          {[['Name', selected.name], ['Company', selected.company], ['Role', selected.role], ['Email', selected.email], ['Notes', selected.notes]].map(([label, value]) => value ? (
            <div key={label} style={{ marginBottom: '10px' }}>
              <div style={{ color: '#6c7086', fontSize: '12px' }}>{label}</div>
              <div style={{ color: '#cdd6f4' }}>{value}</div>
            </div>
          ) : null)}
          {selected.attributes && Object.keys(selected.attributes).length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ color: '#89b4fa', fontWeight: 'bold', marginBottom: '8px' }}>Extra Attributes</div>
              {Object.entries(selected.attributes).map(([k, v]) => (
                <div key={k} style={{ marginBottom: '6px' }}>
                  <span style={{ color: '#6c7086' }}>{k}: </span>
                  <span style={{ color: '#cdd6f4' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => handleDelete(selected._id)}
            style={{ marginTop: '16px', width: '100%', padding: '8px', borderRadius: '6px', border: 'none', background: '#f38ba8', color: '#1e1e2e', cursor: 'pointer', fontWeight: 'bold' }}>
            🗑️ Delete Contact
          </button>
        </div>
      )}
    </div>
  );
}