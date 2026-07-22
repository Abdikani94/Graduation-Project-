import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../admission/models/admission_models.dart';
import '../admission/screens/admission_home_screen.dart';
import '../home/home_screen.dart';
import '../profile/profile_screen.dart';
import '../support/support_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final draft = ApplicationDraft();
  int index = 0;
  bool showMenu = true;

  void _selectPage(int value) {
    Navigator.of(context).maybePop();
    setState(() {
      index = value;
      showMenu = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeScreen(draft: draft),
      AdmissionHomeScreen(draft: draft),
      const SupportScreen(),
      const ProfileScreen(),
    ];
    final titles = ['JUST', 'Admission', 'Support', 'Profile'];

    if (showMenu) {
      return _JustMenuScreen(
        selectedIndex: 4,
        onSelect: (value) {
          if (value == 4) {
            _selectPage(1);
            return;
          }

          _selectPage(0);
        },
      );
    }

    if (index == 1) {
      return AdmissionHomeScreen(
        draft: draft,
        onBack: () => setState(() => showMenu = true),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(titles[index]),
        leading: IconButton(
          onPressed: () => setState(() => showMenu = true),
          icon: const Icon(Icons.menu),
        ),
      ),
      body: pages[index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        height: 70,
        backgroundColor: Colors.white,
        indicatorColor: AppColors.justGreen.withValues(alpha: .18),
        shadowColor: AppColors.primaryBlue.withValues(alpha: .08),
        surfaceTintColor: Colors.white,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment),
            label: 'Admission',
          ),
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline),
            selectedIcon: Icon(Icons.chat_bubble),
            label: 'Support',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class _JustMenuScreen extends StatelessWidget {
  const _JustMenuScreen({
    required this.selectedIndex,
    required this.onSelect,
  });

  final int selectedIndex;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    const items = [
      _MenuEntry('\u{2302}', 'Home', null),
      _MenuEntry('\u{2661}', 'Welcome', null),
      _MenuEntry('\u{1F680}', 'Faculties', null),
      _MenuEntry('\u{1F4CD}', 'Centers', null),
      _MenuEntry('\u{1F393}', 'Admission', 'NEW'),
      _MenuEntry('\u{2709}\u{FE0F}', 'News', null),
      _MenuEntry('\u{1F464}', 'Student', null),
      _MenuEntry('\u{1F465}', 'Parent', null),
      _MenuEntry('\u{1F468}\u{200D}\u{1F3EB}', 'Lecturer', null),
      _MenuEntry('\u{1F4DE}', 'Contact us', null),
    ];

    return Scaffold(
      backgroundColor: AppColors.primaryBlue,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 56, 24, 30),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Center(
                      child: Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: AppColors.justGreen,
                            width: 2,
                          ),
                          shape: BoxShape.circle,
                        ),
                        child: const Center(
                          child: Text(
                            'J',
                            style: TextStyle(
                              color: AppColors.justGreen,
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'JUST',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      SizedBox(height: 1),
                      Text(
                        'Jamhuriya University',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Divider(
                color: Colors.white.withValues(alpha: .26),
                height: 1,
              ),
              const SizedBox(height: 20),
              ...List.generate(items.length, (index) {
                final item = items[index];
                return _MenuItem(
                  icon: item.icon,
                  label: item.label,
                  badge: item.badge,
                  selected: selectedIndex == index,
                  onTap: () => onSelect(index),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }
}

class _MenuEntry {
  const _MenuEntry(this.icon, this.label, this.badge);

  final String icon;
  final String label;
  final String? badge;
}

class _MenuItem extends StatelessWidget {
  const _MenuItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
    this.badge,
  });

  final String icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10.5),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: selected
                    ? Colors.white
                    : Colors.white.withValues(alpha: .13),
                borderRadius: BorderRadius.circular(9),
              ),
              child: Center(
                child: Text(
                  icon,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: _usesSymbolColor(icon)
                        ? (selected ? const Color(0xFF2D2659) : Colors.white)
                        : null,
                    fontSize: _emojiFontSize(icon),
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 15),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            if (badge != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.greenAccent,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  badge!,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  static bool _usesSymbolColor(String icon) {
    return icon == '\u{2302}' || icon == '\u{2661}';
  }

  static double _emojiFontSize(String icon) {
    if (icon == '\u{1F468}\u{200D}\u{1F3EB}') return 17;
    if (icon == '\u{2709}\u{FE0F}') return 18;
    return 19;
  }
}
