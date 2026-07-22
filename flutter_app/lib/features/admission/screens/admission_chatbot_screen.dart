import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_theme.dart';
import '../data/chatbot_repository.dart';

class AdmissionChatbotScreen extends StatefulWidget {
  const AdmissionChatbotScreen({super.key});

  @override
  State<AdmissionChatbotScreen> createState() => _AdmissionChatbotScreenState();
}

class _AdmissionChatbotScreenState extends State<AdmissionChatbotScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _repository = ChatbotRepository();
  final _messages = <_ChatMessage>[
    const _ChatMessage(
      text: '👋 Welcome to the JUST Admission Assistant! Ask me anything about admission — in English or Somali.',
      isUser: false,
      tag: 'Admission Office',
    ),
  ];
  bool _isLoading = false;

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final question = _controller.text.trim();
    if (question.isEmpty || _isLoading) return;
    final thinkingStartedAt = DateTime.now();

    setState(() {
      _messages.add(_ChatMessage(text: question, isUser: true));
      _controller.clear();
      _isLoading = true;
    });
    _scrollToBottom();

    try {
      final response = await _repository.ask(question);
      await _waitForThinking(thinkingStartedAt);
      if (!mounted) return;
      setState(() {
        _messages.add(
          _ChatMessage(
            text: response.answer,
            isUser: false,
            tag: response.categories.isNotEmpty
                ? response.categories.first
                : response.contextFound
                    ? 'JUST Admission'
                    : 'Admission Office',
          ),
        );
      });
    } on ChatbotException catch (error) {
      await _waitForThinking(thinkingStartedAt);
      if (!mounted) return;
      setState(() => _messages.add(_ChatMessage(
            text: error.message,
            isUser: false,
            isError: true,
          )));
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
        _scrollToBottom();
      }
    }
  }

  Future<void> _waitForThinking(DateTime startedAt) async {
    final remaining = const Duration(seconds: 5) - DateTime.now().difference(startedAt);
    if (!remaining.isNegative) await Future<void>.delayed(remaining);
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: AppColors.primaryBlue,
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
      ),
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Column(
            children: [
              const _ChatHeader(),
              Expanded(
                child: ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
                  itemCount: _messages.length + (_isLoading ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (_isLoading && index == _messages.length) {
                      return const _TypingBubble();
                    }
                    final message = _messages[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: message.isUser
                          ? _UserBubble(text: message.text)
                          : _AssistantBubble(
                              text: message.text,
                              tag: message.tag,
                              isError: message.isError,
                            ),
                    );
                  },
                ),
              ),
              _ChatInputBar(
                controller: _controller,
                isLoading: _isLoading,
                onSend: _send,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChatMessage {
  const _ChatMessage({
    required this.text,
    required this.isUser,
    this.tag = '',
    this.isError = false,
  });
  final String text;
  final bool isUser;
  final String tag;
  final bool isError;
}

class _ChatHeader extends StatelessWidget {
  const _ChatHeader();
  @override
  Widget build(BuildContext context) => Container(
        height: 68,
        color: AppColors.primaryBlue,
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: Row(children: [
          IconButton(
            onPressed: () => Navigator.of(context).maybePop(),
            icon: const Icon(Icons.chevron_left, color: Colors.white, size: 25),
          ),
          const Expanded(
            child: Text('Admission Assistant', textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w900)),
          ),
          const SizedBox(width: 48),
        ]),
      );
}

class _AssistantBubble extends StatelessWidget {
  const _AssistantBubble({required this.text, this.tag = '', this.isError = false});
  final String text;
  final String tag;
  final bool isError;
  @override
  Widget build(BuildContext context) => Align(
        alignment: Alignment.centerLeft,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 270),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isError ? AppColors.pastelRed : Colors.white,
            border: Border.all(color: isError ? AppColors.danger : AppColors.border),
            borderRadius: BorderRadius.circular(10),
            boxShadow: AppShadows.card,
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(text, style: TextStyle(
              color: isError ? AppColors.danger : AppColors.text,
              fontSize: 12, height: 1.35, fontWeight: FontWeight.w600,
            )),
            if (tag.isNotEmpty) ...[const SizedBox(height: 8), _Tag(text: tag)],
          ]),
        ),
      );
}

class _UserBubble extends StatelessWidget {
  const _UserBubble({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Align(
        alignment: Alignment.centerRight,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 270),
          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 12),
          decoration: BoxDecoration(color: AppColors.primaryBlue, borderRadius: BorderRadius.circular(10)),
          child: Text(text, style: const TextStyle(color: Colors.white, fontSize: 12, height: 1.35, fontWeight: FontWeight.w700)),
        ),
      );
}

class _Tag extends StatelessWidget {
  const _Tag({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(color: AppColors.pastelBlue, borderRadius: BorderRadius.circular(6)),
        child: Text(text, style: const TextStyle(color: AppColors.primaryBlue, fontSize: 10, fontWeight: FontWeight.w900)),
      );
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();
  @override
  Widget build(BuildContext context) => const _AssistantBubble(
        text: 'Chatbot is thinking…',
        tag: 'Please wait',
      );
}

class _ChatInputBar extends StatelessWidget {
  const _ChatInputBar({required this.controller, required this.isLoading, required this.onSend});
  final TextEditingController controller;
  final bool isLoading;
  final VoidCallback onSend;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
        decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: AppColors.border))),
        child: Row(children: [
          Expanded(
            child: SizedBox(
              height: 42,
              child: TextField(
                controller: controller,
                enabled: !isLoading,
                maxLength: 500,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => onSend(),
                decoration: InputDecoration(
                  hintText: 'Type your question...',
                  counterText: '',
                  hintStyle: const TextStyle(fontSize: 12),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            width: 42, height: 42,
            child: ElevatedButton(
              onPressed: isLoading ? null : onSend,
              style: ElevatedButton.styleFrom(
                padding: EdgeInsets.zero, backgroundColor: AppColors.justGreen,
                foregroundColor: Colors.white, elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
              ),
              child: const Icon(Icons.send, size: 18),
            ),
          ),
        ]),
      );
}
