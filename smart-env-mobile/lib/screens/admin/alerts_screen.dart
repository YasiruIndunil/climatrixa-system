import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/providers.dart';
import '../../widgets/widgets.dart';

class AdminAlertsScreen extends ConsumerStatefulWidget {
  const AdminAlertsScreen({super.key});
  @override ConsumerState<AdminAlertsScreen> createState() => _S();
}
class _S extends ConsumerState<AdminAlertsScreen> {
  String _filter = 'all';
  bool _bulkMode = false;
  final Set<String> _selected = {};
  @override
  Widget build(BuildContext context) {
    final alerts = ref.watch(alertsProvider);
    const purple = Color(0xFF7C3AED);
    final all = alerts.valueOrNull??[];
    final threshold = all.where((a)=>!a.isPredicted&&!a.isAnomaly).length;
    final predicted = all.where((a)=>a.isPredicted).length;
    final anomaly   = all.where((a)=>a.isAnomaly).length;
    final unread    = all.where((a)=>!a.acknowledged).length;
    return Scaffold(
      appBar: AppBar(
        backgroundColor:purple, foregroundColor:Colors.white,
        leading:Builder(builder:(ctx)=>IconButton(icon:const Icon(Icons.menu,color:Colors.white),onPressed:()=>Scaffold.of(ctx).openDrawer())),
        title:const Text('Alerts',style:TextStyle(color:Colors.white)),
        actions:[
          if(_bulkMode&&_selected.isNotEmpty)
            TextButton(onPressed:_ackSelected, child:Text('Ack (${_selected.length})',style:const TextStyle(color:Colors.white))),
          IconButton(icon:Icon(_bulkMode?Icons.close:Icons.checklist,color:Colors.white), onPressed:()=>setState(()=>_bulkMode=!_bulkMode)),
          const SizedBox(width:8),
        ],
      ),
      body:Column(children:[
        // Summary bar
        Container(color:Colors.white, padding:const EdgeInsets.symmetric(horizontal:14,vertical:10), child:Row(children:[
          _SummaryChip('Threshold','$threshold',const Color(0xFFEF4444)),
          const SizedBox(width:8),
          _SummaryChip('AI Pred','$predicted',const Color(0xFFF59E0B)),
          const SizedBox(width:8),
          _SummaryChip('Anomaly','$anomaly',purple),
          const Spacer(),
          if(unread>0) Text('$unread unread',style:const TextStyle(fontSize:10,color:Color(0xFF9CA3AF))),
        ])),
        // Filter chips
        Container(color:Colors.white, padding:const EdgeInsets.fromLTRB(14,0,14,8), child:SingleChildScrollView(scrollDirection:Axis.horizontal, child:Row(children:['all','threshold','predicted','anomaly','unread'].map((f)=>GestureDetector(onTap:()=>setState(()=>_filter=f), child:Container(margin:const EdgeInsets.only(right:6),padding:const EdgeInsets.symmetric(horizontal:10,vertical:4),decoration:BoxDecoration(color:_filter==f?purple:Colors.transparent,borderRadius:BorderRadius.circular(16),border:Border.all(color:_filter==f?purple:const Color(0xFFE5E7EB))),child:Text(f[0].toUpperCase()+f.substring(1),style:TextStyle(fontSize:10.5,color:_filter==f?Colors.white:const Color(0xFF6B7280),fontWeight:_filter==f?FontWeight.w600:FontWeight.w400))))).toList()))),
        Expanded(child:alerts.when(
          loading:()=>const Center(child:CircularProgressIndicator()),
          error:(e,_)=>Center(child:Text('$e')),
          data:(list){
            final filtered = list.where((a){
              if(_filter=='unread') return !a.acknowledged;
              if(_filter=='threshold') return !a.isPredicted&&!a.isAnomaly;
              if(_filter=='predicted') return a.isPredicted;
              if(_filter=='anomaly') return a.isAnomaly;
              return true;
            }).toList();
            if(filtered.isEmpty) return const Center(child:Text('No alerts',style:TextStyle(color:Color(0xFF9CA3AF))));
            return RefreshIndicator(onRefresh:()=>ref.read(alertsProvider.notifier).refresh(), child:ListView.builder(
              padding:const EdgeInsets.fromLTRB(14,10,14,80),
              itemCount:filtered.length,
              itemBuilder:(_,i){
                final a=filtered[i];
                if(_bulkMode) return CheckboxListTile(value:_selected.contains(a.id),onChanged:(v)=>setState(()=>v!?_selected.add(a.id):_selected.remove(a.id)), title:Text(a.message,style:const TextStyle(fontSize:11.5)), subtitle:Text(a.alertType,style:const TextStyle(fontSize:9.5,color:Color(0xFF9CA3AF))));
                return AlertCard(alert:a, onAcknowledge:()=>ref.read(alertsProvider.notifier).acknowledge(a.id));
              },
            ));
          },
        )),
      ]),
    );
  }
  Widget _SummaryChip(String label, String count, Color color) => Container(padding:const EdgeInsets.symmetric(horizontal:8,vertical:4),decoration:BoxDecoration(color:color.withValues(alpha: .1),borderRadius:BorderRadius.circular(8)),child:Column(children:[Text(count,style:TextStyle(fontSize:14,fontWeight:FontWeight.w700,color:color)),Text(label,style:TextStyle(fontSize:8.5,color:color))]));
  Future<void> _ackSelected() async {
    for(final id in _selected) await ref.read(alertsProvider.notifier).acknowledge(id);
    setState((){_selected.clear();_bulkMode=false;});
  }
}
