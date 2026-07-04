import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ImagePlus,
  Mail,
  MapPin,
  Phone,
  UploadCloud,
} from 'lucide-react';
import Toast from '../components/Toast';
import logo from '../images/logo.jpg';
import secondarySchoolNames from '../data/secondarySchools';

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
  'Who can apply to Jamhuriya University?',
  'Which documents are required for online admission?',
  'Can I track my admission status online?',
  'How do I pay the admission fee?',
  'When will admission results be announced?',
];

const programs = [
  ['Medicine & Health Science', ['MBBS', 'Nursing', 'Midwifery', 'Public Health', 'Medical Laboratory Science']],
  ['Computer Science & IT', ['Computer Application', 'Computer Networking & Security', 'Computer Multimedia']],
  ['Economics & Management', ['Business Administration', 'Public Administration', 'Banking & Finance', 'Accounting', 'Economics']],
  ['Engineering', ['Civil Engineering', 'Electrical Engineering', 'Biomedical Engineering']],
  ['Agro-Veterinary', ['Agricultural', 'Veterinary']],
];

const today = new Date().toISOString().slice(0, 10);
const apiBaseUrl = 'http://localhost:5000';
const appointmentStartTime = '08:00';
const appointmentEndTime = '17:00';
const gradeOptions = ['A+', 'A', 'A-', 'B+', 'B', 'B-' , 'C+', 'C', 'C-'];
const mobileMoneyMethods = ['EVC Plus', 'eDahab', 'Zaad', 'Sahal'];
const paymentSteps = {
  'EVC Plus': [
    'Dial *712#',
    'Choose Send Money / Payment',
    'Enter the university merchant number',
    'Enter the admission fee amount',
    'Confirm the payment',
    'Enter the transaction ID in the form',
  ],
  'eDahab': [
    'Open your eDahab account',
    'Choose payment or send money',
    'Enter the university payment number',
    'Enter the admission fee amount',
    'Confirm payment',
    'Enter the transaction ID',
  ],
  'Zaad': [
    'Dial *880#',
    'Select payment or send money',
    'Enter the university merchant number',
    'Enter the amount',
    'Confirm payment',
    'Enter the transaction ID',
  ],
  'Sahal': [
    'Open Sahal service',
    'Choose payment/send money',
    'Enter the university payment number',
    'Enter the admission fee amount',
    'Confirm payment',
    'Enter the transaction ID',
  ],
};

const initialForm = {
  fullName: null,
  motherName: null,
  nationality: null,
  nationalId: null,
  rollNumber: null,
  dateOfBirth: null,
  placeOfBirth: null,
  district: null,
  area: null,
  email: null,
  mobile: '+252',
  sex: null,
  maritalStatus: null,
  campus: null,
  emergencyName: null,
  emergencyTell: '+252',
  relationship: null,
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
  paymentAmount: null,
  paymentTransactionId: null,
  cardHolderName: null,
  cardNumber: null,
  cardExpiry: null,
  cardCVV: null,
  hasCertificate: null,
  appointmentDate: null,
  appointmentTime: null,
};

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

function Field({ label, name, type = 'text', value, onChange, placeholder, min, max, maxLength, inputMode, step }) {
  return (
    <label className="apply-field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder || label}
        min={min}
        max={max}
        maxLength={maxLength}
        inputMode={inputMode}
        step={step}
      />
    </label>
  );
}

function PhoneField({ label, name, value, onChange, placeholder, maxLength }) {
  const localNumber = (value || '').replace(/^\+252/, '');

  const handleChange = (event) => {
    onChange({ target: { name, value: `+252${event.target.value}`, type: 'text', checked: false } });
  };

  return (
    <label className="apply-field">
      <span>{label}</span>
      <div className="apply-phone-field">
        <span className="apply-phone-prefix">+252</span>
        <input
          name={name}
          type="tel"
          value={localNumber}
          onChange={handleChange}
          placeholder={placeholder || '61 1234567'}
          maxLength={maxLength}
          inputMode="tel"
        />
      </div>
    </label>
  );
}

function SelectField({ label, name, value, onChange, options, placeholder = 'Select grade' }) {
  return (
    <label className="apply-field">
      <span>{label}</span>
      <select name={name} value={value ?? ''} onChange={onChange}>
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function SearchableSelectField({ label, name, value, onChange, options, placeholder }) {
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
    <label className="apply-field apply-combobox" ref={containerRef}>
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
            <li className="apply-combobox-empty">No matching school found</li>
          )}
        </ul>
      )}
    </label>
  );
}

function OptionGroup({ label, name, value, options, onChange, className = '' }) {
  return (
    <fieldset className={`apply-options ${className}`}>
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <label key={option}>
            <input checked={value === option} name={name} onChange={onChange} type="checkbox" value={option} />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PaymentMethodDetails({ method, form, onChange, receipt, onReceiptChange }) {
  if (!method) return null;
  const isCard = method === 'Card';

  return (
    <div className="payment-details-card">
      <h3>{method} Payment</h3>

      {!isCard && (
        <ol className="payment-steps">
          {paymentSteps[method].map((stepText) => (
            <li key={stepText}>{stepText}</li>
          ))}
        </ol>
      )}

      <div className="apply-form-grid">
        {isCard && (
          <>
            <Field label="Cardholder Name" name="cardHolderName" value={form.cardHolderName} onChange={onChange} placeholder="Name on card" maxLength={80} />
            <Field label="Card Number" name="cardNumber" value={form.cardNumber} onChange={onChange} placeholder="1234 5678 9012 3456" maxLength={19} inputMode="numeric" />
            <Field label="Expiry Date" name="cardExpiry" value={form.cardExpiry} onChange={onChange} placeholder="MM/YY" maxLength={5} />
            <Field label="CVV" name="cardCVV" value={form.cardCVV} onChange={onChange} placeholder="123" maxLength={4} inputMode="numeric" />
          </>
        )}
        {mobileMoneyMethods.includes(method) && (
          <PhoneField label="Payment Phone Number" name="paymentPhone" value={form.paymentPhone} onChange={onChange} maxLength={16} />
        )}
        <Field label="Payment Amount" name="paymentAmount" value={form.paymentAmount} onChange={onChange} placeholder="Amount paid" type="number" min="0" inputMode="numeric" />
        {mobileMoneyMethods.includes(method) && (
          <Field label="Transaction ID / Reference Number" name="paymentTransactionId" value={form.paymentTransactionId} onChange={onChange} maxLength={50} />
        )}
      </div>

      {isCard && <p className="payment-note">We support Visa and Mastercard.</p>}

      <label className="apply-field payment-receipt-field">
        <span>Upload Payment Screenshot / Receipt</span>
        <input accept="image/png,image/jpeg,image/webp,.pdf" onChange={onReceiptChange} type="file" />
        {receipt && <span className="payment-receipt-name">{receipt.name}</span>}
      </label>
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
    ['district', 'District'],
    ['email', 'Email'],
    ['mobile', 'Phone Number'],
    ['area', 'Area'],
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
const isValidPhone = (value) => {
  const text = normalizeValue(value);
  const digits = text.replace(/\D/g, '');
  return /^\+?[\d\s-]{7,20}$/.test(text) && digits.length >= 7 && digits.length <= 15;
};
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
const simpleTextPattern = /^[A-Za-z0-9][A-Za-z0-9\s'.&,/-]{1,99}$/;
const idPattern = /^[A-Za-z0-9][A-Za-z0-9\s/-]{2,29}$/;
const rollNumberPattern = /^[A-Za-z0-9][A-Za-z0-9/-]{2,29}$/;
const optionValues = {
  sex: ['Male', 'Female'],
  maritalStatus: ['Single', 'Marriage', 'Divorced', 'Widowed'],
  hasCertificate: ['Yes', 'No'],
  relationship: ['Mother', 'Father', 'Brother', 'Sister', 'Other specify'],
  familyStudied: ['Haa', 'Maya'],
  heardFrom: ['Social Media', 'Friends', 'University came to our School', 'Parents', 'Seminars of the University', 'Other specify'],
  modeOfStudy: ['Full Time', 'Part Time'],
  paymentPlan: ['Admission fee only', 'Semester payment', 'Full year payment'],
  paymentMethod: ['EVC Plus', 'Card', 'eDahab', 'Zaad', 'Sahal'],
};

const isAllowedOption = (name, value) => optionValues[name]?.includes(value);

function ApplyPage() {
  const [activeNav, setActiveNav] = useState('apply');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [certificate, setCertificate] = useState(null);
  const [certificatePreview, setCertificatePreview] = useState('');
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const updateForm = (event) => {
    const { checked, name, type, value } = event.target;
    const nextValue = type === 'checkbox' ? (checked ? value : null) : (value || null);

    if (name === 'hasCertificate') {
      if (nextValue === 'No') {
        setCertificate(null);
        setCertificatePreview('');
      }
    }

    if (name === 'paymentMethod') {
      setPaymentReceipt(null);
    }

    setForm((current) => ({
      ...current,
      [name]: nextValue,
      ...(name === 'program' ? { department: null } : {}),
      ...(name === 'hasCertificate' && nextValue === 'Yes' ? { appointmentDate: null, appointmentTime: null } : {}),
      ...(name === 'paymentMethod' ? {
        paymentPhone: '+252',
        paymentAmount: null,
        paymentTransactionId: null,
        cardHolderName: null,
        cardNumber: null,
        cardExpiry: null,
        cardCVV: null,
      } : {}),
    }));
  };

  const handlePaymentReceipt = (event) => {
    const file = event.target.files?.[0];
    setToast(null);
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showError('Payment receipt must be a PDF, JPG, PNG, or WEBP file.');
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showError('Payment receipt file must be 10MB or smaller.');
      event.target.value = '';
      return;
    }
    setPaymentReceipt(file);
  };

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    setToast(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError('Passport photo must be an image file only.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError('Passport photo must be 5MB or smaller.');
      event.target.value = '';
      return;
    }
    try {
      const isPassportPhoto = await hasWhitePassportBackground(file);
      if (!isPassportPhoto) {
        showError('Upload a passport photo only: portrait or square photo with a plain white background.');
        event.target.value = '';
        return;
      }
    } catch {
      showError('Passport photo could not be read. Upload a valid JPG, PNG, or WEBP image.');
      event.target.value = '';
      return;
    }
    setPhoto(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleCertificate = (event) => {
    const file = event.target.files?.[0];
    setToast(null);
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type) || !fileNameLooksLikeCertificate(file.name)) {
      showError('Certificate upload accepts certificate files only. Use PDF/JPG/PNG/WEBP and include certificate, shahaado, transcript, or result in the file name.');
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showError('Certificate file must be 10MB or smaller.');
      event.target.value = '';
      return;
    }
    setCertificate(file);
    if (certificatePreview) URL.revokeObjectURL(certificatePreview);
    setCertificatePreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : '');
  };

  const validateStep = (stepIndex) => {
    const missing = (requiredFieldsByStep[stepIndex] || [])
      .filter(([field]) => isEmpty(form[field]))
      .map(([, label]) => label);

    if (stepIndex === 1 && !photo) missing.push('Passport Photo');
    if (stepIndex === 1 && form.hasCertificate === 'Yes' && !certificate) missing.push('Certificate File');
    if (stepIndex === 1 && form.hasCertificate === 'No') {
      if (isEmpty(form.appointmentDate)) missing.push('Appointment Date');
      if (isEmpty(form.appointmentTime)) missing.push('Appointment Time');
    }

    if (missing.length) {
      showError(`Please complete: ${missing.join(', ')}`);
      return false;
    }

    if (stepIndex === 2) {
      const graduationYear = Number(form.graduationYear);
      const currentYear = new Date().getFullYear();
      if (!Number.isInteger(graduationYear) || graduationYear < 1970 || graduationYear > currentYear) {
        showError(`Graduation year must be between 1970 and ${currentYear}.`);
        return false;
      }
      if (!gradeOptions.includes(form.percentage)) {
        showError('Please select a valid passing grade.');
        return false;
      }
    }

    if (stepIndex === 1) {
      if (!personNamePattern.test(normalizeValue(form.fullName))) {
        showError('Full Name must contain only letters, spaces, apostrophes, hyphens, or periods.');
        return false;
      }
      if (!personNamePattern.test(normalizeValue(form.motherName))) {
        showError("Mother's Name must contain only letters, spaces, apostrophes, hyphens, or periods.");
        return false;
      }
      if (!simpleTextPattern.test(normalizeValue(form.nationality))) {
        showError('Nationality must be 2-100 characters and use letters, numbers, spaces, or simple punctuation.');
        return false;
      }
      if (!idPattern.test(normalizeValue(form.nationalId))) {
        showError('National ID is required and must be 3-30 letters or numbers.');
        return false;
      }
      if (!rollNumberPattern.test(normalizeValue(form.rollNumber))) {
        showError('Roll Number must be 3-30 letters or numbers. Hyphens and slashes are allowed.');
        return false;
      }
      if (!isValidDateValue(form.dateOfBirth)) {
        showError('Please enter a valid date of birth.');
        return false;
      }
      if (form.dateOfBirth > today) {
        showError('Date of birth cannot be in the future.');
        return false;
      }
      const age = ageFromDate(form.dateOfBirth);
      if (age < 14 || age > 100) {
        showError('Applicant age must be between 14 and 100 years.');
        return false;
      }
      if (!simpleTextPattern.test(normalizeValue(form.placeOfBirth))) {
        showError('Place Of Birth must be 2-100 characters and use letters, numbers, spaces, or simple punctuation.');
        return false;
      }
      if (!simpleTextPattern.test(normalizeValue(form.district))) {
        showError('District must be 2-100 characters and use letters, numbers, spaces, or simple punctuation.');
        return false;
      }
      if (!simpleTextPattern.test(normalizeValue(form.area))) {
        showError('Area must be 2-100 characters and use letters, numbers, spaces, or simple punctuation.');
        return false;
      }
      if (!isValidEmail(form.email)) {
        showError('Please enter a valid email address.');
        return false;
      }
      if (!isValidPhone(form.mobile)) {
        showError('Please enter a valid phone number with 7 to 15 digits.');
        return false;
      }
      if (!isAllowedOption('sex', form.sex)) {
        showError('Please select a valid sex option.');
        return false;
      }
      if (!isAllowedOption('maritalStatus', form.maritalStatus)) {
        showError('Please select a valid marital status.');
        return false;
      }
      if (!isAllowedOption('hasCertificate', form.hasCertificate)) {
        showError('Please select a valid certificate status.');
        return false;
      }
      if (form.hasCertificate === 'No') {
        if (!isValidDateValue(form.appointmentDate)) {
          showError('Please enter a valid appointment date.');
          return false;
        }
        if (form.appointmentDate < today) {
          showError('Appointment date cannot be in the past.');
          return false;
        }
        if (!/^\d{2}:\d{2}$/.test(normalizeValue(form.appointmentTime))) {
          showError('Please enter a valid appointment time.');
          return false;
        }
        if (form.appointmentTime < appointmentStartTime || form.appointmentTime > appointmentEndTime) {
          showError('Appointment time must be between 8:00 AM and 5:00 PM.');
          return false;
        }
      }
    }

    if (stepIndex === 2) {
      if (!personNamePattern.test(normalizeValue(form.emergencyName))) {
        showError('Emergency Contact Name must contain only letters, spaces, apostrophes, hyphens, or periods.');
        return false;
      }
      if (!isValidPhone(form.emergencyTell)) {
        showError('Emergency phone must contain 7 to 15 digits.');
        return false;
      }
      if (!isAllowedOption('relationship', form.relationship)) {
        showError('Please select a valid relationship.');
        return false;
      }
      if (!isAllowedOption('familyStudied', form.familyStudied)) {
        showError('Please select whether a family member studied here.');
        return false;
      }
      if (!secondarySchoolNames.includes(normalizeValue(form.schoolName))) {
        showError('Please select a valid Secondary School Name from the list.');
        return false;
      }
      if (!simpleTextPattern.test(normalizeValue(form.schoolDistrict))) {
        showError('School District must be 2-100 characters and use letters, numbers, spaces, or simple punctuation.');
        return false;
      }
      if (!isAllowedOption('heardFrom', form.heardFrom)) {
        showError('Please select a valid source for how you heard about the university.');
        return false;
      }
    }

    if (stepIndex === 3) {
      const selectedProgram = programs.find(([program]) => program === form.program);
      if (!selectedProgram) {
        showError('Please select a valid faculty.');
        return false;
      }
      if (!selectedProgram[1].includes(form.department)) {
        showError('Please select a department that belongs to the chosen faculty.');
        return false;
      }
      if (!isAllowedOption('modeOfStudy', form.modeOfStudy)) {
        showError('Please select a valid mode of study.');
        return false;
      }
      if (!isAllowedOption('paymentPlan', form.paymentPlan)) {
        showError('Please select a valid payment plan.');
        return false;
      }
      if (!isAllowedOption('paymentMethod', form.paymentMethod)) {
        showError('Please select a valid payment method.');
        return false;
      }
      if (form.paymentMethod === 'Card') {
        if (isEmpty(form.cardHolderName)) {
          showError('Please enter the cardholder name.');
          return false;
        }
        if (isEmpty(form.cardNumber)) {
          showError('Please enter the card number.');
          return false;
        }
        if (isEmpty(form.cardExpiry)) {
          showError('Please enter the card expiry date.');
          return false;
        }
        if (isEmpty(form.cardCVV)) {
          showError('Please enter the card CVV.');
          return false;
        }
      }
    }

    return true;
  };

  const validateAllSteps = () => [1, 2, 3].every((stepIndex) => validateStep(stepIndex));

  const handleNextStep = () => {
    if (step > 0 && step < steps.length - 1 && !validateStep(step)) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const submitApplication = async () => {
    if (!validateAllSteps()) return;

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      payload.append(key, value ?? '');
    });
    payload.append('faculty', form.program ?? '');
    if (photo) payload.append('passportPhoto', photo);
    if (certificate) payload.append('certificate', certificate);
    if (paymentReceipt) payload.append('paymentReceipt', paymentReceipt);

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/applications`, {
        method: 'POST',
        body: payload,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Application submission failed.');
      }

      showToast({
        type: 'success',
        title: 'Application submitted',
        message: 'Xogtaada wala xareeyay Mahadsanid!',
        duration: 6500,
      });
      setForm(initialForm);
      setPhoto(null);
      setPhotoPreview('');
      setCertificate(null);
      setCertificatePreview('');
      setPaymentReceipt(null);
      setStep(0);
    } catch (error) {
      showError(error.message || 'Application submission failed.', 'Submit error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previousStep = () => setStep((current) => Math.max(current - 1, 0));
  const navClass = (item) => `site-nav-link ${activeNav === item ? 'active' : ''}`;
  const displayValue = (value, fallback = 'Not provided') => value || fallback;
  const documentReviewItems = form.hasCertificate === 'Yes'
    ? [['Certificate File', certificate?.name || 'Not uploaded']]
    : form.hasCertificate === 'No'
      ? [
          ['Appointment Date', displayValue(form.appointmentDate)],
          ['Appointment Time', displayValue(form.appointmentTime)],
        ]
      : [];
  const paymentReviewItems = form.paymentMethod === 'Card'
    ? [
        ['Cardholder Name', displayValue(form.cardHolderName)],
        ['Card Number', displayValue(form.cardNumber)],
        ['Expiry Date', displayValue(form.cardExpiry)],
        ['Payment Amount', displayValue(form.paymentAmount)],
        ['Payment Receipt', paymentReceipt?.name || 'Not uploaded'],
      ]
    : mobileMoneyMethods.includes(form.paymentMethod)
      ? [
          ['Payment Phone Number', displayValue(form.paymentPhone)],
          ['Payment Amount', displayValue(form.paymentAmount)],
          ['Transaction ID', displayValue(form.paymentTransactionId)],
          ['Payment Receipt', paymentReceipt?.name || 'Not uploaded'],
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
        ['District', displayValue(form.district)],
        ['Area', displayValue(form.area)],
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
        ['Relationship', displayValue(form.relationship, 'Not selected')],
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

  return (
    <div className="apply-page hero-pattern">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <header className="apply-header">
        <nav className="mx-auto flex max-w-5xl items-center justify-center gap-4">
          <a
            aria-label="Go to homepage"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 p-1 shadow-[0_0_30px_rgba(139,78,239,0.55)]"
            href="/#home"
          >
            <img src={logo} alt="Jamhuriya University logo" className="h-full w-full rounded-full object-cover" />
          </a>
          <div className="site-nav">
            <a className={navClass('home')} href="/#home" onClick={() => setActiveNav('home')}>Home</a>
            <a className={navClass('programs')} href="/#programs" onClick={() => setActiveNav('programs')}>Programs</a>
            <a className={navClass('apply')} href="#application" onClick={() => setActiveNav('apply')}>Apply</a>
            <a className={navClass('contact')} href="/#contact" onClick={() => setActiveNav('contact')}>Contact</a>
            <a className={navClass('login')} href="/login" onClick={() => setActiveNav('login')}>Login</a>
          </div>
        </nav>

        <section className="apply-hero">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F5F5F5] px-4 py-2 text-xs text-text-dark">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
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

      <Stepper currentStep={step} />

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
              <label className="photo-upload">
                <input accept="image/png,image/jpeg,image/webp" onChange={handlePhoto} type="file" />
                {photoPreview ? (
                  <div className="upload-preview">
                    <img src={photoPreview} alt="Passport photo preview" />
                    <div>
                      <strong>Profile photo uploaded</strong>
                      <small>Click to replace</small>
                    </div>
                  </div>
                ) : (
                  <>
                    <ImagePlus size={30} />
                    <strong>Click to upload</strong>
                    <small>Passport photo only. White background required. JPG, PNG, WEBP max 5MB.</small>
                  </>
                )}
              </label>
              <div className="apply-form-grid">
                <Field label="Full Name" name="fullName" value={form.fullName} onChange={updateForm} placeholder="Your full name" maxLength={80} />
                <Field label="Mother's Name" name="motherName" value={form.motherName} onChange={updateForm} placeholder="Mother's name" maxLength={80} />
                <Field label="Nationality" name="nationality" value={form.nationality} onChange={updateForm} placeholder="Your nationality" maxLength={100} />
                <Field label="National ID" name="nationalId" value={form.nationalId} onChange={updateForm} placeholder="Enter your national id" maxLength={30} />
              </div>
              <div className="apply-form-grid full">
                <Field label="Roll Number" name="rollNumber" value={form.rollNumber} onChange={updateForm} placeholder="Enter your roll number" maxLength={30} />
                <Field label="Date Of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={updateForm} max={today} />
                <Field label="Place Of Birth" name="placeOfBirth" value={form.placeOfBirth} onChange={updateForm} placeholder="Enter your place of birth" maxLength={100} />
                <Field label="District" name="district" value={form.district} onChange={updateForm} placeholder="Enter your district" maxLength={100} />
                <Field label="Your Email" name="email" type="email" value={form.email} onChange={updateForm} placeholder="yourmail@gmail.com" maxLength={254} inputMode="email" />
                <PhoneField label="Phone Number" name="mobile" value={form.mobile} onChange={updateForm} maxLength={16} />
                <Field label="Area" name="area" value={form.area} onChange={updateForm} placeholder="Enter your area" maxLength={100} />
                <OptionGroup label="Sex" name="sex" value={form.sex} options={['Male', 'Female']} onChange={updateForm} />
                <OptionGroup className="wide" label="Marital Status" name="maritalStatus" value={form.maritalStatus} options={['Single', 'Marriage', 'Divorced', 'Widowed']} onChange={updateForm} />
                <OptionGroup label="Do you have certificate?" name="hasCertificate" value={form.hasCertificate} options={['Yes', 'No']} onChange={updateForm} />
                {form.hasCertificate === 'Yes' && (
                  <label className="certificate-upload">
                    <span>Certificate Upload</span>
                    <input accept=".pdf,image/png,image/jpeg,image/webp" onChange={handleCertificate} type="file" />
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
                  </label>
                )}
                {form.hasCertificate === 'No' && (
                  <div className="certificate-appointment">
                    <p className="appointment-helper">Qabso xilliga aad keeneyso certificate ka</p>
                    <Field label="Appointment Date" name="appointmentDate" type="date" value={form.appointmentDate} onChange={updateForm} min={today} />
                    <Field label="Appointment Time" name="appointmentTime" type="time" value={form.appointmentTime} onChange={updateForm} min={appointmentStartTime} max={appointmentEndTime} step={60} />
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h1>Emergency Contact & School Information</h1>
            <p className="apply-note"><Check size={14} /> Add a trusted contact and secondary school details.</p>
            <div className="apply-form-grid">
              <Field label="Emergency Contact Name" name="emergencyName" value={form.emergencyName} onChange={updateForm} placeholder="Name" maxLength={80} />
              <PhoneField label="Tell" name="emergencyTell" value={form.emergencyTell} onChange={updateForm} maxLength={16} />
              <OptionGroup className="wide" label="Relationship to applicant" name="relationship" value={form.relationship} options={['Mother', 'Father', 'Brother', 'Sister', 'Other specify']} onChange={updateForm} />
              <OptionGroup className="wide" label="Majiraa qof kamida qoyskaaga oo Jaamacad dhigta?" name="familyStudied" value={form.familyStudied} options={['Haa', 'Maya']} onChange={updateForm} />
              <SearchableSelectField label="Secondary School Name" name="schoolName" value={form.schoolName} onChange={updateForm} options={secondarySchoolNames} placeholder="Search for your school" />
              <Field label="School District" name="schoolDistrict" value={form.schoolDistrict} onChange={updateForm} maxLength={100} />
              <Field label="Graduation Year" name="graduationYear" type="number" value={form.graduationYear} onChange={updateForm} min="1970" max={String(new Date().getFullYear())} inputMode="numeric" />
              <SelectField label="Passing Grade" name="percentage" value={form.percentage} onChange={updateForm} options={gradeOptions} />
              <OptionGroup className="wide" label="How did you know about university?" name="heardFrom" value={form.heardFrom} options={['Social Media', 'Friends', 'University came to our School', 'Parents', 'Seminars of the University', 'Other specify']} onChange={updateForm} />
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1>Program of Study & Payment Plan</h1>
            <p className="apply-note"><Check size={14} /> Select your faculty, department, mode of study, and admission payment plan.</p>
            <div className="program-select-grid">
              {programs.map(([program, departments]) => (
                <article className={`program-box ${form.program === program ? 'selected' : ''}`} key={program}>
                  <label>
                    <input checked={form.program === program} name="program" onChange={updateForm} type="checkbox" value={program} />
                    {program}
                  </label>
                  <div>
                    {departments.map((department) => (
                      <label key={department}>
                        <input checked={form.department === department} disabled={form.program !== program} name="department" onChange={updateForm} type="checkbox" value={department} />
                        {department}
                      </label>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <div className="apply-form-grid mt-form">
              <OptionGroup label="Mode Of Study" name="modeOfStudy" value={form.modeOfStudy} options={['Full Time', 'Part Time']} onChange={updateForm} />
              <OptionGroup label="Payment Plan" name="paymentPlan" value={form.paymentPlan} options={['Admission fee only', 'Semester payment', 'Full year payment']} onChange={updateForm} />
              <label className="integrity-declaration">
                <AlertTriangle size={20} />
                <input checked={form.integrityDeclaration === 'Yes'} name="integrityDeclaration" onChange={updateForm} type="checkbox" value="Yes" />
                <span><strong>Statement of Integrity:</strong> I declare that the information provided in this application is true and complete, and I understand that any incomplete or false information may result in delay or cancellation of my enrollment.</span>
              </label>
              <OptionGroup className="wide" label="Payment Method" name="paymentMethod" value={form.paymentMethod} options={['EVC Plus', 'Card', 'eDahab', 'Zaad', 'Sahal']} onChange={updateForm} />
              <PaymentMethodDetails method={form.paymentMethod} form={form} onChange={updateForm} receipt={paymentReceipt} onReceiptChange={handlePaymentReceipt} />
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
                          <dd>{value}</dd>
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
          <button className="next-button" disabled={isSubmitting} onClick={step === steps.length - 1 ? submitApplication : handleNextStep} type="button">
            {step === steps.length - 1 ? (isSubmitting ? 'Submitting...' : 'Submit Application') : 'Next Step'} <ArrowRight size={16} />
          </button>
        </div>
      </main>

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
            <details className="faq-item" key={faq}>
              <summary>
                {faq}
                <ChevronDown size={16} />
              </summary>
              <p>
                Applicants can complete registration online, upload documents, pay admission fees,
                and track decisions through the student portal.
              </p>
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

      <footer className="footer-panel apply-footer">
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

export default ApplyPage;
