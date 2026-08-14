const isoDaysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const programs = [
  {
    id: 'fac_medicine',
    title: 'Medicine & Health Science',
    admissionFee: 25,
    campus: 'Main Campus',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
    departments: [
      { id: 'dep_mbbs', name: 'Medicine & General Surgery', code: 'MGS', durationYears: 7 },
      { id: 'dep_nursing', name: 'Nursing', code: 'NUR', durationYears: 5 },
      { id: 'dep_midwifery', name: 'Midwifery', code: 'MID', durationYears: 5 },
      { id: 'dep_public_health', name: 'Public Health', code: 'PH', durationYears: 5 },
      { id: 'dep_laboratory', name: 'Medical Laboratory Science', code: 'MLS', durationYears: 5 },
      { id: 'dep_radiography', name: 'BSc in Medical Radiography and Imaging Technology', code: 'MRI', durationYears: 5 }
    ]
  },
  {
    id: 'fac_computing',
    title: 'Computer & IT',
    admissionFee: 25,
    campus: 'Campus 3',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
    departments: [
      { id: 'dep_computer_application', name: 'Computer Application', code: 'CA', durationYears: 5 },
      { id: 'dep_networking', name: 'Computer Network & Security', code: 'CNS', durationYears: 5 },
      { id: 'dep_multimedia', name: 'Computer Multi-Media', code: 'CM', durationYears: 5 },
      { id: 'dep_ai_data', name: 'BSc in Artificial Intelligence and Data Science', code: 'AIDS', durationYears: 5 }
    ]
  },
  {
    id: 'fac_business',
    title: 'Economics & Management',
    admissionFee: 25,
    campus: 'Main Campus',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80',
    departments: [
      { id: 'dep_business_admin', name: 'Business Administration', code: 'BA', durationYears: 5 },
      { id: 'dep_public_admin', name: 'Public Administration', code: 'PA', durationYears: 5 },
      { id: 'dep_banking', name: 'Banking & Finance', code: 'BF', durationYears: 5 },
      { id: 'dep_accounting', name: 'Accounting', code: 'ACC', durationYears: 5 },
      { id: 'dep_economics', name: 'Economics', code: 'ECO', durationYears: 5 },
      { id: 'dep_business_analytics', name: 'BSc in Business Analytics', code: 'BBA', durationYears: 5 },
      { id: 'dep_social_work', name: 'BSc in Social Work', code: 'SW', durationYears: 5 }
    ]
  },
  {
    id: 'fac_engineering',
    title: 'Engineering',
    admissionFee: 25,
    campus: 'Campus 2',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    departments: [
      { id: 'dep_civil', name: 'Civil Engineering', code: 'CE', durationYears: 5 },
      { id: 'dep_electrical_power', name: 'Electrical Engineering (Majoring in Power and Energy)', code: 'EEPE', durationYears: 5 },
      { id: 'dep_electrical_networking', name: 'Electrical Engineering (Majoring in Telecommunications and Networking)', code: 'EETN', durationYears: 5 }
    ]
  },
  {
    id: 'fac_agro',
    title: 'Agro-Veterinary',
    admissionFee: 25,
    campus: 'Main Campus',
    image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=600&q=80',
    departments: [
      { id: 'dep_agriculture', name: 'Agricultural', code: 'AGR', durationYears: 5 },
      { id: 'dep_veterinary', name: 'Veterinary', code: 'VET', durationYears: 5 }
    ]
  }
];

const applications = [
  {
    id: 'app_1001',
    reference: 'JUM-2026-0001',
    fullName: 'Said Omar Ahmed Mohamud',
    motherName: 'Amina Ali',
    nationality: 'Somali',
    nationalId: 'SO-11001',
    rollNumber: 'SNE-2025-0142',
    dateOfBirth: '2004-04-15',
    placeOfBirth: 'Mogadishu',
    district: 'Hodon',
    area: 'KM4',
    email: 'said.omar@example.com',
    mobile: '614465608',
    sex: 'Male',
    maritalStatus: 'Single',
    campus: 'Campus 3',
    emergencyName: 'Ahmed Mohamud',
    emergencyTell: '615552222',
    relationship: 'Father',
    familyStudied: 'Maya',
    schoolName: 'Tawakkal Secondary School',
    schoolDistrict: 'Hodon',
    graduationYear: '2025',
    percentage: '86',
    heardFrom: 'Social Media',
    faculty: 'Computer Science & IT',
    department: 'Computer Application',
    modeOfStudy: 'Full Time',
    paymentPlan: 'Admission fee only',
    paymentMethod: 'EVC PLUS',
    admissionFee: 25,
    paymentStatus: 'Paid',
    hasCertificate: 'Yes',
    appointmentDate: '',
    appointmentTime: '',
    status: 'Approved',
    documents: {},
    notes: 'Eligible for admission.',
    reviewedBy: 'usr_admin',
    createdAt: isoDaysAgo(41),
    updatedAt: isoDaysAgo(39)
  },
  {
    id: 'app_1002',
    reference: 'JUM-2026-0002',
    fullName: 'Maryan Hassan Nur',
    motherName: 'Fadumo Abdi',
    nationality: 'Somali',
    nationalId: 'SO-11002',
    rollNumber: 'SNE-2025-0881',
    dateOfBirth: '2005-02-20',
    placeOfBirth: 'Mogadishu',
    district: 'Wadajir',
    area: 'Airport Road',
    email: 'maryan.hassan@example.com',
    mobile: '617770909',
    sex: 'Female',
    maritalStatus: 'Single',
    campus: 'Main Campus',
    emergencyName: 'Hassan Nur',
    emergencyTell: '617771010',
    relationship: 'Father',
    familyStudied: 'Haa',
    schoolName: 'Al Huda Secondary School',
    schoolDistrict: 'Wadajir',
    graduationYear: '2025',
    percentage: '91',
    heardFrom: 'Friends',
    faculty: 'Medicine & Health Science',
    department: 'Nursing',
    modeOfStudy: 'Full Time',
    paymentPlan: 'Admission fee + Semester fee',
    paymentMethod: 'Zaad',
    admissionFee: 25,
    paymentStatus: 'Pending',
    hasCertificate: 'Yes',
    appointmentDate: '',
    appointmentTime: '',
    status: 'Pending',
    documents: {},
    notes: '',
    reviewedBy: null,
    createdAt: isoDaysAgo(9),
    updatedAt: isoDaysAgo(9)
  },
  {
    id: 'app_1003',
    reference: 'JUM-2026-0003',
    fullName: 'Ahmed Ali Warsame',
    motherName: 'Zahra Yusuf',
    nationality: 'Somali',
    nationalId: 'SO-11003',
    rollNumber: 'SNE-2025-0920',
    dateOfBirth: '2003-11-03',
    placeOfBirth: 'Baidoa',
    district: 'Dharkenley',
    area: 'Ex-Control',
    email: 'ahmed.warsame@example.com',
    mobile: '612345678',
    sex: 'Male',
    maritalStatus: 'Single',
    campus: 'Campus 2',
    emergencyName: 'Ali Warsame',
    emergencyTell: '612340000',
    relationship: 'Father',
    familyStudied: 'Maya',
    schoolName: 'Al Furqan Secondary School',
    schoolDistrict: 'Dharkenley',
    graduationYear: '2024',
    percentage: '74',
    heardFrom: 'University came to our School',
    faculty: 'Engineering',
    department: 'Civil Engineering',
    modeOfStudy: 'Part Time',
    paymentPlan: 'Admission fee only',
    paymentMethod: 'EVC Plus',
    admissionFee: 25,
    paymentStatus: 'Failed',
    hasCertificate: 'No',
    appointmentDate: '2026-06-16',
    appointmentTime: '10:30',
    status: 'Rejected',
    documents: {},
    notes: 'Certificate must be provided before admission.',
    reviewedBy: 'usr_officer',
    createdAt: isoDaysAgo(17),
    updatedAt: isoDaysAgo(15)
  }
];

export const createSeedData = ({ hashPassword }) => {
  const now = new Date().toISOString();
  return {
    meta: {
      version: 1,
      seededAt: now
    },
    users: [
      {
        id: 'usr_admin',
        name: 'System Admin',
        username: 'admin',
        email: 'admin@jamhuriya.edu.so',
        passwordHash: hashPassword('admin12345'),
        role: 'Admin',
        permissions: ['admission_period.view', 'admission_period.create', 'admission_period.update', 'admission_period.open', 'admission_period.close', 'admission_period.pause', 'admission_period.resume', 'admission_period.extend', 'admission_period.reopen', 'admission_period.cancel', 'admission_period.archive', 'admission_period.view_audit_log', 'scheduled_message.view', 'scheduled_message.create', 'scheduled_message.update', 'scheduled_message.schedule', 'scheduled_message.send_now', 'scheduled_message.cancel', 'scheduled_message.retry', 'scheduled_message.view_results', 'scheduled_message.manage_templates'],
        campus: 'Main Campus',
        status: 'Active',
        createdAt: isoDaysAgo(90),
        updatedAt: isoDaysAgo(2)
      },
      {
        id: 'usr_officer',
        name: 'Admission Officer',
        username: 'officer',
        email: 'officer@jamhuriya.edu.so',
        passwordHash: hashPassword('officer12345'),
        role: 'Officer',
        campus: 'Campus 3',
        status: 'Active',
        createdAt: isoDaysAgo(60),
        updatedAt: isoDaysAgo(5)
      }
    ],
    programs,
    applications,
    students: [
      {
        id: 'stu_1001',
        applicationId: 'app_1001',
        studentNumber: 'JUST-2026-0001',
        fullName: 'Said Omar Ahmed Mohamud',
        email: 'said.omar@example.com',
        mobile: '614465608',
        faculty: 'Computer Science & IT',
        department: 'Computer Application',
        campus: 'Campus 3',
        status: 'Enrolled',
        whatsappSent: false,
        enrolledAt: isoDaysAgo(39),
        createdAt: isoDaysAgo(39),
        updatedAt: isoDaysAgo(39)
      }
    ],
    payments: [
      {
        id: 'pay_1001',
        applicationId: 'app_1001',
        reference: 'JUM-2026-0001',
        amount: 0.1,
        currency: 'USD',
        method: 'EVC PLUS',
        transactionCode: 'EVC-2026-9001',
        status: 'Paid',
        createdAt: isoDaysAgo(41),
        updatedAt: isoDaysAgo(40)
      },
      {
        id: 'pay_1002',
        applicationId: 'app_1002',
        reference: 'JUM-2026-0002',
        amount: 0.1,
        currency: 'USD',
        method: 'Zaad',
        transactionCode: 'ZAAD-2026-9002',
        status: 'Pending',
        createdAt: isoDaysAgo(9),
        updatedAt: isoDaysAgo(9)
      },
      {
        id: 'pay_1003',
        applicationId: 'app_1003',
        reference: 'JUM-2026-0003',
        amount: 0.1,
        currency: 'USD',
        method: 'EVC Plus',
        transactionCode: 'EVC-2026-9003',
        status: 'Failed',
        createdAt: isoDaysAgo(17),
        updatedAt: isoDaysAgo(15)
      }
    ],
    contactMessages: [
      {
        id: 'con_1001',
        name: 'Hassan Mohamed',
        email: 'hassan@example.com',
        phone: '615000111',
        type: 'Admission',
        message: 'I need help completing my online application.',
        status: 'Pending',
        response: '',
        createdAt: isoDaysAgo(3),
        updatedAt: isoDaysAgo(3)
      },
      {
        id: 'con_1002',
        name: 'Asha Ali',
        email: 'asha@example.com',
        phone: '616000222',
        type: 'Payment',
        message: 'My payment reference is not showing as paid.',
        status: 'Resolved',
        response: 'Payment confirmed by finance office.',
        createdAt: isoDaysAgo(8),
        updatedAt: isoDaysAgo(7)
      }
    ],
    activities: [
      {
        id: 'act_1001',
        action: 'Approved Application',
        beforeAction: 'Pending',
        afterAction: 'Approved',
        adminId: 'usr_admin',
        adminName: 'System Admin',
        adminEmail: 'admin@jamhuriya.edu.so',
        applicantPerson: 'Said Omar Ahmed Mohamud',
        applicationReference: 'JUM-2026-0001',
        module: 'Applications',
        metadata: {},
        createdAt: isoDaysAgo(39)
      },
      {
        id: 'act_1002',
        action: 'Rejected Application',
        beforeAction: 'Pending',
        afterAction: 'Rejected',
        adminId: 'usr_officer',
        adminName: 'Admission Officer',
        adminEmail: 'officer@jamhuriya.edu.so',
        applicantPerson: 'Ahmed Ali Warsame',
        applicationReference: 'JUM-2026-0003',
        module: 'Applications',
        metadata: {},
        createdAt: isoDaysAgo(15)
      }
    ],
    admissionPeriods: [{
      id: 'adp_general_2026', name: 'General Admission 2026-2027', academicYear: '2026-2027', intakeName: 'General Intake',
      admissionType: 'General Admission', facultyId: '', programId: '', description: 'University-wide admission registration period.',
      applicantInstructions: 'Complete every required field and submit before the closing deadline.',
      openingDatetime: new Date(Date.now() - 30 * 86400000).toISOString(), closingDatetime: new Date(Date.now() + 365 * 86400000).toISOString(),
      timezone: 'Africa/Nairobi', status: 'Open', automaticOpen: true, automaticClose: true, allowDraftApplications: true,
      allowApplicationEditing: true, maximumApplications: null, applicationCount: applications.length, openedAt: now, openedBy: 'usr_admin',
      closedAt: null, closedBy: null, pausedAt: null, pausedBy: null, pauseReason: '', cancellationReason: '', extensionReason: '',
      sendOpeningNotification: false, sendClosingReminder: false, closingReminderPeriod: 24, archived: false, version: 1,
      createdBy: 'usr_admin', updatedBy: 'usr_admin', createdAt: now, updatedAt: now
    }],
    admissionPeriodActivities: [],
    settings: {
      universityName: 'Jamhuriya University',
      supportEmail: 'support@jamhuriya.edu.so',
      admissionsSemester: 'Fall 2026',
      currency: 'USD',
      maintenanceMode: false,
      twoFactorRequired: false,
      notifications: {
        newAdmissions: true,
        paymentSuccess: true,
        weeklyReports: false
      },
      updatedAt: now
    }
  };
};
