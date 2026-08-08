import { ArrowRight, CircleDollarSign } from 'lucide-react';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';
import { programFeeGroups } from '../data/admissionsData';

const money = (value) => `$${Number(value).toLocaleString('en-US')}`;
const totalMoney = (value) => `$${Math.round(Number(value)).toLocaleString('en-US', {
  maximumFractionDigits: 0,
})}`;

function ProgramFeesPage() {
  return (
    <div className="public-page admission-info-page min-h-screen">
      <PublicNav active="fees" />
      <header className="admission-info-header fees-header">
        <div className="admission-info-hero">
          <span>CURRENT FEE SCHEDULE</span>
          <h1>Program <em>Fees</em></h1>
          <p>Compare the published monthly, semester, yearly, registration, and total program costs before choosing your course.</p>
        </div>
      </header>

      <main className="admission-info-main fees-main">
        <aside className="registration-fee-note">
          <CircleDollarSign size={32} />
          <div><strong>$25 registration fee</strong><p>A one-time registration fee applies to every faculty and program. The minimum individual payment accepted is $0.01.</p></div>
        </aside>

        <section className="program-fees-table-wrap">
          <table className="program-fees-table">
            <thead>
              <tr>
                <th>Program</th><th>Monthly</th><th>Other</th><th>Semester</th><th>Yearly</th><th>Duration</th><th>English</th><th>Registration</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              {programFeeGroups.map((group) => [
                <tr className="faculty-fee-row" key={group.faculty}><th colSpan="9">{group.faculty}</th></tr>,
                ...group.programs.map(([program, monthly, other, semester, yearly, duration, english, registration, total]) => (
                  <tr key={`${group.faculty}-${program}`}>
                    <td>{program}</td><td>{money(monthly)}</td><td>{money(other)}</td><td>{money(semester)}</td><td>{money(yearly)}</td><td>{duration} years</td><td>{money(english)}</td><td>{money(registration)}</td><td><strong>{totalMoney(total)}</strong></td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </section>

        <p className="fees-source-note">Fees are displayed from JUST's published program-fee schedule. Confirm current charges with the admissions office before payment.</p>
        <section className="admission-page-cta compact-cta">
          <div><span>NEXT STEP</span><h2>Choose your program and apply</h2></div>
          <a className="btn-primary" href="/apply">Apply Now <ArrowRight size={17} /></a>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

export default ProgramFeesPage;
