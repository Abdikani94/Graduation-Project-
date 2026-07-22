class RetrievedDocument {
  final String id;
  final String question;
  final String answer;
  final String category;
  final String content;
  final double? distance;
  final Map<String, dynamic> metadata;

  const RetrievedDocument({
    required this.id,
    required this.question,
    required this.answer,
    required this.category,
    required this.content,
    required this.distance,
    required this.metadata,
  });

  factory RetrievedDocument.fromJson(Map<String, dynamic> json) {
    return RetrievedDocument(
      id: json['id']?.toString() ?? '',
      question: json['question']?.toString() ?? '',
      answer: json['answer']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
      distance: json['distance'] == null
          ? null
          : (json['distance'] as num).toDouble(),
      metadata: Map<String, dynamic>.from(json['metadata'] ?? {}),
    );
  }
}