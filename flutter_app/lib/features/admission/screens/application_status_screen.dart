import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../models/admission_models.dart';

class ApplicationStatusScreen extends StatelessWidget {
  const ApplicationStatusScreen({super.key, required this.draft});

  final ApplicationDraft draft;

  @override
  Widget build(BuildContext context) {
    final hasSubmission = draft.submittedReference?.isNotEmpty == true;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('My Application')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (!hasSubmission)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(18),
                child: Column(
                  children: [
                    Icon(Icons.search_off,
                        size: 46, color: AppColors.mutedText),
                    SizedBox(height: 12),
                    Text('No submitted application on this device',
                        style: TextStyle(
                            fontSize: 17, fontWeight: FontWeight.w900)),
                    SizedBox(height: 8),
                    Text(
                      'The backend does not currently provide a public application lookup endpoint. Keep the reference shown after submission and contact the admissions office for updates.',
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            )
          else
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Application reference',
                        style: TextStyle(color: AppColors.mutedText)),
                    Text(draft.reference,
                        style: const TextStyle(
                            fontSize: 20, fontWeight: FontWeight.w900)),
                    const Divider(height: 28),
                    _StatusRow(label: 'Applicant', value: draft.fullName),
                    _StatusRow(label: 'Faculty', value: draft.faculty),
                    _StatusRow(label: 'Department', value: draft.department),
                    _StatusRow(
                      label: 'Assigned class',
                      value: draft.assignedClass.isEmpty
                          ? 'Assigned automatically after approval'
                          : draft.assignedClass,
                    ),
                    _StatusRow(
                      label: 'Application status',
                      value: draft.applicationStatus.isEmpty
                          ? 'Pending'
                          : draft.applicationStatus,
                    ),
                    _StatusRow(
                        label: 'Payment status', value: draft.paymentStatus),
                    const SizedBox(height: 12),
                    const Text(
                      'These values are from the last backend-confirmed response on this device. Contact admissions for later status updates.',
                      style: TextStyle(color: AppColors.mutedText),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  const _StatusRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 7),
        child: Row(
          children: [
            Expanded(
                child: Text(label,
                    style: const TextStyle(color: AppColors.mutedText))),
            Expanded(
              child: Text(value.isEmpty ? 'Not available' : value,
                  textAlign: TextAlign.right,
                  style: const TextStyle(fontWeight: FontWeight.w800)),
            ),
          ],
        ),
      );
}
