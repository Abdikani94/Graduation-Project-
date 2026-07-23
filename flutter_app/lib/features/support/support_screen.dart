import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_card.dart';

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: const [
          GradientHero(
            title: 'Student Support',
            subtitle: 'Ask admission questions, payment issues, or document upload help.',
          ),
          SectionTitle('Admission Chatbot', icon: Icons.smart_toy_outlined),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _Message('Applicant', 'Which faculty is best for software development?'),
                _Message('JUST Bot', 'Computer & IT is the strongest match. You can choose Computer Application, Computer Network & Security, Computer Multi-Media, or Artificial Intelligence and Data Science.'),
              ],
            ),
          ),
          SectionTitle('Support Tickets', icon: Icons.support_agent),
          AppCard(
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.pending_actions, color: AppColors.warning),
              title: Text('Payment confirmation delay'),
              subtitle: Text('Pending • Admission office will respond soon.'),
              trailing: Icon(Icons.chevron_right),
            ),
          ),
        ],
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message(this.author, this.body);

  final String author;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(author, style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.primaryBlue)),
          const SizedBox(height: 3),
          Text(body, style: const TextStyle(height: 1.4)),
        ],
      ),
    );
  }
}
