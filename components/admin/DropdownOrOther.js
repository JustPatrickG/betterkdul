'use client';
import { useState } from 'react';

/* A <select> populated from `options`, plus an "Other…" choice that swaps
   to a free-text input for anything not on the list. If `value` is already
   set to something outside `options` (e.g. loaded from an existing record),
   it starts in text mode automatically so nothing gets silently blanked. */
function DropdownOrOther({ label, value, onChange, options, placeholder }) {
  const [customMode, setCustomMode] = useState(!!value && !options.includes(value));

  function handleSelect(e) {
    const v = e.target.value;
    if (v === '__other__') {
      setCustomMode(true);
      onChange('');
    } else {
      onChange(v);
    }
  }

  return (
    <div className="field">
      <label>{label}</label>
      {customMode ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || `Type ${label.toLowerCase()}`} />
          <button type="button" className="btn-small" onClick={() => { setCustomMode(false); onChange(''); }}>List</button>
        </div>
      ) : (
        <select value={options.includes(value) ? value : ''} onChange={handleSelect}>
          <option value="" disabled>Select…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
          <option value="__other__">Other…</option>
        </select>
      )}
    </div>
  );
}

export default DropdownOrOther;
