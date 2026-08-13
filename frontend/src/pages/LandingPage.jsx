import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
  MessageCircle,
  Play,
  Send,
} from 'lucide-react';
import Toast from '../components/Toast';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';
import facultyVeterinary from '../images/faculty-veterinary.jpg';
import facultyMedicine from '../images/faculty-medicine.jpg';
import facultyComputer from '../images/faculty-computer.jpg';
import facultyEngineering from '../images/faculty-engineering.jpg';
import education from '../images/education.jpg';
import jrc from '../images/jrc.jpg';
import jsc from '../images/jsc.jpg';
import logo from '../images/logo.jpg';
import economics from '../images/econimic.jpg';
import team from '../images/team.jpg';
import warsame from '../images/warsame.jpeg';
import { readResponsePayload, responseMessage } from '../api/response';
const centers = [
  { abbreviation: 'JTECH', name: 'Jamhuriya Technology Solutions', logo: 'https://www.jtech.so/images/jtech-light-logo.svg', accent: '#2D368D', website: 'https://www.jtech.so/' },
  { abbreviation: 'JIC', name: 'Jamhuriya Incubation Center', logo: 'https://www.jic.just.edu.so/assets/images/logo.png', accent: '#00A451', website: 'https://www.jic.just.edu.so/' },
  { abbreviation: 'JCGS', name: 'Jamhuriya Center for Graduate Studies', glyph: 'graduate', accent: '#2D368D', website: 'https://j.just.edu.so/centers/center-for-graduate-studies' },
  { abbreviation: 'ULC', name: 'University Language Center', glyph: 'language', accent: '#2D368D', website: 'https://j.just.edu.so/announcements' },
  { abbreviation: 'JRC', name: 'Jamhuriya Research Center', logo: jrc, accent: '#00A451', website: 'https://j.just.edu.so/centers/center-for-research-development' },
  { abbreviation: 'JPTEC', name: 'Jamhuriya Professional Training & Examination Center', glyph: 'certificate', accent: '#2D368D', website: 'https://j.just.edu.so/centers/jptec' },
  { abbreviation: 'PEARSON', name: 'Pearson VUE Authorized Test Center', logo: 'https://www.pearsonvue.com/content/dam/VUE/vue/global/images/test-centers/resources/Pearson-VUE-Authorized-Test-Center-US.jpg', accent: '#2D368D', website: 'https://j.just.edu.so/centers/jptec' },
  { abbreviation: 'ACCA', name: 'Association of Chartered Certified Accountants', glyph: 'finance', accent: '#2D368D' },
  { abbreviation: 'SAIL', name: 'Somali-language AI and Innovation Lab', logo: 'https://www.sail.just.edu.so/assets/images/footer_logo.png', accent: '#2D368D', website: 'https://www.sail.just.edu.so/' },
  { abbreviation: 'CAPR', name: 'Center for Antimicrobial Resistance Research', glyph: 'antimicrobial', accent: '#00A451' },
  { abbreviation: 'NSP', name: 'Neuroscience Psychologists', glyph: 'neuroscience', accent: '#2D368D' },
  { abbreviation: 'JSC', name: 'Jamhuriya STEM Center', logo: jsc, accent: '#2D368D' },
];

const faculties = [
  {
    number: '01',
    name: 'Faculty of Economics & Management',
    title: 'Faculty of Economics and Management',
    image: economics,
    alt: 'Faculty of Economics and Management',
    description: 'Build strong foundations in leadership, accounting, administration, finance, and practical business decision-making.',
    programs: [
      'Business Administration',
      'Public Administration',
      'Banking & Finance',
      'Accounting',
      'Economics',
      'B.Sc. in Business Analytics',
      'B.Sc. in Social Work',
    ],
  },
  {
    number: '02',
    name: 'Faculty of Computer & Information Technology',
    title: 'Faculty of Computer Science and Information Technology',
    image: facultyComputer,
    alt: 'Computer and Information Technology students learning in a modern computer lab',
    description: 'Study software, networking, multimedia, and applied computing through practical labs and modern technology projects.',
    programs: [
      'B.Sc. in Computer Application',
      'B.Sc. in Computer Networking and Security',
      'B.Sc. in Computer Multi-Media',
      'B.Sc. in Artificial Intelligence and Data Science',
    ],
  },
  {
    number: '03',
    name: 'Faculty of Engineering',
    title: 'Faculty of Engineering',
    image: facultyEngineering,
    alt: 'Professional engineer at a construction site',
    description: 'Prepare for professional engineering work with strong training in design, infrastructure, systems, and applied science.',
    programs: ['B.Sc. in Civil Engineering', 'Electrical Engineering (Power and Energy)', 'Electrical Engineering (Telecommunications and Networking)'],
  },
  {
    number: '04',
    name: 'Faculty of Medicine & Health Science',
    title: 'Faculty of Medicine and Health Science',
    image: facultyMedicine,
    alt: 'Medical doctor providing professional patient care',
    description: 'Develop the clinical, laboratory, public health, and patient-care knowledge needed for modern healthcare service.',
    programs: ['Medicine & General Surgery', 'B.Sc. in Nursing', 'B.Sc. in Midwifery', 'B.Sc. in Public Health', 'B.Sc. in Medical Laboratory Science', 'B.Sc. in Medical Radiography and Imaging Technology'],
  },
  {
    number: '05',
    name: 'Faculty of Education',
    title: 'Faculty of Education',
    image: education,
    alt: 'Education books, globe, and graduation cap',
    description: 'Develop the academic knowledge, teaching practice, and critical thinking needed to help shape Somalia’s next generation of learners.',
    programs: ['B.Sc. in Mathematics and Physics', 'B.Sc. in Biology and Chemistry', 'B.Sc. in History and Geography'],
  },
  {
    number: '06',
    name: 'Faculty of Animal Husbandry & Agriculture',
    title: 'Faculty of Animal Husbandry & Agriculture',
    image: facultyVeterinary,
    alt: 'Veterinary doctor caring for livestock',
    description: 'Build practical expertise in agricultural production, animal health, and sustainable food systems that support communities and national development.',
    programs: ['B.Sc. in Agricultural Sciences', 'B.Sc. in Veterinary Sciences'],
  },
];

const facultyNavigation = faculties.map((faculty, index) => ({ ...faculty, index }));

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
  {
    question: 'Who can apply to Jamhuriya University?',
    answer: 'Applicants who have completed secondary school may apply. You must provide valid personal and school information and select an available faculty and department. Two years of work experience is recommended for part-time applicants.',
  },
  {
    question: 'Which documents are required for online admission?',
    answer: 'Upload one clear passport photo and your secondary-school certificate in PDF, JPG, PNG, or WEBP format. If your certificate is not yet available, choose an appointment date and time to bring it to the admissions office. You may also be asked to bring the original certificate, two copies, and four passport-size photos during verification.',
  },
  {
    question: 'Can I track my admission status online?',
    answer: 'A public status-tracking page is not currently available. Keep the application reference number shown after submission and give it to the admissions office when requesting an update. Admissions staff record each application as Pending, Approved, or Rejected after review.',
  },
  {
    question: 'How do I pay the admission fee?',
    answer: 'Select a payment plan and payment method in the application. For EVC Plus, enter the payer phone number and approve the secure prompt on that phone; never enter your EVC PIN on this website. The application can continue only after the payment provider confirms the transaction successfully.',
  },
  {
    question: 'When will admission results be announced?',
    answer: 'Results are issued after the admissions team verifies the submitted information, documents, and payment. Review time can vary, so keep your application reference number and contact the admissions office for the latest decision or missing-document request.',
  },
];

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

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

function CenterFallbackIcon({ type }) {
  const iconProps = { fill: 'none', viewBox: '0 0 64 64', xmlns: 'http://www.w3.org/2000/svg' };
  const strokeProps = { stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2.8 };

  const glyphs = {
    graduate: <><path {...strokeProps} d="M7 24 32 12l25 12-25 12L7 24Z" /><path {...strokeProps} d="M17 30v10c8 8 22 8 30 0V30" /><path {...strokeProps} d="M53 28v14" /></>,
    language: <><circle {...strokeProps} cx="32" cy="32" r="21" /><path {...strokeProps} d="M11 32h42M32 11c6 6 9 13 9 21s-3 15-9 21c-6-6-9-13-9-21s3-15 9-21Z" /><path {...strokeProps} d="M18 19h13M18 45h10" /></>,
    certificate: <><rect {...strokeProps} x="13" y="11" width="38" height="35" rx="5" /><path {...strokeProps} d="M22 22h20M22 30h13" /><path {...strokeProps} d="m28 46 4 8 4-8" /></>,
    finance: <><path {...strokeProps} d="M12 49h40M17 43V29M30 43V20M43 43V13" /><path {...strokeProps} d="m16 24 13-9 10 5 10-10" /><path {...strokeProps} d="M44 10h5v5" /></>,
    antimicrobial: <><path {...strokeProps} d="M32 9c8 7 15 8 19 9v13c0 11-7 19-19 24-12-5-19-13-19-24V18c4-1 11-2 19-9Z" /><path {...strokeProps} d="M24 31h16M32 23v16" /><circle {...strokeProps} cx="32" cy="31" r="8" /></>,
    neuroscience: <><path {...strokeProps} d="M27 14c-7-5-15 1-13 9-6 4-4 14 3 15 0 7 8 11 13 6 3 7 16 5 16-4 6-4 5-14-1-16 1-8-10-12-15-5-1-2-2-4-3-5Z" /><path {...strokeProps} d="M25 25c3 1 5 3 5 7m-13 0c4-1 7 0 9 3m5-12c2 2 5 3 8 2m-7 14c2-3 5-4 9-3" /></>,
  };

  return <svg {...iconProps} aria-hidden="true">{glyphs[type]}</svg>;
}

function LandingPage() {
  const [activeFacultyIndex, setActiveFacultyIndex] = useState(0);
  const [visibleCards, setVisibleCards] = useState(() => new Array(centers.length).fill(false));
  const cardRefs = useRef([]);
  const [contactForm, setContactForm] = useState(initialContactForm);
  const [contactToast, setContactToast] = useState(null);
  const [isContactSubmitting, setIsContactSubmitting] = useState(false);
  const activeFaculty = faculties[activeFacultyIndex];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.dataset.index);
          if (entry.isIntersecting) {
            setVisibleCards((current) => {
              if (current[index]) return current;
              const next = [...current];
              next[index] = true;
              return next;
            });
          }
        });
      },
      { threshold: 0.2 }
    );

    cardRefs.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

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
      const response = await fetch(`${apiBaseUrl}/contact-messages`, {
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
      const { data: result, text } = await readResponsePayload(response);
      if (!response.ok) throw new Error(responseMessage(result, text, 'Contact message failed.'));
      if (!result || typeof result !== 'object') throw new Error(responseMessage(result, text, 'The server returned an invalid response.'));
      setContactForm(initialContactForm);
      showContactToast('success', 'Your message has been sent. Thank you!', 'Message sent');
    } catch (error) {
      showContactToast('error', error.message || 'Contact message failed.', 'Submit error');
    } finally {
      setIsContactSubmitting(false);
    }
  };

  return (
    <div className="public-page home-page min-h-screen overflow-hidden bg-white text-text-dark">
      <Toast toast={contactToast} onClose={() => setContactToast(null)} />
      <PublicNav active="home" />
      <header className="home-hero hero-pattern relative px-5 sm:px-8 lg:px-12">
        <section id="home" className="home-hero-content mx-auto flex max-w-5xl flex-col items-center text-center">
          <div className="home-hero-badge inline-flex items-center gap-2 rounded-full bg-[#F5F5F5] px-4 py-2 text-xs text-text-dark">
            <span className="h-2 w-2 rounded-full bg-[#00A451]" />
            Admissions open - class of 2026
          </div>
          <h1 className="home-hero-title max-w-4xl font-extrabold tracking-normal">
            We <span className="serif italic text-[#11B67A]">Educate</span> Students
            <br />
            That Shape <span className="serif italic text-[#11B67A]">Tomorrow</span>
          </h1>
          <p className="home-hero-description max-w-2xl">
            Five world-class faculties. One ambitious community. Apply online in minutes and join
            Jamhuriya University of Science & Technology, East Africa's leading university.
          </p>
          <div className="home-hero-actions flex flex-wrap justify-center">
            <a href="/apply" className="btn-primary">
              Apply Now <ArrowRight size={16} />
            </a>
            <a href="#programs" className="btn-ghost">Explore Programs</a>
          </div>
          <div className="home-hero-stats flex flex-wrap justify-center font-semibold">
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
            <div className="facts-title">
              Everything You Need to Know: Facts, Figures, and Results
            </div>
            <div className="facts-grid">
              {stats.map(([value, label]) => (
                <div key={label} className="facts-item">
                  <div>
                    <div className="facts-value">{value}</div>
                    <div className="facts-label">{label}</div>
                  </div>
                  <span className="facts-check">
                    <Check size={15} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-wrap">
          <div className="welcome-card">
            <div className="flex-1 p-8 sm:p-12">
              <h2 className="max-w-md text-5xl font-bold leading-tight">Welcome to Jamhuriya</h2>
              <p className="mt-5 max-w-md text-sm leading-6 text-white/75">
                Congratulations on completing your secondary education. The university is ready to support you with
                knowledge, research, and career opportunities.
              </p>
              <div className="mt-12 flex gap-4">
                <span className="h-1 w-10 rounded-full bg-white" />
                <span className="h-1 w-10 rounded-full bg-white/55" />
                <span className="h-1 w-10 rounded-full bg-white/25" />
              </div>
            </div>
            <div className="relative min-h-[360px] flex-1 overflow-hidden rounded-[28px] bg-[#eef0ff]">
              <div className="absolute inset-x-8 bottom-0 top-10 rounded-t-full bg-[#00A451]/10" />
              <img src={warsame} alt="Abdirisakh Warsame Abdulle" className="absolute inset-x-0 bottom-0 mx-auto h-full object-cover" />
              <div className="absolute bottom-8 left-8 right-8 rounded-2xl bg-white/75 p-4 text-[#20113b] backdrop-blur">
                <p className="text-xl font-extrabold">Abdirisakh Warsame Abdulle</p>
                <p className="text-sm font-semibold text-[#4b376b]">Vice president</p>
              </div>
            </div>
          </div>
        </section>

        <section id="programs" className="faculty-showcase-section" aria-labelledby="faculty-showcase-heading">
          <header className="faculty-showcase-heading">
            <span>ACADEMIC EXCELLENCE</span>
            <h2 id="faculty-showcase-heading">Explore our <em>faculties</em></h2>
            <p>Discover career-ready programs, expert teaching, and a community designed to help you thrive.</p>
          </header>
          <div className="program-panel home-program-panel">
            <aside className="faculty-tabs home-faculty-tabs" aria-label="University faculties">
              {facultyNavigation.map((faculty) => (
                <button
                  className={faculty.index === activeFacultyIndex ? 'active' : ''}
                  key={faculty.name}
                  onClick={() => setActiveFacultyIndex(faculty.index)}
                  type="button"
                  aria-pressed={faculty.index === activeFacultyIndex}
                >
                  <span>{faculty.number}</span>
                  <b>{faculty.name}</b>
                </button>
              ))}
            </aside>
            <article className="home-faculty-card min-w-0 flex-1" key={activeFaculty.name}>
              <div className="home-faculty-copy">
                <div className="number-pill">{activeFaculty.number}</div>
                <p className="home-faculty-label">Faculty</p>
                <h3>{activeFaculty.title}</h3>
                <p className="home-faculty-description">{activeFaculty.description}</p>
                <div className="home-program-list" aria-label={`${activeFaculty.title} programs`}>
                  {activeFaculty.programs.map((program) => (
                    <span key={program}>
                      <i aria-hidden="true" />
                      {program}
                    </span>
                  ))}
                </div>
              </div>
              <div className="home-faculty-image">
                <img className={activeFaculty.imageClassName || ''} src={activeFaculty.image} alt={activeFaculty.alt} />
                <span>JUST</span>
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

        <section className="centers-of-excellence" aria-labelledby="centers-heading">
          <div className="centers-of-excellence__inner">
            <header className="centers-of-excellence__header">
              <span className="centers-of-excellence__eyebrow">JAMHUURIYA UNIVERSITY</span>
              <h2 id="centers-heading">Centers of Excellence</h2>
              <p>
                Explore Jamhuuriya University's specialized centers, innovation labs, research institutes, professional certifications, graduate studies, and academic excellence.
              </p>
            </header>

            <div className="centers-of-excellence__grid">
              {centers.map((center, index) => {
                const cardProps = {
                  ref: (node) => (cardRefs.current[index] = node),
                  'data-index': index,
                  className: `center-excellence-card ${visibleCards[index] ? 'is-visible' : ''}`,
                  style: { '--center-accent': center.accent, '--card-delay': `${index * 70}ms` },
                };
                const cardContent = <>
                  <div className="center-excellence-card__art" aria-hidden="true">
                    {center.logo ? (
                      <img src={center.logo} alt="" />
                    ) : (
                      <CenterFallbackIcon type={center.glyph} />
                    )}
                  </div>
                  <div className="center-excellence-card__body">
                    <h3>{center.abbreviation}</h3>
                    <p>{center.name}</p>
                  </div>
                  {center.website ? (
                    <span className="center-excellence-card__link">
                      Visit Website <ExternalLink aria-hidden="true" size={14} />
                    </span>
                  ) : (
                    <span className="center-excellence-card__coming-soon">Coming Soon</span>
                  )}
                </>;

                return (
                  center.website ? (
                    <a
                      key={center.abbreviation}
                      {...cardProps}
                      href={center.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Visit ${center.name} website (opens in a new tab)`}
                    >
                      {cardContent}
                    </a>
                  ) : (
                    <article key={center.abbreviation} {...cardProps}>
                      {cardContent}
                    </article>
                  )
                );
              })}
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
              <details className="faq-item" key={faq.question}>
                <summary>
                  {faq.question}
                  <ChevronDown size={18} />
                </summary>
                <p>{faq.answer}</p>
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

      <PublicFooter />
    </div>
  );
}

export default LandingPage;
