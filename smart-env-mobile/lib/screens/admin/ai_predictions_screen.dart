
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../../core/app_bar.dart';
import 'admin_shell.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';

class AiPredictionsScreen extends ConsumerStatefulWidget {
  const AiPredictionsScreen({super.key});
  @override ConsumerState<AiPredictionsScreen> createState() => _S();
}
class _S extends ConsumerState<AiPredictionsScreen> {
  final Map<String, String> _metric = {};   // sensorId -> 'temperature'|'humidity'|'aqi'|'pressure'
  final Map<String, bool>   _training = {};

  @override Widget build(BuildContext context) {
    final sensors = ref.watch(sensorsProvider).valueOrNull ?? [];
    final dark    = ref.watch(themeModeProvider) == ThemeMode.dark;
    final bg      = dark ? kGray950 : kGray50;
    final card    = dark ? kGray900 : kGrayWhite;
    final border  = dark ? kGray800 : kGray100;
    final textP   = dark ? Colors.white : kGray900Text;
    final textS   = dark ? kGray500 : kGray500;

    return Scaffold(
      backgroundColor: bg,
      appBar: climatrixaAppBar(context, ref, scaffoldKey: AdminShell.scaffoldKey),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Text('AI Predictions', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: textP)),
        const SizedBox(height: 4),
        Text('Manage forecasting models, view predictions, and monitor training across all sensors',
            style: TextStyle(fontSize: 12, color: textS)),
        const SizedBox(height: 16),
        ...sensors.map((s) => _SensorAiCard(
          sensor: s, dark: dark, card: card, border: border, textP: textP, textS: textS,
          metric: _metric[s.id] ?? 'temperature',
          training: _training[s.id] ?? false,
          onMetricChange: (m) => setState(() => _metric[s.id] = m),
          onRetrain: () async {
            setState(() => _training[s.id] = true);
            try { await ref.read(apiProvider).trainModel(s.id); } catch (_) {}
            if (mounted) setState(() => _training[s.id] = false);
          },
        )),
      ]),
    );
  }
}

class _SensorAiCard extends ConsumerWidget {
  final sensor; final bool dark, training;
  final Color card, border, textP, textS;
  final String metric;
  final ValueChanged<String> onMetricChange;
  final VoidCallback onRetrain;
  const _SensorAiCard({required this.sensor, required this.dark, required this.training,
    required this.card, required this.border, required this.textP, required this.textS,
    required this.metric, required this.onMetricChange, required this.onRetrain});

  @override Widget build(BuildContext context, WidgetRef ref) {
    final forecast = ref.watch(forecastProvider(sensor.id));
    const tabs = [('temperature','Temp'), ('humidity','Humidity'), ('aqi','AQI'), ('pressure','Pressure')];

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(16), border: Border.all(color: border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Header
        Row(children: [
          Container(width: 36, height: 36,
            decoration: BoxDecoration(color: const Color(0xFF3B82F6).withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
            child: const Icon(Icons.auto_awesome_outlined, size: 18, color: Color(0xFF3B82F6))),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(sensor.name, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: textP)),
            Text(sensor.location, style: const TextStyle(fontSize: 11, color: kGray500)),
          ])),
          ElevatedButton.icon(
            onPressed: training ? null : onRetrain,
            icon: training
                ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Icon(Icons.refresh, size: 14),
            label: const Text('Retrain', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            style: ElevatedButton.styleFrom(
              backgroundColor: kViolet600, foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8), elevation: 0,
            ),
          ),
        ]),
        const SizedBox(height: 12),

        // Model status badge
        forecast.when(
          loading: () => Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(color: kGray700, borderRadius: BorderRadius.circular(8)),
            child: const Text('Loading...', style: TextStyle(fontSize: 11, color: kGray400))),
          error: (_, __) => Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(color: kGray700, borderRadius: BorderRadius.circular(8)),
            child: const Text('Not trained yet', style: TextStyle(fontSize: 11, color: kGray400))),
          data: (pts) => Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: pts.any((p) => (p.temperature ?? 0) > 0)
                    ? const Color(0xFF22C55E).withValues(alpha: 0.15)
                    : kGray700,
                borderRadius: BorderRadius.circular(8)),
              child: Row(children: [
                Icon(Icons.check_circle_outline,
                    size: 12, color: pts.any((p) => (p.temperature ?? 0) > 0)
                        ? const Color(0xFF22C55E) : kGray500),
                const SizedBox(width: 4),
                Text(pts.any((p) => (p.temperature ?? 0) > 0) ? 'Model trained' : 'Not trained yet',
                    style: TextStyle(fontSize: 11,
                        color: pts.any((p) => (p.temperature ?? 0) > 0) ? const Color(0xFF22C55E) : kGray500,
                        fontWeight: FontWeight.w500)),
              ]),
            ),
          ]),
        ),
        const SizedBox(height: 12),

        // Metric tabs
        Row(children: tabs.map((t) {
          final (key, lbl) = t;
          final sel = key == metric;
          return GestureDetector(
            onTap: () => onMetricChange(key),
            child: Container(
              margin: const EdgeInsets.only(right: 6),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: sel ? kTeal600.withValues(alpha: 0.15) : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: sel ? kTeal500 : (dark ? kGray700 : kGray100)),
              ),
              child: Text(lbl, style: TextStyle(fontSize: 11,
                  color: sel ? kTeal500 : kGray500,
                  fontWeight: sel ? FontWeight.w600 : FontWeight.w400)),
            ),
          );
        }).toList()),
        const SizedBox(height: 12),

        // Chart
        SizedBox(height: 160, child: forecast.when(
          loading: () => const Center(child: CircularProgressIndicator(color: kTeal600, strokeWidth: 2)),
          error: (_, __) => const Center(child: Text('No forecast data', style: TextStyle(color: kGray500))),
          data: (pts) {
            if (pts.isEmpty) return const Center(child: Text('No data', style: TextStyle(color: kGray500)));
            double? val(ForecastPoint p) {
              switch (metric) {
                case 'temperature': return p.temperature;
                case 'humidity':    return p.humidity;
                case 'aqi':         return p.aqi;
                case 'pressure':    return p.pressure;
                default:            return p.temperature;
              }
            }
            final spots = pts.map((p) => FlSpot(p.hoursAhead.toDouble(), val(p) ?? 0)).toList();
            final yVals = spots.map((s) => s.y).toList();
            final minY = yVals.reduce((a,b) => a < b ? a : b);
            final maxY = yVals.reduce((a,b) => a > b ? a : b);
            final pad = ((maxY - minY) * 0.2).clamp(1.0, double.infinity);

            return LineChart(LineChartData(
              minY: minY - pad, maxY: maxY + pad,
              clipData: const FlClipData.all(),
              backgroundColor: card,
              gridData: FlGridData(
                show: true, drawVerticalLine: false,
                getDrawingHorizontalLine: (_) => FlLine(color: dark ? kGray800 : kGray100, strokeWidth: 1)),
              borderData: FlBorderData(show: false),
              titlesData: FlTitlesData(
                leftTitles: AxisTitles(sideTitles: SideTitles(
                  showTitles: true, reservedSize: 36,
                  getTitlesWidget: (v, _) => Text(v.toStringAsFixed(0),
                      style: const TextStyle(fontSize: 10, color: kGray500)))),
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(sideTitles: SideTitles(
                  showTitles: true, reservedSize: 22, interval: 4,
                  getTitlesWidget: (v, _) => Text('+${v.toInt()}h',
                      style: const TextStyle(fontSize: 9, color: kGray500)))),
              ),
              lineBarsData: [LineChartBarData(
                spots: spots, isCurved: true,
                color: kRed500, barWidth: 2,
                dotData: const FlDotData(show: false),
                belowBarData: BarAreaData(show: true, color: kRed500.withValues(alpha: 0.15)),
              )],
            ));
          },
        )),

        // Peak / Low footer
        forecast.maybeWhen(data: (pts) {
          if (pts.isEmpty) return const SizedBox();
          double? val(ForecastPoint p) { switch(metric){case 'temperature': return p.temperature; case 'humidity': return p.humidity; case 'aqi': return p.aqi; default: return p.pressure;} }
          final vals = pts.map(val).whereType<double>().toList();
          if (vals.isEmpty) return const SizedBox();
          final peak = vals.reduce((a,b) => a > b ? a : b);
          final low  = vals.reduce((a,b) => a < b ? a : b);
          final unit = metric == 'humidity' ? '%' : metric == 'pressure' ? ' hPa' : '°C';
          return Padding(padding: const EdgeInsets.only(top: 10), child:
            Row(children: [
              Text('Peak ${peak.toStringAsFixed(1)}$unit', style: const TextStyle(fontSize: 11, color: kGray400, fontWeight: FontWeight.w500)),
              const Spacer(),
              Text('Low ${low.toStringAsFixed(1)}$unit', style: const TextStyle(fontSize: 11, color: kGray400)),
              const Spacer(),
              Text(DateTime.now().toLocal().toString().substring(11,16),
                  style: const TextStyle(fontSize: 11, color: kGray500)),
            ]));
        }, orElse: () => const SizedBox()),
      ]),
    );
  }
}
