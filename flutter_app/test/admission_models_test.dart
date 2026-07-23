import 'dart:typed_data';

import 'package:flutter_app/features/admission/models/admission_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('admission API models', () {
    test('parses registration status without inventing fields', () {
      final status = RegistrationStatus.fromJson({
        'isOpen': true,
        'status': 'Open',
        'period': {
          'id': 'adp_1',
          'name': '2026 Intake',
          'openingDatetime': '2026-07-01T00:00:00.000Z',
          'closingDatetime': '2026-08-01T00:00:00.000Z',
          'applicantInstructions': 'Upload clear documents',
        },
      });

      expect(status.isOpen, isTrue);
      expect(status.status, 'Open');
      expect(status.period?.id, 'adp_1');
      expect(status.period?.closingDatetime, isNotNull);
    });

    test('parses backend payment states', () {
      final payment = PaymentResult.fromJson({
        'status': 'SUCCESS',
        'referenceId': 'PAY-1',
        'amount': 25,
        'currency': 'USD',
        'payerPhone': '+252611111111',
      });

      expect(payment.status, 'SUCCESS');
      expect(payment.amount, 25.0);
      expect(payment.referenceId, 'PAY-1');
    });

    test('serializes exact backend application keys', () {
      final draft = ApplicationDraft()
        ..fullName = 'Ahmed Ali'
        ..faculty = 'Computer Science & IT'
        ..department = 'Computer Application'
        ..certificateStatus = 'Yes'
        ..applicantPhotoBytes = Uint8List.fromList([1])
        ..certificateBytes = Uint8List.fromList([2]);

      final payload = draft.toApiPayload();

      expect(payload['faculty'], 'Computer Science & IT');
      expect(payload['department'], 'Computer Application');
      expect(payload['applicantPhotoUploaded'], 'Yes');
      expect(payload['certificateUploaded'], 'Yes');
      expect(payload.containsKey('appointmentDate'), isFalse);
    });
  });

  group('admission validation parity', () {
    test('rejects an applicant younger than 14', () {
      final now = DateTime.now();
      final birthYear = now.year - 10;
      final draft = ApplicationDraft()
        ..fullName = 'Ahmed Ali'
        ..motherName = 'Hodan Ali'
        ..nationality = 'Somali'
        ..rollNumber = '12345'
        ..dateOfBirth = '$birthYear-01-01'
        ..placeOfBirth = 'Mogadishu'
        ..district = 'Hodan'
        ..email = 'ahmed@example.com'
        ..phone = '+252611111111'
        ..sex = 'Male'
        ..maritalStatus = 'Single'
        ..certificateStatus = 'No'
        ..appointmentDate = '${now.year}-12-01'
        ..appointmentTime = '09:00'
        ..applicantPhotoUploaded = true;

      expect(draft.validateStep(1), contains('between 14 and 100'));
    });
  });
}
