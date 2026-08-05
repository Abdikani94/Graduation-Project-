import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'dart:typed_data';

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode, this.details});

  final String message;
  final int? statusCode;
  final Object? details;

  @override
  String toString() => message;
}

class MultipartFileData {
  const MultipartFileData({
    required this.field,
    required this.name,
    required this.contentType,
    required this.bytes,
  });

  final String field;
  final String name;
  final String contentType;
  final Uint8List bytes;
}

class ApiClient {
  ApiClient({HttpClient? httpClient})
      : _httpClient = httpClient ?? HttpClient();

  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5055/api',
  );

  final HttpClient _httpClient;

  Future<Map<String, dynamic>> get(String path, {String? bearerToken}) {
    return _send('GET', path, bearerToken: bearerToken);
  }

  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    String? bearerToken,
    Duration responseTimeout = const Duration(seconds: 35),
  }) {
    return _send('POST', path,
        body: body,
        bearerToken: bearerToken,
        responseTimeout: responseTimeout);
  }

  Future<Map<String, dynamic>> postMultipart(
    String path, {
    required Map<String, String> fields,
    required List<MultipartFileData> files,
    String? bearerToken,
  }) async {
    final boundary =
        '----just-mobile-${DateTime.now().microsecondsSinceEpoch}-${Random.secure().nextInt(1 << 32)}';
    final request = await _open('POST', path, bearerToken: bearerToken);
    request.headers.contentType = ContentType(
      'multipart',
      'form-data',
      parameters: {'boundary': boundary},
    );

    void writeText(String value) => request.add(utf8.encode(value));
    for (final entry in fields.entries) {
      writeText('--$boundary\r\n');
      writeText(
        'Content-Disposition: form-data; name="${_escape(entry.key)}"\r\n\r\n',
      );
      writeText('${entry.value}\r\n');
    }
    for (final file in files) {
      writeText('--$boundary\r\n');
      writeText(
        'Content-Disposition: form-data; name="${_escape(file.field)}"; filename="${_escape(file.name)}"\r\n',
      );
      writeText('Content-Type: ${file.contentType}\r\n\r\n');
      request.add(file.bytes);
      writeText('\r\n');
    }
    writeText('--$boundary--\r\n');
    return _read(request);
  }

  Future<Map<String, dynamic>> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
    String? bearerToken,
    Duration responseTimeout = const Duration(seconds: 35),
  }) async {
    final request = await _open(method, path, bearerToken: bearerToken);
    request.headers.contentType = ContentType.json;
    if (body != null) request.write(jsonEncode(body));
    return _read(request, responseTimeout: responseTimeout);
  }

  Future<HttpClientRequest> _open(
    String method,
    String path, {
    String? bearerToken,
  }) async {
    try {
      final uri =
          Uri.parse('$baseUrl${path.startsWith('/') ? path : '/$path'}');
      final request = await _httpClient.openUrl(method, uri).timeout(
            const Duration(seconds: 20),
          );
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      if (bearerToken != null && bearerToken.isNotEmpty) {
        request.headers
            .set(HttpHeaders.authorizationHeader, 'Bearer $bearerToken');
      }
      return request;
    } on SocketException {
      throw const ApiException(
          'No internet connection or backend unavailable.');
    } on TimeoutException {
      throw const ApiException('The request timed out. Please try again.');
    }
  }

  Future<Map<String, dynamic>> _read(
    HttpClientRequest request, {
    Duration responseTimeout = const Duration(seconds: 35),
  }) async {
    try {
      final response =
          await request.close().timeout(responseTimeout);
      final text = await utf8.decoder.bind(response).join();
      final decoded = text.isEmpty ? <String, dynamic>{} : jsonDecode(text);
      if (decoded is! Map<String, dynamic>) {
        throw const ApiException(
            'The backend returned an unexpected response.');
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        final error = decoded['error'];
        final message = error is Map ? error['message'] : decoded['message'];
        final details = error is Map ? error['details'] : null;
        throw ApiException(
          (message ?? 'Request failed').toString(),
          statusCode: response.statusCode,
          details: details,
        );
      }
      return decoded;
    } on ApiException {
      rethrow;
    } on SocketException {
      throw const ApiException('The network connection was interrupted.');
    } on TimeoutException {
      throw const ApiException('The request timed out. Please try again.');
    } on FormatException {
      throw const ApiException('The backend returned invalid JSON.');
    }
  }

  static String _escape(String value) =>
      value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}
