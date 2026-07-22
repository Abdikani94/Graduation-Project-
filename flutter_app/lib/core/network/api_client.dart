import 'dart:convert';
import 'dart:io';

class ApiException implements Exception {
  const ApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({HttpClient? httpClient})
      : _httpClient = httpClient ?? HttpClient();

  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000/api',
  );

  final HttpClient _httpClient;

  Future<Map<String, dynamic>> get(String path) {
    return _send('GET', path);
  }

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) {
    return _send('POST', path, body: body);
  }

  Future<Map<String, dynamic>> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('$baseUrl${path.startsWith('/') ? path : '/$path'}');
    final request = await _httpClient.openUrl(method, uri);
    request.headers.contentType = ContentType.json;
    request.headers.set(HttpHeaders.acceptHeader, 'application/json');

    if (body != null) {
      request.write(jsonEncode(body));
    }

    final response = await request.close().timeout(
          const Duration(seconds: 20),
          onTimeout: () => throw const ApiException(
            'Backend is not responding. Make sure the backend server is running.',
          ),
        );
    final text = await utf8.decoder.bind(response).join();
    final data = text.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(text) as Map<String, dynamic>;

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = data['error'];
      final message =
          error is Map<String, dynamic> ? error['message'] : data['message'];
      throw ApiException((message ?? 'Request failed').toString());
    }

    return data;
  }
}
