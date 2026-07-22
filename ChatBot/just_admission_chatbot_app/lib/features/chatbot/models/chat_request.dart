class ChatRequest {
  final String question;
  final int topK;

  const ChatRequest({
    required this.question,
    this.topK = 3,
  });

  Map<String, dynamic> toJson() {
    return {
      'question': question,
      'top_k': topK,
    };
  }
}