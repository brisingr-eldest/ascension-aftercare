export const listFilters = {
  attendance: { search: '', startDate: null, endDate: null, action: null, sortBy: 'timestamp', sortDir: 'desc' },
  // students: { ... },
  // users: { ... },
  // checkInList: { ... }
};

export function applyFiltersAndSort(items, filters, fieldMap = {}) {
  return items
    .filter(item => {
      // SEARCH
      if (filters.search) {
        const text = filters.search.toLowerCase();
        const searchable = Object.keys(fieldMap).length
          ? Object.values(fieldMap).map(f => f(item)).join(' ')
          : Object.values(item).join(' ');
        if (!searchable.toLowerCase().includes(text)) return false;
      }

      // START / END FILTER (compare YYYY-MM-DD UTC date portion of timestamp)
      // filters.startDate / filters.endDate are "YYYY-MM-DD" or null
      const startStr = filters.startDate || null;
      const endStr = filters.endDate || null;

      // If item has timestamp/date, extract UTC YYYY-MM-DD. If not, treat as non-matching.
      const raw = item.timestamp ?? item.date;
      if (!raw) return false;
      const dt = new Date(raw);
      if (Number.isNaN(dt.getTime())) return false;
      const utcDate = dt.toISOString().slice(0, 10);

      if (startStr && utcDate < startStr) return false;
      if (endStr && utcDate > endStr) return false; // end is inclusive

      // ACTION
      if (filters.action && item.action !== filters.action) return false;

      return true;
    })
    .sort((a, b) => {
      const field = filters.sortBy;
      const valA = fieldMap[field] ? fieldMap[field](a) : a[field];
      const valB = fieldMap[field] ? fieldMap[field](b) : b[field];

      if (valA == null) return 1;
      if (valB == null) return -1;
      if (valA > valB) return filters.sortDir === 'asc' ? 1 : -1;
      if (valA < valB) return filters.sortDir === 'asc' ? -1 : 1;
      return 0;
    });
}
