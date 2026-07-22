import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_theme.dart';

class AiProgramAdvisorScreen extends StatefulWidget {
  const AiProgramAdvisorScreen({super.key});

  @override
  State<AiProgramAdvisorScreen> createState() => _AiProgramAdvisorScreenState();
}

class _AiProgramAdvisorScreenState extends State<AiProgramAdvisorScreen> {
  int step = 0;
  final selected = <int, int>{};

  static const questions = [
    _AdvisorQuestion(
      title: 'Which subjects did you enjoy most in\nschool?',
      options: [
        'Mathematics & ICT',
        'Biology & Chemistry',
        'Business & Economics',
        'Physics & Technical drawing',
      ],
    ),
    _AdvisorQuestion(
      title: 'What kind of career interests you?',
      options: [
        'Technology & software',
        'Health & medicine',
        'Business & finance',
        'Engineering & construction',
      ],
    ),
    _AdvisorQuestion(
      title: 'What is your passing grade range?',
      options: [
        'A (85%+)',
        'B (70\u{2013}84%)',
        'C (55\u{2013}69%)',
        'Below 55%',
      ],
    ),
    _AdvisorQuestion(
      title: 'Which study mode do you prefer?',
      options: [
        'Full Time',
        'Part Time',
        'Not sure yet',
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final question = questions[step];
    final currentSelection = selected[step] ?? -1;
    final isLastStep = step == questions.length - 1;

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
              const _AdvisorHeader(title: 'AI Program Advisor'),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
                  children: [
                    const _AdvisorHero(),
                    const SizedBox(height: 18),
                    _ProgressCaption(step: step),
                    const SizedBox(height: 7),
                    _ProgressBar(step: step),
                    const SizedBox(height: 18),
                    Text(
                      question.title,
                      style: const TextStyle(
                        color: AppColors.text,
                        fontSize: 16,
                        height: 1.28,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 14),
                    ...List.generate(
                      question.options.length,
                      (index) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _AdvisorOption(
                          title: question.options[index],
                          selected: currentSelection == index,
                          onTap: () => setState(() => selected[step] = index),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    const _GuidanceNote(),
                    const SizedBox(height: 80),
                  ],
                ),
              ),
              _AdvisorBottomBar(
                enabled: currentSelection >= 0,
                label: isLastStep
                    ? 'See my recommendation \u{2728}'
                    : 'Continue \u{2192}',
                onBack: _goBack,
                onContinue: () => _goForward(isLastStep),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _goBack() {
    if (step == 0) {
      Navigator.of(context).maybePop();
      return;
    }

    setState(() => step--);
  }

  void _goForward(bool isLastStep) {
    if (isLastStep) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const AdvisorRecommendationScreen()),
      );
      return;
    }

    setState(() => step++);
  }
}

class AdvisorRecommendationScreen extends StatelessWidget {
  const AdvisorRecommendationScreen({super.key});

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
              const _AdvisorHeader(title: 'Recommendation'),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 22),
                  children: const [
                    _RecommendationHero(),
                    SizedBox(height: 18),
                    _WhyTitle(),
                    SizedBox(height: 12),
                    _WhyCard(),
                    SizedBox(height: 12),
                    _RecommendationTable(),
                    SizedBox(height: 12),
                    _InfoNotice(),
                    SizedBox(height: 12),
                    _ChooseProgramButton(),
                    SizedBox(height: 10),
                    _OtherRecommendationsButton(),
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

class _AdvisorQuestion {
  const _AdvisorQuestion({required this.title, required this.options});

  final String title;
  final List<String> options;
}

class _AdvisorHeader extends StatelessWidget {
  const _AdvisorHeader({required this.title});

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

class _AdvisorHero extends StatelessWidget {
  const _AdvisorHero();

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
          _IconBox(
            icon: '\u{2728}',
            background: Color(0xFF6A7FC8),
            size: 44,
          ),
          SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Find your program',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Answer a few questions \u{2014} we\u{2019}ll\nsuggest programs that fit you',
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

class _ProgressCaption extends StatelessWidget {
  const _ProgressCaption({required this.step});

  final int step;

  @override
  Widget build(BuildContext context) {
    final questionNumber = step + 1;
    final percent = questionNumber * 25;

    return Row(
      children: [
        Text(
          'Question $questionNumber of 4',
          style: const TextStyle(
            color: AppColors.mutedText,
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
        const Spacer(),
        Text(
          '$percent%',
          style: const TextStyle(
            color: AppColors.primaryBlue,
            fontSize: 11,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }
}

class _ProgressBar extends StatelessWidget {
  const _ProgressBar({required this.step});

  final int step;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(999),
      child: LinearProgressIndicator(
        minHeight: 5,
        value: (step + 1) / 4,
        color: AppColors.primaryBlue,
        backgroundColor: AppColors.border,
      ),
    );
  }
}

class _AdvisorOption extends StatelessWidget {
  const _AdvisorOption({
    required this.title,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          height: 58,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? AppColors.primaryBlue : AppColors.border,
            ),
            boxShadow: AppShadows.card,
          ),
          child: Row(
            children: [
              const _OptionStar(),
              const SizedBox(width: 13),
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.text,
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              Container(
                width: 19,
                height: 19,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: selected
                        ? AppColors.primaryBlue
                        : const Color(0xFFB9C3D4),
                    width: selected ? 5 : 1.2,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GuidanceNote extends StatelessWidget {
  const _GuidanceNote();

  @override
  Widget build(BuildContext context) {
    return const Text(
      'This is guidance only \u{2014} it is not an admission decision.',
      style: TextStyle(
        color: Color(0xFF9AA2B1),
        fontSize: 11,
        fontWeight: FontWeight.w600,
      ),
    );
  }
}

class _AdvisorBottomBar extends StatelessWidget {
  const _AdvisorBottomBar({
    required this.enabled,
    required this.label,
    required this.onBack,
    required this.onContinue,
  });

  final bool enabled;
  final String label;
  final VoidCallback onBack;
  final VoidCallback onContinue;

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
            width: 48,
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
          Expanded(
            child: SizedBox(
              height: 42,
              child: ElevatedButton(
                onPressed: enabled ? onContinue : null,
                style: ElevatedButton.styleFrom(
                  elevation: 0,
                  backgroundColor: AppColors.primaryBlue,
                  disabledBackgroundColor: const Color(0xFFCCD3DF),
                  disabledForegroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(13),
                  ),
                ),
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 13,
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

class _RecommendationHero extends StatelessWidget {
  const _RecommendationHero();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
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
          _IconBox(
            icon: '\u{1F3AF}',
            background: Color(0xFF6E9CD0),
            size: 46,
          ),
          SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _BestMatchPill(),
                SizedBox(height: 4),
                Text(
                  'Computer Application',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Faculty of Computer Science & IT',
                  style: TextStyle(
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
    );
  }
}

class _BestMatchPill extends StatelessWidget {
  const _BestMatchPill();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .25),
        borderRadius: BorderRadius.circular(999),
      ),
      child: const Text(
        'Best match \u{2022} 92%',
        style: TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _WhyTitle extends StatelessWidget {
  const _WhyTitle();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        _IconBox(
          icon: '\u{1F4A1}',
          background: AppColors.pastelGreen,
          size: 32,
          fontSize: 16,
        ),
        SizedBox(width: 10),
        Text(
          'Why it suits you',
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

class _WhyCard extends StatelessWidget {
  const _WhyCard();

  @override
  Widget build(BuildContext context) {
    return _WhiteCard(
      child: RichText(
        text: const TextSpan(
          style: TextStyle(
            color: Color(0xFF44516A),
            fontSize: 12,
            height: 1.45,
            fontWeight: FontWeight.w600,
          ),
          children: [
            TextSpan(text: 'You enjoyed '),
            TextSpan(
              text: 'mathematics and ICT',
              style: TextStyle(fontWeight: FontWeight.w900),
            ),
            TextSpan(text: ', want a '),
            TextSpan(
              text: 'technology career',
              style: TextStyle(fontWeight: FontWeight.w900),
            ),
            TextSpan(
              text:
                  ', and prefer practical project work. Computer Application builds programming, databases, and app-development skills with strong job demand in Mogadishu\u{2019}s growing tech sector.',
            ),
          ],
        ),
      ),
    );
  }
}

class _RecommendationTable extends StatelessWidget {
  const _RecommendationTable();

  @override
  Widget build(BuildContext context) {
    const rows = [
      ('Duration', '4 years \u{2022} 8 semesters'),
      ('Study mode', 'Full Time or Part Time'),
      ('Key\nsubjects', 'Programming, Databases,\nNetworks'),
      ('Careers', 'Developer, Analyst, IT Officer'),
    ];

    return _WhiteCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          for (var index = 0; index < rows.length; index++)
            _RecommendationRow(
              label: rows[index].$1,
              value: rows[index].$2,
              divider: index != rows.length - 1,
            ),
        ],
      ),
    );
  }
}

class _RecommendationRow extends StatelessWidget {
  const _RecommendationRow({
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
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        border: divider
            ? const Border(bottom: BorderSide(color: AppColors.border))
            : null,
      ),
      child: Row(
        children: [
          SizedBox(
            width: 84,
            child: Text(
              label,
              style: const TextStyle(
                color: AppColors.mutedText,
                fontSize: 12,
                height: 1.25,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(
                color: AppColors.text,
                fontSize: 12,
                height: 1.28,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoNotice extends StatelessWidget {
  const _InfoNotice();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: const Color(0xFFEAF7FF),
        border: Border.all(color: const Color(0xFFB9E0FF)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: const Row(
        children: [
          Icon(Icons.info, color: Color(0xFF4B95E8), size: 18),
          SizedBox(width: 10),
          Expanded(
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(text: 'This recommendation is '),
                  TextSpan(
                    text: 'guidance only',
                    style: TextStyle(fontWeight: FontWeight.w900),
                  ),
                  TextSpan(text: '\nand does not guarantee admission.'),
                ],
              ),
              style: TextStyle(
                color: Color(0xFF244A92),
                fontSize: 12,
                height: 1.3,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChooseProgramButton extends StatelessWidget {
  const _ChooseProgramButton();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 46,
      child: ElevatedButton(
        onPressed: () =>
            Navigator.of(context).popUntil((route) => route.isFirst),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.justGreen,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: const Text(
          'Choose this program',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
        ),
      ),
    );
  }
}

class _OtherRecommendationsButton extends StatelessWidget {
  const _OtherRecommendationsButton();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 42,
      child: OutlinedButton(
        onPressed: () {},
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primaryBlue,
          side: const BorderSide(color: Color(0xFFB8C7E8)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: const Text(
          'View other recommendations',
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
        ),
      ),
    );
  }
}

class _WhiteCard extends StatelessWidget {
  const _WhiteCard({
    required this.child,
    this.padding = const EdgeInsets.all(14),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(13),
        boxShadow: AppShadows.card,
      ),
      child: child,
    );
  }
}

class _IconBox extends StatelessWidget {
  const _IconBox({
    required this.icon,
    required this.background,
    required this.size,
    this.fontSize = 21,
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

class _OptionStar extends StatelessWidget {
  const _OptionStar();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: AppColors.pastelPurple,
        borderRadius: BorderRadius.circular(9),
      ),
      child: const Center(
        child: Text(
          '\u{2726}',
          style: TextStyle(
            color: Color(0xFFB73FD2),
            fontSize: 16,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}
