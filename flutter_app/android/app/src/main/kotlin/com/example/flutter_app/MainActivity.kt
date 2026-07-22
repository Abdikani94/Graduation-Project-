package com.example.flutter_app

import android.app.Activity
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.provider.OpenableColumns
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channelName = "just_admission/document_picker"
    private val photoRequestCode = 4101
    private val certificateRequestCode = 4102
    private var pendingResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
                if (pendingResult != null) {
                    result.error("PICKER_BUSY", "A picker is already open.", null)
                    return@setMethodCallHandler
                }

                when (call.method) {
                    "pickApplicantPhoto" -> openPicker(
                        result = result,
                        requestCode = photoRequestCode,
                        mimeType = "image/*",
                        extraMimeTypes = arrayOf("image/jpeg", "image/png", "image/webp")
                    )
                    "pickCertificate" -> openPicker(
                        result = result,
                        requestCode = certificateRequestCode,
                        mimeType = "*/*",
                        extraMimeTypes = arrayOf(
                            "application/pdf",
                            "image/jpeg",
                            "image/png",
                            "image/webp"
                        )
                    )
                    else -> result.notImplemented()
                }
            }
    }

    private fun openPicker(
        result: MethodChannel.Result,
        requestCode: Int,
        mimeType: String,
        extraMimeTypes: Array<String>
    ) {
        pendingResult = result
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = mimeType
            putExtra(Intent.EXTRA_MIME_TYPES, extraMimeTypes)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
        }
        startActivityForResult(intent, requestCode)
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != photoRequestCode && requestCode != certificateRequestCode) return

        val result = pendingResult ?: return
        pendingResult = null

        if (resultCode != Activity.RESULT_OK || data?.data == null) {
            result.success(null)
            return
        }

        val uri = data.data!!
        try {
            contentResolver.takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION
            )
        } catch (_: SecurityException) {
            // Some providers do not grant persistable permission; current access is enough.
        }

        result.success(
            mapOf(
                "uri" to uri.toString(),
                "name" to displayName(uri),
                "mimeType" to (contentResolver.getType(uri) ?: "")
            )
        )
    }

    private fun displayName(uri: Uri): String {
        var cursor: Cursor? = null
        return try {
            cursor = contentResolver.query(uri, null, null, null, null)
            val nameIndex = cursor?.getColumnIndex(OpenableColumns.DISPLAY_NAME) ?: -1
            if (cursor != null && cursor.moveToFirst() && nameIndex >= 0) {
                cursor.getString(nameIndex)
            } else {
                uri.lastPathSegment ?: "Selected file"
            }
        } finally {
            cursor?.close()
        }
    }
}
