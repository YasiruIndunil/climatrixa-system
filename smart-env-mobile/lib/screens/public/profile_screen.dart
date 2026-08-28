import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../providers/providers.dart';
import 'public_shell.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});
  @override Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final dark = ref.watch(themeModeProvider) == ThemeMode.dark;
    final bg = dark ? kGray950 : kGray50;
    final card = dark ? kGray900 : kGrayWhite;
    final bd = dark ? kGray800 : kGray100;
    final textP = dark ? Colors.white : kGray900Text;
    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(backgroundColor: dark ? kGray950 : kGrayWhite, elevation: 0,
        leading: Builder(builder: (ctx) => IconButton(icon: Icon(Icons.menu, color: dark ? kGray400 : kGray600), onPressed: () => PublicShell.scaffoldKey.currentState?.openDrawer())),
        title: Text('Profile', style: TextStyle(color: textP, fontWeight: FontWeight.w700)),
        bottom: PreferredSize(preferredSize: const Size.fromHeight(1), child: Container(color: dark ? kGray800 : kGray100, height: 1))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Container(padding: const EdgeInsets.all(20), decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(16), border: Border.all(color: bd)),
          child: Column(children: [
            CircleAvatar(radius: 32, backgroundColor: kTeal600,
              child: Text((user?.email.isNotEmpty == true ? user!.email[0].toUpperCase() : 'U'),
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 22))),
            const SizedBox(height: 12),
            Text(user?.displayName ?? user?.email ?? '—', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: textP)),
            const SizedBox(height: 4),
            Text(user?.email ?? '', style: const TextStyle(fontSize: 12, color: kGray500)),
            const SizedBox(height: 8),
            Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
              decoration: BoxDecoration(color: kTeal600.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
              child: Text(user?.isAdmin == true ? 'Admin' : 'Public User',
                style: const TextStyle(fontSize: 11, color: kTeal500, fontWeight: FontWeight.w600))),
            const SizedBox(height: 20),
            SizedBox(width: double.infinity, child: OutlinedButton.icon(
              onPressed: () async { await ref.read(authProvider.notifier).logout(); if (context.mounted) context.go('/login'); },
              icon: const Icon(Icons.logout_rounded, size: 16, color: kRed500),
              label: const Text('Sign out', style: TextStyle(color: kRed500)),
              style: OutlinedButton.styleFrom(side: const BorderSide(color: kRed500),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))))),
          ])),
      ]),
    );
  }
}