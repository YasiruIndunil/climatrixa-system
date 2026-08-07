import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';
import '../../widgets/widgets.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  String? _selectedSensorId;
  String _forecastMetric = 'temperature';

  @override
  Widget build(BuildContext context) {
    final readings  = ref.watch(readingsProvider);
    final sensors   = ref.watch(sensorsProvider);
    const teal      = Color(0xFF14B8A6);

    return Scaffold(
      appBar: AppBar(
        leading: Builder(builder: (ctx) =>
            IconButton(
              icon: const Icon(Icons.menu),
              onPressed: () => Scaffold.of(ctx).openDrawer(),
            )),
        title: const Text('Dashboard'),
        actions: [
          _AlertBell(),
          const SizedBox(width: 8),
        ],
      ),
      body: readings.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (readingList) {
          // Determine the selected sensor
          final available = sensors.valueOrNull ?? [];
          if (_selectedSensorId == null && available.isNotEmpty) {
            _selectedSensorId = available.first.id;
          }
          final reading = readingList.firstWhere(
            (r) => r.sensorId == _selectedSensorId,
            orElse: () => readingList.isNotEmpty ? readingList.first : Reading(
              id: '', sensorId: '', temperature: 0, humidity: 0, aqi: 0,
              recordedAt: '',
            ),
          );

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(readingsProvider),
            child: ListView(
              padding: const EdgeInsets.all(14),
              children: [
                // ── Sensor selector ─────────────────────────────────────
                _SensorSelector(
                  sensors: available,
                  selectedId: _selectedSensorId,
                  onChanged: (id) => setState(() => _selectedSensorId = id),
                ),
                const SizedBox(height: 12),

                // ── 2×2 Metric grid ─────────────────────────────────────
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 8,
                  childAspectRatio: 1.5,
                  children: [
                    MetricCard(
                      icon: Icons.thermostat,
                      label: 'TEMPERATURE',
                      value: reading.temperature.toStringAsFixed(1),
                      unit: '°C',
                    ),
                    MetricCard(
                      icon: Icons.water_drop,
                      label: 'HUMIDITY',
                      value: reading.humidity.toStringAsFixed(1),
                      unit: '%',
                      color: const Color(0xFF3B82F6),
                      bg: const Color(0xFFEFF6FF),
                    ),
                    MetricCard(
                      icon: Icons.air,
                      label: 'CO₂',
                      value: reading.aqi.toStringAsFixed(0),
                      unit: 'ppm',
                      color: const Color(0xFF8B5CF6),
                      bg: const Color(0xFFF5F3FF),
                    ),
                    MetricCard(
                      icon: Icons.wb_sunny_outlined,
                      label: 'PRESSURE',
                      value: reading.pressure?.toStringAsFixed(0) ?? '—',
                      unit: 'hPa',
                      color: const Color(0xFFF59E0B),
                      bg: const Color(0xFFFFFBEB),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // ── AQI badge ────────────────────────────────────────────
                AqiBadge(aqi: reading.aqi),
                const SizedBox(height: 12),

                // ── AI Forecast chart ────────────────────────────────────
                if (_selectedSensorId != null) _ForecastCard(
                  sensorId: _selectedSensorId!,
                  metric: _forecastMetric,
                  onMetricChange: (m) => setState(() => _forecastMetric = m),
                ),
                const SizedBox(height: 12),

                // ── Alert banner ─────────────────────────────────────────
                _AlertBanner(),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SensorSelector extends StatelessWidget {
  final List<Sensor> sensors;
  final String? selectedId;
  final ValueChanged<String> onChanged;

  const _SensorSelector(
      {required this.sensors,
      required this.selectedId,
      required this.onChanged});

  @override
  Widget build(BuildContext context) {
    if (sensors.isEmpty) return const SizedBox();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5E7EB))),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: selectedId,
          isExpanded: true,
          icon: const Icon(Icons.keyboard_arrow_down,
              color: Color(0xFF6B7280)),
          style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
              color: Color(0xFF1F2937)),
          onChanged: (v) { if (v != null) onChanged(v); },
          items: sensors
              .map((s) => DropdownMenuItem(
                    value: s.id,
                    child: Text(s.name,
                        overflow: TextOverflow.ellipsis),
                  ))
              .toList(),
        ),
      ),
    );
  }
}

class _ForecastCard extends ConsumerWidget {
  final String sensorId;
  final String metric;
  final ValueChanged<String> onMetricChange;

  const _ForecastCard(
      {required this.sensorId,
      required this.metric,
      required this.onMetricChange});

  static const _metrics = [
    ('temperature', 'Temp', Color(0xFF14B8A6)),
    ('humidity',    'Hum.',  Color(0xFF3B82F6)),
    ('aqi',         'IAQ',   Color(0xFF8B5CF6)),
    ('pressure',    'Press', Color(0xFFF59E0B)),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final forecast = ref.watch(forecastProvider(sensorId));
    final (_, __, color) =
        _metrics.firstWhere((m) => m.$1 == metric, orElse: () => _metrics.first);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Text('AI Forecast (24h)',
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1F2937))),
          const Spacer(),
          const Icon(Icons.show_chart, size: 16, color: Color(0xFF14B8A6)),
        ]),
        const SizedBox(height: 8),
        // Metric tabs
        Row(children: _metrics.map((m) {
          final (key, lbl, c) = m;
          final sel = key == metric;
          return GestureDetector(
            onTap: () => onMetricChange(key),
            child: Container(
              margin: const EdgeInsets.only(right: 6),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                  color: sel ? c.withOpacity(.12) : Colors.transparent,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                      color: sel ? c : const Color(0xFFE5E7EB))),
              child: Text(lbl,
                  style: TextStyle(
                      fontSize: 9.5,
                      fontWeight: sel ? FontWeight.w600 : FontWeight.w400,
                      color: sel ? c : const Color(0xFF6B7280))),
            ),
          );
        }).toList()),
        const SizedBox(height: 10),
        forecast.when(
          loading: () =>
              const SizedBox(height: 120, child: Center(child: CircularProgressIndicator())),
          error: (e, _) => Text('Forecast unavailable', style: TextStyle(color: Colors.red, fontSize: 11)),
          data: (pts) => ForecastChart(points: pts, metric: metric, lineColor: color),
        ),
      ]),
    );
  }
}

class _AlertBell extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(unreadAlertCountProvider);
    return Stack(clipBehavior: Clip.none, children: [
      IconButton(
        icon: const Icon(Icons.notifications_outlined),
        onPressed: () => context.go('/dashboard/alerts'),
      ),
      if (count > 0)
        Positioned(
          top: 6,
          right: 6,
          child: Container(
            width: 16,
            height: 16,
            decoration: const BoxDecoration(
                color: Color(0xFFEF4444), shape: BoxShape.circle),
            child: Center(
              child: Text(count > 9 ? '9+' : '$count',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 8,
                      fontWeight: FontWeight.w700)),
            ),
          ),
        ),
    ]);
  }
}

class _AlertBanner extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(unreadAlertCountProvider);
    if (count == 0) return const SizedBox();
    return GestureDetector(
      onTap: () => context.go('/dashboard/alerts'),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
            color: const Color(0xFFFFF0F0),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFFCA5A5))),
        child: Row(children: [
          const Icon(Icons.warning_rounded,
              size: 16, color: Color(0xFFEF4444)),
          const SizedBox(width: 8),
          Text('$count active ${count == 1 ? 'alert' : 'alerts'}',
              style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFFEF4444))),
          const Spacer(),
          const Text('View →',
              style: TextStyle(fontSize: 11, color: Color(0xFFEF4444))),
        ]),
      ),
    );
  }
}
