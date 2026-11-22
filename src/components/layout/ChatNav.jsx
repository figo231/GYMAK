import { Link, useLocation } from 'react-router-dom';
export default function ChatNav() {
  const { pathname, search, hash } = useLocation();
  const requests = new URLSearchParams(search).get('view') === 'requests' || hash === '#contact-requests';
  const items = [['/messages','محادثاتي',pathname === '/messages'],['/professionals','المقترحين',pathname === '/professionals' && !requests],['/professionals?view=requests','الطلبات',pathname === '/professionals' && requests]];
  return <nav className="ux-chat-nav" aria-label="أقسام الدردشة">{items.map(([to,label,on]) => <Link key={to} to={to} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>{label}</Link>)}</nav>;
}
