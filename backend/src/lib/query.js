export const toPublicUser = (user) => {
  if (!user) return null;
  const safeUser = { ...user };
  delete safeUser.passwordHash;
  return safeUser;
};

export const normalize = (value) => String(value || '').trim().toLowerCase();

export const matchesText = (record, fields, query) => {
  const needle = normalize(query);
  if (!needle) return true;
  return fields.some((field) => normalize(record[field]).includes(needle));
};

export const paginate = (items, query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  const total = items.length;
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1)
    }
  };
};

export const sortNewest = (items) => [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

export const countBy = (items, selector) => {
  const counts = {};
  for (const item of items) {
    const key = selector(item) || 'Unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
};

export const topCounts = (items, selector, limit = 5) =>
  Object.entries(countBy(items, selector))
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

export const toCsv = (rows, columns) => {
  const escape = (value) => {
    const text = value === undefined || value === null ? '' : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    columns.map((column) => escape(column.header)).join(','),
    ...rows.map((row) => columns.map((column) => escape(row[column.key])).join(','))
  ].join('\n');
};
