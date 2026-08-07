import 'package:flutter/material.dart';
import 'constants.dart';

class AppTheme {
  // ── Public (teal) ──────────────────────────────────────────────────────────
  static ThemeData get light => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(kPublicSeed),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF9FAFB),
        cardColor: Colors.white,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF1F2937),
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          titleTextStyle: TextStyle(
            color: Color(0xFF1F2937),
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(kPublicSeed), width: 1.5),
          ),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF1F2937),
            foregroundColor: Colors.white,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(vertical: 14),
            textStyle: const TextStyle(
                fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 1),
          ),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Colors.white,
          selectedItemColor: Color(kPublicSeed),
          unselectedItemColor: Color(0xFF9CA3AF),
          type: BottomNavigationBarType.fixed,
          elevation: 0,
        ),
      );

  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(kPublicSeed),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF030712),
        cardColor: const Color(0xFF111827),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF111827),
          foregroundColor: Colors.white,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          titleTextStyle: TextStyle(
            color: Colors.white,
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      );

  // ── Admin (purple) ─────────────────────────────────────────────────────────
  static ThemeData get adminLight => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(kAdminSeed),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF9FAFB),
        cardColor: Colors.white,
        appBarTheme: AppBarTheme(
          backgroundColor: const Color(kAdminSeed),
          foregroundColor: Colors.white,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          titleTextStyle: const TextStyle(
            color: Colors.white,
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(kAdminSeed),
            foregroundColor: Colors.white,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
        ),
      );
}
