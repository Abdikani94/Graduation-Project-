import 'package:flutter/material.dart';

import 'core/theme/app_theme.dart';
import 'features/shell/app_shell.dart';

void main() {
  runApp(const JustMobileApp());
}

class JustMobileApp extends StatelessWidget {
  const JustMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'JUST Admission',
      theme: AppTheme.light(),
      home: const AppShell(),
    );
  }
}
