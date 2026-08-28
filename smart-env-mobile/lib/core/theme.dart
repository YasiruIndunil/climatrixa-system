// Climatrixa — exact web Tailwind palette in Flutter
// Source: web screenshots + color reference guide

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// ── Exact web hex values ───────────────────────────────────────────────────────

// Teal (primary brand)
const kTeal400 = Color(0xFF2DD4BF);
const kTeal500 = Color(0xFF14B8A6);
const kTeal600 = Color(0xFF0D9488); // primary button, active nav
const kTeal700 = Color(0xFF0F766E); // hover

// Dark mode backgrounds
const kGray950 = Color(0xFF030712); // page bg dark
const kGray900 = Color(0xFF111827); // card bg dark
const kGray800 = Color(0xFF1F2937); // card border dark
const kGray700 = Color(0xFF374151);
const kGray600 = Color(0xFF4B5563);
const kGray500 = Color(0xFF6B7280); // body text dark
const kGray400 = Color(0xFF9CA3AF); // label text dark
const kGray300 = Color(0xFFD1D5DB);

// Light mode backgrounds
const kGray50  = Color(0xFFF9FAFB); // page bg light
const kGray100 = Color(0xFFF3F4F6); // card border light
const kGrayWhite = Color(0xFFFFFFFF); // card bg light

// Light text
const kGray900Text = Color(0xFF111827); // heading light

// Admin violet
const kViolet600 = Color(0xFF7C3AED);
const kViolet700 = Color(0xFF6D28D9);
const kViolet500 = Color(0xFF8B5CF6);
const kViolet400 = Color(0xFFA78BFA);

// Metric colours
const kRed500    = Color(0xFFEF4444); // temperature
const kBlue500   = Color(0xFF3B82F6); // humidity
const kAQITeal   = Color(0xFF14B8A6); // AQI (teal-500)
const kPurple500 = Color(0xFFA855F7); // pressure

// Alert type colours
const kAlertRed    = Color(0xFFEF4444); // threshold
const kAlertOrange = Color(0xFFF97316); // threshold low
const kAlertAmber  = Color(0xFFF59E0B); // AI predicted
const kAlertPurple = Color(0xFFA855F7); // anomaly

// AQI badge
const kGreen100 = Color(0xFFDCFCE7); const kGreen700 = Color(0xFF15803D);
const kYellow100= Color(0xFFFEF9C3); const kYellow700= Color(0xFFA16207);
const kRed100   = Color(0xFFFEE2E2); const kRed700   = Color(0xFFB91C1C);

// Map pins
const kPinGreen  = Color(0xFF22C55E);
const kPinRed    = Color(0xFFEF4444);
const kPinAmber  = Color(0xFFF59E0B);
const kPinGray   = Color(0xFF9CA3AF);

// ── AppColors helper ────────────────────────────────────────────────────────────
class AppColors {
  static const primary      = kTeal600;
  static const primaryHover = kTeal700;
  static const admin        = kViolet600;
}

// ── Light theme ─────────────────────────────────────────────────────────────────
ThemeData get lightTheme => ThemeData(
  useMaterial3: true,
  brightness: Brightness.light,
  colorScheme: ColorScheme.fromSeed(
    seedColor: kTeal600,
    brightness: Brightness.light,
    primary: kTeal600,
    onPrimary: Colors.white,
    surface: kGrayWhite,
    onSurface: kGray900Text,
  ),
  scaffoldBackgroundColor: kGray50,
  cardColor: kGrayWhite,
  cardTheme: CardThemeData(
    color: kGrayWhite,
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
      side: const BorderSide(color: kGray100),
    ),
    margin: EdgeInsets.zero,
  ),
  appBarTheme: const AppBarTheme(
    backgroundColor: kGrayWhite,
    foregroundColor: kGray900Text,
    elevation: 0,
    scrolledUnderElevation: 0,
    surfaceTintColor: Colors.transparent,
    systemOverlayStyle: SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
    titleTextStyle: TextStyle(
      color: kGray900Text, fontSize: 15, fontWeight: FontWeight.w700,
    ),
    iconTheme: IconThemeData(color: kGray700),
    shape: Border(bottom: BorderSide(color: kGray100)),
  ),
  bottomNavigationBarTheme: const BottomNavigationBarThemeData(
    backgroundColor: kGrayWhite,
    selectedItemColor: kTeal600,
    unselectedItemColor: kGray400,
    type: BottomNavigationBarType.fixed,
    elevation: 0,
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: kTeal600,
      foregroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      padding: const EdgeInsets.symmetric(vertical: 14),
      textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      elevation: 0,
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: kGrayWhite,
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: kGray100),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: kGray100),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: kTeal600, width: 1.5),
    ),
    hintStyle: const TextStyle(color: kGray400, fontSize: 14),
    labelStyle: const TextStyle(color: kGray500, fontSize: 11,
        fontWeight: FontWeight.w600, letterSpacing: .5),
  ),
  dividerTheme: const DividerThemeData(color: kGray100, thickness: 1, space: 0),
  textTheme: const TextTheme(
    headlineLarge:  TextStyle(color: kGray900Text, fontWeight: FontWeight.w700, fontSize: 22),
    titleLarge:     TextStyle(color: kGray900Text, fontWeight: FontWeight.w600, fontSize: 15),
    titleMedium:    TextStyle(color: kGray900Text, fontWeight: FontWeight.w500, fontSize: 13),
    bodyLarge:      TextStyle(color: kGray900Text, fontSize: 14),
    bodyMedium:     TextStyle(color: kGray600,     fontSize: 13),
    bodySmall:      TextStyle(color: kGray400,     fontSize: 12),
    labelLarge:     TextStyle(color: kGray500,     fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: .5),
    labelSmall:     TextStyle(color: kGray400,     fontSize: 10),
  ),
);

// ── Dark theme (matches web exactly) ────────────────────────────────────────────
ThemeData get darkTheme => ThemeData(
  useMaterial3: true,
  brightness: Brightness.dark,
  colorScheme: ColorScheme.fromSeed(
    seedColor: kTeal600,
    brightness: Brightness.dark,
    primary: kTeal500,
    onPrimary: Colors.white,
    surface: kGray900,
    onSurface: Colors.white,
    outline: kGray800,
  ),
  scaffoldBackgroundColor: kGray950,  // #030712
  cardColor: kGray900,                // #111827
  cardTheme: CardThemeData(
    color: kGray900,
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
      side: const BorderSide(color: kGray800),
    ),
    margin: EdgeInsets.zero,
  ),
  appBarTheme: const AppBarTheme(
    backgroundColor: kGray950,
    foregroundColor: Colors.white,
    elevation: 0,
    scrolledUnderElevation: 0,
    surfaceTintColor: Colors.transparent,
    systemOverlayStyle: SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
    titleTextStyle: TextStyle(
      color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700,
    ),
    iconTheme: IconThemeData(color: kGray400),
    shape: Border(bottom: BorderSide(color: kGray800)),
  ),
  bottomNavigationBarTheme: const BottomNavigationBarThemeData(
    backgroundColor: kGray950,
    selectedItemColor: kTeal500,
    unselectedItemColor: kGray600,
    type: BottomNavigationBarType.fixed,
    elevation: 0,
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: kTeal600,
      foregroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      padding: const EdgeInsets.symmetric(vertical: 14),
      textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      elevation: 0,
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: kGray800,
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: kGray700),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: kGray700),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: kTeal500, width: 1.5),
    ),
    hintStyle: const TextStyle(color: kGray600, fontSize: 14),
    labelStyle: const TextStyle(color: kGray500, fontSize: 11,
        fontWeight: FontWeight.w600, letterSpacing: .5),
  ),
  dividerTheme: const DividerThemeData(color: kGray800, thickness: 1, space: 0),
  textTheme: const TextTheme(
    headlineLarge:  TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 22),
    titleLarge:     TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15),
    titleMedium:    TextStyle(color: Colors.white, fontWeight: FontWeight.w500, fontSize: 13),
    bodyLarge:      TextStyle(color: Colors.white, fontSize: 14),
    bodyMedium:     TextStyle(color: kGray500,     fontSize: 13),
    bodySmall:      TextStyle(color: kGray500,     fontSize: 12),
    labelLarge:     TextStyle(color: kGray400,     fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: .5),
    labelSmall:     TextStyle(color: kGray600,     fontSize: 10),
  ),
);

// ── Admin variants ───────────────────────────────────────────────────────────────
ThemeData get adminLightTheme => lightTheme.copyWith(
  appBarTheme: lightTheme.appBarTheme.copyWith(
    backgroundColor: kViolet600,
    foregroundColor: Colors.white,
    iconTheme: const IconThemeData(color: Colors.white),
    actionsIconTheme: const IconThemeData(color: Colors.white),
    titleTextStyle: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700),
    shape: null,
    systemOverlayStyle: const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
  ),
);

ThemeData get adminDarkTheme => darkTheme.copyWith(
  appBarTheme: darkTheme.appBarTheme.copyWith(
    backgroundColor: kViolet600,
    foregroundColor: Colors.white,
    iconTheme: const IconThemeData(color: Colors.white),
    actionsIconTheme: const IconThemeData(color: Colors.white),
  ),
);
