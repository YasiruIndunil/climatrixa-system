import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../../providers/providers.dart';
import 'public_shell.dart';

class AlertsScreen extends ConsumerWidget {
  const AlertsScreen({super.key});
  @override Widget build(BuildContext context, WidgetRef ref) {
    final alertsAsync = ref.watch(alertsProvider);
    final dark = ref.watch(themeModeProvider) == ThemeMode.dark;
    final bg = dark ? kGray950 : kGray50;
    final card = dark ? kGray900 : kGrayWhite;
    final bd = dark ? kGray800 : kGray100;
    final textP = dark ? Colors.white : kGray900Text;
    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(backgroundColor: dark ? kGray950 : kGrayWhite, elevation: 0,
        leading: Builder(builder: (ctx) => IconButton(icon: Icon(Icons.menu, color: dark ? kGray400 : kGray600), onPressed: () => PublicShell.scaffoldKey.currentState?.openDrawer())),
        title: Text('Alerts', style: TextStyle(color: textP, fontWeight: FontWeight.w700)),
        bottom: PreferredSize(preferredSize: const Size.fromHeight(1), child: Container(color: dark ? kGray800 : kGray100, height: 1))),
      body: alertsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: kTeal600)),
        error: (e,_) => Center(child: Text('Error: $e', style: const TextStyle(color: kGray500))),
        data: (events) => RefreshIndicator(color: kTeal600, onRefresh: () => ref.read(alertsProvider.notifier).refresh(),
          child: events.isEmpty ? Center(child: Text('No alerts', style: TextStyle(color: dark ? kGray500 : kGray400)))
          : ListView.builder(padding: const EdgeInsets.all(16), itemCount: events.length, itemBuilder: (_, i) {
              final a = events[i];
              final c = a.isAnomaly ? kViolet600 : a.isPredicted ? kAlertAmber : kRed500;
              return Container(margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: a.acknowledged ? bd : c.withValues(alpha: 0.4))),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Icon(a.isAnomaly ? Icons.manage_search : a.isPredicted ? Icons.auto_awesome : Icons.warning_amber_rounded, size: 16, color: c),
                  const SizedBox(width: 8),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(a.message, style: TextStyle(fontSize: 12, color: textP)),
                    const SizedBox(height: 3),
                    Text(a.triggeredAt, style: const TextStyle(fontSize: 10, color: kGray500)),
                  ])),
                  if (!a.acknowledged) GestureDetector(onTap: () => ref.read(alertsProvider.notifier).acknowledge(a.id),
                    child: Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: kTeal600, borderRadius: BorderRadius.circular(8)),
                      child: const Text('ACK', style: TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.w700)))),
                ]));
            }))));
  }
}