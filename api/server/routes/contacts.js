const express = require('express');
const router = express.Router();
const Contact = require('../../models/Contact');

// Helper function to search contacts
async function searchContacts(query) {
  try {
    const trimmedQuery = query.trim();
    const contacts = await Contact.find({
      $or: [
        { name: { $regex: trimmedQuery, $options: 'i' } },
        { company: { $regex: trimmedQuery, $options: 'i' } },
        { role: { $regex: trimmedQuery, $options: 'i' } },
        { notes: { $regex: trimmedQuery, $options: 'i' } },
        { email: { $regex: trimmedQuery, $options: 'i' } },
      ],
    })
      .limit(10)
      .lean();
    return contacts;
  } catch (e) {
    return [];
  }
}

// Format contacts as context string
function formatContactsAsContext(contacts) {
  if (!contacts || contacts.length === 0) return '';
  const lines = contacts.map((c) => {
    const attrs = c.attributes
      ? Object.entries(c.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')
      : '';
    return `- ${c.name}${c.company ? ` at ${c.company}` : ''}${c.role ? `, ${c.role}` : ''}${c.email ? `, email: ${c.email}` : ''}${c.notes ? `, notes: ${c.notes}` : ''}${attrs ? `, ${attrs}` : ''}`;
  });
  return `\n\n[Contacts Context]\n${lines.join('\n')}\n[End Contacts Context]`;
}

// GET /api/contacts - list with pagination + search
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } },
          { role: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const [contacts, total] = await Promise.all([
      Contact.find(query).skip(skip).limit(limit).lean(),
      Contact.countDocuments(query),
    ]);

    res.json({ contacts, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/contacts/search - for chat integration
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q) return res.json([]);
    const contacts = await searchContacts(q);
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contacts/inject - inject contacts into chat message
router.post('/inject', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.json({ message, contactsFound: 0 });

    const trimmedQuery = message.trim();

    // Try word by word search
    const words = trimmedQuery.split(/\s+/).filter(w => w.length > 3);
    let contacts = [];

    for (const word of words) {
      const found = await Contact.find({
        $or: [
          { name: { $regex: word, $options: 'i' } },
          { company: { $regex: word, $options: 'i' } },
          { role: { $regex: word, $options: 'i' } },
          { notes: { $regex: word, $options: 'i' } },
          { email: { $regex: word, $options: 'i' } },
        ],
      }).limit(10).lean();
      if (found.length) {
        contacts = found;
        break;
      }
    }

    if (!contacts.length) {
      return res.json({ message, contactsFound: 0 });
    }

    const lines = contacts.map((c) => {
      const attrs = c.attributes
        ? Object.entries(c.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')
        : '';
      return `- ${c.name}${c.company ? ` at ${c.company}` : ''}${c.role ? `, ${c.role}` : ''}${c.email ? `, email: ${c.email}` : ''}${c.notes ? `, notes: ${c.notes}` : ''}${attrs ? `, ${attrs}` : ''}`;
    });

    const context = `\n\n[Contacts Context]\n${lines.join('\n')}\n[End Contacts Context]`;
    const enrichedMessage = `${message}${context}`;

    res.json({ message: enrichedMessage, contactsFound: contacts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contacts/import - CSV upload (handles both comma and tab delimited)
router.post('/import', express.raw({ type: 'text/csv', limit: '100mb' }), async (req, res) => {
  try {
    const csvContent = req.body.toString('utf8');
    const lines = csvContent.split('\n').filter((l) => l.trim());
    if (lines.length < 2) return res.status(400).json({ error: 'CSV is empty' });

    // Detect delimiter
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';

    const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/"/g, ''));
    const knownFields = ['name', 'company', 'role', 'email', 'notes'];
    const fieldMap = {
      'email': 'email',
      'company_name': 'company',
      'designation': 'role',
      'notes': 'notes',
    };
    const skipFields = ['first_name', 'middle_name', 'last_name', 'company_name', 
                        'designation', 'email', 'notes', 'id'];

    const batchSize = 500;
    let imported = 0;
    let errors = 0;
    const allContacts = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map((v) => v.trim().replace(/"/g, ''));
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      const contact = {};
      const attributes = {};

      // Check if CSV has first_name/last_name columns
      if (headers.includes('first_name') || headers.includes('last_name')) {
        const firstName = row['first_name'] || '';
        const middleName = row['middle_name'] || '';
        const lastName = row['last_name'] || '';
        const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
        if (fullName) contact.name = fullName;

        for (const [csvCol, contactField] of Object.entries(fieldMap)) {
          if (row[csvCol]) contact[contactField] = row[csvCol];
        }

        for (const [key, value] of Object.entries(row)) {
          if (!skipFields.includes(key) && value) {
            attributes[key] = value;
          }
        }
      } else {
        // Standard CSV with name, company, role, email, notes columns
        for (const [key, value] of Object.entries(row)) {
          const field = key.toLowerCase().trim();
          if (knownFields.includes(field)) {
            contact[field] = value;
          } else if (value) {
            attributes[key] = value;
          }
        }
      }

      contact.attributes = attributes;
      if (contact.name) allContacts.push(contact);
    }

    for (let i = 0; i < allContacts.length; i += batchSize) {
      const batch = allContacts.slice(i, i + batchSize);
      try {
        await Contact.insertMany(batch, { ordered: false });
        imported += batch.length;
      } catch (e) {
        errors++;
      }
    }

    res.json({ imported, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/contacts/:id
router.get('/:id', async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id).lean();
    if (!contact) return res.status(404).json({ error: 'Not found' });
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contacts - create one
router.post('/', async (req, res) => {
  try {
    const { name, company, role, email, notes, attributes } = req.body;
    const contact = await Contact.create({ name, company, role, email, notes, attributes });
    res.status(201).json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/contacts/:id
router.put('/:id', async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!contact) return res.status(404).json({ error: 'Not found' });
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/contacts/:id
router.delete('/:id', async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.searchContacts = searchContacts;
module.exports.formatContactsAsContext = formatContactsAsContext;