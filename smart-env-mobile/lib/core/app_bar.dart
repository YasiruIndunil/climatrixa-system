import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'theme.dart';
import '../providers/providers.dart';

/// Call this from admin screens — passes the scaffoldKey via the callback
/// so there is no circular import with admin_shell.dart
PreferredSizeWidget climatrixaAppBar(
  BuildContext context,
  WidgetRef ref, {
  bool canPop = false,
  GlobalKey<ScaffoldState>? scaffoldKey,
}) {
  final dark = ref.watch(themeModeProvider) == ThemeMode.dark;
  return AppBar(
    backgroundColor: dark ? kGray950 : kGrayWhite,
    elevation: 0,
    scrolledUnderElevation: 0,
    leading: canPop
        ? IconButton(
            icon: Icon(Icons.arrow_back_ios_new_rounded,
                color: dark ? kGray400 : kGray600),
            onPressed: () => Navigator.of(context).pop(),
          )
        : Builder(builder: (ctx) => IconButton(
            icon: Icon(Icons.menu, color: dark ? kGray400 : kGray600),
            onPressed: () {
              if (scaffoldKey != null) {
                scaffoldKey.currentState?.openDrawer();
              } else {
                Scaffold.of(ctx).openDrawer();
              }
            },
          )),
    title: Row(mainAxisSize: MainAxisSize.min, children: [
      Container(
        width: 28, height: 28,
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [kTeal400, kTeal600]),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Icon(Icons.eco_rounded, size: 16, color: Colors.white),
      ),
      const SizedBox(width: 8),
      Text('Climatrixa',
          style: TextStyle(
              color: dark ? Colors.white : kGray900Text,
              fontWeight: FontWeight.w700,
              fontSize: 16)),
    ]),
    centerTitle: true,
    actions: [
      IconButton(
        icon: Icon(
          dark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
          color: dark ? kGray400 : kGray600,
        ),
        onPressed: () => ref.read(themeModeProvider.notifier).toggle(),
      ),
    ],
    bottom: PreferredSize(
      preferredSize: const Size.fromHeight(1),
      child: Container(color: dark ? kGray800 : kGray100, height: 1),
    ),
  );
}
