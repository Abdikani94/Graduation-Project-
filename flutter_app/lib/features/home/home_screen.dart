import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_card.dart';
import '../admission/models/admission_models.dart';
import '../admission/screens/admission_home_screen.dart';
import '../admission/screens/application_wizard_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.draft});

  final ApplicationDraft draft;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 22),
        children: [
          _PortalHero(
            onApply: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ApplicationWizardScreen(draft: draft),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: _ActionButton(
                  label: 'Apply Now',
                  icon: Icons.note_add_outlined,
                  color: AppColors.justGreen,
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ApplicationWizardScreen(draft: draft),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ActionButton(
                  label: 'Track',
                  icon: Icons.timeline,
                  color: AppColors.primaryBlue,
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ApplicationWizardScreen(
                        draft: draft,
                        initialStep: 4,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SectionTitle('JUST Official App', icon: Icons.apps),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.15,
            children: [
              _ServiceTile('Apply Online', 'Admission', Icons.school_outlined,
                  AppColors.justGreen, () {
                Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => ApplicationWizardScreen(draft: draft)));
              }),
              _ServiceTile('My Application', 'Review',
                  Icons.folder_copy_outlined, AppColors.primaryBlue, () {
                Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => AdmissionHomeScreen(draft: draft)));
              }),
              _ServiceTile('Track Status', 'Updates',
                  Icons.notifications_active_outlined, AppColors.warning, () {
                Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => ApplicationWizardScreen(
                            draft: draft, initialStep: 4)));
              }),
              _ServiceTile('Programs', 'Faculties',
                  Icons.account_balance_outlined, AppColors.secondaryBlue, () {
                Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => ApplicationWizardScreen(
                            draft: draft, initialStep: 3)));
              }),
            ],
          ),
          const SectionTitle('Notifications', icon: Icons.notifications_none),
          const _NotificationTabs(),
          const SectionTitle('Welcome To Quality Education',
              icon: Icons.verified_outlined),
          const AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Jamhuriya University of Science and Technology',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: AppColors.text,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'Apply online, pay securely, and follow every admission step through the mobile portal.',
                  style: TextStyle(height: 1.45, color: AppColors.mutedText),
                ),
                SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _ValueChip('Integrity'),
                    _ValueChip('Innovation'),
                    _ValueChip('Academic Quality'),
                    _ValueChip('Teamwork'),
                  ],
                ),
              ],
            ),
          ),
          const SectionTitle('University Highlights', icon: Icons.bar_chart),
          const _HighlightsGrid(),
        ],
      ),
    );
  }
}

class _ServiceTile extends StatelessWidget {
  const _ServiceTile(
      this.title, this.subtitle, this.icon, this.color, this.onTap);

  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                backgroundColor: color.withValues(alpha: .12),
                child: Icon(icon, color: color),
              ),
              const Spacer(),
              Text(title,
                  style: const TextStyle(
                      fontWeight: FontWeight.w900, color: AppColors.text)),
              const SizedBox(height: 3),
              Text(subtitle,
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.mutedText)),
            ],
          ),
        ),
      ),
    );
  }
}

class _PortalHero extends StatelessWidget {
  const _PortalHero({required this.onApply});

  final VoidCallback onApply;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        gradient: const LinearGradient(
          colors: [AppColors.justGreen, AppColors.primaryBlue],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryBlue.withValues(alpha: .22),
            blurRadius: 26,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10)),
                child: const Center(
                  child: Text('JUST',
                      style: TextStyle(
                          color: AppColors.justGreen,
                          fontWeight: FontWeight.w900)),
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('JUST Official App',
                        style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 17)),
                    SizedBox(height: 2),
                    Text('MOBILE',
                        style: TextStyle(
                            color: Colors.white70,
                            fontWeight: FontWeight.w800,
                            fontSize: 12)),
                  ],
                ),
              ),
              IconButton(
                onPressed: () {},
                icon: const Icon(Icons.dark_mode_outlined, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 22),
          const Text(
            'Enlighting the life of many',
            style: TextStyle(
                color: Colors.white,
                fontSize: 29,
                height: 1.05,
                fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          const Text(
            'Apply, pay, and track your admission journey with Jamhuriya University.',
            style: TextStyle(color: Colors.white, height: 1.45),
          ),
          const SizedBox(height: 18),
          ElevatedButton.icon(
            onPressed: onApply,
            style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppColors.primaryBlue),
            icon: const Icon(Icons.arrow_forward),
            label: const Text('Start Application'),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton(
      {required this.label,
      required this.icon,
      required this.color,
      required this.onTap});

  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Flexible(
                  child: Text(label,
                      style: const TextStyle(
                          color: Colors.white, fontWeight: FontWeight.w900))),
            ],
          ),
        ),
      ),
    );
  }
}

class _NotificationTabs extends StatelessWidget {
  const _NotificationTabs();

  @override
  Widget build(BuildContext context) {
    return const AppCard(
      padding: EdgeInsets.all(12),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(child: _TabPill('News', true)),
              SizedBox(width: 8),
              Expanded(child: _TabPill('Events', false)),
              SizedBox(width: 8),
              Expanded(child: _TabPill('Notices', false)),
            ],
          ),
          SizedBox(height: 12),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: CircleAvatar(
                backgroundColor: Color(0xFFE8F5EE),
                child:
                    Icon(Icons.campaign_outlined, color: AppColors.justGreen)),
            title: Text('Admission for Academic Year 2026 is open',
                style: TextStyle(fontWeight: FontWeight.w900)),
            subtitle: Text(
                'Medicine, Computing, Engineering, Economics, and Agriculture programs.'),
          ),
        ],
      ),
    );
  }
}

class _TabPill extends StatelessWidget {
  const _TabPill(this.label, this.selected);

  final String label;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 9),
      decoration: BoxDecoration(
        color: selected ? AppColors.justGreen : AppColors.background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
            color: selected ? AppColors.justGreen : AppColors.border),
      ),
      child: Text(
        label,
        textAlign: TextAlign.center,
        style: TextStyle(
            color: selected ? Colors.white : AppColors.mutedText,
            fontWeight: FontWeight.w900),
      ),
    );
  }
}

class _ValueChip extends StatelessWidget {
  const _ValueChip(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(
      label: Text(label),
      backgroundColor: AppColors.justGreen.withValues(alpha: .1),
      side: BorderSide.none,
      labelStyle: const TextStyle(
          color: AppColors.justGreen, fontWeight: FontWeight.w800),
    );
  }
}

class _HighlightsGrid extends StatelessWidget {
  const _HighlightsGrid();

  @override
  Widget build(BuildContext context) {
    const items = [
      ['6', 'Faculties'],
      ['40+', 'Programs'],
      ['3', 'Campuses'],
      ['20+', 'Labs'],
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      childAspectRatio: 1.8,
      children: items.map((item) {
        return AppCard(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(item[0],
                  style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      color: AppColors.primaryBlue)),
              Text(item[1],
                  style: const TextStyle(
                      color: AppColors.mutedText, fontWeight: FontWeight.w700)),
            ],
          ),
        );
      }).toList(),
    );
  }
}
