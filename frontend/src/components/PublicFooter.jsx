import { Mail, MapPin, Phone } from 'lucide-react';
import logo from '../images/logo.jpg';

const quickLinks = [
  ['About JUST', 'https://www.just.edu.so/about'],
  ['Academics', 'https://www.just.edu.so/academics'],
  ['Research', 'https://www.just.edu.so/research'],
  ['News & Events', 'https://www.just.edu.so/news'],
];

const admissionLinks = [
  ['Admission Overview', '/admissions'],
  ['Admission Requirements', '/admission-requirements'],
  ['Program Fees', '/program-fees'],
  ['Apply Online', '/apply'],
];

function PublicFooter() {
  return (
    <footer className="university-footer">
      <div className="university-footer-main">
        <section className="university-footer-about">
          <a className="university-footer-brand" href="/#home">
            <img src={logo} alt="Jamhuriya University logo" />
            <span><strong>Jamhuriya University</strong><small>of Science and Technology (JUST)</small></span>
          </a>
          <p>Jamhuriya University of Science and Technology is a private institution established in Mogadishu to provide higher education of international standards.</p>
        </section>

        <nav className="university-footer-column" aria-label="University links">
          <h2>Quick Links</h2>
          {quickLinks.map(([label, href]) => <a href={href} key={label}>{label}</a>)}
        </nav>

        <nav className="university-footer-column" aria-label="Admission links">
          <h2>Admissions</h2>
          {admissionLinks.map(([label, href]) => <a href={href} key={label}>{label}</a>)}
        </nav>

        <section className="university-footer-column university-footer-contact">
          <h2>Contact Details</h2>
          <p><MapPin size={17} /> <span>Digfeer Street, Hodan District, Banadir Region</span></p>
          <a href="tel:+2521656666"><Phone size={17} /> +252 1 656666</a>
          <a href="tel:+252612223999"><Phone size={17} /> +252 61 2223999</a>
          <a href="mailto:info@just.edu.so"><Mail size={17} /> info@just.edu.so</a>
          <a href="mailto:admission@just.edu.so"><Mail size={17} /> admission@just.edu.so</a>
        </section>
      </div>
      <div className="university-footer-bottom">
        <p>© 2026 Jamhuriya University of Science and Technology. All rights reserved.</p>
        <p>Developed for the JUST Online Admission System</p>
      </div>
    </footer>
  );
}

export default PublicFooter;
