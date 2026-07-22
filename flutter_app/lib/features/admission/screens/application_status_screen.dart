import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_theme.dart';

class ApplicationStatusScreen extends StatelessWidget {
  const ApplicationStatusScreen({super.key});

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
              const _StatusHeader(),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 22),
                  children: const [
                    _ApplicantCard(),
                    SizedBox(height: 20),
                    _SectionHeading(),
                    SizedBox(height: 12),
                    _TimelineItem(
                      icon: Icons.check,
                      active: true,
                      title: 'Application started',
                      subtitle: 'Draft created and saved',
                      time: '18 Jul 2026 \u{00B7} 4:10 PM',
                    ),
                    _TimelineItem(
                      icon: Icons.check,
                      active: true,
                      title: 'Application submitted',
                      subtitle: 'All five steps completed',
                      time: '19 Jul 2026 \u{00B7} 12:44 PM',
                    ),
                    _TimelineItem(
                      icon: Icons.search,
                      current: true,
                      title: 'Documents under review',
                      subtitle:
                          'The admission office is checking your certificate\nand ID',
                      time: 'In progress',
                    ),
                    _TimelineItem(
                      icon: Icons.credit_card,
                      title: 'Payment verified',
                      subtitle: 'Finance confirms your admission fee',
                    ),
                    _TimelineItem(
                      icon: Icons.school,
                      title: 'Admission decision',
                      subtitle: 'Final decision by the admission committee',
                      last: true,
                    ),
                    SizedBox(height: 20),
                    _DemoTitle(),
                    SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _DemoChip('Under review', AppColors.pastelBlue,
                            AppColors.primaryBlue),
                        _DemoChip('Info required', Color(0xFFF0F3FA),
                            Color(0xFF44516A)),
                        _DemoChip('Accepted', AppColors.pastelGreen,
                            AppColors.justGreen),
                        _DemoChip(
                            'Rejected', AppColors.pastelRed, AppColors.danger),
                      ],
                    ),
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

class _StatusHeader extends StatelessWidget {
  const _StatusHeader();

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
          const Expanded(
            child: Text(
              'My Application',
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
            icon: const Text('\u{1F514}', style: TextStyle(fontSize: 19)),
          ),
        ],
      ),
    );
  }
}

class _ApplicantCard extends StatelessWidget {
  const _ApplicantCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.primaryBlue,
        borderRadius: BorderRadius.circular(13),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFF6A7FC8),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Center(
                  child: Text('\u{1F464}', style: TextStyle(fontSize: 20)),
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Abdikadir\nMohamed Ali',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        height: 1.08,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'JUST-ADM-26-04815',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .22),
                  borderRadius: BorderRadius.circular(9),
                ),
                child: const Text(
                  'Under\nreview',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    height: 1.1,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Row(
            children: [
              _ApplicantMeta(label: 'Faculty', value: 'Computer\nScience & IT'),
              _ApplicantMeta(label: 'Program', value: 'Computer\nApplication'),
              _ApplicantMeta(label: 'Submitted', value: '19 Jul\n2026'),
            ],
          ),
        ],
      ),
    );
  }
}

class _ApplicantMeta extends StatelessWidget {
  const _ApplicantMeta({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 10,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 10,
              height: 1.1,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        _IconBadge(icon: Icons.history, background: AppColors.pastelBlue),
        SizedBox(width: 10),
        Text(
          'Application progress',
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

class _TimelineItem extends StatelessWidget {
  const _TimelineItem({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.time,
    this.active = false,
    this.current = false,
    this.last = false,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String? time;
  final bool active;
  final bool current;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final muted = !active && !current;
    final color = current
        ? AppColors.primaryBlue
        : (active ? AppColors.justGreen : const Color(0xFFB8C0CC));

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 36,
            child: Column(
              children: [
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: current ? AppColors.primaryBlue : Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(color: color.withValues(alpha: .35)),
                  ),
                  child: Icon(
                    icon,
                    color: current ? Colors.white : color,
                    size: 16,
                  ),
                ),
                if (!last)
                  Expanded(
                    child: Container(width: 1.3, color: AppColors.border),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: muted ? const Color(0xFFAAB2C0) : AppColors.text,
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color:
                          muted ? const Color(0xFFAAB2C0) : AppColors.mutedText,
                      fontSize: 11,
                      height: 1.25,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (time != null) ...[
                    const SizedBox(height: 3),
                    Text(
                      time!,
                      style: TextStyle(
                        color: current
                            ? const Color(0xFFAAB2C0)
                            : AppColors.mutedText,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DemoTitle extends StatelessWidget {
  const _DemoTitle();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        _IconBadge(icon: Icons.tune, background: AppColors.pastelPurple),
        SizedBox(width: 10),
        Text(
          'Demo: status states',
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

class _IconBadge extends StatelessWidget {
  const _IconBadge({required this.icon, required this.background});

  final IconData icon;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(9),
      ),
      child: Icon(icon, size: 17, color: AppColors.primaryBlue),
    );
  }
}

class _DemoChip extends StatelessWidget {
  const _DemoChip(this.text, this.background, this.color);

  final String text;
  final Color background;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
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
