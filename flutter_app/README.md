# Flutter App

Starter Flutter app for the graduation project.

## Run

```bash
flutter pub get
flutter run
```

If platform folders such as `android`, `ios`, or `web` are missing, run this inside the folder:

```bash
flutter create .
```

## Chatbot API

The Android emulator uses `http://10.0.2.2:8025/api/v1` for the chatbot and
`http://10.0.2.2:5055/api` for the main admission API by default. Override
the chatbot URL for a physical device or production without changing Dart code:

```bash
flutter run --dart-define=API_BASE_URL=http://YOUR-LAN-IP:5055/api --dart-define=CHATBOT_API_BASE_URL=http://YOUR-LAN-IP:8025/api/v1
flutter build apk --dart-define=CHATBOT_API_BASE_URL=https://YOUR-DOMAIN/api/v1
```
