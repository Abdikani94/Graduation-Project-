import 'package:flutter/material.dart';

import 'app_colors.dart';

class AppShadows {
  const AppShadows._();

  static List<BoxShadow> get card => [
        BoxShadow(
          color: AppColors.darkNavy.withValues(alpha: .07),
          blurRadius: 18,
          offset: const Offset(0, 8),
        ),
      ];

  static List<BoxShadow> get hero => [
        BoxShadow(
          color: AppColors.primaryBlue.withValues(alpha: .22),
          blurRadius: 24,
          offset: const Offset(0, 12),
        ),
      ];
}
