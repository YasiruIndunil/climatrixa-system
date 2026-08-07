import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/providers.dart';
import '../../widgets/widgets.dart';

class SensorDetailScreen extends ConsumerWidget {
  final String sensorId;
  const SensorDetailScreen({super.key, required this.sensorId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sensor   = ref.watch(sensorDetailProvider(sensorId));
    final readings = ref.watch(readingsProvider);
    final forecast = ref.watch(forecastProvider(sensorId));
    final alerts   = ref.watch(alertsProvider).valueOrNull ?? [];
    const teal     = Color(0xFF14B8A6);
    const tealDark = Color(0xFF0F766E);
    const tealLight= Color(0xFFCCFBF1);

    return Scaffold(
      appBar: AppBar(
        title: sensor.when(data:(s)=>Text(s.name), loading:()=>const Text('Loading…'), error:(_,__)=>const Text('Sensor')),
        leading: const BackButton(),
        actions: [_AlertBellSmall(), const SizedBox(width:8)],
      ),
      body: sensor.when(
        loading: ()=>const Center(child:CircularProgressIndicator()),
        error: (e,_)=>Center(child:Text('$e')),
        data: (s) {
          final reading = readings.valueOrNull?.firstWhere((r)=>r.sensorId==sensorId, orElse:()=>Reading(id:"",sensorId:"",temperature:0,humidity:0,aqi:0,recordedAt:""));
          final sensorAlerts = alerts.where((a)=>a.sensorId==sensorId).take(5).toList();
          return ListView(
            padding: const EdgeInsets.all(14),
            children: [
              // Info header
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color:Colors.white, borderRadius:BorderRadius.circular(12)),
                child: Row(children: [
                  Expanded(child: Column(crossAxisAlignment:CrossAxisAlignment.start, children: [
                    Row(children: [
                      Text(s.name, style:const TextStyle(fontSize:13, fontWeight:FontWeight.w700, color:Color(0xFF1F2937))),
                      const Spacer(),
                      Container(
                        padding:const EdgeInsets.symmetric(horizontal:7,vertical:2),
                        decoration:BoxDecoration(color:s.isActive?tealLight:const Color(0xFFF3F4F6), borderRadius:BorderRadius.circular(8)),
                        child:Text(s.isActive?'Active':'Inactive', style:TextStyle(fontSize:9, fontWeight:FontWeight.w700, color:s.isActive?tealDark:const Color(0xFF6B7280))),
                      ),
                    ]),
                    const SizedBox(height:3),
                    Text(s.location, style:const TextStyle(fontSize:10, color:Color(0xFF6B7280))),
                    if (reading!=null) Text('Updated ${reading.recordedAtLocal ?? reading.recordedAt}', style:const TextStyle(fontSize:9.5, color:Color(0xFF9CA3AF))),
                  ])),
                ]),
              ),
              const SizedBox(height:10),
              // Live readings
              Container(
                padding:const EdgeInsets.all(12),
                decoration:BoxDecoration(color:Colors.white, borderRadius:BorderRadius.circular(12)),
                child:Column(crossAxisAlignment:CrossAxisAlignment.start, children:[
                  const Text('Live Readings', style:TextStyle(fontSize:12, fontWeight:FontWeight.w600, color:Color(0xFF1F2937))),
                  const SizedBox(height:10),
                  if (reading!=null) GridView.count(
                    crossAxisCount:2, shrinkWrap:true, physics:const NeverScrollableScrollPhysics(),
                    mainAxisSpacing:8, crossAxisSpacing:8, childAspectRatio:1.6,
                    children:[
                      MetricCard(icon:Icons.thermostat, label:'TEMPERATURE', value:reading.temperature.toStringAsFixed(1), unit:'°C'),
                      MetricCard(icon:Icons.water_drop, label:'HUMIDITY', value:reading.humidity.toStringAsFixed(1), unit:'%', color:const Color(0xFF3B82F6), bg:const Color(0xFFEFF6FF)),
                      MetricCard(icon:Icons.air, label:'CO₂', value:reading.aqi.toStringAsFixed(0), unit:'ppm', color:const Color(0xFF8B5CF6), bg:const Color(0xFFF5F3FF)),
                      MetricCard(icon:Icons.speed, label:'PRESSURE', value:reading.pressure?.toStringAsFixed(0)??'—', unit:'hPa', color:const Color(0xFFF59E0B), bg:const Color(0xFFFFFBEB)),
                    ],
                  ) else const Text('No reading available', style:TextStyle(color:Color(0xFF9CA3AF))),
                ]),
              ),
              const SizedBox(height:10),
              // AI Forecast
              Container(
                padding:const EdgeInsets.all(12),
                decoration:BoxDecoration(color:Colors.white, borderRadius:BorderRadius.circular(12)),
                child:Column(crossAxisAlignment:CrossAxisAlignment.start, children:[
                  Row(children:[
                    const Text('AI Forecast (24h)', style:TextStyle(fontSize:12, fontWeight:FontWeight.w600, color:Color(0xFF1F2937))),
                    const Spacer(),
                    forecast.maybeWhen(data:(pts){
                      final peak = pts.map((p)=>p.temperature??0).fold(0.0,(a,b)=>b>a?b:a);
                      return Text('Peak ${peak.toStringAsFixed(1)}°C', style:const TextStyle(fontSize:9.5, color:teal, fontWeight:FontWeight.w600));
                    }, orElse:()=>const SizedBox()),
                  ]),
                  const SizedBox(height:8),
                  forecast.when(
                    loading:()=>const SizedBox(height:100, child:Center(child:CircularProgressIndicator())),
                    error:(_,__)=>const Text('Forecast unavailable', style:TextStyle(fontSize:11, color:Color(0xFF9CA3AF))),
                    data:(pts)=>ForecastChart(points:pts),
                  ),
                ]),
              ),
              const SizedBox(height:10),
              // Anomaly status
              Container(
                padding:const EdgeInsets.all(12),
                decoration:BoxDecoration(color:Colors.white, borderRadius:BorderRadius.circular(12)),
                child:Row(children:[
                  const Icon(Icons.manage_search, size:16, color:Color(0xFF6B7280)),
                  const SizedBox(width:8),
                  const Expanded(child:Text('Anomaly status', style:TextStyle(fontSize:12, fontWeight:FontWeight.w600, color:Color(0xFF1F2937)))),
                  Container(
                    padding:const EdgeInsets.symmetric(horizontal:8,vertical:3),
                    decoration:BoxDecoration(color:const Color(0xFFDCFCE7), borderRadius:BorderRadius.circular(8)),
                    child:const Text('Low Risk', style:TextStyle(fontSize:9.5, fontWeight:FontWeight.w700, color:Color(0xFF166534))),
                  ),
                ]),
              ),
              const SizedBox(height:10),
              // Alert history
              if (sensorAlerts.isNotEmpty) ...[
                const Text('Recent Alerts', style:TextStyle(fontSize:12, fontWeight:FontWeight.w600, color:Color(0xFF1F2937))),
                const SizedBox(height:8),
                ...sensorAlerts.map((a)=>AlertCard(alert:a, onAcknowledge:()=>ref.read(alertsProvider.notifier).acknowledge(a.id))),
              ],
              const SizedBox(height:20),
            ],
          );
        },
      ),
    );
  }
}
