'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function NavBar() {
  const pathname = usePathname();
  const items = [
    { href: '/', label: 'Fixtures', icon: '⚽' },
    { href: '/league', label: 'League', icon: '📊' },
    { href: '/referees', label: 'Referees', icon: '🧑\u200d⚖️' },
    { href: '/account', label: 'Account', icon: '👤' },
  ];
  return (
    <nav className="bottom">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={pathname === item.href ? 'active' : ''}>
          <span className="ic">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export default NavBar;
