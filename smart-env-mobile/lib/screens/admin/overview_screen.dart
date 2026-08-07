import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/providers.dart';
import '../../widgets/widgets.dart';

class AdminOverviewScreen extends ConsumerWidget {
  const AdminOverviewScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sensors = ref.watch(sensorsProvider).valueOrNull ?? [];
    final readings = ref.watch(readingsProvider).valueOrNull ?? [];
    final alerts = ref.watch(alertsProvider).valueOrNull ?? [];
    const purple = Color(0xFF7C3AED);
    final active = sensors.where((s)=>s.isActive).length;
    final unread = alerts.where((a)=>!a.acknowledged).length;
    final predicted = alerts.where((a)=>a.isPredicted&&!a.acknowledged).length;
    final anomalies = alerts.where((a)=>a.isAnomaly&&!a.acknowledged).length;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: purple,
        foregroundColor: Colors.white,
        leading: Builder(builder:(ctx)=>IconButton(icon:const Icon(Icons.menu),onPressed:()=>Scaffold.of(ctx).openDrawer())),
        title: const Text('Admin Overview', style:TextStyle(color:Colors.white)),
        actions:[Stack(clipBehavior:Clip.none,children:[
          IconButton(icon:const Icon(Icons.notifications_outlined,color:Colors.white), onPressed:()=>context.go('/admin/alerts')),
          if(unread>0) Positioned(top:6,right:6,child:Container(width:14,height:14,decoration:const BoxDecoration(color:Color(0xFFEF4444),shape:BoxShape.circle),child:Center(child:Text('$unread',style:const TextStyle(color:Colors.white,fontSize:7,fontWeight:FontWeight.w700))))),
        ]),const SizedBox(width:8)],
      ),
      body: RefreshIndicator(
        onRefresh:(){ref.invalidate(sensorsProvider);ref.invalidate(readingsProvider);return Future.value();},
        child:ListView(padding:const EdgeInsets.all(14), children:[
          // Stats grid
          GridView.count(crossAxisCount:3, shrinkWrap:true, physics:const NeverScrollableScrollPhysics(), mainAxisSpacing:8, crossAxisSpacing:8, childAspectRatio:1.0,
            children:[
              _StatCard(icon:Icons.sensors, label:'Sensors', value:'${sensors.length}', color:const Color(0xFF14B8A6), onTap:()=>context.go('/admin/sensors')),
              _StatCard(icon:Icons.sensors_rounded, label:'Active', value:'$active', color:const Color(0xFF16A34A), onTap:()=>context.go('/admin/sensors')),
              _StatCard(icon:Icons.notifications, label:'Alerts', value:'$unread', color:const Color(0xFFEF4444), onTap:()=>context.go('/admin/alerts')),
              _StatCard(icon:Icons.people, label:'Users', value:'—', color:purple, onTap:()=>context.go('/admin/users')),
              _StatCard(icon:Icons.manage_search, label:'Anomalies', value:'$anomalies', color:const Color(0xFF7C3AED), onTap:()=>context.go('/admin/alerts')),
              _StatCard(icon:Icons.auto_awesome, label:'Predicted', value:'$predicted', color:const Color(0xFFF59E0B), onTap:()=>context.go('/admin/alerts')),
            ],
          ),
          const SizedBox(height:12),
          // Sensor status
          Container(padding:const EdgeInsets.all(14), decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(12)), child:Column(crossAxisAlignment:CrossAxisAlignment.start, children:[
            const Text('Sensor Status', style:TextStyle(fontSize:12,fontWeight:FontWeight.w600)),
            const SizedBox(height:10),
            ...sensors.take(5).map((s){
              final r = readings.firstWhere((r)=>r.sensorId==s.id, orElse:()=>null as dynamic);
              final hasAlert = alerts.any((a)=>a.sensorId==s.id&&!a.acknowledged);
              return Padding(padding:const EdgeInsets.only(bottom:8), child:Row(children:[
                Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start, children:[
                  Row(children:[
                    Text(s.name, style:const TextStyle(fontSize:10.5,fontWeight:FontWeight.w500)),
                    if(hasAlert) const Padding(padding:EdgeInsets.only(left:4), child:Icon(Icons.warning_rounded,size:11,color:Color(0xFFEF4444))),
                  ]),
                  const SizedBox(height:3),
                  ClipRRect(borderRadius:BorderRadius.circular(3), child:LinearProgressIndicator(value:s.isActive?0.7:0, minHeight:5, backgroundColor:const Color(0xFFE5E7EB), valueColor:AlwaysStoppedAnimation(s.isActive?const Color(0xFF14B8A6):const Color(0xFFE5E7EB)))),
                ])),
                const SizedBox(width:8),
                Text(s.isActive?'Active':'Offline', style:TextStyle(fontSize:9,fontWeight:FontWeight.w600, color:s.isActive?const Color(0xFF0F766E):const Color(0xFF6B7280))),
              ]));
            }),
          ])),
          const SizedBox(height:12),
          // Recent alerts
          Container(padding:const EdgeInsets.all(14), decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(12)), child:Column(crossAxisAlignment:CrossAxisAlignment.start, children:[
            Row(children:[const Text('Recent Alerts',style:TextStyle(fontSize:12,fontWeight:FontWeight.w600)),const Spacer(),TextButton(onPressed:()=>context.go('/admin/alerts'),child:const Text('View all →',style:TextStyle(fontSize:11)))]),
            ...alerts.where((a)=>!a.acknowledged).take(3).map((a)=>Padding(padding:const EdgeInsets.only(top:8), child:Row(children:[
              Icon(a.isPredicted?Icons.auto_awesome:a.isAnomaly?Icons.manage_search:Icons.warning_rounded, size:13, color:a.isPredicted?const Color(0xFFF59E0B):a.isAnomaly?const Color(0xFF7C3AED):const Color(0xFFEF4444)),
              const SizedBox(width:6),
              Expanded(child:Text(a.message, style:const TextStyle(fontSize:10.5), maxLines:1, overflow:TextOverflow.ellipsis)),
            ]))),
            if(alerts.where((a)=>!a.acknowledged).isEmpty) const Text('No active alerts', style:TextStyle(fontSize:11,color:Color(0xFF9CA3AF))),
          ])),
          const SizedBox(height:12),
          // Quick actions
          Container(padding:const EdgeInsets.all(14), decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(12)), child:Column(crossAxisAlignment:CrossAxisAlignment.start, children:[
            const Text('Quick Actions', style:TextStyle(fontSize:12,fontWeight:FontWeight.w600)),
            const SizedBox(height:10),
            GridView.count(crossAxisCount:2, shrinkWrap:true, physics:const NeverScrollableScrollPhysics(), mainAxisSpacing:8, crossAxisSpacing:8, childAspectRatio:2.5, children:[
              _ActionBtn('Add Sensor',Icons.add,const Color(0xFF14B8A6),()=>context.go('/admin/sensor/new')),
              _ActionBtn('Add User',Icons.person_add,purple,()=>context.go('/admin/users')),
              _ActionBtn('Export',Icons.download,const Color(0xFF6B7280),()=>context.go('/admin/export')),
              _ActionBtn('View Map',Icons.map,const Color(0xFF3B82F6),()=>context.go('/admin/map')),
            ]),
          ])),
          const SizedBox(height:20),
        ]),
      ),
    );
  }
}
class _StatCard extends StatelessWidget {
  final IconData icon; final String label,value; final Color color; final VoidCallback? onTap;
  const _StatCard({required this.icon,required this.label,required this.value,required this.color,this.onTap});
  @override Widget build(BuildContext context) => GestureDetector(onTap:onTap, child:Container(padding:const EdgeInsets.all(10), decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(10)), child:Column(mainAxisAlignment:MainAxisAlignment.center, children:[Icon(icon,size:20,color:color),const SizedBox(height:4),Text(value,style:TextStyle(fontSize:18,fontWeight:FontWeight.w700,color:color)),Text(label,style:const TextStyle(fontSize:8.5,color:Color(0xFF6B7280)))])));
}
class _ActionBtn extends StatelessWidget {
  final String label; final IconData icon; final Color color; final VoidCallback onTap;
  const _ActionBtn(this.label,this.icon,this.color,this.onTap);
  @override Widget build(BuildContext context) => GestureDetector(onTap:onTap, child:Container(padding:const EdgeInsets.symmetric(horizontal:10,vertical:8), decoration:BoxDecoration(color:color.withOpacity(.08),borderRadius:BorderRadius.circular(8)), child:Row(children:[Icon(icon,size:14,color:color),const SizedBox(width:6),Text(label,style:TextStyle(fontSize:11,color:color,fontWeight:FontWeight.w500))])));
}
