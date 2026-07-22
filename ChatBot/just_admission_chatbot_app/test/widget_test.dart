import 'package:flutter_test/flutter_test.dart';
import 'package:just_admission_chatbot_app/main.dart';

void main() {
  testWidgets('App starts successfully', (WidgetTester tester) async {
    await tester.pumpWidget(const JustAdmissionChatbotApp());

    expect(find.text('JUST Admission Chatbot'), findsOneWidget);
    expect(find.textContaining('JUST Admission Chatbot'), findsWidgets);
  });
}