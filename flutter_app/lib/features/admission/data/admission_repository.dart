import '../../../core/network/api_client.dart';
import '../models/admission_models.dart';

class AdmissionRepository {
  const AdmissionRepository({this.apiClient});

  final ApiClient? apiClient;

  ApiClient get _api => apiClient ?? ApiClient();

  Future<List<Faculty>> fetchFaculties() async {
    final data = await _api.get('/programs');
    final raw = data['data'];
    if (raw is! List) throw const ApiException('Programs response is invalid.');
    final parsed = raw
        .whereType<Map<String, dynamic>>()
        .map(Faculty.fromJson)
        .where((item) => item.name.isNotEmpty && item.departments.isNotEmpty)
        .toList();
    if (parsed.isEmpty) {
      throw const ApiException('No admission programs are available.');
    }
    return parsed;
  }

  Future<RegistrationStatus> fetchRegistrationStatus() async {
    return RegistrationStatus.fromJson(
      await _api.get('/admission-registration/status'),
    );
  }

  Future<List<String>> fetchSecondarySchools() async {
    final data = await _api.get('/secondary-schools');
    final raw = data['data'];
    if (raw is! List) {
      throw const ApiException('Secondary schools response is invalid.');
    }
    final seen = <String>{};
    return raw
        .map((item) => item.toString().trim())
        .where((item) => item.isNotEmpty && seen.add(item.toLowerCase()))
        .toList();
  }

  Future<List<String>> fetchDistricts() async {
    final data = await _api.get('/districts');
    final raw = data['data'];
    if (raw is! List) {
      throw const ApiException('Districts response is invalid.');
    }
    final seen = <String>{};
    return raw
        .map((item) => item.toString().trim())
        .where((item) => item.isNotEmpty && seen.add(item.toLowerCase()))
        .toList();
  }

  Future<Map<String, dynamic>> submitApplication(ApplicationDraft draft) {
    final fields = draft.toApiPayload().map(
          (key, value) => MapEntry(key, value?.toString() ?? ''),
        );
    final files = <MultipartFileData>[];
    if (draft.applicantPhotoBytes != null) {
      files.add(MultipartFileData(
        field: 'passportPhoto',
        name: draft.applicantPhotoName,
        contentType: draft.applicantPhotoMimeType,
        bytes: draft.applicantPhotoBytes!,
      ));
    }
    if (draft.hasCertificate && draft.certificateBytes != null) {
      files.add(MultipartFileData(
        field: 'certificate',
        name: draft.certificateName,
        contentType: draft.certificateMimeType,
        bytes: draft.certificateBytes!,
      ));
    }
    if (draft.paymentReceiptBytes != null) {
      files.add(MultipartFileData(
        field: 'paymentReceipt',
        name: draft.paymentReceiptName,
        contentType: draft.paymentReceiptMimeType,
        bytes: draft.paymentReceiptBytes!,
      ));
    }
    return _api.postMultipart('/applications', fields: fields, files: files);
  }

  Future<Map<String, dynamic>> previewPayment({
    required ApplicationDraft draft,
    required String phoneNumber,
  }) {
    return _api.post(
        '/payments/preview',
        {
          'registrationId': draft.reference,
          'phoneNumber': phoneNumber,
        },
        bearerToken: draft.paymentAccessToken);
  }

  Future<PaymentResult> initiatePayment({
    required ApplicationDraft draft,
    required String phoneNumber,
    required String idempotencyKey,
  }) async {
    final data = await _api.post(
        '/payments/initiate',
        {
          'registrationId': draft.reference,
          'phoneNumber': phoneNumber,
          'idempotencyKey': idempotencyKey,
        },
        bearerToken: draft.paymentAccessToken,
        responseTimeout: const Duration(seconds: 130));
    final payment = data['payment'];
    if (payment is! Map<String, dynamic>) {
      throw const ApiException('Payment response is invalid.');
    }
    return PaymentResult.fromJson(payment);
  }

  Future<PaymentResult> fetchPaymentStatus(ApplicationDraft draft) async {
    final data = await _api.get(
      '/payments/${Uri.encodeComponent(draft.paymentReferenceId)}/status',
      bearerToken: draft.paymentAccessToken,
    );
    final payment = data['payment'];
    if (payment is! Map<String, dynamic>) {
      throw const ApiException('Payment status response is invalid.');
    }
    return PaymentResult.fromJson(payment);
  }

  Future<Map<String, dynamic>> submitPaidApplication(ApplicationDraft draft) {
    return _api.post(
      '/applications/${Uri.encodeComponent(draft.reference)}/submit',
      const {},
      bearerToken: draft.paymentAccessToken,
    );
  }

  List<Faculty> getFaculties() {
    return fallbackFaculties();
  }

  List<Faculty> fallbackFaculties() {
    return const [
      Faculty(
        name: 'Medicine & Health Science',
        campus: 'Main Campus',
        departments: [
          'Medicine & General Surgery',
          'Nursing',
          'Midwifery',
          'Public Health',
          'Medical Laboratory Science',
          'BSc in Medical Radiography and Imaging Technology',
        ],
      ),
      Faculty(
        name: 'Computer & IT',
        campus: 'Campus 3',
        departments: [
          'Computer Application',
          'Computer Network & Security',
          'Computer Multi-Media',
          'BSc in Artificial Intelligence and Data Science',
        ],
      ),
      Faculty(
        name: 'Economics & Management',
        campus: 'Main Campus',
        departments: [
          'Business Administration',
          'Public Administration',
          'Banking & Finance',
          'Accounting',
          'Economics',
          'BSc in Business Analytics',
          'BSc in Social Work',
        ],
      ),
      Faculty(
        name: 'Engineering',
        campus: 'Campus 2',
        departments: [
          'Civil Engineering',
          'Electrical Engineering (Majoring in Power and Energy)',
          'Electrical Engineering (Majoring in Telecommunications and Networking)',
        ],
      ),
    ];
  }

  List<Map<String, String>> getAnnouncements() {
    return const [
      {
        'date': '2024-07-20T12:46:32',
        'title':
            'Jamhuriya University Announces Admission for Academic Year 2024-2025',
        'body':
            'Admission is open for Medicine, Computing, Engineering, and Economics programs.',
      },
      {
        'date': '2024-11-16T11:13:48',
        'title':
            'Empowering Digital Health: Somali Digital Health Conference 2024',
        'body':
            'JUST continues promoting innovation and professional development in health technology.',
      },
      {
        'date': '2024-07-18T11:29:40',
        'title':
            'Somali Cultural Festival: A Week of Heritage at Jamhuriya University',
        'body':
            'A vibrant celebration of Somali heritage with students, staff, and university partners.',
      },
    ];
  }
}
