package com.laikamusic

import android.net.Uri
import android.provider.MediaStore
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray

class AudioScannerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AudioScanner"

  @ReactMethod
  fun scanAudioFiles(promise: Promise) {
    Thread {
      try {
        val resolver = reactApplicationContext.contentResolver
        val audioUri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI

        val projection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.ALBUM_ID,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.IS_MUSIC,
        )

        val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0"
        val sortOrder = "${MediaStore.Audio.Media.TITLE} COLLATE NOCASE ASC"

        val results: WritableArray = Arguments.createArray()

        resolver.query(audioUri, projection, selection, null, sortOrder)?.use { cursor ->
          val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
          val titleColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
          val artistColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
          val albumColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
          val albumIdColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
          val durationColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)

          while (cursor.moveToNext()) {
            val id = cursor.getLong(idColumn)
            val title = cursor.getString(titleColumn) ?: "Unknown Title"
            val artist = cursor.getString(artistColumn) ?: "Unknown Artist"
            val album = cursor.getString(albumColumn) ?: ""
            val albumId = cursor.getLong(albumIdColumn)
            val duration = cursor.getLong(durationColumn)

            val contentUri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
                .buildUpon()
                .appendPath(id.toString())
                .build()

            // Album art URI — works on Android 10+ via MediaStore, fallback for older
            val artworkUri = Uri.parse("content://media/external/audio/albumart/$albumId").toString()

            val song = Arguments.createMap().apply {
              putString("id", contentUri.toString())
              putString("title", title)
              putString("artist", artist)
              putString("album", album)
              putString("artwork", artworkUri)
              putDouble("duration", duration.toDouble())
              putString("path", contentUri.toString())
            }

            results.pushMap(song)
          }
        }

        promise.resolve(results)
      } catch (error: Exception) {
        promise.reject("SCAN_FAILED", error.message, error)
      }
    }.start()
  }
}
