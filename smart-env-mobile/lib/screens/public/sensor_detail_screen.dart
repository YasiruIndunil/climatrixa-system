import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../../providers/providers.dart';

class SensorDetailScreen extends ConsumerWidget {
  final String sensorId;
  const SensorDetailScreen({super.key, required this.sensorId});
  @override Widget build(BuildContext context, WidgetRef ref) {
    final sensor   = ref.watch(sensorDetailProvider(sensorId));
    final readings = ref.watch(readingsProvider).valueOrNull ?? [];
    final dark = ref.watch(themeModeProvider) == ThemeMode.dark;
    final bg = dark ? kGray950 : kGray50;
    final card = dark ? kGray900 : kGrayWhite;
    final bd = dark ? kGray800 : kGray100;
    final textP = dark ? Colors.white : kGray900Text;
    final r = readings.where((r) => r.sensorId == sensorId).isNotEmpty
        ? readings.firstWhere((r) => r.sensorId == sensorId) : null;
    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(backgroundColor: dark ? kGray950 : kGrayWhite, elevation: 0,
        leading: IconButton(icon: Icon(Icons.arrow_back, color: dark ? kGray300 : kGray700), onPressed: () => Navigator.of(context).pop()),
        title: Text(sensor.valueOrNull?.name ?? 'Sensor Detail', style: TextStyle(color: textP, fontWeight: FontWeight.w700)),
        bottom: PreferredSize(preferredSize: const Size.fromHeight(1), child: Container(color: dark ? kGray800 : kGray100, height: 1))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        if (r != null) ...[
          GridView.count(crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 8, crossAxisSpacing: 8, childAspectRatio: 1.6,
            children: [
              _card('Temperature', '\${r.temperature.toStringAsFixed(2)}°C', kRed500, dark, card, bd),
              _card('Humidity', '\${r.humidity.toStringAsFixed(2)}%', const Color(0xFF3B82F6), dark, card, bd),
              _card('AQI (\${r.aqiLabel})', '\${r.aqi.toStringAsFixed(0)}', kTeal500, dark, card, bd),
              _card('Pressure', '\${r.pressure?.toStringAsFixed(2) ?? "—"} hPa', kViolet600, dark, card, bd),
            ]),
          const SizedBox(height: 12),
          Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(12), border: Border.all(color: bd)),
            child: Text('Last updated: \${r.recordedAt}', style: const TextStyle(fontSize: 11, color: kGray500))),
        ] else
          Center(child: Padding(padding: const EdgeInsets.all(40), child: Text('No readings yet', style: TextStyle(color: dark ? kGray500 : kGray400)))),
      ]),
    );
  }
  Widget _card(String lbl, String val, Color c, bool dark, Color card, Color bd) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(12), border: Border.all(color: bd)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
      Text(lbl, style: const TextStyle(fontSize: 11, color: kGray500)),
      const SizedBox(height: 6),
      Text(val, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: c)),
    ]));
}