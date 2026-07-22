import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_theme.dart';
import '../data/admission_repository.dart';
import '../models/admission_models.dart';
import 'payment_screen.dart';

class _PickedDocument {
  const _PickedDocument({
    required this.uri,
    required this.name,
    required this.mimeType,
  });

  final String uri;
  final String name;
  final String mimeType;

  factory _PickedDocument.fromMap(Map<dynamic, dynamic> data) {
    return _PickedDocument(
      uri: (data['uri'] ?? '').toString(),
      name: (data['name'] ?? 'Selected file').toString(),
      mimeType: (data['mimeType'] ?? '').toString(),
    );
  }
}

class _MobileDocumentPicker {
  static const _channel = MethodChannel('just_admission/document_picker');

  static Future<_PickedDocument?> pickApplicantPhoto() {
    return _pick('pickApplicantPhoto');
  }

  static Future<_PickedDocument?> pickCertificate() {
    return _pick('pickCertificate');
  }

  static Future<_PickedDocument?> _pick(String method) async {
    try {
      final result = await _channel.invokeMapMethod<String, dynamic>(method);
      if (result == null) return null;
      return _PickedDocument.fromMap(result);
    } on PlatformException {
      return null;
    } on MissingPluginException {
      return null;
    }
  }
}

class ApplicationWizardScreen extends StatefulWidget {
  const ApplicationWizardScreen({
    super.key,
    required this.draft,
    this.initialStep = 1,
  });

  final ApplicationDraft draft;
  final int initialStep;

  @override
  State<ApplicationWizardScreen> createState() =>
      _ApplicationWizardScreenState();
}

class _ApplicationWizardScreenState extends State<ApplicationWizardScreen> {
  late int step = widget.initialStep.clamp(0, 4);
  final faculties = const AdmissionRepository().fallbackFaculties();
  bool confirmedInfo = false;
  bool agreedTerms = false;
  bool isFinishing = false;

  ApplicationDraft get draft => widget.draft;

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: AppColors.primaryBlue,
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
      ),
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Column(
            children: [
              _WizardHeader(step: step),
              Expanded(
                child: ListView(
                  padding: EdgeInsets.fromLTRB(16, step == 3 ? 0 : 16, 16, 20),
                  children: [
                    if (step == 1)
                      _PersonalDetailsStep(
                        draft: draft,
                        onChanged: () => setState(() {}),
                      )
                    else if (step == 2)
                      _EmergencySchoolStep(
                        draft: draft,
                        onChanged: () => setState(() {}),
                      )
                    else if (step == 3)
                      _ProgramPaymentStep(
                        draft: draft,
                        faculties: faculties,
                        onChanged: () => setState(() {}),
                      )
                    else if (step == 4)
                      _ReviewApplicationStep(
                        draft: draft,
                        confirmedInfo: confirmedInfo,
                        agreedTerms: agreedTerms,
                        onConfirmChanged: (value) =>
                            setState(() => confirmedInfo = value),
                        onTermsChanged: (value) =>
                            setState(() => agreedTerms = value),
                      )
                    else
                      _PlaceholderStep(step: step),
                    const SizedBox(height: 84),
                  ],
                ),
              ),
              _WizardBottomBar(
                canBack: step > 0,
                nextLabel:
                    step == 4
                        ? (isFinishing ? 'Submitting...' : 'Submit application')
                        : 'Next step \u{2192}',
                nextEnabled: !isFinishing &&
                    (step != 4 || (confirmedInfo && agreedTerms)),
                onBack: () {
                  if (step == 0) {
                    Navigator.of(context).maybePop();
                  } else {
                    setState(() => step--);
                  }
                },
                onSave: () {},
                onNext: _next,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _next() async {
    final validationError = draft.validateStep(step);
    if (validationError != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(validationError)),
      );
      return;
    }

    if (step == 3) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => PaymentScreen(draft: draft)),
      );
      setState(() => step = 4);
      return;
    }

    if (step < 4) {
      setState(() => step++);
      return;
    }

    setState(() => isFinishing = true);
    try {
      if (!draft.submitted) {
        final data = await const AdmissionRepository().submitApplication(draft);
        draft.updateFromSubmission(data);
      }
      if (!mounted) return;

      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) => AlertDialog(
          icon: const Icon(
            Icons.check_circle,
            color: AppColors.justGreen,
            size: 54,
          ),
          title: const Text('Application submitted'),
          content: Text(
            'Your application was submitted successfully.\n\nReference: ${draft.reference}',
            textAlign: TextAlign.center,
          ),
          actionsAlignment: MainAxisAlignment.center,
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Done'),
            ),
          ],
        ),
      );

      if (mounted) Navigator.of(context).pop();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      if (mounted) setState(() => isFinishing = false);
    }
  }
}

class _WizardHeader extends StatelessWidget {
  const _WizardHeader({required this.step});

  final int step;

  @override
  Widget build(BuildContext context) {
    final title = switch (step) {
      1 => 'Personal Details',
      2 => 'Emergency & School',
      3 => 'Program & Payment',
      4 => 'Review Application',
      _ => 'Admission Requirements',
    };
    final number = step + 1;

    return Container(
      color: AppColors.primaryBlue,
      padding: const EdgeInsets.fromLTRB(10, 0, 10, 14),
      child: Column(
        children: [
          SizedBox(
            height: 60,
            child: Row(
              children: [
                IconButton(
                  onPressed: () => Navigator.of(context).maybePop(),
                  icon: const Icon(
                    Icons.chevron_left,
                    color: Colors.white,
                    size: 25,
                  ),
                ),
                const Expanded(
                  child: Text(
                    'Application',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const SizedBox(width: 48),
              ],
            ),
          ),
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 1),
                  color: Colors.white.withValues(alpha: .12),
                ),
                child: Center(
                  child: Text(
                    '$number',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Step $number of 5',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: List.generate(5, (index) {
              final active = index <= step;
              return Expanded(
                child: Container(
                  height: 4,
                  margin: EdgeInsets.only(right: index == 4 ? 0 : 4),
                  decoration: BoxDecoration(
                    color: active
                        ? AppColors.greenAccent
                        : Colors.white.withValues(alpha: .38),
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}

class _ProgramPaymentStep extends StatelessWidget {
  const _ProgramPaymentStep({
    required this.draft,
    required this.faculties,
    required this.onChanged,
  });

  final ApplicationDraft draft;
  final List<Faculty> faculties;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        const Text(
          'Select your faculty, department, and study mode.',
          style: TextStyle(
            color: AppColors.mutedText,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 14),
        ...faculties.map((faculty) {
          final expanded = faculty.name == draft.faculty;
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _FacultyPickerCard(
              faculty: faculty,
              expanded: expanded,
              selectedDepartment: draft.department,
              onFacultyTap: () {
                draft.faculty = faculty.name;
                draft.campus = faculty.campus;
                draft.department = faculty.departments.first;
                onChanged();
              },
              onDepartmentTap: (department) {
                draft.faculty = faculty.name;
                draft.campus = faculty.campus;
                draft.department = department;
                onChanged();
              },
            ),
          );
        }),
        const SizedBox(height: 4),
        const _RequiredLabel('Study mode'),
        const SizedBox(height: 8),
        _SegmentedMode(
          value: draft.studyMode,
          onChanged: (value) {
            draft.studyMode = value;
            onChanged();
          },
        ),
        const SizedBox(height: 20),
        const _SectionHeading(
          icon: '\u{2705}',
          background: AppColors.pastelGreen,
          title: 'Selected program',
        ),
        const SizedBox(height: 10),
        _SelectedProgramCard(draft: draft),
        const SizedBox(height: 20),
        const _SectionHeading(
          icon: '\u{1F4B3}',
          background: AppColors.pastelOrange,
          title: 'Payment plan',
        ),
        const SizedBox(height: 10),
        _PaymentPlanCard(
          badge: '1\u{00D7}',
          title: 'Admission Fee Only',
          subtitle: 'Pay registration now, tuition later',
          amount: '\$25',
          selected: draft.paymentPlan == 'Admission fee only',
          onTap: () {
            draft.paymentPlan = 'Admission fee only';
            onChanged();
          },
        ),
        const SizedBox(height: 10),
        _PaymentPlanCard(
          badge: '6m',
          title: 'Semester Payment',
          subtitle: 'Admission fee + first semester tuition',
          amount: '\$295',
          selected: draft.paymentPlan == 'Semester payment',
          onTap: () {
            draft.paymentPlan = 'Semester payment';
            onChanged();
          },
        ),
        const SizedBox(height: 10),
        _PaymentPlanCard(
          badge: '1y',
          title: 'Full-Year Payment',
          subtitle: 'Admission fee + full year, save 5%',
          amount: '\$538',
          selected: draft.paymentPlan == 'Full year payment',
          onTap: () {
            draft.paymentPlan = 'Full year payment';
            onChanged();
          },
        ),
      ],
    );
  }
}

class _PersonalDetailsStep extends StatelessWidget {
  const _PersonalDetailsStep({required this.draft, required this.onChanged});

  final ApplicationDraft draft;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _FieldBox(
          label: 'Full Name',
          value: draft.fullName,
          icon: '\u{1F464}',
          required: true,
          maxLength: 80,
          inputFormatters: _nameFormatters,
          onChanged: (value) => draft.fullName = value,
        ),
        const SizedBox(height: 12),
        _FieldBox(
          label: 'Mother\u{2019}s Name',
          value: draft.motherName,
          icon: '\u{1F469}',
          required: true,
          maxLength: 80,
          inputFormatters: _nameFormatters,
          onChanged: (value) => draft.motherName = value,
        ),
        const SizedBox(height: 12),
        _FieldBox(
          label: 'Roll Number',
          value: draft.rollNumber,
          hint: 'Enter roll number',
          icon: '#',
          required: true,
          keyboardType: TextInputType.number,
          maxLength: 30,
          inputFormatters: _rollNumberFormatters,
          onChanged: (value) => draft.rollNumber = value,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _FieldBox(
                label: 'Nationality',
                value: draft.nationality,
                required: true,
                trailing: Icons.keyboard_arrow_down,
                maxLength: 100,
                inputFormatters: _simpleTextFormatters,
                onChanged: (value) => draft.nationality = value,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _FieldBox(
                label: 'National ID',
                value: draft.nationalId,
                hint: 'If available',
                muted: true,
                keyboardType: TextInputType.number,
                maxLength: 30,
                inputFormatters: _idFormatters,
                onChanged: (value) => draft.nationalId = value,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _FieldBox(
                label: 'Date of Birth',
                value: draft.dateOfBirth,
                hint: 'YYYY-MM-DD',
                required: true,
                trailing: Icons.calendar_month,
                onTap: () async {
                  final selectedDate = await showDatePicker(
                    context: context,
                    initialDate: _parseDateOrDefault(draft.dateOfBirth),
                    firstDate: DateTime(DateTime.now().year - 100),
                    lastDate: DateTime.now(),
                    helpText: 'Select date of birth',
                  );
                  if (selectedDate == null) return;
                  draft.dateOfBirth = _formatDate(selectedDate);
                  onChanged();
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _FieldBox(
                label: 'Place of Birth',
                value: draft.placeOfBirth,
                required: true,
                maxLength: 100,
                inputFormatters: _simpleTextFormatters,
                onChanged: (value) => draft.placeOfBirth = value,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _FieldBox(
          label: 'District',
          value: draft.district,
          required: true,
          trailing: Icons.keyboard_arrow_down,
          maxLength: 100,
          inputFormatters: _simpleTextFormatters,
          onChanged: (value) => draft.district = value,
        ),
        const SizedBox(height: 12),
        _FieldBox(
          label: 'Email Address',
          value: draft.email,
          icon: '\u{2709}\u{FE0F}',
          required: true,
          keyboardType: TextInputType.emailAddress,
          maxLength: 254,
          onChanged: (value) => draft.email = value,
        ),
        const SizedBox(height: 12),
        _FieldBox(
          label: 'Phone Number',
          value: draft.phone,
          icon: '\u{1F4DE}',
          required: true,
          keyboardType: TextInputType.phone,
          maxLength: 20,
          inputFormatters: _phoneFormatters,
          onChanged: (value) => draft.phone = value,
        ),
        const SizedBox(height: 12),
        _FieldBox(
          label: 'Area',
          value: draft.area,
          hint: 'Optional neighborhood / area',
          muted: true,
          maxLength: 100,
          inputFormatters: _simpleTextFormatters,
          onChanged: (value) => draft.area = value,
        ),
        const SizedBox(height: 12),
        const _RequiredLabel('Applicant photo'),
        const SizedBox(height: 8),
        _DocumentUploadCard(
          icon: '\u{1F4F7}',
          background: AppColors.pastelBlue,
          title: 'Passport-size photo',
          subtitle: draft.applicantPhotoName.isEmpty
              ? 'JPG or PNG \u{00B7} choose from your phone'
              : draft.applicantPhotoName,
          actionText: draft.applicantPhotoUploaded
              ? 'Photo uploaded'
              : 'Tap to choose your photo',
          uploaded: draft.applicantPhotoUploaded,
          onTap: () async {
            final picked = await _MobileDocumentPicker.pickApplicantPhoto();
            if (picked == null) return;
            draft.setApplicantPhoto(
              uri: picked.uri,
              name: picked.name,
              mimeType: picked.mimeType,
            );
            onChanged();
          },
        ),
        const SizedBox(height: 12),
        const _RequiredLabel('Sex'),
        const SizedBox(height: 8),
        _SegmentedChoice(
          labels: const ['Male', 'Female'],
          selected: draft.sex,
          onChanged: (value) {
            draft.sex = value;
            onChanged();
          },
        ),
        const SizedBox(height: 12),
        const _RequiredLabel('Marital Status'),
        const SizedBox(height: 8),
        _ChipWrap(
          selected: draft.maritalStatus,
          options: const ['Single', 'Marriage', 'Divorced', 'Widowed'],
          onChanged: (value) {
            draft.maritalStatus = value;
            onChanged();
          },
        ),
        const SizedBox(height: 12),
        const _RequiredLabel('Do you have a certificate?'),
        const SizedBox(height: 8),
        _SegmentedChoice(
          labels: const ['Yes', 'No'],
          selected: draft.certificateStatus,
          onChanged: (value) {
            draft.certificateStatus = value;
            if (!draft.hasCertificate) {
              draft.clearCertificate();
            } else {
              draft.appointmentDate = '';
              draft.appointmentTime = '';
            }
            onChanged();
          },
        ),
        const SizedBox(height: 14),
        if (draft.certificateStatus == 'Yes')
          _CertificateUploadCard(
            uploaded: draft.certificateUploaded,
            fileName: draft.certificateName,
            onTap: () async {
              final picked = await _MobileDocumentPicker.pickCertificate();
              if (picked == null) return;
              draft.setCertificate(
                uri: picked.uri,
                name: picked.name,
                mimeType: picked.mimeType,
              );
              onChanged();
            },
          ),
        if (draft.certificateStatus == 'No')
          _AppointmentCard(
            draft: draft,
            onChanged: onChanged,
          ),
      ],
    );
  }

  static DateTime _parseDateOrDefault(String value) {
    final parsed = DateTime.tryParse(value);
    final now = DateTime.now();
    final fallback = DateTime(now.year - 18, now.month, now.day);
    if (parsed == null || parsed.isAfter(now)) return fallback;
    return parsed;
  }

  static String _formatDate(DateTime date) {
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    return '${date.year}-$month-$day';
  }

  static final _nameFormatters = [
    FilteringTextInputFormatter.allow(RegExp(r"[A-Za-z\s'.-]")),
  ];
  static final _simpleTextFormatters = [
    FilteringTextInputFormatter.allow(RegExp(r"[A-Za-z\s'.&,/-]")),
  ];
  static final _idFormatters = [
    FilteringTextInputFormatter.digitsOnly,
  ];
  static final _rollNumberFormatters = [
    FilteringTextInputFormatter.allow(RegExp(r'[\d/-]')),
  ];
  static final _phoneFormatters = [
    FilteringTextInputFormatter.allow(RegExp(r'[\d\s+-]')),
  ];
}

class _EmergencySchoolStep extends StatelessWidget {
  const _EmergencySchoolStep({required this.draft, required this.onChanged});

  final ApplicationDraft draft;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Add a trusted contact and secondary-school details.',
          style: TextStyle(
            color: AppColors.mutedText,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 18),
        const _SectionHeading(
          icon: '\u{1F6A8}',
          background: AppColors.pastelRed,
          title: 'Emergency contact',
        ),
        const SizedBox(height: 12),
        _FieldBox(
          label: 'Emergency Contact Name',
          value: draft.emergencyName,
          icon: '\u{1F464}',
          required: true,
          maxLength: 80,
          inputFormatters: _nameFormatters,
          onChanged: (value) => draft.emergencyName = value,
        ),
        const SizedBox(height: 12),
        _FieldBox(
          label: 'Phone Number',
          value: draft.emergencyTell,
          icon: '\u{1F4DE}',
          required: true,
          keyboardType: TextInputType.phone,
          maxLength: 20,
          inputFormatters: _phoneFormatters,
          onChanged: (value) => draft.emergencyTell = value,
        ),
        const SizedBox(height: 12),
        const _FieldBox(
          label: 'Alternative Phone Number',
          value: 'Optional',
          icon: '\u{1F4DE}',
          muted: true,
        ),
        const SizedBox(height: 12),
        const _RequiredLabel('Relationship to applicant'),
        const SizedBox(height: 8),
        _ChipWrap(
          selected: draft.relationship,
          options: const [
            'Mother',
            'Father',
            'Brother',
            'Sister',
            'Other specify',
          ],
          onChanged: (value) {
            draft.relationship = value;
            onChanged();
          },
        ),
        const SizedBox(height: 16),
        const Text(
          'Does anyone from your family study at JUST?',
          style: TextStyle(
            color: Color(0xFF34405A),
            fontSize: 12,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 8),
        _SegmentedChoice(
          labels: const ['Haa', 'Maya'],
          selected: draft.familyStudied,
          onChanged: (value) {
            draft.familyStudied = value;
            onChanged();
          },
        ),
        const SizedBox(height: 22),
        const _SectionHeading(
          icon: '\u{1F3EB}',
          background: AppColors.pastelGreen,
          title: 'School information',
        ),
        const SizedBox(height: 12),
        _FieldBox(
          label: 'Secondary School Name',
          value: draft.schoolName,
          icon: '\u{1F3EB}',
          required: true,
          maxLength: 100,
          inputFormatters: _simpleTextFormatters,
          onChanged: (value) => draft.schoolName = value,
        ),
        const SizedBox(height: 12),
        _FieldBox(
          label: 'School District',
          value: draft.schoolDistrict,
          required: true,
          trailing: Icons.keyboard_arrow_down,
          maxLength: 100,
          inputFormatters: _simpleTextFormatters,
          onChanged: (value) => draft.schoolDistrict = value,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _FieldBox(
                label: 'Graduation Year',
                value: draft.graduationYear,
                hint: 'Select year',
                required: true,
                trailing: Icons.keyboard_arrow_down,
                onTap: () async {
                  final selectedYear = await _showOptionPicker(
                    context,
                    title: 'Graduation Year',
                    options: _graduationYears(),
                  );
                  if (selectedYear == null) return;
                  draft.graduationYear = selectedYear;
                  onChanged();
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _FieldBox(
                label: 'Passing Grade',
                value: draft.passingGrade,
                hint: 'Select grade',
                required: true,
                success: true,
                trailing: Icons.keyboard_arrow_down,
                onTap: () async {
                  final selectedGrade = await _showOptionPicker(
                    context,
                    title: 'Passing Grade',
                    options: const [
                      'A+',
                      'A',
                      'A-',
                      'B+',
                      'B',
                      'B-',
                      'C+',
                      'C',
                      'C-',
                    ],
                  );
                  if (selectedGrade == null) return;
                  draft.passingGrade = selectedGrade;
                  onChanged();
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        const _RequiredLabel('How did you know about university'),
        const SizedBox(height: 8),
        _ChipWrap(
          selected: draft.heardFrom,
          options: const [
            'Social Media',
            'Friends',
            'University came to our School',
            'Parents',
            'Seminars of the University',
            'Other specify',
          ],
          onChanged: (value) {
            draft.heardFrom = value;
            onChanged();
          },
        ),
      ],
    );
  }

  static List<String> _graduationYears() {
    final currentYear = DateTime.now().year;
    return [
      for (var year = currentYear; year >= 1970; year--) year.toString(),
    ];
  }

  static Future<String?> _showOptionPicker(
    BuildContext context, {
    required String title,
    required List<String> options,
  }) {
    return showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 16, 18, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: const TextStyle(
                          color: AppColors.text,
                          fontSize: 17,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
              ),
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: options.length,
                  separatorBuilder: (context, index) =>
                      const Divider(height: 1, color: AppColors.border),
                  itemBuilder: (context, index) {
                    final option = options[index];
                    return ListTile(
                      title: Text(
                        option,
                        style: const TextStyle(
                          color: AppColors.text,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      onTap: () => Navigator.pop(context, option),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  static final _nameFormatters = [
    FilteringTextInputFormatter.allow(RegExp(r"[A-Za-z\s'.-]")),
  ];
  static final _simpleTextFormatters = [
    FilteringTextInputFormatter.allow(RegExp(r"[A-Za-z\s'.&,/-]")),
  ];
  static final _phoneFormatters = [
    FilteringTextInputFormatter.allow(RegExp(r'[\d\s+-]')),
  ];
}

class _FacultyPickerCard extends StatelessWidget {
  const _FacultyPickerCard({
    required this.faculty,
    required this.expanded,
    required this.selectedDepartment,
    required this.onFacultyTap,
    required this.onDepartmentTap,
  });

  final Faculty faculty;
  final bool expanded;
  final String selectedDepartment;
  final VoidCallback onFacultyTap;
  final ValueChanged<String> onDepartmentTap;

  @override
  Widget build(BuildContext context) {
    final accent = _facultyColor(faculty.name);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(13),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(13),
            onTap: onFacultyTap,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(13, 12, 10, 12),
              child: Row(
                children: [
                  _SmallIcon(
                    icon: _facultyIcon(faculty.name),
                    background: _facultyBackground(faculty.name),
                  ),
                  const SizedBox(width: 11),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          faculty.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.text,
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${faculty.departments.length} programs available',
                          style: const TextStyle(
                            color: AppColors.mutedText,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right, color: accent, size: 18),
                ],
              ),
            ),
          ),
          if (expanded)
            ...faculty.departments.take(5).map(
                  (department) => _DepartmentRow(
                    title: department,
                    years: _durationFor(department),
                    selected: department == selectedDepartment,
                    onTap: () => onDepartmentTap(department),
                  ),
                ),
        ],
      ),
    );
  }

  static String _facultyIcon(String name) {
    if (name.contains('Medicine')) return '\u{1F9EC}';
    if (name.contains('Computer')) return '\u{1F4BB}';
    if (name.contains('Economics')) return '\u{1F4CA}';
    if (name.contains('Engineering')) return '\u{1F4D0}';
    return '\u{1F331}';
  }

  static Color _facultyColor(String name) {
    if (name.contains('Medicine')) return AppColors.danger;
    if (name.contains('Computer')) return AppColors.warning;
    if (name.contains('Economics')) return AppColors.primaryBlue;
    if (name.contains('Engineering')) return AppColors.justGreen;
    return const Color(0xFFBC35D4);
  }

  static Color _facultyBackground(String name) {
    if (name.contains('Medicine')) return AppColors.pastelRed;
    if (name.contains('Computer')) return AppColors.pastelOrange;
    if (name.contains('Economics')) return AppColors.pastelBlue;
    if (name.contains('Engineering')) return AppColors.pastelGreen;
    return AppColors.pastelPurple;
  }

  static String _durationFor(String department) {
    if (department.contains('Medicine') || department.contains('MBBS')) {
      return '6 yrs';
    }
    if (department.contains('Engineering') ||
        department.contains('Veterinary')) {
      return '5 yrs';
    }
    return '4 yrs';
  }
}

class _DepartmentRow extends StatelessWidget {
  const _DepartmentRow({
    required this.title,
    required this.years,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String years;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 12),
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: Row(
          children: [
            Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: selected ? AppColors.justGreen : Colors.transparent,
                border: Border.all(
                  color:
                      selected ? AppColors.justGreen : const Color(0xFFB9C3D4),
                ),
              ),
              child: selected
                  ? const Center(
                      child: CircleAvatar(
                          radius: 3, backgroundColor: Colors.white),
                    )
                  : null,
            ),
            const SizedBox(width: 11),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  color: selected ? AppColors.justGreen : AppColors.text,
                  fontSize: 12,
                  fontWeight: selected ? FontWeight.w900 : FontWeight.w700,
                ),
              ),
            ),
            Text(
              years,
              style: const TextStyle(
                color: AppColors.mutedText,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RequiredLabel extends StatelessWidget {
  const _RequiredLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(text: text),
          const TextSpan(
            text: ' *',
            style: TextStyle(color: AppColors.danger),
          ),
        ],
      ),
      style: const TextStyle(
        color: Color(0xFF34405A),
        fontSize: 12,
        fontWeight: FontWeight.w900,
      ),
    );
  }
}

class _SegmentedMode extends StatelessWidget {
  const _SegmentedMode({required this.value, required this.onChanged});

  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 42,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F3FA),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          _ModeButton(
            label: 'Full Time',
            selected: value == 'Full Time',
            onTap: () => onChanged('Full Time'),
          ),
          _ModeButton(
            label: 'Part Time',
            selected: value == 'Part Time',
            onTap: () => onChanged('Part Time'),
          ),
        ],
      ),
    );
  }
}

class _ModeButton extends StatelessWidget {
  const _ModeButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? AppColors.primaryBlue : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            boxShadow: selected ? AppShadows.card : null,
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : AppColors.mutedText,
              fontSize: 12,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ),
    );
  }
}

class _SelectedProgramCard extends StatelessWidget {
  const _SelectedProgramCard({required this.draft});

  final ApplicationDraft draft;

  @override
  Widget build(BuildContext context) {
    final rows = [
      ('Faculty', draft.faculty),
      ('Department', draft.department),
      ('Duration', '4 years'),
      ('Study mode', draft.studyMode),
      ('Monthly fee', '\$45'),
      ('Admission fee', '\$25'),
      ('Campus', 'Campus 1 \u{00B7} Mogadishu'),
    ];

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFAED6A3)),
        borderRadius: BorderRadius.circular(13),
      ),
      child: Column(
        children: [
          for (var index = 0; index < rows.length; index++)
            _SummaryRow(
              label: rows[index].$1,
              value: rows[index].$2,
              divider: index != rows.length - 1,
            ),
        ],
      ),
    );
  }
}

class _PaymentPlanCard extends StatelessWidget {
  const _PaymentPlanCard({
    required this.badge,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.selected,
    required this.onTap,
  });

  final String badge;
  final String title;
  final String subtitle;
  final String amount;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(13),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(
            color: selected ? AppColors.justGreen : AppColors.border,
            width: selected ? 1.5 : 1,
          ),
          borderRadius: BorderRadius.circular(13),
          boxShadow: AppShadows.card,
        ),
        child: Row(
          children: [
            _PlanBadge(text: badge),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: AppColors.text,
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: AppColors.mutedText,
                      fontSize: 10,
                      height: 1.2,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            Text(
              amount,
              style: const TextStyle(
                color: AppColors.primaryBlue,
                fontSize: 13,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(width: 9),
            _RadioDot(selected: selected),
          ],
        ),
      ),
    );
  }
}

class _ReviewApplicationStep extends StatelessWidget {
  const _ReviewApplicationStep({
    required this.draft,
    required this.confirmedInfo,
    required this.agreedTerms,
    required this.onConfirmChanged,
    required this.onTermsChanged,
  });

  final ApplicationDraft draft;
  final bool confirmedInfo;
  final bool agreedTerms;
  final ValueChanged<bool> onConfirmChanged;
  final ValueChanged<bool> onTermsChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Confirm that all information is correct before\nsubmission.',
          style: TextStyle(
            color: AppColors.mutedText,
            fontSize: 12,
            height: 1.45,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 14),
        _ReviewDetailCard(
          icon: '\u{1F464}',
          background: AppColors.pastelPurple,
          title: 'Personal details',
          rows: [
            ('Full name', draft.fullName),
            ('Mother\u{2019}s name', draft.motherName),
            ('Roll number', draft.rollNumber),
            (
              'Date of birth',
              '${draft.dateOfBirth} \u{00B7} ${draft.placeOfBirth}',
            ),
            ('Phone', draft.phone),
          ],
        ),
        const SizedBox(height: 10),
        const _ReviewTile(
          icon: '\u{1F6A8}',
          background: AppColors.pastelRed,
          title: 'Emergency contact',
        ),
        const SizedBox(height: 10),
        const _ReviewTile(
          icon: '\u{1F3EB}',
          background: AppColors.pastelGreen,
          title: 'School information',
        ),
        const SizedBox(height: 10),
        const _ReviewTile(
          icon: '\u{1F4DA}',
          background: AppColors.pastelOrange,
          title: 'Program & payment plan',
        ),
        const SizedBox(height: 10),
        _UploadDocumentsTile(draft: draft),
        const SizedBox(height: 12),
        _ConfirmationCard(
          confirmedInfo: confirmedInfo,
          agreedTerms: agreedTerms,
          onConfirmChanged: onConfirmChanged,
          onTermsChanged: onTermsChanged,
        ),
      ],
    );
  }
}

class _ReviewDetailCard extends StatelessWidget {
  const _ReviewDetailCard({
    required this.icon,
    required this.background,
    required this.title,
    required this.rows,
  });

  final String icon;
  final Color background;
  final String title;
  final List<(String, String)> rows;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(13),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        children: [
          Row(
            children: [
              _SmallIcon(icon: icon, background: background, size: 36),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '$title \u{2713}',
                  style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const _EditPill(),
            ],
          ),
          const SizedBox(height: 10),
          for (var index = 0; index < rows.length; index++)
            _SummaryRow(
              label: rows[index].$1,
              value: rows[index].$2,
              divider: index != rows.length - 1,
            ),
        ],
      ),
    );
  }
}

class _ReviewTile extends StatelessWidget {
  const _ReviewTile({
    required this.icon,
    required this.background,
    required this.title,
  });

  final String icon;
  final Color background;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(13),
        boxShadow: AppShadows.card,
      ),
      child: Row(
        children: [
          _SmallIcon(icon: icon, background: background, size: 36),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              '$title \u{2713}',
              style: const TextStyle(
                color: AppColors.text,
                fontSize: 13,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const _EditPill(),
        ],
      ),
    );
  }
}

class _UploadDocumentsTile extends StatelessWidget {
  const _UploadDocumentsTile({required this.draft});

  final ApplicationDraft draft;

  @override
  Widget build(BuildContext context) {
    final certificateReady = !draft.hasCertificate || draft.certificateUploaded;
    final complete = draft.applicantPhotoUploaded && certificateReady;
    final subtitle = draft.hasCertificate
        ? 'Photo ${draft.applicantPhotoUploaded ? "ready" : "missing"} \u{00B7} Certificate ${draft.certificateUploaded ? "ready" : "missing"}'
        : 'Photo ${draft.applicantPhotoUploaded ? "ready" : "missing"} \u{00B7} Appointment selected';

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(
          color: complete ? AppColors.border : const Color(0xFFFFC56C),
        ),
        borderRadius: BorderRadius.circular(13),
      ),
      child: Row(
        children: [
          const _SmallIcon(
            icon: '\u{1F4CE}',
            background: AppColors.pastelOrange,
            size: 36,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Uploaded documents',
                  style: TextStyle(
                    color: AppColors.text,
                    fontSize: 13,
                    height: 1.2,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: AppColors.mutedText,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          _StatusPill(
            text: complete ? 'Complete' : 'Missing',
            color: complete ? AppColors.primaryBlue : const Color(0xFFB87500),
            background:
                complete ? AppColors.pastelBlue : AppColors.pastelOrange,
          ),
        ],
      ),
    );
  }
}

class _ConfirmationCard extends StatelessWidget {
  const _ConfirmationCard({
    required this.confirmedInfo,
    required this.agreedTerms,
    required this.onConfirmChanged,
    required this.onTermsChanged,
  });

  final bool confirmedInfo;
  final bool agreedTerms;
  final ValueChanged<bool> onConfirmChanged;
  final ValueChanged<bool> onTermsChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(13),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        children: [
          _CheckLine(
            value: confirmedInfo,
            onChanged: onConfirmChanged,
            text:
                'I confirm that the information provided\nis accurate and complete.',
          ),
          const SizedBox(height: 10),
          _CheckLine(
            value: agreedTerms,
            onChanged: onTermsChanged,
            richText: const TextSpan(
              children: [
                TextSpan(text: 'I agree to the '),
                TextSpan(
                  text: 'university admission\nterms',
                  style: TextStyle(
                    color: AppColors.primaryBlue,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                TextSpan(text: ' and '),
                TextSpan(
                  text: 'privacy notice.',
                  style: TextStyle(
                    color: AppColors.primaryBlue,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CheckLine extends StatelessWidget {
  const _CheckLine({
    required this.value,
    required this.onChanged,
    this.text,
    this.richText,
  });

  final bool value;
  final ValueChanged<bool> onChanged;
  final String? text;
  final TextSpan? richText;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => onChanged(!value),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 19,
            height: 19,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(5),
              border: Border.all(color: const Color(0xFFB9C3D4)),
              color: value ? AppColors.justGreen : Colors.white,
            ),
            child: value
                ? const Icon(Icons.check, color: Colors.white, size: 14)
                : null,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: richText == null
                ? Text(
                    text ?? '',
                    style: const TextStyle(
                      color: Color(0xFF44516A),
                      fontSize: 12,
                      height: 1.3,
                      fontWeight: FontWeight.w600,
                    ),
                  )
                : RichText(
                    text: TextSpan(
                      style: const TextStyle(
                        color: Color(0xFF44516A),
                        fontSize: 12,
                        height: 1.3,
                        fontWeight: FontWeight.w600,
                      ),
                      children: richText!.children,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _PlaceholderStep extends StatelessWidget {
  const _PlaceholderStep({required this.step});

  final int step;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(13),
        border: Border.all(color: AppColors.border),
      ),
      child: Text(
        'Application step ${step + 1}',
        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
      ),
    );
  }
}

class _FieldBox extends StatelessWidget {
  const _FieldBox({
    required this.label,
    required this.value,
    this.hint,
    this.icon,
    this.trailing,
    this.required = false,
    this.muted = false,
    this.success = false,
    this.onTap,
    this.keyboardType,
    this.maxLength,
    this.inputFormatters,
    this.onChanged,
  });

  final String label;
  final String value;
  final String? hint;
  final String? icon;
  final IconData? trailing;
  final bool required;
  final bool muted;
  final bool success;
  final VoidCallback? onTap;
  final TextInputType? keyboardType;
  final int? maxLength;
  final List<TextInputFormatter>? inputFormatters;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    final borderColor = success ? AppColors.justGreen : const Color(0xFFD5DCE8);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text.rich(
          TextSpan(
            children: [
              TextSpan(text: label),
              if (required)
                const TextSpan(
                  text: ' *',
                  style: TextStyle(color: AppColors.danger),
                ),
            ],
          ),
          style: const TextStyle(
            color: Color(0xFF34405A),
            fontSize: 12,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 7),
        if (onChanged == null)
          InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: onTap,
            child: Container(
              height: 46,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: borderColor),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  if (icon != null) ...[
                    Text(icon!, style: const TextStyle(fontSize: 14)),
                    const SizedBox(width: 8),
                  ],
                  Expanded(
                    child: Text(
                      value.isEmpty ? (hint ?? '') : value,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: muted && value.isEmpty
                            ? const Color(0xFFAAB2C0)
                            : AppColors.text,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (trailing != null)
                    Icon(trailing, color: AppColors.mutedText, size: 18),
                ],
              ),
            ),
          )
        else
          SizedBox(
            height: 46,
            child: TextFormField(
              initialValue: value,
              onChanged: onChanged,
              keyboardType: keyboardType,
              maxLength: maxLength,
              inputFormatters: inputFormatters,
              style: const TextStyle(
                color: AppColors.text,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
              decoration: InputDecoration(
                hintText: hint,
                hintStyle: const TextStyle(
                  color: Color(0xFFAAB2C0),
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
                prefixIcon: icon == null
                    ? null
                    : Center(
                        widthFactor: 1,
                        child: Padding(
                          padding: const EdgeInsets.only(left: 12, right: 8),
                          child: Text(
                            icon!,
                            style: const TextStyle(fontSize: 14),
                          ),
                        ),
                      ),
                suffixIcon: trailing == null
                    ? null
                    : Icon(trailing, color: AppColors.mutedText, size: 18),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 13,
                ),
                counterText: '',
                filled: true,
                fillColor: Colors.white,
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: borderColor),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: borderColor, width: 1.2),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _SegmentedChoice extends StatelessWidget {
  const _SegmentedChoice({
    required this.labels,
    required this.selected,
    this.onChanged,
  });

  final List<String> labels;
  final String selected;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 42,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F3FA),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: labels.map((label) {
          final isSelected = label == selected;
          return Expanded(
            child: InkWell(
              borderRadius: BorderRadius.circular(8),
              onTap: () => onChanged?.call(label),
              child: Container(
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color:
                      isSelected ? AppColors.primaryBlue : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: isSelected ? AppShadows.card : null,
                ),
                child: Text(
                  label,
                  style: TextStyle(
                    color: isSelected ? Colors.white : AppColors.mutedText,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _ChipWrap extends StatelessWidget {
  const _ChipWrap({
    required this.options,
    required this.selected,
    this.onChanged,
  });

  final List<String> options;
  final String selected;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: options.map((option) {
        final isSelected = option == selected;
        return InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: () => onChanged?.call(option),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            decoration: BoxDecoration(
              color: isSelected ? AppColors.pastelGreen : Colors.white,
              border: Border.all(
                color:
                    isSelected ? AppColors.justGreen : const Color(0xFFD5DCE8),
              ),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              isSelected ? '\u{2713} $option' : option,
              style: TextStyle(
                color:
                    isSelected ? AppColors.justGreen : const Color(0xFF34405A),
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _CertificateUploadCard extends StatelessWidget {
  const _CertificateUploadCard({
    required this.uploaded,
    required this.fileName,
    required this.onTap,
  });

  final bool uploaded;
  final String fileName;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return _DocumentUploadCard(
      icon: '\u{1F393}',
      background: AppColors.pastelGreen,
      title: 'Secondary-school certificate',
      subtitle:
          fileName.isEmpty ? 'PDF, JPG or PNG \u{00B7} max 10 MB' : fileName,
      actionText:
          uploaded ? 'Certificate uploaded' : 'Tap to choose your certificate',
      uploaded: uploaded,
      onTap: onTap,
    );
  }
}

class _DocumentUploadCard extends StatelessWidget {
  const _DocumentUploadCard({
    required this.icon,
    required this.background,
    required this.title,
    required this.subtitle,
    required this.actionText,
    required this.uploaded,
    required this.onTap,
  });

  final String icon;
  final Color background;
  final String title;
  final String subtitle;
  final String actionText;
  final bool uploaded;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(13),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(
            color: uploaded ? AppColors.justGreen : AppColors.border,
            width: uploaded ? 1.4 : 1,
          ),
          borderRadius: BorderRadius.circular(13),
          boxShadow: AppShadows.card,
        ),
        child: Column(
          children: [
            Row(
              children: [
                _SmallIcon(
                  icon: icon,
                  background: background,
                  size: 36,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          color: AppColors.text,
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: const TextStyle(
                          color: AppColors.mutedText,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                if (uploaded)
                  const Icon(
                    Icons.check_circle,
                    color: AppColors.justGreen,
                    size: 20,
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: uploaded ? AppColors.pastelGreen : Colors.white,
                border: Border.all(
                  color:
                      uploaded ? AppColors.justGreen : const Color(0xFFB9C3D4),
                ),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                children: [
                  Icon(
                    uploaded ? Icons.check : Icons.upload_file,
                    color: uploaded
                        ? AppColors.justGreen
                        : const Color(0xFF4B95E8),
                    size: 22,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    actionText,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: uploaded
                          ? AppColors.justGreen
                          : AppColors.primaryBlue,
                      fontSize: 11,
                      height: 1.25,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  if (!uploaded) ...[
                    const SizedBox(height: 2),
                    const Text(
                      'choose a file from your phone',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: AppColors.mutedText,
                        fontSize: 11,
                        height: 1.25,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AppointmentCard extends StatelessWidget {
  const _AppointmentCard({required this.draft, required this.onChanged});

  final ApplicationDraft draft;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.pastelOrange,
            border: Border.all(color: const Color(0xFFFFC56C)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('\u{1F3DB}\u{FE0F}', style: TextStyle(fontSize: 17)),
              SizedBox(width: 10),
              Expanded(
                child: Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: 'Office visit may be required\n',
                        style: TextStyle(fontWeight: FontWeight.w900),
                      ),
                      TextSpan(
                        text:
                            'Since you don\u{2019}t have a certificate yet,\nchoose an appointment to visit the\nadmission office for verification.',
                      ),
                    ],
                  ),
                  style: TextStyle(
                    color: Color(0xFF9A6100),
                    fontSize: 12,
                    height: 1.25,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _FieldBox(
                label: 'Appointment Date',
                value: draft.appointmentDate,
                hint: 'YYYY-MM-DD',
                required: true,
                trailing: Icons.calendar_month,
                onTap: () async {
                  final selectedDate = await showDatePicker(
                    context: context,
                    initialDate: _parseDateOrDefault(draft.appointmentDate),
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                    helpText: 'Select appointment date',
                  );
                  if (selectedDate == null) return;
                  draft.appointmentDate = _formatDate(selectedDate);
                  onChanged();
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _FieldBox(
                label: 'Appointment Time',
                value: draft.appointmentTime,
                hint: '09:00',
                required: true,
                trailing: Icons.keyboard_arrow_down,
                onTap: () async {
                  final selectedTime = await showTimePicker(
                    context: context,
                    initialTime: _parseTimeOrDefault(draft.appointmentTime),
                    helpText: 'Select appointment time',
                  );
                  if (selectedTime == null) return;
                  draft.appointmentTime = _formatTime(selectedTime);
                  onChanged();
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  static DateTime _parseDateOrDefault(String value) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final parsed = DateTime.tryParse(value);
    if (parsed == null || parsed.isBefore(today)) return today;
    return parsed;
  }

  static String _formatDate(DateTime date) {
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    return '${date.year}-$month-$day';
  }

  static TimeOfDay _parseTimeOrDefault(String value) {
    final parts = value.split(':');
    if (parts.length == 2) {
      final hour = int.tryParse(parts[0]);
      final minute = int.tryParse(parts[1]);
      if (hour != null &&
          minute != null &&
          hour >= 0 &&
          hour <= 23 &&
          minute >= 0 &&
          minute <= 59) {
        return TimeOfDay(hour: hour, minute: minute);
      }
    }
    return const TimeOfDay(hour: 9, minute: 0);
  }

  static String _formatTime(TimeOfDay time) {
    final hour = time.hour.toString().padLeft(2, '0');
    final minute = time.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }
}

class _WizardBottomBar extends StatelessWidget {
  const _WizardBottomBar({
    required this.canBack,
    required this.nextLabel,
    required this.nextEnabled,
    required this.onBack,
    required this.onSave,
    required this.onNext,
  });

  final bool canBack;
  final String nextLabel;
  final bool nextEnabled;
  final VoidCallback onBack;
  final VoidCallback onSave;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 44,
            height: 42,
            child: TextButton(
              onPressed: onBack,
              style: TextButton.styleFrom(
                backgroundColor: const Color(0xFFF0F3FA),
                foregroundColor: AppColors.primaryBlue,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(13),
                ),
              ),
              child: const Text(
                '\u{2039}',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
              ),
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 92,
            height: 42,
            child: OutlinedButton(
              onPressed: onSave,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primaryBlue,
                side: const BorderSide(color: Color(0xFFB8C7E8)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(13),
                ),
              ),
              child: const Text(
                'Save draft',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: SizedBox(
              height: 42,
              child: ElevatedButton(
                onPressed: nextEnabled ? onNext : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryBlue,
                  disabledBackgroundColor: const Color(0xFFCCD3DF),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(13),
                  ),
                ),
                child: Text(
                  nextLabel,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({
    required this.icon,
    required this.background,
    required this.title,
  });

  final String icon;
  final Color background;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _SmallIcon(icon: icon, background: background, size: 32),
        const SizedBox(width: 10),
        Text(
          title,
          style: const TextStyle(
            color: AppColors.text,
            fontSize: 17,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
    required this.divider,
  });

  final String label;
  final String value;
  final bool divider;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        border: divider
            ? const Border(bottom: BorderSide(color: AppColors.border))
            : null,
      ),
      child: Row(
        children: [
          SizedBox(
            width: 96,
            child: Text(
              label,
              style: const TextStyle(
                color: AppColors.mutedText,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.text,
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SmallIcon extends StatelessWidget {
  const _SmallIcon({
    required this.icon,
    required this.background,
    this.size = 30,
  });

  final String icon;
  final Color background;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(9),
      ),
      child: Center(child: Text(icon, style: const TextStyle(fontSize: 15))),
    );
  }
}

class _PlanBadge extends StatelessWidget {
  const _PlanBadge({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: AppColors.pastelGreen,
        borderRadius: BorderRadius.circular(9),
      ),
      child: Center(
        child: Text(
          text,
          style: const TextStyle(
            color: AppColors.justGreen,
            fontSize: 12,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}

class _RadioDot extends StatelessWidget {
  const _RadioDot({required this.selected});

  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 19,
      height: 19,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: selected ? AppColors.justGreen : Colors.white,
        border: Border.all(
          color: selected ? AppColors.justGreen : const Color(0xFFB9C3D4),
          width: selected ? 5 : 1.2,
        ),
      ),
    );
  }
}

class _EditPill extends StatelessWidget {
  const _EditPill();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: AppColors.pastelBlue,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Text(
        'Edit',
        style: TextStyle(
          color: AppColors.primaryBlue,
          fontSize: 11,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({
    required this.text,
    this.color = AppColors.primaryBlue,
    this.background = AppColors.pastelBlue,
  });

  final String text;
  final Color color;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}
