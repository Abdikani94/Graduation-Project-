class ChatbotResponse {
  const ChatbotResponse({
    required this.answer,
    required this.contextFound,
    required this.categories,
  });

  final String answer;
  final bool contextFound;
  final List<String> categories;

  factory ChatbotResponse.fromJson(Map<String, dynamic> json) {
    final documents = json['retrieved_documents'];
    final categories = <String>{};
    if (documents is List) {
      for (final document in documents) {
        if (document is Map) {
          final category = document['category']?.toString().trim() ?? '';
          if (category.isNotEmpty) categories.add(category);
        }
      }
    }
    return ChatbotResponse(
      answer: json['answer']?.toString() ?? '',
      contextFound: json['context_found'] == true,
      categories: categories.toList(),
    );
  }
}

