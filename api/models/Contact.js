const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    company: { type: String, index: true },
    role: { type: String },
    email: { type: String },
    notes: { type: String },
    attributes: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

contactSchema.index(
  { name: 'text', company: 'text', role: 'text', notes: 'text' },
  { name: 'contact_text_index' }
);

module.exports = mongoose.model('Contact', contactSchema);