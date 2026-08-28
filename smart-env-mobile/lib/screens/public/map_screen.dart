import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';
import '../admin/admin_shell.dart';
import 'public_shell.dart';

class MapScreen extends ConsumerStatefulWidget {
  final bool adminMode;
  const MapScreen({super.key, this.adminMode = false});
  @override ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  Sensor? _selected;

  Color _pinColor(Sensor s, List<AlertEvent> alerts) {
    if (!s.isActive) return const Color(0xFF9CA3AF);
    if (alerts.any((a) => a.sensorId == s.id && !a.acknowledged && !a.isPredicted))
      return const Color(0xFFEF4444);
    if (alerts.any((a) => a.sensorId == s.id && !a.acknowledged && a.isPredicted))
      return const Color(0xFFF59E0B);
    return const Color(0xFF22C55E);
  }

  @override
  Widget build(BuildContext context) {
    final sensors = ref.watch(sensorsProvider).valueOrNull ?? [];
    final alerts  = ref.watch(alertsProvider).valueOrNull ?? [];
    final dark    = ref.watch(themeModeProvider) == ThemeMode.dark;
    final bg      = dark ? kGray950 : kGray50;
    final card    = dark ? kGray900 : kGrayWhite;
    final bd      = dark ? kGray800 : kGray100;
    final textP   = dark ? Colors.white : kGray900Text;

    final mapped = sensors.where((s) => s.latitude != null && s.longitude != null).toList();
    final active  = sensors.where((s) => s.isActive).length;
    final center  = mapped.isNotEmpty
        ? LatLng(
            mapped.map((s) => s.latitude!).reduce((a, b) => a + b) / mapped.length,
            mapped.map((s) => s.longitude!).reduce((a, b) => a + b) / mapped.length)
        : const LatLng(7.8731, 80.7718);

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: dark ? kGray950 : kGrayWhite,
        elevation: 0,
        leading: Builder(builder: (ctx) => IconButton(
          icon: Icon(Icons.menu, color: dark ? kGray400 : kGray600),
          onPressed: () {
            if (widget.adminMode) {
              AdminShell.scaffoldKey.currentState?.openDrawer();
            } else {
              PublicShell.scaffoldKey.currentState?.openDrawer();
            }
          },
        )),
        title: Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 26, height: 26,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [kTeal400, kTeal600]),
              borderRadius: BorderRadius.circular(7)),
            child: const Icon(Icons.eco_rounded, size: 14, color: Colors.white)),
          const SizedBox(width: 7),
          Text('Climatrixa', style: TextStyle(
              color: dark ? Colors.white : kGray900Text,
              fontWeight: FontWeight.w700, fontSize: 15)),
        ]),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(dark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                color: dark ? kGray400 : kGray600),
            onPressed: () => ref.read(themeModeProvider.notifier).toggle()),
        ],
        bottom: PreferredSize(
            preferredSize: const Size.fromHeight(1),
            child: Container(color: dark ? kGray800 : kGray100, height: 1)),
      ),
      body: Column(children: [
        // Title + legend
        Padding(padding: const EdgeInsets.fromLTRB(16, 12, 16, 6), child:
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Sensor Map', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: textP)),
            const SizedBox(height: 3),
            Text('${mapped.length} sensors with GPS · $active active',
                style: const TextStyle(fontSize: 12, color: kGray500)),
            const SizedBox(height: 8),
            Wrap(spacing: 12, runSpacing: 4, children: [
              _legend('Active sensor',              const Color(0xFF22C55E)),
              _legend('Inactive sensor',            const Color(0xFF9CA3AF)),
              _legend('Active alert',               const Color(0xFFEF4444)),
              _legend('AI predicted warning',       const Color(0xFFF59E0B)),
            ]),
          ])),

        // Map
        Expanded(flex: 5, child: Stack(children: [
          FlutterMap(
            options: MapOptions(
              initialCenter: center,
              initialZoom: mapped.length > 1 ? 7.0 : 12.0,
              onTap: (_, __) => setState(() => _selected = null),
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.climatrixa.app',
              ),
              MarkerLayer(markers: mapped.map((s) {
                final color = _pinColor(s, alerts);
                return Marker(
                  point: LatLng(s.latitude!, s.longitude!),
                  width: 36, height: 44,
                  child: GestureDetector(
                    onTap: () => setState(() => _selected = s),
                    child: Column(children: [
                      Container(
                        width: 28, height: 28,
                        decoration: BoxDecoration(
                          color: color, shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2)),
                        child: const Icon(Icons.wifi_tethering_rounded,
                            size: 14, color: Colors.white)),
                      CustomPaint(size: const Size(12, 8),
                          painter: _TrianglePainter(color)),
                    ]),
                  ),
                );
              }).toList()),
            ],
          ),

          // Popup
          if (_selected != null) Positioned(
            bottom: 0, left: 0, right: 0,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: card,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16))),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Row(children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(_selected!.name,
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: textP)),
                    Text(_selected!.location,
                        style: const TextStyle(fontSize: 12, color: kGray500)),
                    if (_selected!.macAddress != null)
                      Text(_selected!.macAddress!,
                          style: const TextStyle(fontSize: 10, color: kGray500,
                              fontFamily: 'monospace')),
                  ])),
                  Row(children: [
                    Container(width: 8, height: 8, decoration: BoxDecoration(
                        color: _selected!.isActive ? const Color(0xFF22C55E) : kGray500,
                        shape: BoxShape.circle)),
                    const SizedBox(width: 5),
                    Text(_selected!.isActive ? 'Active' : 'Inactive',
                        style: TextStyle(fontSize: 12,
                            color: _selected!.isActive ? const Color(0xFF22C55E) : kGray500)),
                  ]),
                ]),
                const SizedBox(height: 10),
                SizedBox(width: double.infinity, child: ElevatedButton(
                  onPressed: () {
                    final id = _selected!.id;
                    setState(() => _selected = null);
                    if (widget.adminMode) {
                      context.push('/admin/sensor/$id/edit');
                    } else {
                      context.push('/dashboard/sensor/$id');
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kTeal600, foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                  child: Text(widget.adminMode ? 'Edit sensor →' : 'View detail →',
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                )),
              ]),
            ),
          ),
        ])),

        // Sensor list
        Expanded(flex: 3, child: ListView(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 16),
          children: [
            Text('All sensors (${sensors.length})',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: textP)),
            const SizedBox(height: 8),
            ...sensors.map((s) {
              final color = _pinColor(s, alerts);
              return GestureDetector(
                onTap: () => setState(() => _selected = s),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: card,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: bd)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(s.name, style: TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w600, color: textP)),
                    const SizedBox(height: 2),
                    Row(children: [
                      const Icon(Icons.location_on_outlined, size: 11, color: kGray500),
                      const SizedBox(width: 3),
                      Text(s.location, style: const TextStyle(fontSize: 11, color: kGray500)),
                    ]),
                    const SizedBox(height: 6),
                    ClipRRect(borderRadius: BorderRadius.circular(3),
                        child: LinearProgressIndicator(
                          value: s.isActive ? 1 : 0, minHeight: 4,
                          backgroundColor: dark ? kGray800 : kGray100,
                          valueColor: AlwaysStoppedAnimation(color))),
                    const SizedBox(height: 2),
                    Text(s.isActive ? 'Active' : 'Inactive',
                        style: TextStyle(fontSize: 10, color: color,
                            fontWeight: FontWeight.w500)),
                  ]),
                ),
              );
            }),
          ],
        )),
      ]),
    );
  }

  Widget _legend(String label, Color color) =>
      Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 10, height: 10,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 5),
        Text(label, style: const TextStyle(fontSize: 10, color: kGray500)),
      ]);
}

class _TrianglePainter extends CustomPainter {
  final Color color;
  _TrianglePainter(this.color);
  @override void paint(Canvas c, Size s) {
    final p = Paint()..color = color;
    final path = ui.Path()
      ..moveTo(0, 0)
      ..lineTo(s.width, 0)
      ..lineTo(s.width / 2, s.height)
      ..close();
    c.drawPath(path, p);
  }
  @override bool shouldRepaint(_) => false;
}
