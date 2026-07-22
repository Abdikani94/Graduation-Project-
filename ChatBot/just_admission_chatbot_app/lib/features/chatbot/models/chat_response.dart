import 'retrieved_document.dart';

class ChatResponse {
  final String question;
  final String answer;
  final bool contextFound;
  final List<RetrievedDocument> retrievedDocuments;

  const ChatResponse({
    required this.question,
    required this.answer,
    required this.contextFound,
    required this.retrievedDocuments,
  });

  factory ChatResponse.fromJson(Map<String, dynamic> json) {
    final documents = json['retrieved_documents'] as List<dynamic>? ?? [];

    return ChatResponse(
      question: json['question']?.toString() ?? '',
      answer: json['answer']?.toString() ?? '',
      contextFound: json['context_found'] == true,
      retrievedDocuments: documents
          .map((item) => RetrievedDocument.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}