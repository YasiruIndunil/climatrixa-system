import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/providers.dart';
import '../../widgets/widgets.dart';

class AlertsScreen extends ConsumerStatefulWidget {
  const AlertsScreen({super.key});
  @override ConsumerState<AlertsScreen> createState() => _AlertsScreenState();
}
class _AlertsScreenState extends ConsumerState<AlertsScreen> {
  String _filter = 'all';
  @override
  Widget build(BuildContext context) {
    final alerts = ref.watch(alertsProvider);
    const teal = Color(0xFF14B8A6);
    final tabs = ['all','threshold','predicted','anomaly'];
    final labels = ['All','Threshold','AI Pred','Anomaly'];
    return Scaffold(
      appBar: AppBar(
        title: alerts.maybeWhen(data:(d){final u=d.where((e)=>!e.acknowledged).length; return Text('Alerts${u>0?" ($u)":" "}');}, orElse:()=>const Text('Alerts')),
      ),
      body: Column(children:[
        // Filter tab bar
        Container(
          color: Colors.white,
          padding:const EdgeInsets.symmetric(horizontal:12, vertical:8),
          child:SingleChildScrollView(scrollDirection:Axis.horizontal, child:Row(
            children:List.generate(tabs.length,(i)=>GestureDetector(
              onTap:()=>setState(()=>_filter=tabs[i]),
              child:Container(
                margin:const EdgeInsets.only(right:6),
                padding:const EdgeInsets.symmetric(horizontal:12,vertical:6),
                decoration:BoxDecoration(
                  color:_filter==tabs[i]?teal:Colors.transparent,
                  borderRadius:BorderRadius.circular(20),
                  border:Border.all(color:_filter==tabs[i]?teal:const Color(0xFFE5E7EB)),
                ),
                child:Text(labels[i], style:TextStyle(fontSize:11, fontWeight:_filter==tabs[i]?FontWeight.w600:FontWeight.w400, color:_filter==tabs[i]?Colors.white:const Color(0xFF6B7280))),
              ),
            )),
          )),
        ),
        Expanded(
          child:alerts.when(
            loading:()=>const Center(child:CircularProgressIndicator()),
            error:(e,_)=>Center(child:Text('$e')),
            data:(list){
              final filtered = list.where((a){
                if(_filter=='threshold') return !a.isPredicted&&!a.isAnomaly;
                if(_filter=='predicted') return a.isPredicted;
                if(_filter=='anomaly') return a.isAnomaly;
                return true;
              }).toList();
              if(filtered.isEmpty) return const Center(child:Text('No alerts', style:TextStyle(color:Color(0xFF9CA3AF))));
              return RefreshIndicator(
                onRefresh:()=>ref.read(alertsProvider.notifier).refresh(),
                child:ListView.builder(
                  padding:const EdgeInsets.fromLTRB(14,10,14,80),
                  itemCount:filtered.length,
                  itemBuilder:(_,i)=>AlertCard(
                    alert:filtered[i],
                    onAcknowledge:()=>ref.read(alertsProvider.notifier).acknowledge(filtered[i].id),
                  ),
                ),
              );
            },
          ),
        ),
      ]),
    );
  }
}
