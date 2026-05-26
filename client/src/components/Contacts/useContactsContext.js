const API = '/api/contacts';

export async function getContactsContext(userMessage) {
  try {
    const res = await fetch(`${API}/search?q=${encodeURIComponent(userMessage)}`);
    const contacts = await res.json();

    if (!contacts || contacts.length === 0) return '';

    const lines = contacts.map((c) => {
      const attrs = c.attributes
        ? Object.entries(c.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')
        : '';
      return `- ${c.name}${c.company ? ` at ${c.company}` : ''}${c.role ? `, ${c.role}` : ''}${c.email ? `, ${c.email}` : ''}${c.notes ? `, Notes: ${c.notes}` : ''}${attrs ? `, ${attrs}` : ''}`;
    });

    return `\n\n[Relevant Contacts from user's contact book]\n${lines.join('\n')}\n[End of Contacts]`;
  } catch (e) {
    return '';
  }
}