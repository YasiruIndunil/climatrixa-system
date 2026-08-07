import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';
import '../../widgets/widgets.dart';

class SensorsScreen extends ConsumerStatefulWidget {
  const SensorsScreen({super.key});
  @override ConsumerState<SensorsScreen> createState() => _SensorsScreenState();
}
class _SensorsScreenState extends ConsumerState<SensorsScreen> {
  String _query = '';
  @override
  Widget build(BuildContext context) {
    final sensors  = ref.watch(sensorsProvider);
    final readings = ref.watch(readingsProvider);
    final alerts   = ref.watch(alertsProvider).valueOrNull ?? [];
    return Scaffold(
      appBar: AppBar(title: const Text('My Sensors'), actions: [_AlertBellSmall(), const SizedBox(width:8)]),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(14,10,14,6),
          child: TextField(
            decoration: InputDecoration(
              hintText: 'Search sensors…',
              prefixIcon: const Icon(Icons.search, size:18),
              contentPadding: const EdgeInsets.symmetric(vertical:10, horizontal:12),
            ),
            onChanged: (v) => setState(() => _query = v.toLowerCase()),
          ),
        ),
        Expanded(
          child: sensors.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e,_) => Center(child: Text('$e')),
            data: (list) {
              final filtered = list.where((s) =>
                s.name.toLowerCase().contains(_query) ||
                s.location.toLowerCase().contains(_query)).toList();
              return RefreshIndicator(
                onRefresh: () async { ref.invalidate(sensorsProvider); ref.invalidate(readingsProvider); },
                child: ListView.builder(
                  padding: const EdgeInsets.fromLTRB(14,4,14,80),
                  itemCount: filtered.isEmpty ? 1 : filtered.length,
                  itemBuilder: (_, i) {
                    if (filtered.isEmpty) return const Center(child: Padding(padding: EdgeInsets.only(top:40), child: Text('No sensors found')));
                    final s = filtered[i];
                    final r = readings.valueOrNull?.firstWhere((r) => r.sensorId == s.id, orElse: () => Reading(id:'',sensorId:'',temperature:0,humidity:0,aqi:0,recordedAt:''));
                    final hasAlert = alerts.any((a) => a.sensorId == s.id && !a.acknowledged);
                    return SensorCard(
                      sensor: s,
                      latestReading: (r != null && r.sensorId.isNotEmpty) ? r : null,
                      hasAlert: hasAlert,
                      onTap: () => context.push('/dashboard/sensor/${s.id}'),
                    );
                  },
                ),
              );
            },
          ),
        ),
      ]),
    );
  }
}

class _AlertBellSmall extends ConsumerWidget {
  @override Widget build(BuildContext context, WidgetRef ref) {
    final c = ref.watch(unreadAlertCountProvider);
    return Stack(clipBehavior:Clip.none,children:[
      const Icon(Icons.notifications_outlined),
      if(c>0) Positioned(top:-2,right:-2,child:Container(width:12,height:12,decoration:const BoxDecoration(color:Color(0xFFEF4444),shape:BoxShape.circle),child:Center(child:Text('$c',style:const TextStyle(color:Colors.white,fontSize:7,fontWeight:FontWeight.w700))))),
    ]);
  }
}
