
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../core/app_bar.dart';
import 'admin_shell.dart';
import '../../providers/providers.dart';

class AdminOverviewScreen extends ConsumerWidget {
  const AdminOverviewScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sensors  = ref.watch(sensorsProvider).valueOrNull ?? [];
    final readings = ref.watch(readingsProvider).valueOrNull ?? [];
    final alerts   = ref.watch(alertsProvider).valueOrNull ?? [];
    final users    = ref.watch(usersProvider).valueOrNull ?? [];
    final dark     = ref.watch(themeModeProvider) == ThemeMode.dark;
    final bg       = dark ? kGray950 : kGray50;
    final card     = dark ? kGray900 : kGrayWhite;
    final border   = dark ? kGray800 : kGray100;
    final textPrimary   = dark ? Colors.white : kGray900Text;
    final textSecondary = dark ? kGray500 : kGray500;

    final active    = sensors.where((s) => s.isActive).length;
    final unread    = alerts.where((a) => !a.acknowledged).length;
    final unreadNew = alerts.where((a) => !a.acknowledged).length;

    final now = DateTime.now();
    const months = ['January','February','March','April','May','June',
      'July','August','September','October','November','December'];
    const days   = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    final dateStr = '${days[now.weekday-1]}, ${months[now.month-1]} ${now.day}, ${now.year}';

    return Scaffold(
      backgroundColor: bg,
      appBar: climatrixaAppBar(context, ref, scaffoldKey: AdminShell.scaffoldKey),
      body: RefreshIndicator(
        color: kTeal600,
        onRefresh: () async {
          ref.invalidate(sensorsProvider);
          ref.invalidate(readingsProvider);
          ref.invalidate(usersProvider);
        },
        child: ListView(padding: const EdgeInsets.all(16), children: [
          // Title
          Text('Overview', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: textPrimary)),
          const SizedBox(height: 4),
          Text(dateStr, style: TextStyle(fontSize: 13, color: textSecondary)),
          const SizedBox(height: 16),

          // 2×2 stats grid
          GridView.count(
            crossAxisCount: 2, shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10, crossAxisSpacing: 10,
            childAspectRatio: 1.45,
            children: [
              _StatCard(icon: Icons.wifi_tethering_rounded, iconColor: kTeal600,
                  value: '$active', label: 'Active sensors', sub: 'of ${sensors.length} total',
                  card: card, border: border, textPrimary: textPrimary, textSec: textSecondary,
                  onTap: () => context.go('/admin/sensors')),
              _StatCard(icon: Icons.people_outline_rounded, iconColor: const Color(0xFF3B82F6),
                  value: '${users.length}', label: 'Users', sub: '',
                  card: card, border: border, textPrimary: textPrimary, textSec: textSecondary,
                  onTap: () => context.go('/admin/users')),
              _StatCard(icon: Icons.notifications_outlined, iconColor: const Color(0xFFF97316),
                  value: '$unread', label: 'Unread alerts', sub: '$unread today',
                  card: card, border: border, textPrimary: textPrimary, textSec: textSecondary,
                  onTap: () => context.go('/admin/alerts')),
              _StatCard(icon: Icons.graphic_eq_rounded, iconColor: kPurple500,
                  value: '30s', label: 'Reading interval', sub: 'continuous',
                  card: card, border: border, textPrimary: textPrimary, textSec: textSecondary,
                  onTap: () {}),
            ],
          ),
          const SizedBox(height: 14),

          // Live sensor readings
          _SectionCard(card: card, border: border, child: Column(
            crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(width: 8, height: 8,
                    decoration: const BoxDecoration(color: Color(0xFF22C55E), shape: BoxShape.circle)),
                const SizedBox(width: 8),
                Text('Live sensor readings',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: textPrimary)),
              ]),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(color: kTeal600.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                child: const Text('Auto-refreshes every 30s',
                    style: TextStyle(fontSize: 11, color: kTeal500, fontWeight: FontWeight.w500)),
              ),
              const SizedBox(height: 14),
              ...sensors.where((s) => s.isActive).map((sensor) {
                final r = readings.where((r) => r.sensorId == sensor.id).isNotEmpty
                    ? readings.firstWhere((r) => r.sensorId == sensor.id) : null;
                return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(sensor.name, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: textPrimary)),
                  const SizedBox(height: 2),
                  Text(sensor.location, style: const TextStyle(fontSize: 11, color: kGray500)),
                  const SizedBox(height: 6),
                  if (r != null) ...[
                    // AQI badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: kGray800, borderRadius: BorderRadius.circular(6)),
                      child: Text(_aqiLabel(r.aqi),
                          style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w500)),
                    ),
                    const SizedBox(height: 8),
                    // 2x2 metric grid
                    GridView.count(
                      crossAxisCount: 2, shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 6, crossAxisSpacing: 6,
                      childAspectRatio: 2.3,
                      children: [
                        _MetricMini('${r.temperature.toStringAsFixed(2)}°C', 'Temp', kRed500, dark),
                        _MetricMini('${r.humidity.toStringAsFixed(1)}%', 'Humidity', const Color(0xFF3B82F6), dark),
                        _MetricMini('${r.aqi.toStringAsFixed(0)}', 'AQI', kTeal500, dark),
                        _MetricMini('${r.pressure?.toStringAsFixed(2) ?? '—'} hPa', 'Pressure', kPurple500, dark),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text('Last updated: ${_fmtTime(r.recordedAt)}',
                        style: const TextStyle(fontSize: 10, color: kGray500)),
                  ],
                  const SizedBox(height: 12),
                ]);
              }),
            ],
          )),
          const SizedBox(height: 14),

          // Recent alerts
          _SectionCard(card: card, border: border, child: Column(
            crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text('Recent alerts', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: textPrimary)),
                if (unreadNew > 0) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: const Color(0xFFF97316), borderRadius: BorderRadius.circular(20)),
                    child: Text('$unreadNew new',
                        style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.w700)),
                  ),
                ],
                const Spacer(),
                GestureDetector(
                  onTap: () => context.go('/admin/alerts'),
                  child: const Text('View all →', style: TextStyle(fontSize: 12, color: kTeal600)),
                ),
              ]),
              const SizedBox(height: 12),
              ...alerts.take(5).map((a) {
                final color = a.isAnomaly ? kPurple500 : a.isPredicted ? const Color(0xFFF59E0B) : const Color(0xFFF97316);
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Icon(a.isAnomaly ? Icons.manage_search : Icons.warning_amber_rounded,
                        size: 14, color: color),
                    const SizedBox(width: 8),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Expanded(child: Text(a.message,
                            style: TextStyle(fontSize: 12, color: textPrimary),
                            maxLines: 2, overflow: TextOverflow.ellipsis)),
                        if (!a.acknowledged) Container(
                          margin: const EdgeInsets.only(left: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(color: const Color(0xFFF97316), borderRadius: BorderRadius.circular(10)),
                          child: const Text('New', style: TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.w700)),
                        ),
                      ]),
                      if (a.isPredicted) Container(
                        margin: const EdgeInsets.only(top: 3),
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                            color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10)),
                        child: const Text('✨ Predicted', style: TextStyle(fontSize: 9, color: Color(0xFFF59E0B), fontWeight: FontWeight.w600)),
                      ),
                      const SizedBox(height: 2),
                      Text(_fmtTime(a.triggeredAt), style: const TextStyle(fontSize: 10, color: kGray500)),
                    ])),
                  ]),
                );
              }),
              if (alerts.isEmpty)
                Text('No alerts', style: TextStyle(fontSize: 13, color: textSecondary)),
            ],
          )),
          const SizedBox(height: 24),
        ]),
      ),
    );
  }

  String _aqiLabel(double aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy (Sensitive)';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  }

  String _fmtTime(String iso) {
    try {
      final d = DateTime.parse(iso).toLocal();
      final h = d.hour > 12 ? d.hour - 12 : (d.hour == 0 ? 12 : d.hour);
      final ampm = d.hour >= 12 ? 'PM' : 'AM';
      return '${d.month}/${d.day}/${d.year}, $h:${d.minute.toString().padLeft(2,'0')}:${d.second.toString().padLeft(2,'0')} $ampm';
    } catch (_) { return iso; }
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon; final Color iconColor;
  final String value, label, sub;
  final Color card, border, textPrimary, textSec;
  final VoidCallback? onTap;
  const _StatCard({required this.icon, required this.iconColor,
    required this.value, required this.label, required this.sub,
    required this.card, required this.border, required this.textPrimary,
    required this.textSec, this.onTap});
  @override Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(16), border: Border.all(color: border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(width: 36, height: 36,
            decoration: BoxDecoration(color: iconColor.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, size: 18, color: iconColor)),
          const Spacer(),
          Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: textPrimary)),
        ]),
        const Spacer(),
        Text(label, style: TextStyle(fontSize: 12, color: textSec)),
        if (sub.isNotEmpty) Text(sub, style: const TextStyle(fontSize: 11, color: kGray500)),
      ]),
    ),
  );
}

Widget _MetricMini(String val, String label, Color color, bool dark) => Container(
  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
  decoration: BoxDecoration(color: color.withValues(alpha: dark ? 0.12 : 0.08), borderRadius: BorderRadius.circular(10)),
  child: Row(children: [
    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
      Text(val, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color)),
      Text(label, style: const TextStyle(fontSize: 10, color: kGray500)),
    ])),
  ]),
);

class _SectionCard extends StatelessWidget {
  final Color card, border; final Widget child;
  const _SectionCard({required this.card, required this.border, required this.child});
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(16), border: Border.all(color: border)),
    child: child,
  );
}
