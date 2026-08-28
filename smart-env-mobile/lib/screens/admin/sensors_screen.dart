
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../core/app_bar.dart';
import 'admin_shell.dart';
import '../../providers/providers.dart';

class AdminSensorsScreen extends ConsumerStatefulWidget {
  const AdminSensorsScreen({super.key});
  @override ConsumerState<AdminSensorsScreen> createState() => _S();
}
class _S extends ConsumerState<AdminSensorsScreen> {
  String _q = '';
  String _filter = 'all';

  @override Widget build(BuildContext context) {
    final sensors = ref.watch(sensorsProvider).valueOrNull ?? [];
    final dark    = ref.watch(themeModeProvider) == ThemeMode.dark;
    final bg      = dark ? kGray950 : kGray50;
    final card    = dark ? kGray900 : kGrayWhite;
    final border  = dark ? kGray800 : kGray100;
    final textP   = dark ? Colors.white : kGray900Text;
    final textS   = dark ? kGray500 : kGray500;

    final filtered = sensors.where((s) {
      final q = _q.toLowerCase();
      final match = s.name.toLowerCase().contains(q) || s.location.toLowerCase().contains(q);
      if (_filter == 'active')   return match && s.isActive;
      if (_filter == 'inactive') return match && !s.isActive;
      return match;
    }).toList();

    return Scaffold(
      backgroundColor: bg,
      appBar: climatrixaAppBar(context, ref, scaffoldKey: AdminShell.scaffoldKey),
      body: Column(children: [
        // Page header
        Padding(padding: const EdgeInsets.fromLTRB(16,16,16,0), child: Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Sensors', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: textP)),
            Text('${sensors.length} of ${sensors.length} sensor nodes',
                style: TextStyle(fontSize: 12, color: textS)),
          ])),
          ElevatedButton.icon(
            onPressed: () => context.go('/admin/sensor/new'),
            icon: const Icon(Icons.add, size: 16),
            label: const Text('Add sensor', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            style: ElevatedButton.styleFrom(
                backgroundColor: kTeal600, foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10), elevation: 0),
          ),
        ])),
        const SizedBox(height: 12),
        // Search
        Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child:
          TextField(
            onChanged: (v) => setState(() => _q = v),
            style: TextStyle(color: textP, fontSize: 13),
            decoration: InputDecoration(
              hintText: 'Search by name, location or MAC...',
              hintStyle: const TextStyle(color: kGray500, fontSize: 13),
              prefixIcon: const Icon(Icons.search, color: kGray500, size: 18),
              filled: true, fillColor: card,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: border)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: border)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kTeal600)),
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
            ),
          )),
        const SizedBox(height: 8),
        // Status filter
        Padding(padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(10), border: Border.all(color: border)),
            child: DropdownButtonHideUnderline(child: DropdownButton<String>(
              value: _filter, isExpanded: true,
              dropdownColor: card,
              style: TextStyle(color: textP, fontSize: 13),
              onChanged: (v) { if (v != null) setState(() => _filter = v); },
              items: const [
                DropdownMenuItem(value: 'all',      child: Text('All status')),
                DropdownMenuItem(value: 'active',   child: Text('Active')),
                DropdownMenuItem(value: 'inactive', child: Text('Inactive')),
              ],
            )),
          )),
        const SizedBox(height: 8),
        // List
        Expanded(child: RefreshIndicator(
          color: kTeal600,
          onRefresh: () async => ref.invalidate(sensorsProvider),
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
            itemCount: filtered.length,
            itemBuilder: (_, i) {
              final s = filtered[i];
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(14), border: Border.all(color: border)),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  // Signal icon
                  Container(
                    width: 42, height: 42,
                    decoration: BoxDecoration(
                      color: (s.isActive ? kTeal600 : kGray600).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(Icons.wifi_tethering_rounded, size: 22,
                        color: s.isActive ? kTeal600 : kGray500),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(s.name, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: textP)),
                    const SizedBox(height: 2),
                    Row(children: [
                      const Icon(Icons.location_on_outlined, size: 12, color: kGray500),
                      const SizedBox(width: 3),
                      Text(s.location, style: const TextStyle(fontSize: 11, color: kGray500)),
                    ]),
                    if (s.macAddress != null) ...[
                      const SizedBox(height: 2),
                      Text(s.macAddress!, style: const TextStyle(fontSize: 11, color: kGray500, fontFamily: 'monospace')),
                    ],
                    if (s.industryProfile != null || (s.latitude != null && s.longitude != null)) ...[
                      const SizedBox(height: 2),
                      Text(
                        [if (s.industryProfile != null) s.industryProfile!,
                          if (s.latitude != null) '${s.latitude!.toStringAsFixed(4)}, ${s.longitude!.toStringAsFixed(4)}']
                            .join(' · '),
                        style: const TextStyle(fontSize: 11, color: kGray500)),
                    ],
                    const SizedBox(height: 10),
                    // Status + actions row
                    Row(children: [
                      Row(children: [
                        Container(width: 7, height: 7, decoration: BoxDecoration(
                            color: s.isActive ? const Color(0xFF22C55E) : kGray500,
                            shape: BoxShape.circle)),
                        const SizedBox(width: 5),
                        Text(s.isActive ? 'Active' : 'Inactive',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500,
                                color: s.isActive ? const Color(0xFF22C55E) : kGray500)),
                      ]),
                      const Spacer(),
                      _IconBtn(Icons.tune_rounded, kGray400, () {}),
                      const SizedBox(width: 8),
                      _IconBtn(Icons.edit_outlined, kGray400,
                          () => context.go('/admin/sensor/${s.id}/edit')),
                      const SizedBox(width: 8),
                      _IconBtn(Icons.remove_red_eye_outlined, kGray400,
                          () => context.push('/dashboard/sensor/${s.id}')),
                    ]),
                  ])),
                ]),
              );
            },
          ),
        )),
      ]),
    );
  }
}

Widget _IconBtn(IconData icon, Color color, VoidCallback onTap) =>
    GestureDetector(onTap: onTap,
        child: Container(
          width: 32, height: 32,
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
          child: Icon(icon, size: 16, color: color)));
