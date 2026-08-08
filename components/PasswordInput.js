'use client';
import { useState } from 'react';

function PasswordInput({ value, onChange, ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        style={{ paddingRight: 52 }}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        style={{
          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 10.5,
          fontFamily: 'var(--mono)', color: 'var(--ink-soft)', textTransform: 'uppercase',
          letterSpacing: '0.4px', padding: '4px 6px',
        }}
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

export default PasswordInput;
