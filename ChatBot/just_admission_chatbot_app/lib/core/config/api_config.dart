class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'CHATBOT_API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8001',
  );
  static const String chatAskEndpoint = '$baseUrl/api/v1/chat/ask';
}
