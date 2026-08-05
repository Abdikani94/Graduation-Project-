import {
  ArrowRight,
  BookOpenCheck,
  CircleDollarSign,
  Download,
  Mail,
  MapPin,
  Phone,
  PlayCircle,
} from 'lucide-react';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';
import team from '../images/team.jpg';

const brochureUrl = 'https://www.just.edu.so/assets/documents/JUST%20BROCHURE%202026.pdf';

function AdmissionsPage() {
  return (
    <div className="public-page admissions-overview-page min-h-screen">
      <PublicNav active="admission" />
      <header className="admissions-overview-header" style={{ backgroundImage: `linear-gradient(110deg, rgba(27, 48, 124, 0.91), rgba(45, 54, 141, 0.78)), url(${team})` }}>
        <div className="admissions-overview-hero">
          <span>HOME / ADMISSION</span>
          <h1>Welcome to Our <em>Undergraduate Programs</em></h1>
          <p>Start your journey toward academic excellence and personal growth through JUST's undergraduate admission process.</p>
          <a className="btn-primary" href="/apply">Apply Now <ArrowRight size={17} /></a>
        </div>
      </header>

      <main>
        <section className="admission-center-section">
          <div className="admission-center-heading">
            <span>EXPLORE YOUR OPTIONS</span>
            <h2>Admission Center</h2>
            <p>Review the fees and requirements, download the university brochure, and begin your application.</p>
          </div>
          <div className="admission-center-grid">
            <article className="admission-center-card">
              <span className="admission-center-icon"><CircleDollarSign size={29} /></span>
              <h3>Admission Fee</h3>
              <p>Every faculty and program has the same fixed, non-refundable admission fee of <strong>$0.10</strong>.</p>
              <a href="/program-fees">View Program Fees <ArrowRight size={15} /></a>
            </article>
            <article className="admission-center-card">
              <span className="admission-center-icon green"><BookOpenCheck size={29} /></span>
              <h3>Admission Requirements</h3>
              <p>See the education, certificate, photograph, registration-fee, and part-time experience requirements for a successful application.</p>
              <a href="/admission-requirements">View Requirements <ArrowRight size={15} /></a>
            </article>
            <article className="admission-center-card brochure-card">
              <span className="admission-center-icon light"><Download size={29} /></span>
              <h3>University Brochure</h3>
              <p>Download the official JUST 2026 brochure for university information, faculties, programs, requirements, facilities, and centers.</p>
              <a href={brochureUrl} rel="noreferrer" target="_blank">Download Brochure <Download size={15} /></a>
            </article>
          </div>
        </section>

        <section className="admission-process-section">
          <div className="admission-process-visual" style={{ backgroundImage: `linear-gradient(rgba(24, 43, 73, 0.48), rgba(24, 43, 73, 0.72)), url(${team})` }}>
            <PlayCircle size={72} />
          </div>
          <div className="admission-process-copy">
            <span>ABOUT THE ADMISSION PROCESS</span>
            <h2>Our Admission</h2>
            <p>Research the available programs, review the entry requirements and fees, prepare your documents, and submit the online application. The admissions team then checks your information, certificate, payment, and program choice before recording a decision.</p>
            <ol>
              <li><strong>01</strong> Review requirements and program fees</li>
              <li><strong>02</strong> Complete the online application</li>
              <li><strong>03</strong> Submit documents and confirm payment</li>
              <li><strong>04</strong> Keep your reference and await review</li>
            </ol>
          </div>
        </section>

        <section className="admissions-apply-banner">
          <div><span>READY TO APPLY NOW?</span><h2>Take the first step toward your academic journey.</h2><p>We are excited to learn about you and help you work toward your goals.</p></div>
          <div className="admissions-banner-actions"><a className="btn-primary" href="/apply">Apply Now <ArrowRight size={17} /></a><a className="btn-ghost" href={brochureUrl} rel="noreferrer" target="_blank">Download Brochure</a></div>
        </section>

        <section className="admission-updates-section">
          <div><span>ANNOUNCEMENTS</span><h2>Latest Admission Updates</h2><p>For current intake dates, application deadlines, and admission decisions, contact the admissions team using your application reference number.</p></div>
          <aside className="admission-contact-panel">
            <h3>Contact Admissions</h3>
            <p><MapPin size={17} /> Digfeer Street, Hodan District, Banadir Region</p>
            <p><Phone size={17} /> <a href="tel:+252612223999">+252 61 2223999</a></p>
            <p><Phone size={17} /> <a href="tel:+2521656666">+252 1 656666</a></p>
            <p><Mail size={17} /> <a href="mailto:admission@just.edu.so">admission@just.edu.so</a></p>
            <p><Mail size={17} /> <a href="mailto:info@just.edu.so">info@just.edu.so</a></p>
          </aside>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

export default AdmissionsPage;
