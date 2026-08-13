import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Camera,
  UploadCloud,
  UserRound,
  ShieldCheck,
} from 'lucide-react';
import Toast from '../components/Toast';
import EvcPaymentFlow from '../components/EvcPaymentFlow';
import PublicNav from '../components/PublicNav';
import PublicFooter from '../components/PublicFooter';
import logo from '../images/logo.jpg';
import secondarySchoolNames from '../data/secondarySchools';
import countries from '../data/countries';
import api from '../api/axios';
import { readResponsePayload, responseMessage } from '../api/response';

const steps = [
  ['01', 'Requirement'],
  ['02', 'Personal details'],
  ['03', 'Emergency & school'],
  ['04', 'Program Payment Plan'],
  ['05', 'Review'],
];

const conditions = [
  'Must have completed Secondary school.',
  'Should bring four (4) passport-size photos.',
  'Should bring the original Secondary School Leaving Certificate with two copies.',
  'For part-time registration, two years experience is recommended.',
  'Should pay a fixed Admission Fee of $25 for all programs.',
];

const admissionRequirements = [
  ['High education completion', 'Submit evidence that you completed secondary school.'],
  ['Four passport pictures', 'Bring four clear passport-size photos with a white background.'],
  ['Have certificate high school', 'Bring the original high school certificate with two copies.'],
  ['Pay fees of Admission', 'Pay the fixed $25 admission fee for any selected faculty.'],
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

const fallbackPrograms = [
  ['Medicine & Health Science', ['Medicine & General Surgery', 'Nursing', 'Midwifery', 'Public Health', 'Medical Laboratory Science', 'BSc in Medical Radiography and Imaging Technology']],
  ['Computer & IT', ['Computer Application', 'Computer Network & Security', 'Computer Multi-Media', 'BSc in Artificial Intelligence and Data Science']],
  ['Economics & Management', ['Business Administration', 'Banking & Finance', 'Accounting', 'Public Administration', 'Economics', 'BSc in Business Analytics', 'BSc in Social Work']],
  ['Engineering', ['Civil Engineering', 'Electrical Engineering (Majoring in Power and Energy)', 'Electrical Engineering (Majoring in Telecommunications and Networking)']],
];

const admissionTimeZone = 'Africa/Mogadishu';
const getAdmissionDateTime = (date = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: admissionTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date).map(({ type, value }) => [type, value])
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
};
const today = getAdmissionDateTime().date;
const getOneYearFromDate = (dateText) => {
  const current = new Date(`${dateText}T00:00:00Z`);
  const targetYear = current.getUTCFullYear() + 1;
  const targetMonth = current.getUTCMonth();
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(current.getUTCDate(), lastDayOfTargetMonth);
  return new Date(Date.UTC(targetYear, targetMonth, targetDay)).toISOString().slice(0, 10);
};
const maximumAppointmentDate = getOneYearFromDate(today);
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const appointmentStartTime = '08:00';
const appointmentEndTime = '17:00';
const appointmentIsNotInFuture = (date, time) => {
  const appointment = new Date(`${date}T${time}:00+03:00`);
  return Number.isNaN(appointment.getTime()) || appointment.getTime() <= Date.now();
};
const minimumAppointmentTime = (date) => {
  const current = getAdmissionDateTime();
  if (date !== current.date || current.time < appointmentStartTime) return appointmentStartTime;
  if (current.time >= appointmentEndTime) return '23:59';

  const nextMinute = getAdmissionDateTime(new Date(Date.now() + 60_000));
  return nextMinute.date === date ? nextMinute.time : '23:59';
};
const gradeOptions = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-'];
const paymentPlanOptions = [
  'Admission fee only',
  'Admission fee + Semester fee',
  'Admission fee + Full payment',
];
const mobileMoneyMethods = ['EVC Plus'];

const initialForm = {
  fullName: null,
  motherName: null,
  nationality: null,
  nationalId: null,
  rollNumber: null,
  dateOfBirth: null,
  placeOfBirth: null,
  district: null,
  email: null,
  mobile: '+252',
  sex: null,
  maritalStatus: null,
  campus: null,
  emergencyName: null,
  emergencyTell: '+252',
  relationship: null,
  relationshipOther: null,
  familyStudied: null,
  schoolName: null,
  schoolDistrict: null,
  graduationYear: null,
  percentage: null,
  heardFrom: null,
  program: null,
  department: null,
  modeOfStudy: null,
  paymentPlan: null,
  integrityDeclaration: null,
  paymentMethod: null,
  paymentPhone: '+252',
  paymentAmount: '0.01',
  hasCertificate: null,
  appointmentDate: null,
  appointmentTime: null,
};

const FieldErrorContext = createContext({});

function FieldErrorMessage({ name }) {
  const errors = useContext(FieldErrorContext);
  const error = errors[name];
  if (!error) return null;

  return (
    <span className="apply-field-error-sr" id={`${name}-error`} role="alert">{error}</span>
  );
}

function Stepper({ currentStep }) {
  return (
    <div className="apply-stepper">
      {steps.map(([number, label], index) => (
        <div className={`apply-step ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'done' : ''}`} key={label}>
          <span>{number}</span>
          <p>{label}</p>
        </div>
      ))}
    </div>
  );
}

function Field({ label, name, type = 'text', value, onChange, placeholder, min, max, minLength, maxLength, inputMode, pattern, title, step, readOnly = false, digitsOnly = false }) {
  const errors = useContext(FieldErrorContext);
  const error = errors[name];
  const handleChange = (event) => {
    if (!digitsOnly) {
      onChange(event);
      return;
    }

    const numericValue = event.target.value
      .replace(/\D/g, '')
      .replace(/^0+/, '')
      .slice(0, maxLength);
    onChange({ target: { name, value: numericValue, type: 'text', checked: false } });
  };

  return (
    <label className={`apply-field ${error ? 'has-error' : ''}`} data-field-name={name}>
      <span>{label}</span>
      <input
        name={name}
        type={type}
        value={value ?? ''}
        onChange={handleChange}
        placeholder={placeholder || label}
        min={min}
        max={max}
        minLength={minLength}
        maxLength={maxLength}
        inputMode={inputMode}
        pattern={pattern}
        title={title}
        step={step}
        readOnly={readOnly}
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={Boolean(error)}
      />
      <FieldErrorMessage name={name} />
    </label>
  );
}

function PhoneField({ label, name, value, onChange, placeholder, maxLength }) {
  const errors = useContext(FieldErrorContext);
  const error = errors[name];
  const localNumber = (value || '').replace(/^\+252/, '');

  const handleChange = (event) => {
    const numericValue = event.target.value
      .replace(/\D/g, '')
      .replace(/^0+/, '')
      .slice(0, maxLength);
    onChange({ target: { name, value: `+252${numericValue}`, type: 'text', checked: false } });
  };

  return (
    <label className={`apply-field ${error ? 'has-error' : ''}`} data-field-name={name}>
      <span>{label}</span>
      <div className="apply-phone-field">
        <span className="apply-phone-prefix">+252</span>
        <input
          name={name}
          type="tel"
          value={localNumber}
          onChange={handleChange}
          placeholder={placeholder || '611234567'}
          minLength={8}
          maxLength={maxLength}
          inputMode="numeric"
          pattern="[1-9][0-9]{7,11}"
          title="Enter 8 to 12 digits and do not start with zero"
          aria-describedby={error ? `${name}-error` : undefined}
          aria-invalid={Boolean(error)}
        />
      </div>
      <FieldErrorMessage name={name} />
    </label>
  );
}

function SelectField({ label, name, value, onChange, options, placeholder = 'Select grade', disabled = false }) {
  const errors = useContext(FieldErrorContext);
  const error = errors[name];
  return (
    <label className={`apply-field ${error ? 'has-error' : ''}`} data-field-name={name}>
      <span>{label}</span>
      <select name={name} value={value ?? ''} onChange={onChange} disabled={disabled} aria-describedby={error ? `${name}-error` : undefined} aria-invalid={Boolean(error)}>
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;
          return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
        })}
      </select>
      <FieldErrorMessage name={name} />
    </label>
  );
}

function SearchableSelectField({ label, name, value, onChange, options, placeholder, emptyMessage = 'No matching option found' }) {
  const errors = useContext(FieldErrorContext);
  const error = errors[name];
  const [query, setQuery] = useState(value ?? '');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setQuery(value ?? '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmedQuery = query.trim().toLowerCase();
  const filteredOptions = (trimmedQuery
    ? options.filter((option) => option.toLowerCase().includes(trimmedQuery))
    : options
  ).slice(0, 50);

  const selectOption = (option) => {
    setQuery(option);
    setOpen(false);
    onChange({ target: { name, value: option, type: 'text', checked: false } });
  };

  const handleInputChange = (event) => {
    setQuery(event.target.value);
    setOpen(true);
    onChange(event);
  };

  return (
    <label className={`apply-field apply-combobox ${error ? 'has-error' : ''}`} data-field-name={name} ref={containerRef}>
      <span>{label}</span>
      <input
        name={name}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}
        placeholder={placeholder || label}
        autoComplete="off"
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={Boolean(error)}
      />
      {open && (
        <ul className="apply-combobox-menu">
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <li key={option}>
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectOption(option)}>
                  {option}
                </button>
              </li>
            ))
          ) : (
            <li className="apply-combobox-empty">{emptyMessage}</li>
          )}
        </ul>
      )}
      <FieldErrorMessage name={name} />
    </label>
  );
}

function OptionGroup({ label, name, value, options, onChange, className = '' }) {
  const errors = useContext(FieldErrorContext);
  const error = errors[name];
  return (
    <fieldset className={`apply-options ${className} ${error ? 'has-error' : ''}`} data-field-name={name} aria-describedby={error ? `${name}-error` : undefined} aria-invalid={Boolean(error)}>
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <label key={option}>
            <input checked={value === option} name={name} onChange={onChange} type="checkbox" value={option} />
            {option}
          </label>
        ))}
      </div>
      <FieldErrorMessage name={name} />
    </fieldset>
  );
}

function PaymentMethodDetails({ method, form, onChange }) {
  if (!method) return null;

  return (
    <div className="payment-details-card evc-only-payment">
      <div className="evc-payment-heading"><strong>EVC Plus</strong><span>Secure mobile payment</span></div>
      <div className="apply-form-grid">
        <PhoneField label="EVC Phone" name="paymentPhone" value={form.paymentPhone} onChange={onChange} maxLength={12} />
        <Field label="Amount (USD)" name="paymentAmount" value={form.paymentAmount} onChange={onChange} type="number" min="0.01" step="0.01" inputMode="decimal" />
      </div>
      <p className="payment-note">Confirm on your phone. Never enter your EVC PIN here.</p>
    </div>
  );
}

const fileNameLooksLikeCertificate = (fileName) =>
  /(certificate|cert|shahaado|shaahado|transcript|result|secondary|school|diploma|degree)/i.test(fileName);

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to read image file.'));
    };
    image.src = url;
  });

const hasWhitePassportBackground = async (file) => {
  const image = await loadImage(file);
  const ratio = image.width / image.height;
  if (ratio < 0.65 || ratio > 1.05) return false;

  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = 160;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const samplePoints = [
    [3, 3], [60, 3], [116, 3],
    [3, 40], [116, 40],
    [3, 80], [116, 80],
  ];

  let whitePixels = 0;
  for (const [x, y] of samplePoints) {
    const [red, green, blue, alpha] = context.getImageData(x, y, 1, 1).data;
    const isWhite = alpha < 10 || (red > 225 && green > 225 && blue > 225 && Math.max(red, green, blue) - Math.min(red, green, blue) < 35);
    if (isWhite) whitePixels += 1;
  }

  return whitePixels >= 5;
};

const requiredFieldsByStep = {
  1: [
    ['fullName', 'Full Name'],
    ['motherName', "Mother's Name"],
    ['nationality', 'Nationality'],
    ['nationalId', 'National ID'],
    ['rollNumber', 'Roll Number'],
    ['dateOfBirth', 'Date Of Birth'],
    ['placeOfBirth', 'Place Of Birth'],
    ['district', 'District / Address'],
    ['email', 'Email'],
    ['mobile', 'Phone Number'],
    ['sex', 'Sex'],
    ['maritalStatus', 'Marital Status'],
    ['hasCertificate', 'Certificate status'],
  ],
  2: [
    ['emergencyName', 'Emergency Contact Name'],
    ['emergencyTell', 'Emergency Phone'],
    ['relationship', 'Relationship'],
    ['familyStudied', 'Family Member Studied Here'],
    ['schoolName', 'Secondary School Name'],
    ['schoolDistrict', 'School District'],
    ['graduationYear', 'Graduation Year'],
    ['percentage', 'Passing Grade'],
    ['heardFrom', 'How did you know about university'],
  ],
  3: [
    ['program', 'Faculty'],
    ['department', 'Department'],
    ['modeOfStudy', 'Mode Of Study'],
    ['paymentPlan', 'Payment Plan'],
    ['integrityDeclaration', 'Statement of Integrity'],
    ['paymentMethod', 'Payment Method'],
  ],
};

const isEmpty = (value) => value === null || value === undefined || String(value).trim() === '';
const normalizeValue = (value) => String(value ?? '').trim();
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeValue(value)) && normalizeValue(value).length <= 254;
const isValidPhone = (value) => /^\+252[1-9]\d{7,11}$/.test(normalizeValue(value));
const isValidDateValue = (value) => {
  const text = normalizeValue(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};
const ageFromDate = (dateText) => {
  const birthDate = new Date(`${dateText}T00:00:00`);
  const currentDate = new Date(`${today}T00:00:00`);
  let age = currentDate.getFullYear() - birthDate.getFullYear();
  const monthDifference = currentDate.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && currentDate.getDate() < birthDate.getDate())) age -= 1;
  return age;
};
const personNamePattern = /^[A-Za-z][A-Za-z\s'.-]{1,79}$/;
const simpleTextPattern = /^[A-Za-z][A-Za-z\s'.&,/-]{1,99}$/;
const addressPattern = /^[A-Za-z0-9][A-Za-z0-9\s'.&,()#/-]{1,149}$/;
const schoolNamePattern = /^[A-Za-z0-9][A-Za-z0-9\s'.&,()/-]{1,149}$/;
const idPattern = /^[1-9]\d{9,14}$/;
const rollNumberPattern = /^[1-9]\d{9,14}$/;
const optionValues = {
  sex: ['Male', 'Female'],
  maritalStatus: ['Single', 'Marriage', 'Divorced', 'Widowed'],
  hasCertificate: ['Yes', 'No'],
  relationship: ['Mother', 'Father', 'Brother', 'Sister', 'Other specify'],
  familyStudied: ['Yes', 'No'],
  heardFrom: ['Social Media', 'Friends', 'University came to our School', 'Parents', 'Seminars of the University', 'Other specify'],
  modeOfStudy: ['Full Time', 'Part Time'],
  paymentPlan: paymentPlanOptions,
  paymentMethod: ['EVC Plus'],
};

const isAllowedOption = (name, value) => optionValues[name]?.includes(value);

function ApplyPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [certificate, setCertificate] = useState(null);
  const [certificatePreview, setCertificatePreview] = useState('');
  const [evcPaymentSession, setEvcPaymentSession] = useState(null);
  const [draftApplication, setDraftApplication] = useState(null);
  const [confirmedEvcPayment, setConfirmedEvcPayment] = useState(null);
  const [generatedReceipt, setGeneratedReceipt] = useState(null);
  const [showGeneratedReceipt, setShowGeneratedReceipt] = useState(false);
  const [toast, setToast] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [pendingFocusField, setPendingFocusField] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registration, setRegistration] = useState({ loading: true, isOpen: false, status: 'Closed', period: null });
  const [programs, setPrograms] = useState(fallbackPrograms);
  const [schools, setSchools] = useState(secondarySchoolNames);
  const [districts, setDistricts] = useState([]);

  useEffect(() => {
    Promise.allSettled([
      api.get('/admission-registration/status'),
      api.get('/programs'),
      api.get('/secondary-schools'),
      api.get('/districts'),
    ]).then(([statusResult, programsResult, schoolsResult, districtsResult]) => {
      setRegistration(statusResult.status === 'fulfilled'
        ? { loading: false, ...statusResult.value }
        : { loading: false, isOpen: false, status: 'Closed', period: null });
      if (programsResult.status === 'fulfilled' && Array.isArray(programsResult.value?.data)) {
        const availablePrograms = programsResult.value.data
          .map((program) => [
            program.title,
            (program.departments || []).map((department) => department.name).filter(Boolean),
          ])
          .filter(([title, departments]) => title && departments.length);
        if (availablePrograms.length) setPrograms(availablePrograms);
      }
      if (schoolsResult.status === 'fulfilled' && Array.isArray(schoolsResult.value?.data) && schoolsResult.value.data.length) {
        setSchools(schoolsResult.value.data);
      }
      if (districtsResult.status === 'fulfilled' && Array.isArray(districtsResult.value?.data)) {
        setDistricts(districtsResult.value.data);
      }
    });
  }, []);

  useEffect(() => {
    if (!pendingFocusField) return undefined;

    const animationFrame = window.requestAnimationFrame(() => {
      const fieldContainer = document.querySelector(`[data-field-name="${pendingFocusField}"]`);
      if (fieldContainer) {
        fieldContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusTarget = fieldContainer.matches('input, select, button')
          ? fieldContainer
          : fieldContainer.querySelector('input:not([type="hidden"]):not(:disabled), select:not(:disabled), button:not(:disabled)');
        focusTarget?.focus({ preventScroll: true });
      }
      setPendingFocusField(null);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [pendingFocusField, step]);

  const showToast = ({ type = 'info', title, message, duration }) => {
    setToast({
      type,
      title,
      message,
      duration,
    });
  };

  const showError = (message, title = 'Validation error') => {
    showToast({ type: 'error', title, message });
  };

  const focusFieldError = (field, stepIndex) => {
    if (typeof stepIndex === 'number' && step !== stepIndex) setStep(stepIndex);
    setPendingFocusField(field);
  };

  const showFieldError = (field, message, stepIndex, title = 'Validation error') => {
    setFieldErrors({ [field]: message });
    showError(message, title);
    focusFieldError(field, stepIndex);
    return false;
  };

  const updateForm = (event) => {
    const { checked, name, type, value } = event.target;
    const nextValue = type === 'checkbox' ? (checked ? value : null) : (value || null);

    setFieldErrors((current) => {
      if (!current[name] && !(name === 'program' && current.department)) return current;
      const nextErrors = { ...current };
      delete nextErrors[name];
      if (name === 'program') delete nextErrors.department;
      if (name === 'hasCertificate') {
        delete nextErrors.certificate;
        delete nextErrors.appointmentDate;
        delete nextErrors.appointmentTime;
      }
      if (name === 'relationship') delete nextErrors.relationshipOther;
      return nextErrors;
    });

    if (name === 'hasCertificate') {
      if (nextValue === 'No') {
        setCertificate(null);
        setCertificatePreview('');
      }
    }

    setForm((current) => ({
      ...current,
      [name]: nextValue,
      ...(name === 'program' ? { department: null } : {}),
      ...(name === 'paymentPlan' ? {
        paymentMethod: 'EVC Plus',
        paymentPhone: current.paymentPhone || '+252',
        paymentAmount: current.paymentAmount || '0.01',
      } : {}),
      ...(name === 'relationship' && nextValue !== 'Other specify' ? { relationshipOther: null } : {}),
      ...(name === 'hasCertificate' && nextValue === 'Yes' ? { appointmentDate: null, appointmentTime: null } : {}),
    }));
  };

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    setToast(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showFieldError('photo', 'Passport photo must be an image file only.', 1);
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showFieldError('photo', 'Passport photo must be 5MB or smaller.', 1);
      event.target.value = '';
      return;
    }
    try {
      const isPassportPhoto = await hasWhitePassportBackground(file);
      if (!isPassportPhoto) {
        showFieldError('photo', 'Upload a passport photo only: portrait or square photo with a plain white background.', 1);
        event.target.value = '';
        return;
      }
    } catch {
      showFieldError('photo', 'Passport photo could not be read. Upload a valid JPG, PNG, or WEBP image.', 1);
      event.target.value = '';
      return;
    }
    setPhoto(file);
    setFieldErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors.photo;
      return nextErrors;
    });
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleCertificate = (event) => {
    const file = event.target.files?.[0];
    setToast(null);
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type) || !fileNameLooksLikeCertificate(file.name)) {
      showFieldError('certificate', 'Certificate upload accepts certificate files only. Use PDF/JPG/PNG/WEBP and include certificate, transcript, or result in the file name.', 1);
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showFieldError('certificate', 'Certificate file must be 10MB or smaller.', 1);
      event.target.value = '';
      return;
    }
    setCertificate(file);
    setFieldErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors.certificate;
      return nextErrors;
    });
    if (certificatePreview) URL.revokeObjectURL(certificatePreview);
    setCertificatePreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : '');
  };

  const validateStep = (stepIndex) => {
    const missing = (requiredFieldsByStep[stepIndex] || [])
      .filter(([field]) => isEmpty(form[field]))
      .map(([field, label]) => [field, label]);

    if (stepIndex === 1 && !photo) missing.push(['photo', 'Passport Photo']);
    if (stepIndex === 1 && form.hasCertificate === 'Yes' && !certificate) missing.push(['certificate', 'Certificate File']);
    if (stepIndex === 1 && form.hasCertificate === 'No') {
      if (isEmpty(form.appointmentDate)) missing.push(['appointmentDate', 'Appointment Date']);
      if (isEmpty(form.appointmentTime)) missing.push(['appointmentTime', 'Appointment Time']);
    }

    if (missing.length) {
      const [firstMissingField, firstMissingLabel] = missing[0];
      const message = `${firstMissingLabel} is required.`;
      setFieldErrors({ [firstMissingField]: message });
      showError(message);
      focusFieldError(firstMissingField, stepIndex);
      return false;
    }

    if (stepIndex === 2) {
      const graduationYear = Number(form.graduationYear);
      const currentYear = new Date().getFullYear();
      if (!Number.isInteger(graduationYear) || graduationYear < 1970 || graduationYear > currentYear) {
        return showFieldError('graduationYear', `Graduation year must be between 1970 and ${currentYear}.`, stepIndex);
      }
      if (!gradeOptions.includes(form.percentage)) {
        return showFieldError('percentage', 'Please select a valid passing grade.', stepIndex);
      }
    }

    if (stepIndex === 1) {
      if (!personNamePattern.test(normalizeValue(form.fullName))) {
        return showFieldError('fullName', 'Full Name must contain only letters, spaces, apostrophes, hyphens, or periods.', stepIndex);
      }
      if (!personNamePattern.test(normalizeValue(form.motherName))) {
        return showFieldError('motherName', "Mother's Name must contain only letters, spaces, apostrophes, hyphens, or periods.", stepIndex);
      }
      if (!countries.includes(normalizeValue(form.nationality))) {
        return showFieldError('nationality', 'Search for and select a country from the list.', stepIndex);
      }
      if (!idPattern.test(normalizeValue(form.nationalId))) {
        return showFieldError('nationalId', 'National ID must contain 10 to 15 digits and cannot start with zero.', stepIndex);
      }
      if (!rollNumberPattern.test(normalizeValue(form.rollNumber))) {
        return showFieldError('rollNumber', 'Roll Number must contain 10 to 15 digits and cannot start with zero.', stepIndex);
      }
      if (!isValidDateValue(form.dateOfBirth)) {
        return showFieldError('dateOfBirth', 'Please enter a valid date of birth.', stepIndex);
      }
      if (form.dateOfBirth > today) {
        return showFieldError('dateOfBirth', 'Date of birth cannot be in the future.', stepIndex);
      }
      const age = ageFromDate(form.dateOfBirth);
      if (age < 14 || age > 100) {
        return showFieldError('dateOfBirth', 'Applicant age must be between 14 and 100 years.', stepIndex);
      }
      if (!simpleTextPattern.test(normalizeValue(form.placeOfBirth))) {
        return showFieldError('placeOfBirth', 'Place Of Birth must contain text only.', stepIndex);
      }
      if (!addressPattern.test(normalizeValue(form.district))) {
        return showFieldError('district', 'Enter a valid district or residential address.', stepIndex);
      }
      if (!isValidEmail(form.email)) {
        return showFieldError('email', 'Please enter a valid email address, for example name@example.com.', stepIndex);
      }
      if (!isValidPhone(form.mobile)) {
        return showFieldError('mobile', 'Phone Number must contain 8 to 12 digits after +252 and cannot start with zero.', stepIndex);
      }
      if (!isAllowedOption('sex', form.sex)) {
        return showFieldError('sex', 'Please select a valid sex option.', stepIndex);
      }
      if (!isAllowedOption('maritalStatus', form.maritalStatus)) {
        return showFieldError('maritalStatus', 'Please select a valid marital status.', stepIndex);
      }
      if (!isAllowedOption('hasCertificate', form.hasCertificate)) {
        return showFieldError('hasCertificate', 'Please select a valid certificate status.', stepIndex);
      }
      if (form.hasCertificate === 'No') {
        if (!isValidDateValue(form.appointmentDate)) {
          return showFieldError('appointmentDate', 'Please enter a valid appointment date.', stepIndex);
        }
        if (form.appointmentDate < today) {
          return showFieldError('appointmentDate', 'Appointment date cannot be in the past.', stepIndex);
        }
        if (form.appointmentDate > maximumAppointmentDate) {
          return showFieldError('appointmentDate', 'Certificate appointment date must be within one year from today.', stepIndex);
        }
        if (!/^\d{2}:\d{2}$/.test(normalizeValue(form.appointmentTime))) {
          return showFieldError('appointmentTime', 'Please enter a valid appointment time.', stepIndex);
        }
        if (appointmentIsNotInFuture(form.appointmentDate, form.appointmentTime)) {
          return showFieldError('appointmentTime', 'Appointment date and time must be in the future. Please select a later time.', stepIndex);
        }
        if (form.appointmentTime < appointmentStartTime || form.appointmentTime > appointmentEndTime) {
          return showFieldError('appointmentTime', 'Appointment time must be between 8:00 AM and 5:00 PM.', stepIndex);
        }
      }
    }

    if (stepIndex === 2) {
      if (!personNamePattern.test(normalizeValue(form.emergencyName))) {
        return showFieldError('emergencyName', 'Emergency Contact Name must contain only letters, spaces, apostrophes, hyphens, or periods.', stepIndex);
      }
      if (!isValidPhone(form.emergencyTell)) {
        return showFieldError('emergencyTell', 'Emergency phone must contain 8 to 12 digits after +252 and cannot start with zero.', stepIndex);
      }
      if (!isAllowedOption('relationship', form.relationship)) {
        return showFieldError('relationship', 'Please select a valid relationship.', stepIndex);
      }
      if (form.relationship === 'Other specify' && !simpleTextPattern.test(normalizeValue(form.relationshipOther))) {
        return showFieldError('relationshipOther', 'Please specify the relationship to the applicant.', stepIndex);
      }
      if (!isAllowedOption('familyStudied', form.familyStudied)) {
        return showFieldError('familyStudied', 'Please select whether a family member studied here.', stepIndex);
      }
      if (!schools.includes(normalizeValue(form.schoolName))) {
        return showFieldError('schoolName', 'Please select a valid Secondary School Name from the list.', stepIndex);
      }
      if (!schoolNamePattern.test(normalizeValue(form.schoolName))) {
        return showFieldError('schoolName', 'Secondary School Name may contain letters and numbers.', stepIndex);
      }
      if (!simpleTextPattern.test(normalizeValue(form.schoolDistrict))) {
        return showFieldError('schoolDistrict', 'School District must contain text only.', stepIndex);
      }
      if (!isAllowedOption('heardFrom', form.heardFrom)) {
        return showFieldError('heardFrom', 'Please select a valid source for how you heard about the university.', stepIndex);
      }
    }

    if (stepIndex === 3) {
      const selectedProgram = programs.find(([program]) => program === form.program);
      if (!selectedProgram) {
        return showFieldError('program', 'Please select a valid faculty.', stepIndex);
      }
      if (!selectedProgram[1].includes(form.department)) {
        return showFieldError('department', 'Please select a department that belongs to the chosen faculty.', stepIndex);
      }
      if (!isAllowedOption('modeOfStudy', form.modeOfStudy)) {
        return showFieldError('modeOfStudy', 'Please select a valid mode of study.', stepIndex);
      }
      if (!isAllowedOption('paymentPlan', form.paymentPlan)) {
        return showFieldError('paymentPlan', 'Please select a valid payment plan.', stepIndex);
      }
      if (!isAllowedOption('paymentMethod', form.paymentMethod)) {
        return showFieldError('paymentMethod', 'Please select a valid payment method.', stepIndex);
      }
      if (mobileMoneyMethods.includes(form.paymentMethod) && !isValidPhone(form.paymentPhone)) {
        return showFieldError('paymentPhone', 'Payment Phone Number must contain 8 to 12 digits after +252 and cannot start with zero.', stepIndex);
      }
      const paymentAmount = Number(form.paymentAmount);
      if (!Number.isFinite(paymentAmount) || paymentAmount < 0.01) {
        return showFieldError('paymentAmount', 'Minimum payment amount is 0.01 USD.', stepIndex);
      }
    }

    return true;
  };

  const validateAllSteps = () => [1, 2, 3].every((stepIndex) => validateStep(stepIndex));

  const buildApplicationPayload = () => {
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, value ?? ''));
    payload.append('faculty', form.program ?? '');
    if (photo) payload.append('passportPhoto', photo);
    if (certificate) payload.append('certificate', certificate);
    return payload;
  };

  const handleNextStep = async () => {
    if (!registration.isOpen) return showError('Admission registration is not currently open.', 'Registration closed');
    if (step > 0 && step < steps.length - 1 && !validateStep(step)) return;
    if (step === 3 && form.paymentMethod === 'EVC Plus') {
      if (confirmedEvcPayment?.status === 'SUCCESS') {
        setStep(4);
        return;
      }
      setIsSubmitting(true);
      try {
        let session = draftApplication;
        if (!session) {
          const response = await fetch(`${apiBaseUrl}/applications`, { method: 'POST', body: buildApplicationPayload() });
          const { data: result, text } = await readResponsePayload(response);
          if (!response.ok) throw new Error(responseMessage(result, text, 'Unable to prepare payment.'));
          if (!result || typeof result !== 'object') throw new Error(responseMessage(result, text, 'The server returned an invalid response.'));
          session = { application: result.application, paymentToken: result.paymentAccessToken };
          setDraftApplication(session);
        }
        setEvcPaymentSession({ ...session, initialAmount: form.paymentAmount, initialPhone: form.paymentPhone });
      } catch (error) {
        showError(error.message || 'Unable to prepare payment.', 'Payment error');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const submitApplication = async () => {
    if (!registration.isOpen) return showError('Admission registration is not currently open.', 'Registration closed');
    if (!validateAllSteps()) return;

    setIsSubmitting(true);
    try {
      let response;
      if (form.paymentMethod === 'EVC Plus') {
        if (!draftApplication || confirmedEvcPayment?.status !== 'SUCCESS') {
          throw new Error('Complete the EVC Plus payment before submitting your application.');
        }
        const statusResponse = await fetch(`${apiBaseUrl}/payments/${encodeURIComponent(confirmedEvcPayment.referenceId)}/status`, {
          headers: { Authorization: `Bearer ${draftApplication.paymentToken}` },
        });
        const { data: statusResult, text: statusText } = await readResponsePayload(statusResponse);
        if (!statusResponse.ok || statusResult?.payment?.status !== 'SUCCESS') {
          throw new Error(responseMessage(statusResult, statusText, 'A confirmed payment is required before submitting this application.'));
        }
        response = await fetch(`${apiBaseUrl}/applications/${encodeURIComponent(draftApplication.application.reference)}/submit`, {
          method: 'POST', headers: { Authorization: `Bearer ${draftApplication.paymentToken}` },
        });
      } else {
        response = await fetch(`${apiBaseUrl}/applications`, { method: 'POST', body: buildApplicationPayload() });
      }
      const { data: result, text } = await readResponsePayload(response);

      if (!response.ok) {
        throw new Error(responseMessage(result, text, 'Application submission failed.'));
      }
      if (!result || typeof result !== 'object') throw new Error(responseMessage(result, text, 'The server returned an invalid response.'));

      showToast({
        type: 'success',
        title: 'Application submitted',
        message: 'Your application has been submitted successfully. Thank you!',
        duration: 6500,
      });
      setForm(initialForm);
      setPhoto(null);
      setPhotoPreview('');
      setCertificate(null);
      setCertificatePreview('');
      setDraftApplication(null);
      setConfirmedEvcPayment(null);
      setGeneratedReceipt(null);
      setStep(0);
    } catch (error) {
      showError(error.message || 'Application submission failed.', 'Submit error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previousStep = () => setStep((current) => Math.max(current - 1, 0));
  const displayValue = (value, fallback = 'Not provided') => value || fallback;
  const documentReviewItems = form.hasCertificate === 'Yes'
    ? [['Certificate File', certificate?.name || 'Not uploaded']]
    : form.hasCertificate === 'No'
      ? [
          ['Appointment Date', displayValue(form.appointmentDate)],
          ['Appointment Time', displayValue(form.appointmentTime)],
        ]
      : [];
  const paymentReviewItems = form.paymentMethod === 'EVC Plus' && confirmedEvcPayment
      ? [
          ['Payment Phone Number', confirmedEvcPayment.payerPhone],
          ['Payment Amount', `$${Number(confirmedEvcPayment.amount).toFixed(2)}`],
          ['Payment Status', confirmedEvcPayment.status === 'SUCCESS' ? 'Successful' : confirmedEvcPayment.status],
          ['Transaction ID', confirmedEvcPayment.providerTransactionId || 'Pending'],
          ['Payment Receipt', generatedReceipt ? 'View Receipt' : 'Generated'],
        ]
      : [];
  const reviewSections = [
    {
      title: 'Personal Details',
      items: [
        ['Full Name', displayValue(form.fullName)],
        ["Mother's Name", displayValue(form.motherName)],
        ['Nationality', displayValue(form.nationality)],
        ['National ID', displayValue(form.nationalId)],
        ['Roll Number', displayValue(form.rollNumber)],
        ['Date Of Birth', displayValue(form.dateOfBirth)],
        ['Place Of Birth', displayValue(form.placeOfBirth)],
        ['District / Address', displayValue(form.district)],
        ['Email', displayValue(form.email)],
        ['Phone Number', displayValue(form.mobile)],
        ['Sex', displayValue(form.sex, 'Not selected')],
        ['Marital Status', displayValue(form.maritalStatus, 'Not selected')],
        ['Certificate Status', displayValue(form.hasCertificate, 'Not selected')],
      ],
    },
    {
      title: 'Emergency & School Information',
      items: [
        ['Emergency Contact', displayValue(form.emergencyName)],
        ['Emergency Phone', displayValue(form.emergencyTell)],
        ['Relationship', form.relationship === 'Other specify'
          ? `Other — ${displayValue(form.relationshipOther)}`
          : displayValue(form.relationship, 'Not selected')],
        ['Family Member Studied Here', displayValue(form.familyStudied, 'Not selected')],
        ['Secondary School', displayValue(form.schoolName)],
        ['School District', displayValue(form.schoolDistrict)],
        ['Graduation Year', displayValue(form.graduationYear)],
        ['Passing Grade', displayValue(form.percentage, 'Not selected')],
        ['Heard From', displayValue(form.heardFrom, 'Not selected')],
      ],
    },
    {
      title: 'Program & Payment',
      items: [
        ['Faculty', displayValue(form.program, 'Not selected')],
        ['Department', displayValue(form.department, 'Not selected')],
        ['Mode Of Study', displayValue(form.modeOfStudy, 'Not selected')],
        ['Payment Plan', displayValue(form.paymentPlan, 'Not selected')],
        ['Statement of Integrity', form.integrityDeclaration === 'Yes' ? 'Accepted' : 'Not accepted'],
        ['Payment Method', displayValue(form.paymentMethod, 'Not selected')],
        ...paymentReviewItems,
      ],
    },
    {
      title: 'Uploads & Certificate',
      items: [
        ['Passport Photo', photo?.name || 'Not uploaded'],
        ...documentReviewItems,
      ],
    },
  ];
  const selectedDepartments = programs.find(([program]) => program === form.program)?.[1] || [];

  return (
    <>
      <PublicNav active="apply" applyHref="#application" />
    <div className="apply-page hero-pattern">
      {evcPaymentSession && <EvcPaymentFlow {...evcPaymentSession} onClose={() => setEvcPaymentSession(null)} onSuccess={(payment, receipt) => { setConfirmedEvcPayment(payment); setGeneratedReceipt(receipt); setEvcPaymentSession(null); setStep(4); }} />}
      {showGeneratedReceipt && generatedReceipt && <div className="evc-overlay" role="dialog" aria-modal="true"><section className="evc-dialog"><div className="evc-result success"><Check size={54} /><h2>Payment Successful</h2></div><dl className="evc-confirmation"><div><dt>Payment Method</dt><dd>EVC Plus</dd></div><div><dt>Payment Phone Number</dt><dd>{generatedReceipt.payerPhone}</dd></div><div><dt>Payment Amount</dt><dd>${Number(generatedReceipt.amount).toFixed(2)}</dd></div><div><dt>Payment Status</dt><dd>Successful</dd></div><div><dt>Transaction ID</dt><dd>{generatedReceipt.providerTransactionId || 'Not available'}</dd></div><div><dt>Reference ID</dt><dd>{generatedReceipt.referenceId}</dd></div><div><dt>Merchant</dt><dd>{generatedReceipt.merchantName}</dd></div></dl><div className="evc-actions"><button onClick={() => setShowGeneratedReceipt(false)} type="button">Close Receipt</button></div></section></div>}
      <Toast toast={toast} onClose={() => setToast(null)} />
      <header className="apply-header">
        <section className="apply-hero">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F5F5F5] px-4 py-2 text-xs text-text-dark">
            <span className="h-2 w-2 rounded-full bg-[#00A451]" />
            Online admission form
          </div>
          <h1>
            Apply to <span>Jamhuriya</span> University
          </h1>
          <p>
            Complete your admission request step by step. You can add your personal details,
            school information, program choice, and payment plan in one place.
          </p>
          <a className="btn-primary mt-8" href="#application">
            Start Application <ArrowRight size={16} />
          </a>
        </section>
      </header>
      {!registration.loading && <section className={`mx-auto mb-6 max-w-5xl rounded-2xl border p-4 text-center ${registration.isOpen ? 'border-[#00A451]/20 bg-[#00A451]/10 text-[#00A451]' : 'border-[#2D368D]/20 bg-[#2D368D]/10 text-[#2D368D]'}`}>
        <strong>{registration.isOpen ? 'Admission registration is currently open.' : registration.status === 'Paused' ? 'Admission registration is temporarily paused. Please check again later.' : registration.status === 'Expired' ? 'The admission registration deadline has passed.' : 'Admission registration is currently closed.'}</strong>
        {registration.period && <p className="mt-1 text-sm">Opening: {new Date(registration.period.openingDatetime).toLocaleString()} · Closing: {new Date(registration.period.closingDatetime).toLocaleString()}</p>}
        {registration.period?.applicantInstructions && <p className="mt-1 text-sm">{registration.period.applicantInstructions}</p>}
      </section>}

      <Stepper currentStep={step} />

      <FieldErrorContext.Provider value={fieldErrors}>
      <main className="apply-card" id="application">
        <div className="apply-number">{steps[step][0]}</div>

        {step === 0 && (
          <section>
            <h1>The Application Should Fulfill The Following Conditions</h1>
            <p className="apply-note"><Check size={14} /> Expect a response from us within 24 hours</p>
            <div className="condition-list">
              {conditions.map((condition) => (
                <article className="condition-item" key={condition}>
                  <span />
                  <div>
                    <h3>{condition}</h3>
                    <p>Automate tasks and save time. With one click you can accept or reject.</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {step === 1 && (
          <section>
            <h1>Personal Details Application</h1>
            <p className="apply-note"><Check size={14} /> Provide your basic information below to help us personalize your application experience.</p>
            <div className="personal-grid">
              <label className={`photo-upload ${fieldErrors.photo ? 'has-error' : ''}`} data-field-name="photo">
                <input accept="image/png,image/jpeg,image/webp" onChange={handlePhoto} type="file" aria-describedby={fieldErrors.photo ? 'photo-error' : undefined} aria-invalid={Boolean(fieldErrors.photo)} />
                {photoPreview ? (
                  <div className="upload-preview">
                    <img src={photoPreview} alt="Passport photo preview" />
                    <div>
                      <strong>Profile photo uploaded</strong>
                      <small>Click to replace</small>
                    </div>
                  </div>
                ) : (
                  <div className="photo-placeholder">
                    <span className="photo-placeholder-icon">
                      <UserRound aria-hidden="true" />
                      <i><Camera aria-hidden="true" /></i>
                    </span>
                    <strong>Upload photo</strong>
                    <small>JPG, PNG or WEBP</small>
                  </div>
                )}
                <FieldErrorMessage name="photo" />
              </label>
              <div className="apply-form-grid">
                <Field label="Full Name" name="fullName" value={form.fullName} onChange={updateForm} placeholder="Your full name" maxLength={80} />
                <Field label="Mother's Name" name="motherName" value={form.motherName} onChange={updateForm} placeholder="Mother's name" maxLength={80} />
                <SearchableSelectField
                  label="Nationality"
                  name="nationality"
                  value={form.nationality}
                  onChange={updateForm}
                  options={countries}
                  placeholder="Search and select a country"
                  emptyMessage="No matching country found"
                />
                <Field label="National ID" name="nationalId" value={form.nationalId} onChange={updateForm} placeholder="10 to 15 digits" minLength={10} maxLength={15} inputMode="numeric" pattern="[1-9][0-9]{9,14}" title="Enter 10 to 15 digits and do not start with zero" digitsOnly />
              </div>
              <div className="apply-form-grid full">
                <Field label="Roll Number" name="rollNumber" value={form.rollNumber} onChange={updateForm} placeholder="10 to 15 digits" minLength={10} maxLength={15} inputMode="numeric" pattern="[1-9][0-9]{9,14}" title="Enter 10 to 15 digits and do not start with zero" digitsOnly />
                <Field label="Date Of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={updateForm} max={today} />
                <Field label="Place Of Birth" name="placeOfBirth" value={form.placeOfBirth} onChange={updateForm} placeholder="Enter your place of birth" maxLength={100} />
                <Field label="District / Address" name="district" value={form.district} onChange={updateForm} placeholder="Enter your district or current residential address" maxLength={150} />
                <Field label="Your Email" name="email" type="email" value={form.email} onChange={updateForm} placeholder="yourmail@gmail.com" maxLength={254} inputMode="email" />
                <PhoneField label="Phone Number" name="mobile" value={form.mobile} onChange={updateForm} maxLength={12} />
                <OptionGroup label="Sex" name="sex" value={form.sex} options={['Male', 'Female']} onChange={updateForm} />
                <SelectField
                  label="Marital Status"
                  name="maritalStatus"
                  value={form.maritalStatus}
                  options={['Single', { value: 'Marriage', label: 'Married' }, 'Divorced', 'Widowed']}
                  onChange={updateForm}
                  placeholder="Select marital status"
                />
                <OptionGroup label="Do you have certificate?" name="hasCertificate" value={form.hasCertificate} options={['Yes', 'No']} onChange={updateForm} />
                {form.hasCertificate === 'Yes' && (
                  <label className={`certificate-upload ${fieldErrors.certificate ? 'has-error' : ''}`} data-field-name="certificate">
                    <span>Certificate Upload</span>
                    <input accept=".pdf,image/png,image/jpeg,image/webp" onChange={handleCertificate} type="file" aria-describedby={fieldErrors.certificate ? 'certificate-error' : undefined} aria-invalid={Boolean(fieldErrors.certificate)} />
                    {certificate ? (
                      <div className="upload-preview certificate-preview">
                        {certificatePreview ? (
                          <img src={certificatePreview} alt="Certificate preview" />
                        ) : (
                          <div className="upload-file-badge">PDF</div>
                        )}
                        <div>
                          <strong>{certificate.name}</strong>
                          <small>Certificate selected. Click to replace.</small>
                        </div>
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={24} />
                        <strong>Upload certificate only</strong>
                        <small>PDF or certificate image only. File name must identify it as a certificate.</small>
                      </>
                    )}
                    <FieldErrorMessage name="certificate" />
                  </label>
                )}
                {form.hasCertificate === 'No' && (
                  <div className="certificate-appointment">
                    <p className="appointment-helper">Qabso xilliga aad keeneyso certificate ka</p>
                    <Field label="Appointment Date" name="appointmentDate" type="date" value={form.appointmentDate} onChange={updateForm} min={today} max={maximumAppointmentDate} />
                    <Field label="Appointment Time" name="appointmentTime" type="time" value={form.appointmentTime} onChange={updateForm} min={minimumAppointmentTime(form.appointmentDate)} max={appointmentEndTime} step={60} />
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="emergency-school-step">
            <h1>Emergency Contact & School</h1>
            <p className="apply-note"><Check size={14} /> Enter one trusted contact and your secondary-school details.</p>
            <div className="apply-form-grid">
              <Field label="Contact Name" name="emergencyName" value={form.emergencyName} onChange={updateForm} placeholder="Full name" maxLength={80} />
              <PhoneField label="Contact Phone" name="emergencyTell" value={form.emergencyTell} onChange={updateForm} maxLength={12} />
              <SelectField label="Relationship" name="relationship" value={form.relationship} options={['Mother', 'Father', 'Brother', 'Sister', 'Other specify']} onChange={updateForm} placeholder="Select relationship" />
              {form.relationship === 'Other specify' && (
                <Field label="Specify relationship" name="relationshipOther" value={form.relationshipOther} onChange={updateForm} placeholder="For example: Uncle, Aunt, or Guardian" maxLength={100} />
              )}
              <OptionGroup label="Family member at JUST?" name="familyStudied" value={form.familyStudied} options={['Yes', 'No']} onChange={updateForm} />
              <SearchableSelectField label="Secondary School" name="schoolName" value={form.schoolName} onChange={updateForm} options={schools} placeholder="Search school" />
              <SearchableSelectField label="School District" name="schoolDistrict" value={form.schoolDistrict} onChange={updateForm} options={districts} placeholder="Search school district" />
              <Field label="Graduation Year" name="graduationYear" type="number" value={form.graduationYear} onChange={updateForm} min="1970" max={String(new Date().getFullYear())} inputMode="numeric" />
              <SelectField label="Passing Grade" name="percentage" value={form.percentage} onChange={updateForm} options={gradeOptions} />
              <SelectField label="How did you hear about JUST?" name="heardFrom" value={form.heardFrom} options={['Social Media', 'Friends', 'University came to our School', 'Parents', 'Seminars of the University', 'Other specify']} onChange={updateForm} placeholder="Select source" />
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="program-payment-step">
            <h1>Program of Study & Payment Plan</h1>
            <p className="apply-note"><Check size={14} /> Select your faculty, department, mode of study, and admission payment plan.</p>
            <div className={`program-dropdown-panel ${(fieldErrors.program || fieldErrors.department) ? 'has-error' : ''}`} data-field-name="program">
              <div className="program-dropdown-heading">
                <strong>Academic program</strong>
                <span>Choose a faculty first, then select one of its available departments.</span>
              </div>
              <div className="program-dropdown-grid">
                <SelectField
                  label="Faculty"
                  name="program"
                  value={form.program}
                  onChange={updateForm}
                  options={programs.map(([program]) => program)}
                  placeholder="Select faculty"
                />
                <SelectField
                  label="Department"
                  name="department"
                  value={form.department}
                  onChange={updateForm}
                  options={selectedDepartments}
                  placeholder={form.program ? 'Select department' : 'Select a faculty first'}
                  disabled={!form.program}
                />
              </div>
            </div>
            <div className="apply-form-grid mt-form program-payment-layout">
              <OptionGroup className="study-mode-options" label="Study Mode" name="modeOfStudy" value={form.modeOfStudy} options={['Full Time', 'Part Time']} onChange={updateForm} />
              <SelectField label="Payment Plan" name="paymentPlan" value={form.paymentPlan} options={paymentPlanOptions} onChange={updateForm} placeholder="Select payment plan" />
              <label className={`integrity-declaration ${fieldErrors.integrityDeclaration ? 'has-error' : ''}`} data-field-name="integrityDeclaration">
                <span className="integrity-icon" aria-hidden="true"><ShieldCheck size={18} /></span>
                <input checked={form.integrityDeclaration === 'Yes'} name="integrityDeclaration" onChange={updateForm} type="checkbox" value="Yes" aria-describedby={fieldErrors.integrityDeclaration ? 'integrityDeclaration-error' : undefined} aria-invalid={Boolean(fieldErrors.integrityDeclaration)} />
                <span className="integrity-copy"><strong>Confirm information accuracy</strong><small>I declare that the information in this application is true and complete.</small></span>
                <FieldErrorMessage name="integrityDeclaration" />
              </label>
              {form.paymentPlan && <PaymentMethodDetails method="EVC Plus" form={form} onChange={updateForm} />}
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h1>Review Your Application</h1>
            <p className="apply-note"><Check size={14} /> Confirm your details before submitting the application.</p>
            <div className="review-panel">
              <aside className="review-profile">
                <img src={photoPreview || logo} alt={photoPreview ? 'Applicant passport preview' : 'Jamhuriya University logo'} />
                <div>
                  <p>{form.fullName || 'Applicant Name'}</p>
                  <span>{form.program || 'Faculty not selected'}</span>
                </div>
              </aside>
              <div className="review-content">
                {reviewSections.map((section) => (
                  <section className="review-section" key={section.title}>
                    <h2>{section.title}</h2>
                    <dl className="review-grid">
                      {section.items.map(([label, value]) => (
                        <div className="review-item" key={label}>
                          <dt>{label}</dt>
                          <dd>{label === 'Payment Receipt' && generatedReceipt ? <button className="receipt-view-button" onClick={() => setShowGeneratedReceipt(true)} type="button">View Receipt</button> : value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="apply-actions">
          {step > 0 && (
            <button className="prev-button" onClick={previousStep} type="button">
              <ArrowLeft size={16} /> Previous
            </button>
          )}
          {step === steps.length - 1 && form.paymentMethod === 'EVC Plus' && confirmedEvcPayment?.status !== 'SUCCESS' && <p className="payment-submit-warning">Complete the EVC Plus payment before submitting your application.</p>}
          <button className="next-button" disabled={registration.loading || !registration.isOpen || isSubmitting || (step === steps.length - 1 && form.paymentMethod === 'EVC Plus' && confirmedEvcPayment?.status !== 'SUCCESS')} onClick={step === steps.length - 1 ? submitApplication : handleNextStep} type="button">
            {step === steps.length - 1 ? (isSubmitting ? 'Submitting...' : 'Submit Application') : 'Next Step'} <ArrowRight size={16} />
          </button>
        </div>
      </main>
      </FieldErrorContext.Provider>

      <section className="apply-requirements-showcase" aria-labelledby="apply-requirements-title">
        <h2 id="apply-requirements-title">
          Admission <br />
          Requirements & <span>Eligibility</span>
        </h2>
        <div className="apply-requirements-map">
          <div className="apply-requirements-logo">
            <img src={logo} alt="Jamhuriya University logo" />
          </div>
          {admissionRequirements.map(([title, text], index) => (
            <article className={`apply-requirement-node req-node-${index + 1}`} key={title}>
              <span><Check size={14} /></span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="apply-faq-section">
        <h2 className="apply-section-title">
          Frequently <br />
          Asked <span>Questions</span>
        </h2>
        <div className="apply-faq-list">
          {faqs.map((faq) => (
            <details className="faq-item" key={faq.question}>
              <summary>
                {faq.question}
                <ChevronDown size={16} />
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="apply-bottom-cta">
        <div className="cta-card">
          <h2>
            Your <span className="serif italic text-[#11B67A]">Future</span> starts here
          </h2>
          <p>
            Join Jamhuriya University of Science & Technology - one form, one fee, one decision that changes everything.
          </p>
          <a href="#application" className="btn-primary">
            Apply Now <ArrowRight size={16} />
          </a>
        </div>
      </section>

    </div>
      <PublicFooter />
    </>
  );
}

export default ApplyPage;
