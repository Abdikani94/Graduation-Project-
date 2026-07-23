import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_theme.dart';
import '../data/admission_repository.dart';
import '../models/admission_models.dart';

class AcademicProgramsScreen extends StatelessWidget {
  const AcademicProgramsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final faculties = const AdmissionRepository().fallbackFaculties();

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: AppColors.background,
        statusBarIconBrightness: Brightness.dark,
        statusBarBrightness: Brightness.light,
      ),
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 22),
            children: [
              Row(
                children: [
                  _BackButtonBox(onTap: () => Navigator.of(context).maybePop()),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Academic Programs',
                          style: TextStyle(
                            color: AppColors.text,
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Explore our faculties',
                          style: TextStyle(
                            color: AppColors.mutedText,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              const _ProgramsHero(),
              const SizedBox(height: 18),
              const _ProgramsTitle(),
              const SizedBox(height: 12),
              ...List.generate(
                faculties.length,
                (index) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _FacultyProgramCard(
                    index: index + 1,
                    faculty: faculties[index],
                    accent: _accentFor(index),
                    background: _backgroundFor(index),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static Color _accentFor(int index) {
    const colors = [
      AppColors.danger,
      AppColors.warning,
      AppColors.primaryBlue,
      AppColors.justGreen,
      Color(0xFFBC35D4),
    ];
    return colors[index % colors.length];
  }

  static Color _backgroundFor(int index) {
    const colors = [
      AppColors.pastelRed,
      AppColors.pastelOrange,
      AppColors.pastelBlue,
      AppColors.pastelGreen,
      AppColors.pastelPurple,
    ];
    return colors[index % colors.length];
  }
}

class _BackButtonBox extends StatelessWidget {
  const _BackButtonBox({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.border),
            borderRadius: BorderRadius.circular(10),
            boxShadow: AppShadows.card,
          ),
          child: const Icon(
            Icons.chevron_left,
            color: AppColors.justGreen,
            size: 22,
          ),
        ),
      ),
    );
  }
}

class _ProgramsHero extends StatelessWidget {
  const _ProgramsHero();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
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
          _EmojiSquare(
            icon: '\u{1F4D6}',
            background: Color(0xFF6E9CD0),
            size: 46,
          ),
          SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Academic Programs',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Review departments of each faculty',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
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

class _ProgramsTitle extends StatelessWidget {
  const _ProgramsTitle();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        _EmojiSquare(
          icon: '\u{1F5C2}\u{FE0F}',
          background: AppColors.pastelBlue,
          size: 32,
          fontSize: 15,
        ),
        SizedBox(width: 10),
        Text(
          'Programs classification',
          style: TextStyle(
            color: AppColors.text,
            fontSize: 17,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }
}

class _FacultyProgramCard extends StatelessWidget {
  const _FacultyProgramCard({
    required this.index,
    required this.faculty,
    required this.accent,
    required this.background,
  });

  final int index;
  final Faculty faculty;
  final Color accent;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(13),
        boxShadow: AppShadows.card,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(13),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.fromLTRB(13, 6, 12, 6),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          leading: _NumberBox(
            number: index.toString(),
            color: accent,
            background: background,
          ),
          title: Text(
            _displayName(faculty.name),
            style: const TextStyle(
              color: AppColors.text,
              fontSize: 14,
              height: 1.08,
              fontWeight: FontWeight.w900,
            ),
          ),
          subtitle: Text(
            '${faculty.departments.length} departments available',
            style: const TextStyle(
              color: AppColors.mutedText,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
          iconColor: accent,
          collapsedIconColor: accent,
          children: [
            for (var i = 0; i < faculty.departments.length; i++)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  border: i == faculty.departments.length - 1
                      ? null
                      : const Border(
                          bottom: BorderSide(color: AppColors.border),
                        ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.school_outlined, color: accent, size: 17),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            faculty.departments[i],
                            style: const TextStyle(
                              color: AppColors.text,
                              fontSize: 12,
                              height: 1.3,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '${_durationFor(faculty.departments[i])} • ${_studyModeFor(faculty.departments[i])}',
                            style: const TextStyle(
                              color: AppColors.mutedText,
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  static String _displayName(String name) {
    if (name == 'Medicine & Health Science') {
      return 'Medicine & Health\nSciences';
    }
    return name;
  }

  static String _durationFor(String program) =>
      program == 'Medicine & General Surgery' ? '7 years' : '5 years';

  static String _studyModeFor(String program) => const {
        'Computer Application',
        'Computer Network & Security',
        'Business Administration',
      }.contains(program)
          ? 'Full Time / Part Time'
          : 'Full Time only';
}

class _NumberBox extends StatelessWidget {
  const _NumberBox({
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
      width: 42,
      height: 42,
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(10),
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

class _EmojiSquare extends StatelessWidget {
  const _EmojiSquare({
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
        borderRadius: BorderRadius.circular(10),
      ),
      child: Center(
        child: Text(icon, style: TextStyle(fontSize: fontSize)),
      ),
    );
  }
}
