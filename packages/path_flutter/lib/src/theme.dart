import 'package:flutter/material.dart';

abstract final class PathTheme {
  static const padding = 16.0;
  static const gap = 12.0;
  static const wide = 760.0;
  static ThemeData get material =>
      ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo));
  static ThemeData get dark => ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: Colors.indigo,
      brightness: Brightness.dark,
    ),
  );
}
