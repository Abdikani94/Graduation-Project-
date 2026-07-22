import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_theme.dart';
import '../data/admission_repository.dart';
import '../models/admission_models.dart';

class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key, required this.draft});

  final ApplicationDraft draft;

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  late String method = widget.draft.paymentMethod.isEmpty
      ? 'EVC Plus'
      : widget.draft.paymentMethod;
  late final TextEditingController phoneController =
      TextEditingController(text: widget.draft.phone);
  late final TextEditingController confirmController =
      TextEditingController(text: widget.draft.phone);
  bool authorized = true;
  String demoStatus = 'Processing';
  bool isPaying = false;
  final repository = const AdmissionRepository();

  @override
  void dispose() {
    phoneController.dispose();
    confirmController.dispose();
    super.dispose();
  }

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
              const _PaymentHeader(),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
                  children: [
                    const _AdmissionFeeNotice(),
                    const SizedBox(height: 18),
                    const _SectionHeading(
                      icon: '\u{1F9EE}',
                      background: AppColors.pastelGreen,
                      title: 'Payment method',
                    ),
                    const SizedBox(height: 12),
                    _PaymentMethodCard(
                      badge: 'EVC',
                      title: 'EVC Plus',
                      subtitle: 'Pay with your Hormuud EVC Plus wallet',
                      selected: method == 'EVC Plus',
                      onTap: () => setState(() => method = 'EVC Plus'),
                    ),
                    const SizedBox(height: 10),
                    _PaymentMethodCard(
                      badge: 'Z',
                      title: 'Zaad',
                      subtitle: 'Pay with your Telesom Zaad wallet',
                      selected: method == 'Zaad',
                      onTap: () => setState(() => method = 'Zaad'),
                    ),
                    const SizedBox(height: 10),
                    _PaymentMethodCard(
                      badge: 'eD',
                      title: 'eDahab',
                      subtitle: 'Pay with your Somtel eDahab wallet',
                      selected: method == 'eDahab',
                      onTap: () => setState(() => method = 'eDahab'),
                    ),
                    const SizedBox(height: 10),
                    _PaymentMethodCard(
                      badge: '\u{1F3E6}',
                      title: 'Cash Office',
                      subtitle: 'Pay at the university finance office',
                      selected: method == 'Cash Office',
                      onTap: () => setState(() => method = 'Cash Office'),
                    ),
                    const SizedBox(height: 12),
                    _PhoneInput(
                      label: 'Mobile Number',
                      controller: phoneController,
                    ),
                    const SizedBox(height: 12),
                    _PhoneInput(
                      label: 'Confirm Mobile Number',
                      controller: confirmController,
                    ),
                    const SizedBox(height: 14),
                    const _TotalCard(),
                    const SizedBox(height: 14),
                    _AuthorizationRow(
                      value: authorized,
                      onTap: () => setState(() => authorized = !authorized),
                    ),
                    const SizedBox(height: 20),
                    const _SectionHeading(
                      icon: '\u{2139}\u{FE0F}',
                      background: AppColors.pastelBlue,
                      title: 'Payment status',
                    ),
                    const SizedBox(height: 12),
                    const Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _StatusChip('Not started', Color(0xFFF0F3FA),
                            Color(0xFF44516A)),
                        _StatusChip('Processing', AppColors.pastelBlue,
                            AppColors.primaryBlue),
                        _StatusChip(
                            'Paid', AppColors.pastelGreen, AppColors.justGreen),
                        _StatusChip(
                            'Failed', AppColors.pastelRed, AppColors.danger),
                        _StatusChip('Pending verification',
                            AppColors.pastelOrange, Color(0xFFB87500)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'This is a design prototype \u{2014} no real payment is\nprocessed. Use the buttons below to preview each result.',
                      style: TextStyle(
                        color: AppColors.mutedText,
                        fontSize: 11,
                        height: 1.3,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _DemoButton(
                          label: 'Demo: success',
                          background: AppColors.pastelGreen,
                          color: AppColors.justGreen,
                          onTap: () => setState(() => demoStatus = 'Paid'),
                        ),
                        const SizedBox(width: 8),
                        _DemoButton(
                          label: 'Demo: failure',
                          background: AppColors.pastelRed,
                          color: AppColors.danger,
                          onTap: () => setState(() => demoStatus = 'Failed'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 84),
                  ],
                ),
              ),
              _PayBottomBar(
                enabled: authorized && !isPaying,
                status: demoStatus,
                isLoading: isPaying,
                onPay: _submitPayment,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _submitPayment() async {
    final phone = phoneController.text.trim();
    final confirmPhone = confirmController.text.trim();
    if (phone.isEmpty || confirmPhone.isEmpty) {
      _showMessage('Mobile number is required');
      return;
    }
    if (!_isValidPhone(phone)) {
      _showMessage('Please enter a valid mobile number with 7 to 15 digits');
      return;
    }
    if (phone != confirmPhone) {
      _showMessage('Mobile numbers do not match');
      return;
    }

    widget.draft
      ..paymentMethod = method
      ..phone = phone
      ..paymentStatus = 'Processing';

    final validationError = widget.draft.validateForSubmission();
    if (validationError != null) {
      _showMessage(validationError);
      return;
    }

    setState(() => isPaying = true);
    try {
      final data = await repository.submitApplication(widget.draft);
      if (!mounted) return;
      setState(() {
        widget.draft.updateFromSubmission(data);
        demoStatus = widget.draft.paymentStatus;
      });
      _showMessage('Application submitted: ${widget.draft.reference}');
      Navigator.of(context).maybePop();
    } catch (error) {
      if (!mounted) return;
      _showMessage(error.toString());
    } finally {
      if (mounted) setState(() => isPaying = false);
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  bool _isValidPhone(String value) {
    final text = value.trim();
    final digits = text.replaceAll(RegExp(r'\D'), '');
    return RegExp(r'^\+?[\d\s-]{7,20}$').hasMatch(text) &&
        digits.length >= 7 &&
        digits.length <= 15;
  }
}

class _PaymentHeader extends StatelessWidget {
  const _PaymentHeader();

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
              'Payment',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
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

class _AdmissionFeeNotice extends StatelessWidget {
  const _AdmissionFeeNotice();

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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('\u{1F9FE}', style: TextStyle(fontSize: 17)),
          SizedBox(width: 10),
          Expanded(
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: 'Admission fee\n',
                    style: TextStyle(fontWeight: FontWeight.w900),
                  ),
                  TextSpan(text: 'You are paying the '),
                  TextSpan(
                    text: 'Admission Fee Only\nplan \u{2014} \$25.00.',
                    style: TextStyle(fontWeight: FontWeight.w900),
                  ),
                  TextSpan(
                    text: ' A receipt will be sent to\nyour phone and email.',
                  ),
                ],
              ),
              style: TextStyle(
                color: Color(0xFF244A92),
                fontSize: 12,
                height: 1.28,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PaymentMethodCard extends StatelessWidget {
  const _PaymentMethodCard({
    required this.badge,
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final String badge;
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(13),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(
            color: selected ? AppColors.justGreen : AppColors.border,
            width: selected ? 1.5 : 1,
          ),
          borderRadius: BorderRadius.circular(13),
          boxShadow: AppShadows.card,
        ),
        child: Row(
          children: [
            _Badge(text: badge),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: AppColors.text,
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: AppColors.mutedText,
                      fontSize: 10,
                      height: 1.25,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            _RadioDot(selected: selected),
          ],
        ),
      ),
    );
  }
}

class _PhoneInput extends StatelessWidget {
  const _PhoneInput({required this.label, required this.controller});

  final String label;
  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _RequiredLabel(label),
        const SizedBox(height: 7),
        SizedBox(
          height: 46,
          child: TextField(
            controller: controller,
            keyboardType: TextInputType.phone,
            maxLength: 20,
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[\d\s+-]')),
            ],
            decoration: InputDecoration(
              prefixIcon: const Icon(
                Icons.phone,
                color: Color(0xFFE53683),
                size: 18,
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12),
              counterText: '',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _TotalCard extends StatelessWidget {
  const _TotalCard();

  @override
  Widget build(BuildContext context) {
    const rows = [
      ('Admission fee', '\$25.00', false),
      ('Service charge', '\$0.00', false),
      ('Total', '\$25.00', true),
    ];

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(13),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        children: [
          for (var index = 0; index < rows.length; index++)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                border: index != rows.length - 1
                    ? const Border(bottom: BorderSide(color: AppColors.border))
                    : null,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      rows[index].$1,
                      style: TextStyle(
                        color: rows[index].$3
                            ? AppColors.text
                            : AppColors.mutedText,
                        fontSize: 12,
                        fontWeight:
                            rows[index].$3 ? FontWeight.w900 : FontWeight.w600,
                      ),
                    ),
                  ),
                  Text(
                    rows[index].$2,
                    style: TextStyle(
                      color: rows[index].$3
                          ? AppColors.primaryBlue
                          : AppColors.text,
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
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

class _AuthorizationRow extends StatelessWidget {
  const _AuthorizationRow({required this.value, required this.onTap});

  final bool value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 19,
            height: 19,
            decoration: BoxDecoration(
              color: value ? AppColors.justGreen : Colors.white,
              borderRadius: BorderRadius.circular(5),
              border: Border.all(
                  color: value ? AppColors.justGreen : AppColors.border),
            ),
            child: value
                ? const Icon(Icons.check, color: Colors.white, size: 14)
                : null,
          ),
          const SizedBox(width: 10),
          const Expanded(
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(text: 'I authorize JUST to request '),
                  TextSpan(
                    text: '\$25.00',
                    style: TextStyle(fontWeight: FontWeight.w900),
                  ),
                  TextSpan(
                    text:
                        ' from my\nmobile wallet. I will confirm the payment on\nmy phone.',
                  ),
                ],
              ),
              style: TextStyle(
                color: Color(0xFF44516A),
                fontSize: 12,
                height: 1.25,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PayBottomBar extends StatelessWidget {
  const _PayBottomBar({
    required this.enabled,
    required this.status,
    required this.isLoading,
    required this.onPay,
  });

  final bool enabled;
  final String status;
  final bool isLoading;
  final VoidCallback onPay;

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
              onPressed: () => Navigator.of(context).maybePop(),
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
                onPressed: enabled ? onPay : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.justGreen,
                  disabledBackgroundColor: const Color(0xFFCCD3DF),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(13),
                  ),
                ),
                child: Text(
                  isLoading
                      ? 'Submitting...'
                      : (status == 'Paid' ? 'Paid \$25.00' : 'Pay \$25.00'),
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

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({
    required this.icon,
    required this.background,
    required this.title,
  });

  final String icon;
  final Color background;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.circular(9),
          ),
          child:
              Center(child: Text(icon, style: const TextStyle(fontSize: 15))),
        ),
        const SizedBox(width: 10),
        Text(
          title,
          style: const TextStyle(
            color: AppColors.text,
            fontSize: 17,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }
}

class _RequiredLabel extends StatelessWidget {
  const _RequiredLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(text: text),
          const TextSpan(text: ' *', style: TextStyle(color: AppColors.danger)),
        ],
      ),
      style: const TextStyle(
        color: Color(0xFF34405A),
        fontSize: 12,
        fontWeight: FontWeight.w900,
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: text == 'EVC' ? AppColors.pastelGreen : AppColors.pastelBlue,
        borderRadius: BorderRadius.circular(9),
      ),
      child: Center(
        child: Text(
          text,
          style: TextStyle(
            color: text == 'EVC' ? AppColors.justGreen : AppColors.primaryBlue,
            fontSize: 12,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}

class _RadioDot extends StatelessWidget {
  const _RadioDot({required this.selected});

  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 19,
      height: 19,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: selected ? AppColors.justGreen : Colors.white,
        border: Border.all(
          color: selected ? AppColors.justGreen : const Color(0xFFB9C3D4),
          width: selected ? 5 : 1.2,
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip(this.text, this.background, this.color);

  final String text;
  final Color background;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        '\u{2022} $text',
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _DemoButton extends StatelessWidget {
  const _DemoButton({
    required this.label,
    required this.background,
    required this.color,
    required this.onTap,
  });

  final String label;
  final Color background;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onTap,
      style: TextButton.styleFrom(
        backgroundColor: background,
        foregroundColor: color,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
      ),
    );
  }
}
