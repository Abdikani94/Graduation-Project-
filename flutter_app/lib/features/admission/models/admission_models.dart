import 'dart:typed_data';

class Faculty {
  const Faculty({
    required this.name,
    required this.campus,
    required this.departments,
  });

  factory Faculty.fromJson(Map<String, dynamic> json) {
    final departmentsJson = json['departments'];
    final departments = departmentsJson is List
        ? departmentsJson
            .map<String>((item) {
              if (item is Map<String, dynamic>) {
                return (item['name'] ?? '').toString();
              }
              return item.toString();
            })
            .where((name) => name.isNotEmpty)
            .toList()
        : <String>[];

    return Faculty(
      name: (json['title'] ?? json['name'] ?? '').toString(),
      campus: (json['campus'] ?? 'Main Campus').toString(),
      departments: departments,
    );
  }

  final String name;
  final String campus;
  final List<String> departments;
}

class ApplicationDraft {
  String fullName = '';
  String motherName = '';
  String nationality = '';
  String nationalId = '';
  String rollNumber = '';
  String dateOfBirth = '';
  String placeOfBirth = '';
  String district = '';
  String area = '';
  String email = '';
  String phone = '';
  String sex = '';
  String maritalStatus = '';
  String emergencyName = '';
  String emergencyTell = '';
  String relationship = '';
  String familyStudied = '';
  String schoolName = '';
  String schoolDistrict = '';
  String graduationYear = '';
  String passingGrade = '';
  String heardFrom = '';
  String faculty = '';
  String department = '';
  String campus = '';
  String studyMode = '';
  String paymentPlan = '';
  String paymentMethod = '';
  bool applicantPhotoUploaded = false;
  bool certificateUploaded = false;
  String applicantPhotoUri = '';
  String applicantPhotoName = '';
  String applicantPhotoMimeType = '';
  Uint8List? applicantPhotoBytes;
  String certificateUri = '';
  String certificateName = '';
  String certificateMimeType = '';
  Uint8List? certificateBytes;
  Uint8List? paymentReceiptBytes;
  String paymentReceiptName = '';
  String paymentReceiptMimeType = '';
  String certificateStatus = '';
  String appointmentDate = '';
  String appointmentTime = '';
  bool submitted = false;
  String? applicationId;
  String? paymentId;
  String? submittedReference;
  String paymentStatus = 'Pending';
  String applicationStatus = '';
  String assignedClass = '';
  String paymentAccessToken = '';
  String paymentReferenceId = '';
  String payerPhone = '';
  String paymentAmount = '25.00';
  String paymentTransactionId = '';

  String get reference => submittedReference ?? 'Draft';
  double get admissionFee => 25;
  bool get hasCertificate => certificateStatus == 'Yes';

  set hasCertificate(bool value) {
    certificateStatus = value ? 'Yes' : 'No';
  }

  static final _personNamePattern = RegExp(r"^[A-Za-z][A-Za-z\s'.-]{1,79}$");
  static final _simpleTextPattern = RegExp(r"^[A-Za-z][A-Za-z\s'.&,/-]{1,99}$");
  static final _schoolNamePattern =
      RegExp(r"^[A-Za-z0-9][A-Za-z0-9\s'.&,()/-]{1,149}$");
  static final _idPattern = RegExp(r'^\d{3,30}$');
  static final _rollNumberPattern = RegExp(r'^\d[\d/-]{2,29}$');
  static final _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
  static final _phonePattern = RegExp(r'^\+?[\d\s-]{7,20}$');
  static final _gradeOptions = [
    'A+',
    'A',
    'A-',
    'B+',
    'B',
    'B-',
    'C+',
    'C',
    'C-'
  ];
  static final _sexOptions = ['Male', 'Female'];
  static final _maritalStatusOptions = [
    'Single',
    'Marriage',
    'Divorced',
    'Widowed'
  ];
  static final _relationshipOptions = [
    'Mother',
    'Father',
    'Brother',
    'Sister',
    'Other specify'
  ];
  static final _familyStudiedOptions = ['Haa', 'Maya'];
  static final _heardFromOptions = [
    'Social Media',
    'Friends',
    'University came to our School',
    'Parents',
    'Seminars of the University',
    'Other specify',
  ];
  static final _studyModeOptions = ['Full Time', 'Part Time'];
  static final _certificateStatusOptions = ['Yes', 'No'];
  static final _paymentPlanOptions = [
    'Admission fee only',
    'Semester payment',
    'Full year payment'
  ];
  static final _paymentMethodOptions = ['EVC Plus'];

  Map<String, dynamic> toApiPayload() {
    return {
      'fullName': fullName,
      'motherName': motherName,
      'nationality': nationality,
      'nationalId': nationalId,
      'rollNumber': rollNumber,
      'dateOfBirth': dateOfBirth,
      'placeOfBirth': placeOfBirth,
      'district': district,
      'area': area,
      'email': email,
      'mobile': phone,
      'sex': sex,
      'maritalStatus': maritalStatus,
      'campus': campus,
      'emergencyName': emergencyName,
      'emergencyTell': emergencyTell,
      'relationship': relationship,
      'familyStudied': familyStudied,
      'schoolName': schoolName,
      'schoolDistrict': schoolDistrict,
      'graduationYear': graduationYear,
      'percentage': passingGrade,
      'heardFrom': heardFrom,
      'modeOfStudy': studyMode,
      'paymentPlan': paymentPlan,
      'paymentMethod': paymentMethod,
      'paymentPhone': payerPhone,
      'paymentAmount': paymentAmount,
      'paymentTransactionId': paymentTransactionId,
      'faculty': faculty,
      'department': department,
      'applicantPhotoUploaded': applicantPhotoBytes != null ? 'Yes' : 'No',
      'applicantPhotoName': applicantPhotoName,
      'applicantPhotoMimeType': applicantPhotoMimeType,
      'certificateUploaded': certificateBytes != null ? 'Yes' : 'No',
      'certificateName': certificateName,
      'certificateMimeType': certificateMimeType,
      'hasCertificate': certificateStatus,
      if (certificateStatus == 'No') 'appointmentDate': appointmentDate,
      if (certificateStatus == 'No') 'appointmentTime': appointmentTime,
    };
  }

  String? validateStep(int step) {
    if (step == 1) return _validatePersonalDetails();
    if (step == 2) return _validateEmergencyAndSchool();
    if (step == 3) return _validateProgramChoice();
    if (step == 4) return validateForSubmission();
    return null;
  }

  String? validateForSubmission() {
    return _validatePersonalDetails() ??
        _validateEmergencyAndSchool() ??
        _validateProgramChoice(requirePaymentMethod: true);
  }

  String? _validatePersonalDetails() {
    final missing = _missingFields([
      ('Full Name', fullName),
      ("Mother's Name", motherName),
      ('Nationality', nationality),
      ('Roll Number', rollNumber),
      ('Date of Birth', dateOfBirth),
      ('Place of Birth', placeOfBirth),
      ('District', district),
      ('Email', email),
      ('Phone Number', phone),
      ('Sex', sex),
      ('Marital Status', maritalStatus),
      ('Certificate status', certificateStatus),
    ]);
    if (!applicantPhotoUploaded) {
      missing.add('Passport Photo');
    }
    if (certificateStatus == 'Yes' && !certificateUploaded) {
      missing.add('Certificate File');
    }
    if (certificateStatus == 'No') {
      if (_isEmpty(appointmentDate)) missing.add('Appointment Date');
      if (_isEmpty(appointmentTime)) missing.add('Appointment Time');
    }
    if (missing.isNotEmpty) {
      return 'Please complete: ${missing.join(', ')}';
    }
    if (!_personNamePattern.hasMatch(fullName.trim())) {
      return 'Full Name must contain only letters, spaces, apostrophes, hyphens, or periods';
    }
    if (!_personNamePattern.hasMatch(motherName.trim())) {
      return "Mother's Name must contain only letters, spaces, apostrophes, hyphens, or periods";
    }
    if (!_simpleTextPattern.hasMatch(nationality.trim())) {
      return 'Nationality must contain text only';
    }
    if (nationalId.trim().isNotEmpty &&
        !_idPattern.hasMatch(nationalId.trim())) {
      return 'National ID must be 3-30 digits when provided';
    }
    if (!_rollNumberPattern.hasMatch(rollNumber.trim())) {
      return 'Roll Number must contain numbers only. Hyphens and slashes are allowed';
    }
    if (!_isValidEmail(email)) return 'Please enter a valid email address';
    if (!_isValidPhone(phone)) return 'Please enter a valid phone number';
    if (!_isValidDate(dateOfBirth)) return 'Date of birth is invalid';
    final birthDate = DateTime.parse(dateOfBirth);
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    if (birthDate.isAfter(today)) {
      return 'Date of birth cannot be in the future';
    }
    final age = _ageFromDate(birthDate, today);
    if (age < 14 || age > 100) {
      return 'Applicant age must be between 14 and 100 years';
    }
    if (!_simpleTextPattern.hasMatch(placeOfBirth.trim())) {
      return 'Place Of Birth must contain text only';
    }
    if (!_simpleTextPattern.hasMatch(district.trim())) {
      return 'District must contain text only';
    }
    if (area.trim().isNotEmpty && !_simpleTextPattern.hasMatch(area.trim())) {
      return 'Area must contain text only';
    }
    if (!_sexOptions.contains(sex)) return 'Sex is invalid';
    if (!_maritalStatusOptions.contains(maritalStatus)) {
      return 'Marital Status is invalid';
    }
    if (!_certificateStatusOptions.contains(certificateStatus)) {
      return 'Please select a valid certificate status';
    }
    if (certificateStatus == 'No') {
      if (!_isValidDate(appointmentDate)) {
        return 'Please enter a valid appointment date';
      }
      final parsedAppointment = DateTime.parse(appointmentDate);
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      if (parsedAppointment.isBefore(today)) {
        return 'Appointment date cannot be in the past';
      }
      if (!RegExp(r'^\d{2}:\d{2}$').hasMatch(appointmentTime.trim())) {
        return 'Please enter a valid appointment time';
      }
      if (appointmentTime.trim().compareTo('08:00') < 0 ||
          appointmentTime.trim().compareTo('17:00') > 0) {
        return 'Appointment time must be between 8:00 AM and 5:00 PM';
      }
    }
    return null;
  }

  String? _validateEmergencyAndSchool() {
    final missing = _missingFields([
      ('Emergency Contact Name', emergencyName),
      ('Emergency Phone', emergencyTell),
      ('Relationship', relationship),
      ('Family Member Studied Here', familyStudied),
      ('Secondary School Name', schoolName),
      ('School District', schoolDistrict),
      ('Graduation Year', graduationYear),
      ('Passing Grade', passingGrade),
      ('How did you know about university', heardFrom),
    ]);
    if (missing.isNotEmpty) {
      return 'Please complete: ${missing.join(', ')}';
    }
    if (!_personNamePattern.hasMatch(emergencyName.trim())) {
      return 'Emergency Contact Name is invalid';
    }
    if (!_isValidPhone(emergencyTell)) return 'Emergency phone is invalid';
    if (!_relationshipOptions.contains(relationship)) {
      return 'Relationship is invalid';
    }
    if (!_familyStudiedOptions.contains(familyStudied)) {
      return 'Family Member Studied Here is invalid';
    }
    if (!_schoolNamePattern.hasMatch(schoolName.trim())) {
      return 'Secondary School Name may contain letters and numbers';
    }
    if (!_simpleTextPattern.hasMatch(schoolDistrict.trim())) {
      return 'School District must contain text only';
    }
    final year = int.tryParse(graduationYear.trim());
    final currentYear = DateTime.now().year;
    if (year == null || year < 1970 || year > currentYear) {
      return 'Graduation year must be between 1970 and $currentYear';
    }
    if (!_gradeOptions.contains(passingGrade)) {
      return 'Please select a valid passing grade';
    }
    if (!_heardFromOptions.contains(heardFrom)) {
      return 'How did you know about university is invalid';
    }
    return null;
  }

  String? _validateProgramChoice({bool requirePaymentMethod = false}) {
    final missing = _missingFields([
      ('Faculty', faculty),
      ('Department', department),
      ('Mode Of Study', studyMode),
      ('Payment Plan', paymentPlan),
      if (requirePaymentMethod) ('Payment Method', paymentMethod),
    ]);
    if (missing.isNotEmpty) {
      return 'Please complete: ${missing.join(', ')}';
    }
    if (!_studyModeOptions.contains(studyMode)) {
      return 'Mode Of Study is invalid';
    }
    if (!_paymentPlanOptions.contains(paymentPlan)) {
      return 'Payment Plan is invalid';
    }
    if (requirePaymentMethod &&
        !_paymentMethodOptions.contains(paymentMethod)) {
      return 'Payment Method is invalid';
    }
    return null;
  }

  static bool _isEmpty(String value) => value.trim().isEmpty;

  static List<String> _missingFields(List<(String, String)> fields) {
    return fields
        .where((field) => _isEmpty(field.$2))
        .map((field) => field.$1)
        .toList();
  }

  static bool _isValidEmail(String value) {
    final text = value.trim();
    return _emailPattern.hasMatch(text) && text.length <= 254;
  }

  static bool _isValidPhone(String value) {
    final text = value.trim();
    final digits = text.replaceAll(RegExp(r'\D'), '');
    return _phonePattern.hasMatch(text) &&
        digits.length >= 7 &&
        digits.length <= 15;
  }

  static bool _isValidDate(String value) {
    final text = value.trim();
    if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(text)) return false;
    final parsed = DateTime.tryParse(text);
    if (parsed == null) return false;
    final parts = text.split('-').map(int.parse).toList();
    return parsed.year == parts[0] &&
        parsed.month == parts[1] &&
        parsed.day == parts[2];
  }

  static int _ageFromDate(DateTime birthDate, DateTime today) {
    var age = today.year - birthDate.year;
    if (today.month < birthDate.month ||
        (today.month == birthDate.month && today.day < birthDate.day)) {
      age -= 1;
    }
    return age;
  }

  void updateFromSubmission(Map<String, dynamic> data) {
    final application = data['application'];
    final payment = data['payment'];

    if (application is Map<String, dynamic>) {
      applicationId = application['id']?.toString();
      submittedReference = application['reference']?.toString();
      paymentStatus =
          (application['paymentStatus'] ?? paymentStatus).toString();
      applicationStatus =
          (application['status'] ?? applicationStatus).toString();
      assignedClass = (application['className'] ?? assignedClass).toString();
    }

    if (payment is Map<String, dynamic>) {
      paymentId = payment['id']?.toString();
      paymentStatus = (payment['status'] ?? paymentStatus).toString();
    }

    paymentAccessToken =
        (data['paymentAccessToken'] ?? paymentAccessToken).toString();

    submitted = true;
  }

  void setApplicantPhoto({
    required String uri,
    required String name,
    required String mimeType,
    Uint8List? bytes,
  }) {
    applicantPhotoUri = uri;
    applicantPhotoName = name;
    applicantPhotoMimeType = mimeType;
    applicantPhotoUploaded = uri.isNotEmpty;
    applicantPhotoBytes = bytes;
  }

  void setCertificate({
    required String uri,
    required String name,
    required String mimeType,
    Uint8List? bytes,
  }) {
    certificateUri = uri;
    certificateName = name;
    certificateMimeType = mimeType;
    certificateUploaded = uri.isNotEmpty;
    certificateBytes = bytes;
  }

  void clearCertificate() {
    certificateUri = '';
    certificateName = '';
    certificateMimeType = '';
    certificateUploaded = false;
    certificateBytes = null;
  }
}

class RegistrationStatus {
  const RegistrationStatus(
      {required this.isOpen, required this.status, this.period});

  factory RegistrationStatus.fromJson(Map<String, dynamic> json) {
    final rawPeriod = json['period'];
    return RegistrationStatus(
      isOpen: json['isOpen'] == true,
      status: (json['status'] ?? 'Closed').toString(),
      period: rawPeriod is Map<String, dynamic>
          ? AdmissionPeriod.fromJson(rawPeriod)
          : null,
    );
  }

  final bool isOpen;
  final String status;
  final AdmissionPeriod? period;
}

class AdmissionPeriod {
  const AdmissionPeriod({
    required this.id,
    required this.name,
    required this.openingDatetime,
    required this.closingDatetime,
    required this.applicantInstructions,
  });

  factory AdmissionPeriod.fromJson(Map<String, dynamic> json) =>
      AdmissionPeriod(
        id: (json['id'] ?? '').toString(),
        name: (json['name'] ?? '').toString(),
        openingDatetime:
            DateTime.tryParse((json['openingDatetime'] ?? '').toString()),
        closingDatetime:
            DateTime.tryParse((json['closingDatetime'] ?? '').toString()),
        applicantInstructions: (json['applicantInstructions'] ?? '').toString(),
      );

  final String id;
  final String name;
  final DateTime? openingDatetime;
  final DateTime? closingDatetime;
  final String applicantInstructions;
}

class PaymentResult {
  const PaymentResult({
    required this.status,
    required this.referenceId,
    required this.amount,
    required this.currency,
    required this.payerPhone,
    this.providerState,
    this.failureCode,
    this.failureMessage,
  });

  factory PaymentResult.fromJson(Map<String, dynamic> json) => PaymentResult(
        status: (json['status'] ?? 'UNKNOWN').toString(),
        referenceId: (json['referenceId'] ?? '').toString(),
        amount: (json['amount'] as num?)?.toDouble() ??
            double.tryParse('${json['amount']}') ??
            0,
        currency: (json['currency'] ?? 'USD').toString(),
        payerPhone: (json['payerPhone'] ?? '').toString(),
        providerState: json['providerState']?.toString(),
        failureCode: json['failureCode']?.toString(),
        failureMessage: json['failureMessage']?.toString(),
      );

  final String status;
  final String referenceId;
  final double amount;
  final String currency;
  final String payerPhone;
  final String? providerState;
  final String? failureCode;
  final String? failureMessage;
}
