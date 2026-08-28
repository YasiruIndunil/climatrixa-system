import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';
import 'public_shell.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});
  @override Widget build(BuildContext context, WidgetRef ref) {
    final sensors  = ref.watch(sensorsProvider).valueOrNull ?? [];
    final readings = ref.watch(readingsProvider).valueOrNull ?? [];
    final alerts   = ref.watch(alertsProvider).valueOrNull ?? [];
    final unread   = ref.watch(unreadAlertCountProvider);
    final dark     = ref.watch(themeModeProvider) == ThemeMode.dark;
    final bg   = dark ? kGray950 : kGray50;
    final card = dark ? kGray900 : kGrayWhite;
    final bd   = dark ? kGray800 : kGray100;
    final textP = dark ? Colors.white : kGray900Text;

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: dark ? kGray950 : kGrayWhite,
        elevation: 0,
        leading: Builder(builder: (ctx) => IconButton(
          icon: Icon(Icons.menu, color: dark ? kGray400 : kGray600),
          onPressed: () => PublicShell.scaffoldKey.currentState?.openDrawer())),
        title: Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 26, height: 26,
            decoration: BoxDecoration(gradient: const LinearGradient(colors: [kTeal400, kTeal600]), borderRadius: BorderRadius.circular(7)),
            child: const Icon(Icons.eco_rounded, size: 14, color: Colors.white)),
          const SizedBox(width: 7),
          Text('Climatrixa', style: TextStyle(color: dark ? Colors.white : kGray900Text, fontWeight: FontWeight.w700, fontSize: 15)),
        ]),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(dark ? Icons.light_mode_outlined : Icons.dark_mode_outlined, color: dark ? kGray400 : kGray600),
            onPressed: () => ref.read(themeModeProvider.notifier).toggle()),
          if (unread > 0) Stack(clipBehavior: Clip.none, children: [
            IconButton(icon: const Icon(Icons.notifications_outlined), onPressed: () => context.go('/dashboard/alerts')),
            Positioned(top: 6, right: 6, child: Container(width: 16, height: 16,
              decoration: const BoxDecoration(color: kRed500, shape: BoxShape.circle),
              child: Center(child: Text('$unread', style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w700))))),
          ]),
        ],
        bottom: PreferredSize(preferredSize: const Size.fromHeight(1), child: Container(color: dark ? kGray800 : kGray100, height: 1)),
      ),
      body: RefreshIndicator(
        color: kTeal600,
        onRefresh: () async { ref.invalidate(sensorsProvider); ref.invalidate(readingsProvider); },
        child: ListView(padding: const EdgeInsets.all(16), children: [
          if (sensors.isEmpty)
            Center(child: Padding(padding: const EdgeInsets.all(40),
              child: Text('No sensors assigned', style: TextStyle(color: dark ? kGray500 : kGray400)))),
          ...sensors.map((s) {
            final r = readings.where((r) => r.sensorId == s.id).isNotEmpty
                ? readings.firstWhere((r) => r.sensorId == s.id) : null;
            final hasAlert = alerts.any((a) => a.sensorId == s.id && !a.acknowledged);
            return Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(16),
                border: Border.all(color: hasAlert ? kRed500.withValues(alpha: 0.4) : bd)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Text(s.name, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: textP)),
                  const SizedBox(width: 8),
                  Container(width: 7, height: 7, decoration: BoxDecoration(
                    color: s.isActive ? const Color(0xFF22C55E) : kGray500, shape: BoxShape.circle)),
                  if (hasAlert) ...[const SizedBox(width: 6),
                    Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(color: kRed500, borderRadius: BorderRadius.circular(10)),
                      child: const Text('ALERT', style: TextStyle(fontSize: 8, color: Colors.white, fontWeight: FontWeight.w700)))],
                ]),
                const SizedBox(height: 3),
                Text(s.location, style: const TextStyle(fontSize: 11, color: kGray500)),
                if (r != null) ...[
                  const SizedBox(height: 12),
                  GridView.count(crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 6, crossAxisSpacing: 6, childAspectRatio: 2.5,
                    children: [
                      _mini('\${r.temperature.toStringAsFixed(1)}°C', 'Temp', kRed500, dark),
                      _mini('\${r.humidity.toStringAsFixed(1)}%', 'Humidity', const Color(0xFF3B82F6), dark),
                      _mini('\${r.aqi.toStringAsFixed(0)}', 'AQI', kTeal500, dark),
                      _mini('\${r.pressure?.toStringAsFixed(0) ?? "—"} hPa', 'Pressure', kViolet600, dark),
                    ]),
                  const SizedBox(height: 6),
                  Text('Updated: \${_fmt(r.recordedAt)}', style: const TextStyle(fontSize: 10, color: kGray500)),
                ],
              ]));
          }),
        ]),
      ),
    );
  }
  Widget _mini(String val, String lbl, Color c, bool dark) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
    decoration: BoxDecoration(color: c.withValues(alpha: dark ? 0.12 : 0.08), borderRadius: BorderRadius.circular(9)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
      Text(val, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: c)),
      Text(lbl, style: const TextStyle(fontSize: 10, color: kGray500)),
    ]));
  String _fmt(String iso) { try { final d = DateTime.parse(iso).toLocal(); return '\${d.day}/\${d.month}/\${d.year} \${d.hour}:\${d.minute.toString().padLeft(2,"0")}'; } catch(_){ return iso; } }
}