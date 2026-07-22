import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_card.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: const [
          Text('Profile', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
          Text('Manage your account', style: TextStyle(color: AppColors.mutedText)),
          SizedBox(height: 18),
          GradientHero(
            title: 'Jamhuriya University',
            subtitle: 'Home of quality education',
          ),
          SectionTitle('Settings', icon: Icons.settings_outlined),
          AppCard(
            child: Column(
              children: [
                _ProfileRow(Icons.language, 'Languages'),
                _ProfileRow(Icons.info_outline, 'About JUST'),
                _ProfileRow(Icons.code, 'About Developer'),
                _ProfileRow(Icons.dark_mode_outlined, 'Dark Mode'),
              ],
            ),
          ),
          SectionTitle('Support', icon: Icons.headset_mic_outlined),
          AppCard(
            child: _ProfileRow(Icons.phone_outlined, 'Get Help'),
          ),
        ],
      ),
    );
  }
}

class _ProfileRow extends StatelessWidget {
  const _ProfileRow(this.icon, this.label);

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        backgroundColor: AppColors.justGreen.withValues(alpha: .1),
        child: Icon(icon, color: AppColors.justGreen),
      ),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w900)),
      trailing: const Icon(Icons.chevron_right),
    );
  }
}
