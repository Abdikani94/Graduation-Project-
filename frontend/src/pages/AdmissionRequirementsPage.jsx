import { ArrowRight, BriefcaseBusiness, Camera, FileCheck2, GraduationCap, ShieldCheck, WalletCards } from 'lucide-react';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';
import { admissionRequirements } from '../data/admissionsData';

const icons = [GraduationCap, FileCheck2, ShieldCheck, Camera, WalletCards, BriefcaseBusiness];

function AdmissionRequirementsPage() {
  return (
    <div className="public-page admission-info-page min-h-screen">
      <PublicNav active="requirements" />
      <header className="admission-info-header">
        <div className="admission-info-hero">
          <span>UNDERGRADUATE ADMISSIONS</span>
          <h1>Admission <em>Requirements</em></h1>
          <p>Prepare the required education records, certificate copies, photographs, and registration fee before starting your application.</p>
        </div>
      </header>

      <main className="admission-info-main">
        <section className="requirements-grid">
          {admissionRequirements.map((requirement, index) => {
            const Icon = icons[index];
            return (
              <article className="admission-requirement-card" key={requirement.title}>
                <span><Icon size={24} /></span>
                <div>
                  <small>REQUIREMENT {String(index + 1).padStart(2, '0')}</small>
                  <h2>{requirement.title}</h2>
                  <p>{requirement.description}</p>
                </div>
              </article>
            );
          })}
        </section>

        <section className="admission-page-cta">
          <div>
            <span>READY TO APPLY?</span>
            <h2>Start your admission application</h2>
            <p>Complete the online form and keep your application reference number for communication with the admissions office.</p>
          </div>
          <a className="btn-primary" href="/apply">Apply Now <ArrowRight size={17} /></a>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

export default AdmissionRequirementsPage;
