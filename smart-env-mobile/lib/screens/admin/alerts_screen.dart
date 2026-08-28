
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../../core/app_bar.dart';
import 'admin_shell.dart';
import '../../providers/providers.dart';
import '../../widgets/widgets.dart';

class AdminAlertsScreen extends ConsumerStatefulWidget {
  const AdminAlertsScreen({super.key});
  @override ConsumerState<AdminAlertsScreen> createState() => _S();
}
class _S extends ConsumerState<AdminAlertsScreen> {
  bool _showAcknowledged = false;
  String _search = '';
  final Set<String> _selected = {};
  bool _bulkMode = false;

  @override Widget build(BuildContext context) {
    final alertsAsync = ref.watch(alertsProvider);
    final dark    = ref.watch(themeModeProvider) == ThemeMode.dark;
    final bg      = dark ? kGray950 : kGray50;
    final card    = dark ? kGray900 : kGrayWhite;
    final border  = dark ? kGray800 : kGray100;
    final textP   = dark ? Colors.white : kGray900Text;
    final textS   = dark ? kGray500 : kGray500;

    return Scaffold(
      backgroundColor: bg,
      appBar: climatrixaAppBar(context, ref, scaffoldKey: AdminShell.scaffoldKey),
      body: alertsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: kTeal600)),
        error: (e,_) => Center(child: Text('Error: $e', style: TextStyle(color: textS))),
        data: (events) {
          final unread = events.where((e) => !e.acknowledged).length;
          final history = events.where((e) {
            final matchSearch = e.message.toLowerCase().contains(_search.toLowerCase());
            return matchSearch && (_showAcknowledged || !e.acknowledged);
          }).toList();

          return ListView(padding: const EdgeInsets.all(16), children: [
            // Page header
            Text('Alert Rules', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: textP)),
            if (unread > 0) ...[
              const SizedBox(height: 4),
              Text('$unread alert${unread>1?'s':''} need attention',
                  style: const TextStyle(fontSize: 13, color: Color(0xFFF97316))),
            ],
            const SizedBox(height: 14),

            // Action buttons
            Row(children: [
              if (unread > 0) Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                    border: Border.all(color: const Color(0xFFF97316)),
                    borderRadius: BorderRadius.circular(10)),
                child: Row(children: [
                  const Icon(Icons.warning_amber_rounded, size: 14, color: Color(0xFFF97316)),
                  const SizedBox(width: 6),
                  Text('$unread unread', style: const TextStyle(fontSize: 12, color: Color(0xFFF97316), fontWeight: FontWeight.w600)),
                ])),
              const Spacer(),
              ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.add, size: 16),
                label: const Text('New rule', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                style: ElevatedButton.styleFrom(backgroundColor: kTeal600, foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10), elevation: 0),
              ),
            ]),
            const SizedBox(height: 16),

            // Alert history section
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(16), border: Border.all(color: border)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  const Icon(Icons.warning_amber_rounded, size: 16, color: Color(0xFFF97316)),
                  const SizedBox(width: 8),
                  Text('Alert history', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: textP)),
                  if (unread > 0) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFFF97316), borderRadius: BorderRadius.circular(20)),
                      child: Text('$unread new', style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.w700))),
                  ],
                  const Spacer(),
                  Row(children: [
                    Checkbox(
                      value: _showAcknowledged,
                      activeColor: kTeal600,
                      onChanged: (v) => setState(() => _showAcknowledged = v ?? false)),
                    Text('Show acknowledged', style: TextStyle(fontSize: 11, color: textS)),
                  ]),
                ]),
                const SizedBox(height: 10),
                TextField(
                  onChanged: (v) => setState(() => _search = v),
                  style: TextStyle(color: textP, fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'Search events...',
                    hintStyle: const TextStyle(color: kGray500, fontSize: 13),
                    prefixIcon: const Icon(Icons.search, size: 16, color: kGray500),
                    filled: true, fillColor: dark ? kGray800 : kGray50,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: border)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: border)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kTeal600)),
                    contentPadding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                  )),
                const SizedBox(height: 12),
                ...history.map((a) => _AlertEventCard(a, dark, textP, ref)),
                if (history.isEmpty)
                  Center(child: Padding(padding: const EdgeInsets.all(20),
                    child: Text('No alerts', style: TextStyle(color: textS)))),
              ]),
            ),
            const SizedBox(height: 24),
          ]);
        },
      ),
    );
  }
}

Widget _AlertEventCard(alert, bool dark, Color textP, WidgetRef ref) {
  final isThreshold = !alert.isAnomaly && !alert.isPredicted;
  final color = alert.isAnomaly ? kPurple500 : alert.isPredicted ? const Color(0xFFF59E0B) : const Color(0xFFF97316);
  final bgColor = dark
      ? color.withValues(alpha: 0.08)
      : color.withValues(alpha: 0.05);

  return Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2))),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Container(width: 32, height: 32,
          decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
          child: Icon(isThreshold ? Icons.thermostat_rounded : alert.isPredicted ? Icons.auto_awesome : Icons.manage_search,
              size: 16, color: color)),
        const SizedBox(width: 8),
        Expanded(child: Row(children: [
          Text(alert.alertType.replaceAll('_', ' ').split(' ').map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}').join(' '),
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: textP)),
          const SizedBox(width: 6),
          if (!alert.acknowledged) Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
            decoration: BoxDecoration(color: const Color(0xFFF97316), borderRadius: BorderRadius.circular(8)),
            child: const Text('NEW', style: TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.w700))),
          const SizedBox(width: 4),
          if (alert.isPredicted) Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
            decoration: BoxDecoration(color: const Color(0xFFF59E0B).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
            child: const Text('✨ Predicted +1h', style: TextStyle(fontSize: 9, color: Color(0xFFF59E0B), fontWeight: FontWeight.w600))),
        ])),
        if (!alert.acknowledged) GestureDetector(
          onTap: () => ref.read(alertsProvider.notifier).acknowledge(alert.id),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(color: kTeal600, borderRadius: BorderRadius.circular(8)),
            child: const Text('✓ Acknowledge', style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w600))),
        ),
      ]),
      const SizedBox(height: 8),
      Row(children: [
        const Icon(Icons.location_on_outlined, size: 11, color: kGray500),
        const SizedBox(width: 3),
        Text('Sensor — ${alert.sensorId}', style: const TextStyle(fontSize: 11, color: kGray500)),
      ]),
      const SizedBox(height: 4),
      Text(alert.message, style: TextStyle(fontSize: 12, color: textP)),
      if (!alert.isAnomaly && alert.actualValue != null) ...[
        const SizedBox(height: 8),
        Row(children: [
          Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(8)),
            child: Text(alert.actualValue!.toStringAsFixed(1), style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: color))),
          Padding(padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text('vs', style: const TextStyle(fontSize: 12, color: kGray500))),
          Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: dark ? kGray800 : kGray100, borderRadius: BorderRadius.circular(8)),
            child: Text(alert.thresholdValue.toStringAsFixed(1), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: kGray500))),
          Padding(padding: const EdgeInsets.only(left: 8), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Actual', style: TextStyle(fontSize: 9, color: kGray500)),
            const SizedBox(height: 12),
          ])),
        ]),
      ],
      const SizedBox(height: 6),
      Text(_fmtTime(alert.triggeredAt), style: const TextStyle(fontSize: 10, color: kGray500)),
    ]));
}

String _fmtTime(String iso) {
  try { final d = DateTime.parse(iso).toLocal(); final h = d.hour>12?d.hour-12:(d.hour==0?12:d.hour); return '${d.month}/${d.day}/${d.year}, $h:${d.minute.toString().padLeft(2,'0')}:${d.second.toString().padLeft(2,'0')} ${d.hour>=12?'PM':'AM'}'; } catch(_){return iso;}
}
