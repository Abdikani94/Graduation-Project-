import { useEffect, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import logo from '../images/logo.jpg';

function PublicNav({ active = 'home', applyHref = '/apply' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navClass = (item) => `site-nav-link ${active === item ? 'active' : ''}`;
  const admissionActive = ['admission', 'requirements', 'fees', 'apply'].includes(active);

  useEffect(() => {
    const updateHeader = () => setIsScrolled(window.scrollY > 12);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    return () => window.removeEventListener('scroll', updateHeader);
  }, []);

  return (
    <div className={`public-site-header ${isScrolled ? 'is-scrolled' : ''}`}>
      <nav className="public-nav-shell">
        <a aria-label="Go to homepage" className="public-nav-brand" href="/#home">
          <span className="public-nav-logo"><img src={logo} alt="Jamhuriya University logo" /></span>
          <span className="public-nav-brand-copy">
            <strong>Jamhuriya University</strong>
            <small>Science &amp; Technology</small>
          </span>
        </a>
        <button
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="public-nav-toggle"
          onClick={() => setMenuOpen((current) => !current)}
          type="button"
        >
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
        <div className={`site-nav ${menuOpen ? 'open' : ''}`} onClick={(event) => { if (event.target.closest('a')) setMenuOpen(false); }}>
          <a className={navClass('home')} href="/#home">Home</a>
          <div className="admission-nav-menu">
            <a className={`site-nav-link admission-nav-trigger ${admissionActive ? 'active' : ''}`} href="/admissions">
              Admission <ChevronDown size={15} />
            </a>
            <div className="admission-nav-dropdown">
              <a href="/admission-requirements">Admission Requirements</a>
              <a href="/program-fees">Program Fees</a>
              <a href={applyHref}>Apply</a>
            </div>
          </div>
          <a className={navClass('contact')} href="/#contact">Contact</a>
          <a className={navClass('login')} href="/login">Login</a>
        </div>
        <span aria-hidden="true" className="public-nav-balance" />
      </nav>
    </div>
  );
}

export default PublicNav;
