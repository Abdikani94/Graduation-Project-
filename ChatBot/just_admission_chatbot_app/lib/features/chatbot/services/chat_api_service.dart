import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/config/api_config.dart';
import '../models/chat_request.dart';
import '../models/chat_response.dart';

class ChatApiService {
  final http.Client _client;

  ChatApiService({
    http.Client? client,
  }) : _client = client ?? http.Client();

  Future<ChatResponse> askQuestion(ChatRequest request) async {
    final uri = Uri.parse(ApiConfig.chatAskEndpoint);

    try {
      final response = await _client
          .post(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: jsonEncode(request.toJson()),
          )
          .timeout(const Duration(seconds: 60));

      if (response.statusCode != 200) {
        throw Exception(
          'Server error ${response.statusCode}: ${response.body}',
        );
      }

      final decoded = jsonDecode(response.body) as Map<String, dynamic>;

      return ChatResponse.fromJson(decoded);
    } catch (error) {
      throw Exception('Failed to connect to chatbot API: $error');
    }
  }
}