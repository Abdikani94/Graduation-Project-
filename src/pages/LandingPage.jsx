import { useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Play,
  Send,
} from 'lucide-react';
import Toast from '../components/Toast';
import agriculture from '../images/agriculture.jpg';
import computer from '../images/FcaultyComputer.jpg';
import engineering from '../images/engineering.jpg';
import j from '../images/j.jpg';
import jic from '../images/jic.jpg';
import logo from '../images/logo.jpg';
import medicine from '../images/medicin.jpg';
import president from '../images/president.jpg';
import team from '../images/team.jpg';

const faculties = [
  {
    number: '01',
    name: 'Business',
    title: 'Faculty of Economics and Management',
    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80',
    alt: 'Business students discussing strategy and management',
    description: 'Build strong foundations in leadership, accounting, administration, finance, and practical business decision-making.',
    programs: [
      'Business Administration',
      'Public Administration',
      'Banking & Finance',
      'Accounting',
      'Economics',
    ],
  },
  {
    number: '02',
    name: 'Computer Science',
    title: 'Faculty of Computer Science and Information Technology',
    image: computer,
    alt: 'Computer science students working in a technology lab',
    description: 'Study software, networking, multimedia, and applied computing through practical labs and modern technology projects.',
    programs: [
      'B.Sc. in Computer Application',
      'B.Sc. in Computer Networking and Security',
      'B.Sc. in Computer Multimedia',
    ],
  },
  {
    number: '03',
    name: 'Engineering',
    title: 'Faculty of Engineering',
    image: engineering,
    alt: 'Engineering students studying design and infrastructure',
    description: 'Prepare for professional engineering work with strong training in design, infrastructure, systems, and applied science.',
    programs: ['B.Sc. in Civil Engineering', 'B.Sc. in Electrical Engineering', 'B.Sc. in Biomedical Engineering'],
  },
  {
    number: '04',
    name: 'Health Science',
    title: 'Faculty of Medicine and Health Science',
    image: medicine,
    alt: 'Health science students in a medical learning environment',
    description: 'Develop the clinical, laboratory, public health, and patient-care knowledge needed for modern healthcare service.',
    programs: ['MBBS', 'B.Sc. in Nursing', 'B.Sc. in Midwifery', 'B.Sc. in Public Health', 'B.Sc. in Medical Laboratory Science'],
  },
  {
    number: '05',
    name: 'Agro-Veterinary',
    title: 'Faculty of Agriculture and Veterinary Science',
    image: team,
    alt: 'Students collaborating in an academic classroom',
    description: 'Learn agricultural science, animal health, food systems, and community development for sustainable local impact.',
    programs: ['B.Sc. in Agriculture', 'B.Sc. in Veterinary Science'],
  },
];

const stats = [
  ['15,000+', 'Students'],
  ['8,000+', 'Labs'],
  ['30,000+', 'Relationships'],
  ['99.5%', 'International Exams'],
];

const dates = [
  ['Jul 15', 'Application Opens', 'Online admission portal goes live for all faculties.', 'right'],
  ['Jul 15', 'Application Opens', 'Final day to submit your admission application.', 'left'],
  ['Sep 20', 'Admission Result', 'Decisions communicated via your student portal.', 'right'],
  ['Oct 01', 'Semester begins', 'Orientation week and first day of classes in the semester.', 'left'],
];

const requirements = [
  ['High education completion', 'Submit secondary school completion evidence.'],
  ['Four passport pictures', 'Upload clear passport-size photos.'],
  ['Have certificate high school', 'Provide your original high school certificate.'],
  ['Pay fees of Admission', 'Complete the admission fee payment online.'],
];

const faqs = [
  'Who can apply to Jamhuriya University?',
  'Which documents are required for online admission?',
  'Can I track my admission status online?',
  'How do I pay the admission fee?',
  'When will admission results be announced?',
];

const apiBaseUrl = 'http://localhost:4000';

const initialContactForm = {
  name: null,
  email: null,
  phone: null,
  type: null,
  message: null,
};

function SectionTitle({ children }) {
  return <h2 className="section-title">{children}</h2>;
}

function LandingPage() {
  const [activeNav, setActiveNav] = useState('home');
  const [activeFacultyIndex, setActiveFacultyIndex] = useState(1);
  const [contactForm, setContactForm] = useState(initialContactForm);
  const [contactToast, setContactToast] = useState(null);
  const [isContactSubmitting, setIsContactSubmitting] = useState(false);
  const activeFaculty = faculties[activeFacultyIndex];
  const navClass = (item) => `site-nav-link ${activeNav === item ? 'active' : ''}`;

  const showContactToast = (type, message, title) => {
    setContactToast({ type, message, title });
  };

  const updateContactForm = (event) => {
    const { name, value } = event.target;
    setContactForm((current) => ({
      ...current,
      [name]: value || null,
    }));
  };

  const submitContactForm = async (event) => {
    event.preventDefault();
    const required = [
      ['name', 'Full Name'],
      ['email', 'Email'],
      ['phone', 'Whatsapp Number'],
      ['type', 'Type Of Contact'],
      ['message', 'Details'],
    ];
    const missing = required.filter(([field]) => !contactForm[field]?.trim()).map(([, label]) => label);
    if (missing.length) {
      showContactToast('error', `Please complete: ${missing.join(', ')}`, 'Validation error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email || '')) {
      showContactToast('error', 'Please enter a valid email address.', 'Validation error');
      return;
    }
    if (!/^\+?\d[\d\s-]{6,}$/.test(contactForm.phone || '')) {
      showContactToast('error', 'Please enter a valid Whatsapp number.', 'Validation error');
      return;
    }

    setIsContactSubmitting(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/contact-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactForm.name,
          email: contactForm.email,
          phone: contactForm.phone,
          type: contactForm.type,
          message: contactForm.message,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Contact message failed.');
      setContactForm(initialContactForm);
      showContactToast('success', 'Fariintaada waa la diray. Mahadsanid!', 'Message sent');
    } catch (error) {
      showContactToast('error', error.message || 'Contact message failed.', 'Submit error');
    } finally {
      setIsContactSubmitting(false);
    }
  };

  return (
    <div className="public-page min-h-screen overflow-hidden bg-white text-text-dark">
      <Toast toast={contactToast} onClose={() => setContactToast(null)} />
      <header className="hero-pattern relative min-h-screen px-5 pb-24 pt-8 sm:px-8 lg:px-12">
        <nav className="mx-auto flex max-w-5xl items-center justify-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 p-1 shadow-[0_0_30px_rgba(139,78,239,0.55)]">
            <img src={logo} alt="Jamhuriya University logo" className="h-full w-full rounded-full object-cover" />
          </div>
          <div className="site-nav">
            <a className={navClass('home')} href="#home" onClick={() => setActiveNav('home')}>Home</a>
            <a className={navClass('apply')} href="/apply" onClick={() => setActiveNav('apply')}>Apply</a>
            <a className={navClass('contact')} href="#contact" onClick={() => setActiveNav('contact')}>Contact</a>
            <a className={navClass('login')} href="/login" onClick={() => setActiveNav('login')}>Login</a>
          </div>
        </nav>

        <section id="home" className="mx-auto flex max-w-5xl flex-col items-center pt-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F5F5F5] px-4 py-2 text-xs text-text-dark">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Admissions open - class of 2026
          </div>
          <h1 className="mt-8 max-w-4xl text-5xl font-extrabold leading-tight tracking-normal sm:text-7xl lg:text-8xl">
            We <span className="serif italic text-[#11B67A]">Educate</span> Students
            <br />
            That Shape <span className="serif italic text-[#11B67A]">Tomorrow</span>
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
            Five world-class faculties. One ambitious community. Apply online in minutes and join
            Jamhuriya University of Science & Technology, East Africa's leading university.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a href="/apply" className="btn-primary">
              Apply Now <ArrowRight size={16} />
            </a>
            <a href="#programs" className="btn-ghost">Explore Programs</a>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-5 text-xs font-semibold text-white">
            <span>5,000+ Students</span>
            <span className="text-white/55">.</span>
            <span>20+ Programs</span>
            <span className="text-white/55">.</span>
            <span>15+ Years</span>
            <span className="text-white/55">.</span>
            <span>8+ Countries</span>
          </div>
        </section>

        <a
          aria-label="Open support chat"
          className="fixed bottom-7 right-7 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-[#2D368D] shadow-[0_0_28px_rgba(45,54,141,0.45)]"
          href="#faq"
        >
          <MessageCircle size={21} />
        </a>
      </header>

      <main>
        <section className="section-wrap -mt-28">
          <div className="stats-panel">
            <div className="relative z-10 max-w-sm text-3xl font-bold leading-tight sm:text-4xl">
              Everything You Need to Know: Facts, Figures, and Results
            </div>
            <div className="relative z-10 mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map(([value, label]) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-3xl font-semibold">{value}</div>
                    <div className="mt-2 text-sm text-white/75">{label}</div>
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <Check size={15} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="programs" className="section-wrap">
          <SectionTitle>
            Our <span>faculties</span> and <br /> Programs of our <span>university</span>
          </SectionTitle>
          <div className="program-panel home-program-panel">
            <aside className="faculty-tabs home-faculty-tabs" aria-label="University faculties">
              {faculties.map((faculty, index) => (
                <button
                  className={index === activeFacultyIndex ? 'active' : ''}
                  key={faculty.name}
                  onClick={() => setActiveFacultyIndex(index)}
                  type="button"
                  aria-pressed={index === activeFacultyIndex}
                >
                  <span>{faculty.number}</span>
                  {faculty.name}
                </button>
              ))}
            </aside>
            <article className="home-faculty-card min-w-0 flex-1" key={activeFaculty.name}>
              <div className="number-pill">{activeFaculty.number}</div>
              <h3 className="mt-7 max-w-xl text-3xl font-bold leading-tight sm:text-4xl">{activeFaculty.title}</h3>
              <p className="home-faculty-description mt-4 max-w-2xl text-sm leading-7">{activeFaculty.description}</p>
              <div className="home-program-list mt-5 flex flex-wrap gap-4 text-xs font-semibold text-white/85">
                {activeFaculty.programs.map((program) => (
                  <span key={program} className="inline-flex items-center gap-2">
                    <i className="h-4 w-4 rounded-full border border-white/20 bg-[#2D368D]" />
                    {program}
                  </span>
                ))}
              </div>
              <div className="home-faculty-image relative mt-7 overflow-hidden rounded-[28px] border-4 border-[#2D368D]">
                <img src={activeFaculty.image} alt={activeFaculty.alt} className="h-72 w-full object-cover" />
              </div>
            </article>
          </div>
        </section>

        <section className="section-wrap">
          <SectionTitle>
            Where <span>Ambition</span> Meets <br className="sm:hidden" /> <span>Opportunity</span>
          </SectionTitle>
          <div className="video-shell">
            <img src={team} alt="Students collaborating in class" className="h-full w-full object-cover" />
            <a
              className="play-button"
              href="https://www.youtube.com/watch?v=R6-BAPSgSyI"
              rel="noreferrer"
              target="_blank"
              aria-label="Watch admission video"
            >
              <Play fill="currentColor" size={28} />
            </a>
          </div>
        </section>

        <section className="section-wrap">
          <div className="welcome-card">
            <div className="flex-1 p-8 sm:p-12">
              <div className="mb-8 flex items-center gap-8">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FBAB19] text-lg font-extrabold text-[#182B49]">
                  03
                </span>
                <div className="h-1 w-40 rounded-full bg-white/30">
                  <div className="h-1 w-14 rounded-full bg-white" />
                </div>
                <span className="text-sm font-semibold">03</span>
              </div>
              <h2 className="max-w-md text-5xl font-bold leading-tight">Welcome to Jamhuriya</h2>
              <p className="mt-5 max-w-md text-sm leading-6 text-white/75">
                Waxaan kugu hambalyeynayaa inaad waxbarasho dhigato sare dhamaystay. Jaamacaddu waxay diyaar u tahay
                inay kugu taageerto aqoon, cilmi, iyo fursad shaqo.
              </p>
              <div className="mt-12 flex gap-4">
                <span className="h-1 w-10 rounded-full bg-white" />
                <span className="h-1 w-10 rounded-full bg-white/55" />
                <span className="h-1 w-10 rounded-full bg-white/25" />
              </div>
            </div>
            <div className="relative min-h-[360px] flex-1 overflow-hidden rounded-[28px] bg-[#eef0ff]">
              <div className="absolute inset-x-8 bottom-0 top-10 rounded-t-full bg-emerald-100" />
              <img src={president} alt="Dr. Mohamed Ali" className="absolute inset-x-0 bottom-0 mx-auto h-full object-cover" />
              <div className="absolute bottom-8 left-8 right-8 rounded-2xl bg-white/75 p-4 text-[#20113b] backdrop-blur">
                <p className="text-xl font-extrabold">Dr. Mohamed Ali</p>
                <p className="text-sm font-semibold text-[#4b376b]">Vice president</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section-wrap innovation-section">
          <SectionTitle>
            Heart of Innovation <br /> Where <span>Excellence</span> Lives
          </SectionTitle>
          <div className="network-panel">
            <p className="max-w-xs text-2xl font-bold leading-tight">Connect more than 6000+ students</p>
            <div className="network-map">
              {[agriculture, computer, engineering, logo, medicine, jic, j].map((src, index) => (
                <img src={src} alt="" className={`network-node node-${index + 1}`} key={src} />
              ))}
              <div className="center-logo">
                <img src={logo} alt="Jamhuriya University logo" />
              </div>
            </div>
          </div>
        </section>

        <section className="section-wrap">
          <SectionTitle>
            Make your calendar <br /> Important <span>dates</span>
          </SectionTitle>
          <div className="timeline">
            {dates.map(([date, title, text, side]) => (
              <article className={`timeline-card ${side}`} key={`${date}-${title}-${side}`}>
                <p className="serif text-xl italic text-[#11B67A]">{date}</p>
                <h3 className="mt-2 font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/45">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="apply" className="section-wrap home-requirements-section">
          <SectionTitle>
            Admission <br /> Requirements & <span>Eligibility</span>
          </SectionTitle>
          <div className="requirements">
            <div className="requirement-logo">
              <img src={logo} alt="Jamhuriya University logo" />
            </div>
            {requirements.map(([title, text], index) => (
              <article className={`requirement-card req-${index + 1}`} key={title}>
                <span><Check size={20} /></span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="section-wrap">
          <SectionTitle>
            Frequently <br /> Asked <span>Questions</span>
          </SectionTitle>
          <div className="mx-auto mt-12 max-w-3xl space-y-4">
            {faqs.map((faq) => (
              <details className="faq-item" key={faq}>
                <summary>
                  {faq}
                  <ChevronDown size={18} />
                </summary>
                <p>
                  Applicants can complete registration online, upload documents, pay admission fees, and track
                  decisions through the student portal.
                </p>
              </details>
            ))}
          </div>
        </section>

        <section id="contact" className="section-wrap contact-section">
          <h2 className="contact-title">
            Have a Question or <br />
            <span>Just Want to Chat?</span>
          </h2>
          <div className="contact-card">
            <div className="contact-copy">
              <h3>
                Tell Us Your <br />
                Amazing <br />
                Objective <span>Here</span>
              </h3>
              <ul>
                <li>
                  <Check size={14} />
                  Expect a response from us within 24 hours.
                </li>
                <li>
                  <Check size={14} />
                  We're happy to get your contact request.
                </li>
                <li>
                  <Check size={14} />
                  Feel free to contact us and tell what ever you want.
                </li>
              </ul>
            </div>

            <form className="contact-form" autoComplete="off" onSubmit={submitContactForm}>
              <label className="full">
                <span>Full Name</span>
                <input autoComplete="off" name="name" type="text" value={contactForm.name ?? ''} onChange={updateContactForm} placeholder="Enter your full name" />
              </label>
              <label>
                <span>Your Email</span>
                <input autoComplete="off" name="email" type="email" value={contactForm.email ?? ''} onChange={updateContactForm} placeholder="yourmail@gmail.com" />
              </label>
              <label>
                <span>Whatsapp Number</span>
                <input autoComplete="off" name="phone" type="tel" value={contactForm.phone ?? ''} onChange={updateContactForm} placeholder="252 61 0000000" />
              </label>
              <fieldset className="full">
                <legend>Type Of Contact</legend>
                <div className="contact-options">
                  {['Admission', 'Get discount', 'Problem enrollment','Other'].map((type) => (
                    <label key={type}>
                      <input checked={contactForm.type === type} name="type" onChange={updateContactForm} type="radio" value={type} />
                      {type}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="full">
                <span>Details</span>
                <textarea autoComplete="off" name="message" value={contactForm.message ?? ''} onChange={updateContactForm} placeholder="Write your message here ..." rows="5" />
              </label>
              <button className="contact-submit" disabled={isContactSubmitting} type="submit">
                {isContactSubmitting ? 'Sending...' : 'Send Message'} <Send size={16} />
              </button>
            </form>
          </div>
        </section>

        <section className="section-wrap">
          <div className="cta-card">
            <h2 className="text-4xl font-extrabold sm:text-5xl">
              Your <span className="serif italic text-[#11B67A]">Future</span> starts here
            </h2>
            <p className="mt-5 text-sm leading-6 text-white/55">
              Join Jamhuriya University of Science & Technology - one form, one fee, one decision that changes everything.
            </p>
            <a href="/apply" className="btn-primary mt-8">
              Apply Now <ArrowRight size={16} />
            </a>
          </div>
        </section>
      </main>

      <footer className="footer-panel">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <img src={logo} alt="Jamhuriya University logo" className="h-12 w-12 rounded-full object-cover" />
              <div>
                <p className="font-bold text-emerald-300">Jamhuriya University</p>
                <p className="text-xs text-white/45">of Science and Technology (JUST)</p>
              </div>
            </div>
            <p className="mt-8 text-xs font-bold tracking-wide text-white/80">EST. 2010 . MOGADISHU</p>
            <p className="mt-5 text-sm font-semibold text-white/70">Excellence in Education, Innovation in Practice</p>
            <div className="mt-8 space-y-3 text-sm text-white/55">
              <p className="flex items-center gap-3"><MapPin size={16} /> KM 5 Road, Mogadishu, Somalia</p>
              <p className="flex items-center gap-3"><Mail size={16} /> info@jamhuriya.edu.so</p>
              <p className="flex items-center gap-3"><Phone size={16} /> +252 61 XXX XXXX</p>
            </div>
          </div>
          {[
            ['UNIVERSITY', 'About', 'Programs', 'Apply', 'Contact'],
            ['FACULTIES', 'Medicine & Health', 'Computer Science & IT', 'Engineering', 'Economics & Management'],
            ['RESOURCES', 'Student Portal', 'Library', 'Research', 'Career Service'],
          ].map(([title, ...links]) => (
            <div key={title}>
              <h3 className="text-sm font-extrabold tracking-wider">{title}</h3>
              <ul className="mt-6 space-y-4 text-sm text-white/50">
                {links.map((link) => <li key={link}>{link}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-20 flex max-w-6xl flex-wrap justify-between gap-5 text-xs text-white/60">
          <p>@2026 Jamhuriya University of Science & Technology. All rights reserved.</p>
          <p>Privacy &nbsp;&nbsp; Terms &nbsp;&nbsp; Cookies</p>
        </div>
        <div className="pointer-events-none select-none text-center text-[12vw] font-black leading-none text-white/[0.035]">
          JAMHURIYA
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
