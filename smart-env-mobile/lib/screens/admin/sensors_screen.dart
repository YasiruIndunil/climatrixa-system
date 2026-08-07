import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';

class AdminSensorsScreen extends ConsumerStatefulWidget {
  const AdminSensorsScreen({super.key});
  @override ConsumerState<AdminSensorsScreen> createState() => _S();
}
class _S extends ConsumerState<AdminSensorsScreen> {
  String _q='';
  @override
  Widget build(BuildContext context) {
    final sensors = ref.watch(sensorsProvider);
    final readings = ref.watch(readingsProvider).valueOrNull??[];
    final alerts = ref.watch(alertsProvider).valueOrNull??[];
    const purple = Color(0xFF7C3AED);
    return Scaffold(
      appBar: AppBar(backgroundColor:purple, foregroundColor:Colors.white,
        leading:Builder(builder:(ctx)=>IconButton(icon:const Icon(Icons.menu),onPressed:()=>Scaffold.of(ctx).openDrawer())),
        title:const Text('Sensors',style:TextStyle(color:Colors.white)),
        actions:[IconButton(icon:const Icon(Icons.add,color:Colors.white), onPressed:()=>context.go('/admin/sensor/new')), const SizedBox(width:8)],
      ),
      body:Column(children:[
        Padding(padding:const EdgeInsets.fromLTRB(14,10,14,6), child:TextField(decoration:const InputDecoration(hintText:'Search sensors…',prefixIcon:Icon(Icons.search,size:18),contentPadding:EdgeInsets.symmetric(vertical:10,horizontal:12)), onChanged:(v)=>setState(()=>_q=v.toLowerCase()))),
        Expanded(child:sensors.when(
          loading:()=>const Center(child:CircularProgressIndicator()),
          error:(e,_)=>Center(child:Text('$e')),
          data:(list){
            final filtered = list.where((s)=>s.name.toLowerCase().contains(_q)||s.location.toLowerCase().contains(_q)).toList();
            return RefreshIndicator(
              onRefresh:()async{ref.invalidate(sensorsProvider);ref.invalidate(readingsProvider);},
              child:ListView.builder(
                padding:const EdgeInsets.fromLTRB(14,4,14,20),
                itemCount:filtered.length,
                itemBuilder:(_,i){
                  final s=filtered[i];
                  final r=readings.firstWhere((r)=>r.sensorId==s.id,orElse:()=>Reading(id:"",sensorId:"",temperature:0,humidity:0,aqi:0,recordedAt:""));
                  final hasAlert=alerts.any((a)=>a.sensorId==s.id&&!a.acknowledged);
                  return Container(margin:const EdgeInsets.only(bottom:10), padding:const EdgeInsets.all(12), decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(12),border:Border.all(color:const Color(0xFFE5E7EB))), child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
                    Row(children:[
                      Icon(Icons.sensors,size:13,color:s.isActive?const Color(0xFF14B8A6):const Color(0xFF9CA3AF)),
                      const SizedBox(width:6),
                      Expanded(child:Text(s.name,style:const TextStyle(fontSize:12,fontWeight:FontWeight.w600))),
                      if(hasAlert) const Padding(padding:EdgeInsets.only(right:4),child:Icon(Icons.warning_rounded,size:12,color:Color(0xFFEF4444))),
                      Container(padding:const EdgeInsets.symmetric(horizontal:7,vertical:2), decoration:BoxDecoration(color:s.isActive?const Color(0xFFCCFBF1):const Color(0xFFF3F4F6),borderRadius:BorderRadius.circular(8)), child:Text(s.isActive?'Active':'Inactive',style:TextStyle(fontSize:9,fontWeight:FontWeight.w700,color:s.isActive?const Color(0xFF0F766E):const Color(0xFF6B7280)))),
                    ]),
                    const SizedBox(height:2),
                    Text(s.location,style:const TextStyle(fontSize:9.5,color:Color(0xFF9CA3AF))),
                    if(r!=null) Padding(padding:const EdgeInsets.only(top:4),child:Text('Temp: ${r.temperature.toStringAsFixed(1)}°C · Hum: ${r.humidity.toStringAsFixed(0)}%',style:const TextStyle(fontSize:10,color:Color(0xFF6B7280)))),
                    const SizedBox(height:8),
                    Row(children:[
                      Expanded(child:_Btn('Edit',Icons.edit,const Color(0xFF6B7280),()=>context.go('/admin/sensor/${s.id}/edit'))),
                      const SizedBox(width:6),
                      Expanded(child:_Btn('Access',Icons.people,purple,(){})),
                      const SizedBox(width:6),
                      Expanded(child:_Btn('Delete',Icons.delete,const Color(0xFFEF4444),()=>_confirmDelete(context,ref,s.id,s.name))),
                    ]),
                  ]));
                },
              ),
            );
          },
        )),
      ]),
    );
  }
  Widget _Btn(String l, IconData ic, Color c, VoidCallback fn) => GestureDetector(onTap:fn, child:Container(padding:const EdgeInsets.symmetric(vertical:5), decoration:BoxDecoration(color:c.withValues(alpha: .1),borderRadius:BorderRadius.circular(7)), child:Row(mainAxisAlignment:MainAxisAlignment.center,children:[Icon(ic,size:11,color:c),const SizedBox(width:3),Text(l,style:TextStyle(fontSize:9.5,color:c,fontWeight:FontWeight.w500))])));
  void _confirmDelete(BuildContext ctx, WidgetRef ref, String id, String name){
    showDialog(context:ctx, builder:(_)=>AlertDialog(title:const Text('Delete sensor?'), content:Text('Remove $name from the system?'), actions:[TextButton(onPressed:()=>Navigator.pop(ctx),child:const Text('Cancel')), TextButton(onPressed:()async{Navigator.pop(ctx);await ref.read(apiProvider).deleteSensor(id);ref.invalidate(sensorsProvider);},child:const Text('Delete',style:TextStyle(color:Color(0xFFEF4444))))]));
  }
}
