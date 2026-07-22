import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_app/main.dart';

void main() {
  testWidgets('shows admission mobile shell', (WidgetTester tester) async {
    await tester.pumpWidget(const JustMobileApp());

    expect(find.text('JUST'), findsWidgets);
    expect(find.text('Admission'), findsOneWidget);
    expect(find.byIcon(Icons.assignment_outlined), findsOneWidget);
  });
}
