import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../models/models.dart';

// ── Metric Card ────────────────────────────────────────────────────────────────
class MetricCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final String unit;
  final Color color;
  final Color bg;

  const MetricCard({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    required this.unit,
    this.color = const Color(0xFF14B8A6),
    this.bg = const Color(0xFFCCFBF1),
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: bg, borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                  color: color, borderRadius: BorderRadius.circular(6)),
              child: Icon(icon, size: 13, color: Colors.white),
            ),
            const SizedBox(width: 6),
            Text(label,
                style: TextStyle(
                    fontSize: 9,
                    color: const Color(0xFF6B7280),
                    fontWeight: FontWeight.w500,
                    letterSpacing: .3)),
          ]),
          const SizedBox(height: 6),
          Row(crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(value,
                    style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1F2937))),
                const SizedBox(width: 2),
                Text(unit,
                    style: const TextStyle(
                        fontSize: 10, color: Color(0xFF9CA3AF))),
              ]),
        ],
      ),
    );
  }
}

// ── AQI Badge ─────────────────────────────────────────────────────────────────
class AqiBadge extends StatelessWidget {
  final double aqi;
  const AqiBadge({super.key, required this.aqi});

  (String, Color) get _level {
    if (aqi <= 50) return ('Good', const Color(0xFF16A34A));
    if (aqi <= 100) return ('Moderate', const Color(0xFFF59E0B));
    if (aqi <= 150) return ('Unhealthy (Sensitive)', const Color(0xFFEA580C));
    if (aqi <= 200) return ('Unhealthy', const Color(0xFFDC2626));
    if (aqi <= 300) return ('Very Unhealthy', const Color(0xFF7C3AED));
    return ('Hazardous', const Color(0xFF7F1D1D));
  }

  @override
  Widget build(BuildContext context) {
    final (label, color) = _level;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(12)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Text('Air Quality (IAQ)',
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1F2937))),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
                color: color.withOpacity(.12),
                borderRadius: BorderRadius.circular(20)),
            child: Text(label,
                style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    color: color)),
          ),
        ]),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: (aqi / 500).clamp(0, 1),
            minHeight: 7,
            backgroundColor: const Color(0xFFE5E7EB),
            valueColor: AlwaysStoppedAnimation(color),
          ),
        ),
        const SizedBox(height: 4),
        Text('${aqi.toStringAsFixed(0)} / 500',
            style:
                const TextStyle(fontSize: 9, color: Color(0xFF9CA3AF))),
        const SizedBox(height: 4),
        Text('Note: Based on MQ-135 raw values — not EPA AQI',
            style: TextStyle(
                fontSize: 8,
                color: const Color(0xFF9CA3AF),
                fontStyle: FontStyle.italic)),
      ]),
    );
  }
}

// ── Forecast Chart ─────────────────────────────────────────────────────────────
class ForecastChart extends StatelessWidget {
  final List<ForecastPoint> points;
  final String metric; // 'temperature' | 'humidity' | 'aqi' | 'pressure'
  final Color lineColor;

  const ForecastChart({
    super.key,
    required this.points,
    this.metric = 'temperature',
    this.lineColor = const Color(0xFF14B8A6),
  });

  double? _value(ForecastPoint p) {
    switch (metric) {
      case 'temperature': return p.temperature;
      case 'humidity':    return p.humidity;
      case 'aqi':         return p.aqi;
      case 'pressure':    return p.pressure;
      default:            return p.temperature;
    }
  }

  @override
  Widget build(BuildContext context) {
    final spots = points
        .map((p) => FlSpot(p.hoursAhead.toDouble(), _value(p) ?? 0))
        .toList();
    if (spots.isEmpty) return const SizedBox(height: 80);

    final yVals = spots.map((s) => s.y).toList();
    final minY = yVals.reduce((a, b) => a < b ? a : b);
    final maxY = yVals.reduce((a, b) => a > b ? a : b);
    final pad = ((maxY - minY) * .2).clamp(1.0, double.infinity);

    return SizedBox(
      height: 120,
      child: LineChart(
        LineChartData(
          minY: minY - pad,
          maxY: maxY + pad,
          clipData: const FlClipData.all(),
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            getDrawingHorizontalLine: (_) => FlLine(
                color: const Color(0xFFE5E7EB), strokeWidth: 0.5),
          ),
          borderData: FlBorderData(show: false),
          titlesData: FlTitlesData(
            leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 20,
                interval: 6,
                getTitlesWidget: (v, _) => Text(
                  v == 0 ? 'Now' : '+${v.toInt()}h',
                  style: const TextStyle(
                      fontSize: 8, color: Color(0xFF9CA3AF)),
                ),
              ),
            ),
          ),
          lineBarsData: [
            LineChartBarData(
              spots: spots,
              isCurved: true,
              color: lineColor,
              barWidth: 2.5,
              dotData: FlDotData(
                checkToShowDot: (spot, _) => spot == spots.last,
                getDotPainter: (_, __, ___, ____) => FlDotCirclePainter(
                    radius: 4, color: lineColor, strokeWidth: 0),
              ),
              belowBarData: BarAreaData(
                show: true,
                color: lineColor.withOpacity(.1),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Alert Card ────────────────────────────────────────────────────────────────
class AlertCard extends StatelessWidget {
  final AlertEvent alert;
  final VoidCallback? onAcknowledge;
  final VoidCallback? onDismiss;

  const AlertCard({
    super.key,
    required this.alert,
    this.onAcknowledge,
    this.onDismiss,
  });

  (Color, Color, IconData, String) get _style {
    if (alert.isPredicted)
      return (
        const Color(0xFFF59E0B),
        const Color(0xFFFFFBEB),
        Icons.auto_awesome,
        'AI Predicted'
      );
    if (alert.isAnomaly)
      return (
        const Color(0xFF7C3AED),
        const Color(0xFFFAF5FF),
        Icons.manage_search,
        'Anomaly'
      );
    if (alert.alertType.contains('high') || alert.alertType.contains('aqi'))
      return (
        const Color(0xFFEF4444),
        const Color(0xFFFFF0F0),
        Icons.warning_rounded,
        'Alert'
      );
    return (
      const Color(0xFFEA580C),
      const Color(0xFFFFF4ED),
      Icons.warning_amber_rounded,
      'Alert'
    );
  }

  @override
  Widget build(BuildContext context) {
    final (color, bg, icon, typeName) = _style;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border(left: BorderSide(color: color, width: 3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(icon, size: 13, color: color),
            const SizedBox(width: 5),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                  color: color.withOpacity(.12),
                  borderRadius: BorderRadius.circular(10)),
              child: Text(typeName,
                  style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      color: color)),
            ),
            const Spacer(),
            if (alert.acknowledged)
              const Icon(Icons.check_circle_outline,
                  size: 13, color: Color(0xFF16A34A)),
          ]),
          const SizedBox(height: 6),
          Text(alert.message,
              style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF1F2937))),

          // Anomaly hides threshold display (threshold_value = 0 for anomalies)
          if (!alert.isAnomaly && alert.actualValue != null) ...[
            const SizedBox(height: 8),
            Row(children: [
              _ValueBox(
                  label: alert.isPredicted ? 'Predicted' : 'Actual',
                  value: alert.actualValue!.toStringAsFixed(1),
                  color: color),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                child: Icon(Icons.arrow_forward,
                    size: 14, color: const Color(0xFFD1D5DB)),
              ),
              _ValueBox(
                  label: 'Limit',
                  value: alert.thresholdValue.toStringAsFixed(1),
                  color: const Color(0xFF9CA3AF)),
            ]),
          ],

          if (alert.isPredicted && alert.predictedHoursAhead != null)
            Padding(
              padding: const EdgeInsets.only(top: 5),
              child: Text(
                  '⏱ Expected in ~${alert.predictedHoursAhead!.toStringAsFixed(0)}h — not yet happened',
                  style: TextStyle(fontSize: 9, color: color, fontWeight: FontWeight.w500)),
            ),

          if (alert.isAnomaly)
            const Padding(
              padding: EdgeInsets.only(top: 5),
              child: Text(
                  'Detected by machine learning — not a fixed threshold',
                  style: TextStyle(
                      fontSize: 9,
                      color: Color(0xFF7C3AED),
                      fontWeight: FontWeight.w500)),
            ),

          if (!alert.acknowledged && onAcknowledge != null) ...[
            const SizedBox(height: 10),
            Row(children: [
              if (onDismiss != null)
                Expanded(
                  child: OutlinedButton(
                    onPressed: onDismiss,
                    style: OutlinedButton.styleFrom(
                        foregroundColor: color,
                        side: BorderSide(color: color),
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8)),
                        textStyle: const TextStyle(fontSize: 10)),
                    child: const Text('Dismiss'),
                  ),
                ),
              if (onDismiss != null) const SizedBox(width: 6),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: onAcknowledge,
                  icon: const Icon(Icons.check, size: 13),
                  label: const Text('Acknowledge'),
                  style: ElevatedButton.styleFrom(
                      backgroundColor: color,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                      textStyle: const TextStyle(
                          fontSize: 10, fontWeight: FontWeight.w600)),
                ),
              ),
            ]),
          ],
        ]),
      ),
    );
  }
}

class _ValueBox extends StatelessWidget {
  final String label, value;
  final Color color;
  const _ValueBox(
      {required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) => Column(children: [
        Text(value,
            style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: color)),
        Text(label,
            style:
                const TextStyle(fontSize: 8, color: Color(0xFF9CA3AF))),
      ]);
}

// ── Sensor Card ───────────────────────────────────────────────────────────────
class SensorCard extends StatelessWidget {
  final Sensor sensor;
  final Reading? latestReading;
  final bool hasAlert;
  final VoidCallback? onTap;

  const SensorCard({
    super.key,
    required this.sensor,
    this.latestReading,
    this.hasAlert = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    const teal = Color(0xFF14B8A6);
    const tealLight = Color(0xFFCCFBF1);
    const tealDark = Color(0xFF0F766E);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE5E7EB))),
        child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Icon(Icons.sensors,
                    size: 14,
                    color: sensor.isActive ? teal : const Color(0xFF9CA3AF)),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(sensor.name,
                      style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1F2937))),
                ),
                if (hasAlert)
                  const Padding(
                    padding: EdgeInsets.only(right: 4),
                    child: Icon(Icons.warning_rounded,
                        size: 13, color: Color(0xFFEF4444)),
                  ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: sensor.isActive ? tealLight : const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    sensor.isActive ? 'Active' : 'Inactive',
                    style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        color: sensor.isActive
                            ? tealDark
                            : const Color(0xFF6B7280)),
                  ),
                ),
              ]),
              const SizedBox(height: 4),
              Text(sensor.location,
                  style: const TextStyle(
                      fontSize: 9.5, color: Color(0xFF9CA3AF))),
              if (latestReading != null) ...[
                const SizedBox(height: 8),
                Row(children: [
                  const Icon(Icons.thermostat, size: 12, color: teal),
                  const SizedBox(width: 3),
                  Text('${latestReading!.temperature.toStringAsFixed(1)}°C',
                      style: const TextStyle(
                          fontSize: 11, color: Color(0xFF6B7280))),
                  const SizedBox(width: 12),
                  const Icon(Icons.water_drop, size: 12, color: Color(0xFF3B82F6)),
                  const SizedBox(width: 3),
                  Text('${latestReading!.humidity.toStringAsFixed(0)}%',
                      style: const TextStyle(
                          fontSize: 11, color: Color(0xFF6B7280))),
                ]),
              ] else if (!sensor.isActive)
                const Padding(
                  padding: EdgeInsets.only(top: 5),
                  child: Text('Sensor offline',
                      style:
                          TextStyle(fontSize: 9.5, color: Color(0xFF9CA3AF))),
                ),
            ]),
      ),
    );
  }
}

// ── Global Alert Popup ────────────────────────────────────────────────────────
// Mirrors web GlobalAlertPopup behaviour exactly:
//   • Threshold / predicted alerts remind every 1 min
//   • Anomaly alerts remind every 15 min
//   • Auto-dismisses after 30 s countdown
//   • Anomaly suppresses threshold_value display
class GlobalAlertPopup extends StatefulWidget {
  final AlertEvent event;
  final VoidCallback onDismiss;
  final Future<void> Function(String id) onAcknowledge;

  const GlobalAlertPopup({
    super.key,
    required this.event,
    required this.onDismiss,
    required this.onAcknowledge,
  });

  @override
  State<GlobalAlertPopup> createState() => _GlobalAlertPopupState();
}

class _GlobalAlertPopupState extends State<GlobalAlertPopup> {
  int _seconds = 30;

  @override
  void initState() {
    super.initState();
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      setState(() => _seconds--);
      if (_seconds <= 0) { widget.onDismiss(); return false; }
      return true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final e = widget.event;
    late Color borderColor, barColor, bgColor, labelColor;

    if (e.isPredicted) {
      borderColor = barColor = labelColor = const Color(0xFFF59E0B);
      bgColor = const Color(0xFFFFFBEB);
    } else if (e.isAnomaly) {
      borderColor = barColor = labelColor = const Color(0xFF7C3AED);
      bgColor = const Color(0xFFFAF5FF);
    } else {
      borderColor = barColor = labelColor = const Color(0xFFEF4444);
      bgColor = const Color(0xFFFFF0F0);
    }

    final icon = e.isPredicted
        ? '✨'
        : e.isAnomaly
            ? '🔍'
            : e.alertType.contains('temperature')
                ? '🌡️'
                : e.alertType.contains('humidity')
                    ? '💧'
                    : '⚠️';

    return Stack(children: [
      GestureDetector(
        onTap: widget.onDismiss,
        child: Container(color: Colors.black54),
      ),
      Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Material(
            borderRadius: BorderRadius.circular(20),
            clipBehavior: Clip.hardEdge,
            child: Container(
              decoration: BoxDecoration(
                  border: Border.all(color: borderColor, width: 2),
                  borderRadius: BorderRadius.circular(20)),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                // Animated bar
                TweenAnimationBuilder<double>(
                  tween: Tween(begin: 1, end: 0),
                  duration: Duration(seconds: _seconds),
                  builder: (_, v, __) => LinearProgressIndicator(
                      value: v,
                      minHeight: 4,
                      backgroundColor: barColor.withOpacity(.2),
                      valueColor: AlwaysStoppedAnimation(barColor)),
                ),
                Container(
                  color: bgColor,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Text(icon, style: const TextStyle(fontSize: 24)),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                              Text(
                                e.isPredicted
                                    ? '✨ AI Predicted Warning'
                                    : e.isAnomaly
                                        ? '🔍 AI Anomaly Detected'
                                        : '🚨 Alert',
                                style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: labelColor,
                                    letterSpacing: .5),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                e.isAnomaly
                                    ? 'Unusual Pattern'
                                    : e.alertType
                                        .replaceAll('_', ' ')
                                        .split(' ')
                                        .map((w) => w.isEmpty
                                            ? w
                                            : '${w[0].toUpperCase()}${w.substring(1)}')
                                        .join(' '),
                                style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF1F2937)),
                              ),
                              if (e.isPredicted && e.predictedHoursAhead != null)
                                Text(
                                  'Expected in ~${e.predictedHoursAhead!.toStringAsFixed(0)}h — not yet happened',
                                  style: TextStyle(
                                      fontSize: 10,
                                      color: labelColor,
                                      fontWeight: FontWeight.w500),
                                ),
                              if (e.isAnomaly)
                                const Text(
                                  'Detected by machine learning, not a fixed threshold',
                                  style: TextStyle(
                                      fontSize: 10,
                                      color: Color(0xFF7C3AED),
                                      fontWeight: FontWeight.w500),
                                ),
                            ]),
                          ),
                          IconButton(
                              onPressed: widget.onDismiss,
                              icon: const Icon(Icons.close, size: 16)),
                        ]),
                        const SizedBox(height: 12),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12)),
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            Text(e.message,
                                style: const TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF374151))),
                            if (!e.isAnomaly && e.actualValue != null) ...[
                              const SizedBox(height: 10),
                              Row(children: [
                                Column(children: [
                                  Text(
                                      e.actualValue!.toStringAsFixed(1),
                                      style: TextStyle(
                                          fontSize: 22,
                                          fontWeight: FontWeight.w700,
                                          color: labelColor)),
                                  Text(
                                      e.isPredicted ? 'Predicted' : 'Actual',
                                      style: const TextStyle(
                                          fontSize: 9,
                                          color: Color(0xFF9CA3AF))),
                                ]),
                                const Padding(
                                  padding:
                                      EdgeInsets.symmetric(horizontal: 12),
                                  child: Icon(Icons.arrow_forward,
                                      color: Color(0xFFD1D5DB)),
                                ),
                                Column(children: [
                                  Text(
                                      e.thresholdValue.toStringAsFixed(1),
                                      style: const TextStyle(
                                          fontSize: 22,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFF9CA3AF))),
                                  const Text('Limit',
                                      style: TextStyle(
                                          fontSize: 9,
                                          color: Color(0xFF9CA3AF))),
                                ]),
                              ]),
                            ],
                          ]),
                        ),
                        const SizedBox(height: 12),
                        Row(children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: widget.onDismiss,
                              style: OutlinedButton.styleFrom(
                                  foregroundColor: labelColor,
                                  side: BorderSide(color: labelColor),
                                  shape: RoundedRectangleBorder(
                                      borderRadius:
                                          BorderRadius.circular(12))),
                              child: const Text('Dismiss'),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () async {
                                await widget.onAcknowledge(e.id);
                                widget.onDismiss();
                              },
                              icon: const Icon(Icons.check, size: 15),
                              label: const Text('Acknowledge'),
                              style: ElevatedButton.styleFrom(
                                  backgroundColor: labelColor,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                      borderRadius:
                                          BorderRadius.circular(12))),
                            ),
                          ),
                        ]),
                        const SizedBox(height: 8),
                        Center(
                          child: Text('Auto-dismissing in $_seconds s',
                              style: TextStyle(
                                  fontSize: 10, color: labelColor)),
                        ),
                      ]),
                ),
              ]),
            ),
          ),
        ),
      ),
    ]);
  }
}
