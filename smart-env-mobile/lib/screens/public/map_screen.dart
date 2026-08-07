import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';

class MapScreen extends ConsumerStatefulWidget {
  final bool adminMode;
  const MapScreen({super.key, this.adminMode = false});
  @override ConsumerState<MapScreen> createState() => _MapScreenState();
}
class _MapScreenState extends ConsumerState<MapScreen> {
  Sensor? _selected;
  @override
  Widget build(BuildContext context) {
    final sensors  = ref.watch(sensorsProvider);
    final readings = ref.watch(readingsProvider);
    final alerts   = ref.watch(alertsProvider).valueOrNull ?? [];
    const teal = Color(0xFF14B8A6);
    return Scaffold(
      appBar: AppBar(title: Text(widget.adminMode ? 'Sensor Map (Admin)' : 'Sensor Map')),
      body: sensors.when(
        loading:()=>const Center(child:CircularProgressIndicator()),
        error:(e,_)=>Center(child:Text('$e')),
        data:(list){
          final mapped = list.where((s)=>s.latitude!=null&&s.longitude!=null).toList();
          final center = mapped.isNotEmpty
              ? LatLng(mapped.first.latitude!, mapped.first.longitude!)
              : const LatLng(7.0, 80.0); // Sri Lanka default
          return Stack(children:[
            FlutterMap(
              options: MapOptions(initialCenter:center, initialZoom:13, onTap:(_,__)=>setState(()=>_selected=null)),
              children:[
                TileLayer(urlTemplate:'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName:'com.climatrixa.app'),
                MarkerLayer(
                  markers: mapped.map((s){
                    final hasAlert = alerts.any((a)=>a.sensorId==s.id&&!a.acknowledged);
                    final color = hasAlert ? const Color(0xFFEF4444) : s.isActive ? teal : const Color(0xFF9CA3AF);
                    return Marker(
                      point: LatLng(s.latitude!, s.longitude!),
                      width:36, height:44,
                      child: GestureDetector(
                        onTap:()=>setState(()=>_selected=s),
                        child: Column(children:[
                          Container(
                            width:28, height:28,
                            decoration:BoxDecoration(color:color, shape:BoxShape.circle, border:Border.all(color:Colors.white,width:2)),
                            child:const Icon(Icons.sensors, size:14, color:Colors.white),
                          ),
                          CustomPaint(size:const Size(10,8), painter:_TrianglePainter(color:color)),
                        ]),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
            // Legend
            Positioned(
              bottom: _selected!=null ? 160 : 16, left:14,
              child:Container(
                padding:const EdgeInsets.symmetric(horizontal:12,vertical:8),
                decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(10),boxShadow:[BoxShadow(color:Colors.black12,blurRadius:4)]),
                child:Column(mainAxisSize:MainAxisSize.min, crossAxisAlignment:CrossAxisAlignment.start, children:[
                  Row(children:[_Dot(teal), const SizedBox(width:5), const Text('Active',style:TextStyle(fontSize:10))]),
                  const SizedBox(height:3),
                  Row(children:[const _Dot(Color(0xFFEF4444)), const SizedBox(width:5), const Text('Alert',style:TextStyle(fontSize:10))]),
                  const SizedBox(height:3),
                  Row(children:[const _Dot(Color(0xFF9CA3AF)), const SizedBox(width:5), const Text('Inactive',style:TextStyle(fontSize:10))]),
                ]),
              ),
            ),
            // Selected sensor popup
            if (_selected!=null)
              Positioned(
                bottom:0, left:0, right:0,
                child:Container(
                  padding:const EdgeInsets.all(16),
                  decoration:const BoxDecoration(color:Colors.white, borderRadius:BorderRadius.vertical(top:Radius.circular(16))),
                  child:Column(mainAxisSize:MainAxisSize.min, crossAxisAlignment:CrossAxisAlignment.start, children:[
                    Row(children:[
                      const Icon(Icons.sensors,size:14,color:teal),
                      const SizedBox(width:6),
                      Expanded(child:Text(_selected!.name, style:const TextStyle(fontSize:13,fontWeight:FontWeight.w700))),
                      Container(
                        padding:const EdgeInsets.symmetric(horizontal:7,vertical:2),
                        decoration:BoxDecoration(color:_selected!.isActive?const Color(0xFFCCFBF1):const Color(0xFFF3F4F6), borderRadius:BorderRadius.circular(8)),
                        child:Text(_selected!.isActive?'Active':'Inactive', style:TextStyle(fontSize:9,fontWeight:FontWeight.w700, color:_selected!.isActive?const Color(0xFF0F766E):const Color(0xFF6B7280))),
                      ),
                    ]),
                    const SizedBox(height:4),
                    Text(_selected!.location, style:const TextStyle(fontSize:10.5, color:Color(0xFF6B7280))),
                    (){
                      final r = readings.valueOrNull?.firstWhere((r)=>r.sensorId==_selected!.id, orElse:()=>Reading(id:"",sensorId:"",temperature:0,humidity:0,aqi:0,recordedAt:""));
                      return r==null ? const SizedBox() : Text('Temp: ${r.temperature.toStringAsFixed(1)}°C', style:const TextStyle(fontSize:10.5,color:Color(0xFF374151)));
                    }(),
                    const SizedBox(height:10),
                    SizedBox(
                      width:double.infinity,
                      child:ElevatedButton(
                        style:ElevatedButton.styleFrom(backgroundColor:teal,foregroundColor:Colors.white,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(10))),
                        onPressed:(){
                              context.push('/dashboard/sensor/${_selected!.id}');
                        },
                        child:const Text('View Sensor Detail →', style:TextStyle(fontSize:12)),
                      ),
                    ),
                  ]),
                ),
              ),
          ]);
        },
      ),
    );
  }
}
class _Dot extends StatelessWidget {
  final Color color;
  const _Dot(this.color);
  @override Widget build(BuildContext context) => Container(width:10,height:10,decoration:BoxDecoration(color:color,shape:BoxShape.circle));
}
class _TrianglePainter extends CustomPainter {
  final Color color;
  _TrianglePainter({required this.color});
  @override void paint(Canvas c, Size s){
    final p=Paint()..color=color;
    final path=ui.Path()..moveTo(0,0)..lineTo(s.width,0)..lineTo(s.width/2,s.height)..close();
    c.drawPath(path,p);
  }
  @override bool shouldRepaint(_)=>false;
}
