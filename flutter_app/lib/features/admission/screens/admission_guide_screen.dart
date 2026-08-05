import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_theme.dart';
import '../models/admission_models.dart';
import 'application_wizard_screen.dart';

class AdmissionGuideScreen extends StatefulWidget {
  const AdmissionGuideScreen({super.key, required this.draft});

  final ApplicationDraft draft;

  @override
  State<AdmissionGuideScreen> createState() => _AdmissionGuideScreenState();
}

class _AdmissionGuideScreenState extends State<AdmissionGuideScreen> {
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
              const _SimpleHeader(title: 'Admission Requirements'),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
                  children: const [
                    _BeforeApplyBanner(),
                    SizedBox(height: 20),
                    _BlockTitle(
                      icon: '\u{1F393}',
                      background: AppColors.pastelGreen,
                      title: 'Education',
                    ),
                    SizedBox(height: 10),
                    _InfoTable(
                      rows: [
                        _InfoRow(
                          'Completed Secondary School Certificate',
                          'Required',
                        ),
                        _InfoRow(
                          'Accredited by the Ministry of Higher Education',
                          'Required',
                        ),
                      ],
                    ),
                    SizedBox(height: 20),
                    _BlockTitle(
                      icon: '\u{1F4DC}',
                      background: AppColors.pastelBlue,
                      title: 'Certificate',
                    ),
                    SizedBox(height: 10),
                    _InfoTable(
                      rows: [
                        _InfoRow(
                          'Original Secondary School Leaving Certificate',
                          'Required',
                        ),
                        _InfoRow('Certificate photocopies', '2 copies'),
                      ],
                    ),
                    SizedBox(height: 20),
                    _BlockTitle(
                      icon: '\u{1F4F7}',
                      background: AppColors.pastelOrange,
                      title: 'Passport photos',
                    ),
                    SizedBox(height: 10),
                    _InfoTable(
                      rows: [
                        _InfoRow('Passport-size photos', '4 photos'),
                        _InfoRow('Photo background', 'White'),
                      ],
                    ),
                    SizedBox(height: 20),
                    _BlockTitle(
                      icon: '\u{1F4B5}',
                      background: AppColors.pastelPurple,
                      title: 'Registration fee',
                    ),
                    SizedBox(height: 10),
                    _InfoTable(
                      rows: [
                        _InfoRow('All faculties and programs', '\$25'),
                        _InfoRow('Registration fee', 'Non-refundable'),
                      ],
                    ),
                    SizedBox(height: 20),
                    _BlockTitle(
                      icon: '\u{1F4BC}',
                      background: AppColors.pastelRed,
                      title: 'Part-time applicants',
                    ),
                    SizedBox(height: 10),
                    _InfoTable(
                      rows: [
                        _InfoRow('Work experience', '2 years recommended'),
                        _InfoRow(
                          'Time management & employer support',
                          'May be required',
                        ),
                      ],
                    ),
                    SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/* replaced by stateful list above */
/*
                  children: const [
                    _BeforeApplyBanner(),
                    SizedBox(height: 20),
                    _BlockTitle(
                      icon: '\u{1F464}',
                      background: AppColors.pastelBlue,
                      title: 'Personal information',
                    ),
                    SizedBox(height: 10),
                    _InfoTable(
                      rows: [
                        _InfoRow(
                            'Full name & mother\u{2019}s name', 'Required'),
                        _InfoRow('Date & place of birth', 'Required'),
                        _InfoRow('Nationality & national ID', 'If available'),
                        _InfoRow('Phone, email & district', 'Required'),
                        _InfoRow('Applicant photo', 'Required'),
                      ],
                    ),
                    SizedBox(height: 20),
                    _BlockTitle(
                      icon: '\u{1F3EB}',
                      background: AppColors.pastelGreen,
                      title: 'Education information',
                    ),
                    SizedBox(height: 10),
                    _InfoTable(
                      rows: [
                        _InfoRow('Secondary-school name', 'Required'),
                        _InfoRow('School district', 'Required'),
                        _InfoRow('Graduation year & passing grade', 'Required'),
                        _InfoRow('Certificate status', 'Required'),
                      ],
                    ),
                    SizedBox(height: 20),
                    _BlockTitle(
                      icon: '\u{1F4CE}',
                      background: AppColors.pastelOrange,
                      title: 'Required documents',
                    ),
                    SizedBox(height: 10),
                    _InfoTable(
                      rows: [
                        _InfoRow('Passport-size photo', 'JPG / PNG'),
                        _InfoRow('Secondary-school certificate', 'PDF / JPG'),
                        _InfoRow(
                            'National ID or identity document', 'PDF / JPG'),
                        _InfoRow('Other supporting documents', 'Optional'),
                      ],
                    ),
                    SizedBox(height: 20),
                    _BlockTitle(
                      icon: '\u{1F9ED}',
                      background: AppColors.pastelPurple,
                      title: 'Admission process',
                    ),
                    SizedBox(height: 10),
                    _ProcessStep(
                      number: '1',
                      color: AppColors.primaryBlue,
                      background: AppColors.pastelBlue,
                      title: 'Complete application',
                      subtitle: 'Personal, emergency & school details',
                    ),
                    SizedBox(height: 10),
                    _ProcessStep(
                      number: '2',
                      color: AppColors.justGreen,
                      background: AppColors.pastelGreen,
                      title: 'Upload documents',
                      subtitle: 'Photo, certificate & ID',
                    ),
                    SizedBox(height: 10),
                    _ProcessStep(
                      number: '3',
                      color: AppColors.warning,
                      background: AppColors.pastelOrange,
                      title: 'Select program',
                      subtitle: 'Faculty, department & study mode',
                    ),
                    SizedBox(height: 10),
                    _ProcessStep(
                      number: '4',
                      color: Color(0xFFB73FD2),
                      background: AppColors.pastelPurple,
                      title: 'Review & pay fee',
                      subtitle: 'Confirm details and pay admission fee',
                    ),
                    SizedBox(height: 10),
                    _ProcessStep(
                      number: '5',
                      color: AppColors.danger,
                      background: AppColors.pastelRed,
                      title: 'Submit & track',
                      subtitle: 'Follow your application status',
                    ),
                    SizedBox(height: 16),
                    _AgreementText(),
                    SizedBox(height: 84),
                  ],
                ),
              ),
              _GuideBottomBar(draft: draft),
            ],
          ),
        ),
      ),
    );
  }
}
*/

class _SimpleHeader extends StatelessWidget {
  const _SimpleHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 68,
      color: AppColors.primaryBlue,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.of(context).maybePop(),
            icon: const Icon(Icons.chevron_left, color: Colors.white, size: 25),
          ),
          Expanded(
            child: Text(
              title,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 17,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: 48),
        ],
      ),
    );
  }
}

class _BeforeApplyBanner extends StatelessWidget {
  const _BeforeApplyBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primaryBlue,
        borderRadius: BorderRadius.circular(14),
      ),
      child: const Row(
        children: [
          _EmojiBadge(
            icon: '\u{1F4CB}',
            background: Color(0xFF6A7FC8),
            size: 44,
          ),
          SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Before You Apply',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Official requirements published by\nJamhuriya University',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    height: 1.2,
                    fontWeight: FontWeight.w700,
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

class _BlockTitle extends StatelessWidget {
  const _BlockTitle({
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
        _EmojiBadge(icon: icon, background: background, size: 32, fontSize: 15),
        const SizedBox(width: 10),
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
      ],
    );
  }
}

class _InfoTable extends StatelessWidget {
  const _InfoTable({required this.rows});

  final List<_InfoRow> rows;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(13),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        children: [
          for (var index = 0; index < rows.length; index++)
            _InfoLine(
              row: rows[index],
              showDivider: index != rows.length - 1,
            ),
        ],
      ),
    );
  }
}

class _InfoLine extends StatelessWidget {
  const _InfoLine({required this.row, required this.showDivider});

  final _InfoRow row;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      decoration: BoxDecoration(
        border: showDivider
            ? const Border(bottom: BorderSide(color: AppColors.border))
            : null,
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              row.label,
              style: const TextStyle(
                color: AppColors.mutedText,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Flexible(
            child: Text(
              row.value,
              textAlign: TextAlign.right,
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

class _InfoRow {
  const _InfoRow(this.label, this.value);

  final String label;
  final String value;
}

class _ProcessStep extends StatelessWidget {
  const _ProcessStep({
    required this.number,
    required this.color,
    required this.background,
    required this.title,
    required this.subtitle,
  });

  final String number;
  final Color color;
  final Color background;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(13, 12, 13, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(13),
        boxShadow: AppShadows.card,
      ),
      child: Row(
        children: [
          _NumberBadge(number: number, color: color, background: background),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: AppColors.mutedText,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
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

class _AgreementText extends StatelessWidget {
  const _AgreementText({required this.checked, required this.onTap});

  final bool checked;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _CheckBadge(checked: checked),
          const SizedBox(width: 10),
          const Expanded(
            child: Text(
              'I have read and understood the admission\nrequirements',
              style: TextStyle(
                color: Color(0xFF44516A),
                fontSize: 13,
                height: 1.25,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GuideBottomBar extends StatelessWidget {
  const _GuideBottomBar({required this.draft, required this.enabled});

  final ApplicationDraft draft;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: Row(
        children: [
          Expanded(
            child: SizedBox(
              height: 44,
              child: TextButton(
                onPressed: () {},
                style: TextButton.styleFrom(
                  backgroundColor: const Color(0xFFF0F3FA),
                  foregroundColor: AppColors.primaryBlue,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(13),
                  ),
                ),
                child: const Text(
                  'Save for later',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            flex: 1,
            child: SizedBox(
              height: 44,
              child: ElevatedButton(
                onPressed: enabled
                    ? () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => ApplicationWizardScreen(
                              draft: draft,
                              initialStep: 1,
                            ),
                          ),
                        )
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.justGreen,
                  disabledBackgroundColor: const Color(0xFFCCD3DF),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(13),
                  ),
                ),
                child: const Text(
                  'Start application \u{2192}',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmojiBadge extends StatelessWidget {
  const _EmojiBadge({
    required this.icon,
    required this.background,
    required this.size,
    this.fontSize = 19,
  });

  final String icon;
  final Color background;
  final double size;
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Center(
        child: Text(
          icon,
          style: TextStyle(fontSize: fontSize),
        ),
      ),
    );
  }
}

class _NumberBadge extends StatelessWidget {
  const _NumberBadge({
    required this.number,
    required this.color,
    required this.background,
  });

  final String number;
  final Color color;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(9),
      ),
      child: Center(
        child: Text(
          number,
          style: TextStyle(
            color: color,
            fontSize: 15,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}

class _CheckBadge extends StatelessWidget {
  const _CheckBadge({required this.checked});

  final bool checked;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 19,
      height: 19,
      decoration: BoxDecoration(
        color: checked ? AppColors.success : Colors.white,
        border:
            Border.all(color: checked ? AppColors.success : AppColors.border),
        borderRadius: BorderRadius.circular(5),
      ),
      child: checked
          ? const Icon(Icons.check, color: Colors.white, size: 14)
          : null,
    );
  }
}
