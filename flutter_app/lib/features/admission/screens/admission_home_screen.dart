import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_theme.dart';
import '../models/admission_models.dart';
import 'academic_programs_screen.dart';
import 'admission_chatbot_screen.dart';
import 'admission_guide_screen.dart';
import 'ai_program_advisor_screen.dart';
import 'application_status_screen.dart';

class AdmissionHomeScreen extends StatelessWidget {
  const AdmissionHomeScreen({
    super.key,
    required this.draft,
    this.onBack,
  });

  final ApplicationDraft draft;
  final VoidCallback? onBack;

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
              _AdmissionHeader(onBack: onBack),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
                  children: [
                    const _OnlineAdmissionBanner(),
                    const SizedBox(height: 18),
                    const _SectionLabel(),
                    const SizedBox(height: 12),
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: .86,
                      children: [
                        _AdmissionActionCard(
                          icon: '\u{1F4DD}',
                          iconBackground: AppColors.pastelGreen,
                          title: 'Start Application',
                          subtitle: 'Begin your online\nregistration',
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) =>
                                  AdmissionGuideScreen(draft: draft),
                            ),
                          ),
                        ),
                        _AdmissionActionCard(
                          icon: '\u{1F4DA}',
                          iconBackground: AppColors.pastelBlue,
                          title: 'Programs',
                          subtitle: 'Explore faculties and\ndepartments',
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const AcademicProgramsScreen(),
                            ),
                          ),
                        ),
                        _AdmissionActionCard(
                          icon: '\u{1F4CB}',
                          iconBackground: AppColors.pastelOrange,
                          title: 'Requirements',
                          subtitle: 'View required\ndocuments',
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => AdmissionGuideScreen(
                                draft: draft,
                              ),
                            ),
                          ),
                        ),
                        _AdmissionActionCard(
                          icon: '\u{2728}',
                          iconBackground: AppColors.pastelPurple,
                          title: 'AI Program\nAdvisor',
                          subtitle: 'Find a suitable\nprogram',
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const AiProgramAdvisorScreen(),
                            ),
                          ),
                        ),
                        _AdmissionActionCard(
                          icon: '\u{1F5E8}\u{FE0F}',
                          iconBackground: const Color(0xFFE6F8F3),
                          title: 'Admission\nChatbot',
                          subtitle: 'Ask admission\nquestions',
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const AdmissionChatbotScreen(),
                            ),
                          ),
                        ),
                        _AdmissionActionCard(
                          icon: '\u{1F50E}',
                          iconBackground: AppColors.pastelRed,
                          title: 'Track Application',
                          subtitle: 'Check application\nprogress',
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const ApplicationStatusScreen(),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    const _RegistrationNotice(),
                    const SizedBox(height: 12),
                    const _DemoButton('Demo: show returning-user state'),
                    const SizedBox(height: 9),
                    const _DemoButton('Demo: empty / error / offline states'),
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

class _AdmissionHeader extends StatelessWidget {
  const _AdmissionHeader({this.onBack});

  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 68,
      color: AppColors.primaryBlue,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Row(
        children: [
          IconButton(
            onPressed: onBack ?? () => Navigator.of(context).maybePop(),
            icon: const Icon(Icons.chevron_left, color: Colors.white, size: 26),
          ),
          const Expanded(
            child: Text(
              'Admission',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          IconButton(
            onPressed: () {},
            icon: const Text(
              '\u{1F514}',
              style: TextStyle(fontSize: 20),
            ),
          ),
        ],
      ),
    );
  }
}

class _OnlineAdmissionBanner extends StatelessWidget {
  const _OnlineAdmissionBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 16, 14, 16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF3E8FCA), Color(0xFF40972F)],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(14),
      ),
      child: const Row(
        children: [
          _EmojiBox(
            icon: '\u{1F393}',
            background: Color(0xFF6E9CD0),
            size: 46,
          ),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Online Admission',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                SizedBox(height: 3),
                Text(
                  'Apply to Jamhuriya University from\nanywhere',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    height: 1.22,
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

class _SectionLabel extends StatelessWidget {
  const _SectionLabel();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const _EmojiBox(
          icon: '\u{1F9ED}',
          background: Color(0xFFEAF4FF),
          size: 32,
          fontSize: 15,
        ),
        const SizedBox(width: 10),
        Text(
          'Get started',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppColors.text,
                fontWeight: FontWeight.w900,
                fontSize: 18,
              ),
        ),
      ],
    );
  }
}

class _AdmissionActionCard extends StatelessWidget {
  const _AdmissionActionCard({
    required this.icon,
    required this.iconBackground,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  final String icon;
  final Color iconBackground;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(13),
      child: InkWell(
        borderRadius: BorderRadius.circular(13),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.fromLTRB(10, 15, 10, 13),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(13),
            border: Border.all(color: AppColors.border),
            boxShadow: AppShadows.card,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _EmojiBox(
                icon: icon,
                background: iconBackground,
                size: 48,
                fontSize: 22,
              ),
              const SizedBox(height: 14),
              Text(
                title,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.text,
                  fontSize: 14,
                  height: 1.05,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.mutedText,
                  fontSize: 11,
                  height: 1.15,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RegistrationNotice extends StatelessWidget {
  const _RegistrationNotice();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(13, 12, 13, 12),
      decoration: BoxDecoration(
        color: const Color(0xFFEAF7FF),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFB9E0FF)),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('\u{1F5D3}\u{FE0F}', style: TextStyle(fontSize: 17)),
          SizedBox(width: 10),
          Expanded(
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: 'Registration is open\n',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF244A92),
                    ),
                  ),
                  TextSpan(
                    text:
                        'Semester 1 registration closes on 15 Sep\n2026. Apply early to secure your seat.',
                  ),
                ],
              ),
              style: TextStyle(
                color: Color(0xFF244A92),
                fontSize: 12,
                height: 1.35,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DemoButton extends StatelessWidget {
  const _DemoButton(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 36,
      child: TextButton(
        onPressed: () {},
        style: TextButton.styleFrom(
          backgroundColor: const Color(0xFFF0F3FA),
          foregroundColor: AppColors.primaryBlue,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(9),
          ),
          textStyle: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w900,
          ),
        ),
        child: Text(text),
      ),
    );
  }
}

class _EmojiBox extends StatelessWidget {
  const _EmojiBox({
    required this.icon,
    required this.background,
    required this.size,
    this.fontSize = 20,
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
        borderRadius: BorderRadius.circular(11),
      ),
      child: Center(
        child: Text(
          icon,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: fontSize,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}
