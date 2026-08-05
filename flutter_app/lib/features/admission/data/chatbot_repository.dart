import 'dart:convert';
import 'dart:io';

import '../models/chatbot_models.dart';

class ChatbotException implements Exception {
  const ChatbotException(this.message);
  final String message;

  @override
  String toString() => message;
}

class ChatbotRepository {
  ChatbotRepository({HttpClient? httpClient})
      : _httpClient = httpClient ?? HttpClient();

  static const baseUrl = String.fromEnvironment(
    'CHATBOT_API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8025/api/v1',
  );

  final HttpClient _httpClient;

  Future<ChatbotResponse> ask(String question) async {
    try {
      final uri = Uri.parse('${baseUrl.replaceAll(RegExp(r'/$'), '')}/chat/ask');
      final request = await _httpClient.postUrl(uri);
      request.headers.contentType = ContentType.json;
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.write(jsonEncode({'question': question.trim(), 'top_k': 3}));

      final response = await request.close().timeout(const Duration(seconds: 60));
      final text = await utf8.decoder.bind(response).join();
      final data = text.isEmpty
          ? <String, dynamic>{}
          : jsonDecode(text) as Map<String, dynamic>;

      if (response.statusCode < 200 || response.statusCode >= 300) {
        final detail = data['detail'];
        throw ChatbotException(
          detail is String ? detail : 'The admission assistant is unavailable.',
        );
      }

      final result = ChatbotResponse.fromJson(data);
      if (result.answer.trim().isEmpty) {
        throw const ChatbotException(
          'The admission assistant returned an empty response.',
        );
      }
      return result;
    } on ChatbotException {
      rethrow;
    } on SocketException {
      throw const ChatbotException(
        'Chatbot-ka hadda lama xiriiri karo. Fadlan mar kale isku day.',
      );
    } on HttpException {
      throw const ChatbotException(
        'Chatbot-ka hadda lama xiriiri karo. Fadlan mar kale isku day.',
      );
    } on FormatException {
      throw const ChatbotException('Chatbot-ka wuxuu soo celiyay jawaab aan sax ahayn.');
    }
  }
}
