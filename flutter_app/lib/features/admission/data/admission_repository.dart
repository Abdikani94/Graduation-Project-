import '../../../core/network/api_client.dart';
import '../models/admission_models.dart';

class AdmissionRepository {
  const AdmissionRepository({this.apiClient});

  final ApiClient? apiClient;

  ApiClient get _api => apiClient ?? ApiClient();

  Future<List<Faculty>> fetchFaculties() async {
    try {
      final data = await _api.get('/options');
      final faculties = data['faculties'];
      if (faculties is List) {
        final parsed = faculties
            .whereType<Map<String, dynamic>>()
            .map(Faculty.fromJson)
            .where((faculty) =>
                faculty.name.isNotEmpty && faculty.departments.isNotEmpty)
            .toList();
        if (parsed.isNotEmpty) return parsed;
      }
    } catch (_) {
      return fallbackFaculties();
    }

    return fallbackFaculties();
  }

  Future<Map<String, dynamic>> submitApplication(ApplicationDraft draft) {
    return _api.post('/applications', draft.toApiPayload());
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
          'MBBS',
          'Nursing',
          'Midwifery',
          'Public Health',
          'Medical Laboratory Science'
        ],
      ),
      Faculty(
        name: 'Computer Science & IT',
        campus: 'Campus 3',
        departments: [
          'Computer Application',
          'Computer Networking & Security',
          'Computer Multimedia',
          'Software Engineering'
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
          'Economics'
        ],
      ),
      Faculty(
        name: 'Engineering',
        campus: 'Campus 2',
        departments: [
          'Civil Engineering',
          'Electrical Engineering',
          'Biomedical Engineering'
        ],
      ),
      Faculty(
        name: 'Agro-Veterinary',
        campus: 'Main Campus',
        departments: ['Agricultural', 'Veterinary'],
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
            'Admission is open for Medicine, Computing, Engineering, Economics, and Agro-Veterinary programs.',
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
