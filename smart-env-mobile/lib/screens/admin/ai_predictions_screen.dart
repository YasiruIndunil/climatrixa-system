import 'admin_shell.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';
import '../../widgets/widgets.dart';

class AiPredictionsScreen extends ConsumerStatefulWidget {
  const AiPredictionsScreen({super.key});
  @override ConsumerState<AiPredictionsScreen> createState() => _S();
}
class _S extends ConsumerState<AiPredictionsScreen> {
  String? _sensorId;
  int _hours = 24;
  String _metric = 'temperature';
  bool _training = false;
  static const _periods = [(6,'6h'),(12,'12h'),(24,'24h'),(48,'48h')];
  static const _metrics = [('temperature','Temp',Color(0xFF14B8A6)),('humidity','Humidity',Color(0xFF3B82F6)),('aqi','IAQ',Color(0xFF8B5CF6)),('pressure','Pressure',Color(0xFFF59E0B))];
  static const _purple = Color(0xFF7C3AED);

  @override
  Widget build(BuildContext context) {
    final sensors = ref.watch(sensorsProvider).valueOrNull??[];
    if(_sensorId==null&&sensors.isNotEmpty) _sensorId=sensors.first.id;
    final forecast = _sensorId!=null ? ref.watch(forecastProvider(_sensorId!)) : const AsyncData<List<ForecastPoint>>([]);
    final selectedColor = _metrics.firstWhere((m)=>m.$1==_metric, orElse:()=>_metrics.first).$3;

    return Scaffold(
      appBar: AppBar(
        backgroundColor:_purple, foregroundColor:Colors.white,
        leading:IconButton(icon:const Icon(Icons.menu,color:Colors.white),onPressed:()=>AdminShell.scaffoldKey.currentState?.openDrawer()),
        title:const Text('AI Predictions',style:TextStyle(color:Colors.white)),
        actions:[IconButton(icon:const Icon(Icons.model_training,color:Colors.white), onPressed:_sensorId==null?null:()=>_train(), tooltip:'Re-train model')],
      ),
      body:ListView(padding:const EdgeInsets.all(14), children:[
        // Sensor selector
        Container(padding:const EdgeInsets.symmetric(horizontal:14,vertical:8), decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(12),border:Border.all(color:const Color(0xFFE5E7EB))), child:DropdownButtonHideUnderline(child:DropdownButton<String>(
          value:_sensorId, isExpanded:true, icon:const Icon(Icons.keyboard_arrow_down,color:Color(0xFF6B7280)),
          style:const TextStyle(fontSize:12.5,fontWeight:FontWeight.w500,color:Color(0xFF1F2937)),
          onChanged:(v){if(v!=null){setState(()=>_sensorId=v);}},
          items:sensors.map((s)=>DropdownMenuItem(value:s.id,child:Text(s.name,overflow:TextOverflow.ellipsis))).toList(),
        ))),
        const SizedBox(height:10),
        // Period selector
        Row(children:_periods.map((p){
          final (h,label)=p; final sel=_hours==h;
          return GestureDetector(onTap:()=>setState(()=>_hours=h), child:Container(margin:const EdgeInsets.only(right:6), padding:const EdgeInsets.symmetric(horizontal:12,vertical:7), decoration:BoxDecoration(color:sel?_purple:Colors.white,borderRadius:BorderRadius.circular(8),border:Border.all(color:sel?_purple:const Color(0xFFE5E7EB))), child:Text(label,style:TextStyle(fontSize:11,fontWeight:sel?FontWeight.w600:FontWeight.w400,color:sel?Colors.white:const Color(0xFF6B7280)))));
        }).toList()),
        const SizedBox(height:10),
        // Metric tabs
        Row(children:_metrics.map((m){
          final (key,lbl,c)=m; final sel=key==_metric;
          return GestureDetector(onTap:()=>setState(()=>_metric=key), child:Container(margin:const EdgeInsets.only(right:6), padding:const EdgeInsets.symmetric(horizontal:8,vertical:5), decoration:BoxDecoration(color:sel?c.withValues(alpha: .12):Colors.transparent,borderRadius:BorderRadius.circular(6),border:Border.all(color:sel?c:const Color(0xFFE5E7EB))), child:Text(lbl,style:TextStyle(fontSize:9.5,fontWeight:sel?FontWeight.w600:FontWeight.w400,color:sel?c:const Color(0xFF6B7280)))));
        }).toList()),
        const SizedBox(height:10),
        // Chart
        Container(padding:const EdgeInsets.all(14), decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(12)), child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
          Row(children:[const Text('Forecast',style:TextStyle(fontSize:12,fontWeight:FontWeight.w600)),const Spacer(),
            _training ? const SizedBox(width:14,height:14,child:CircularProgressIndicator(strokeWidth:2)) : const SizedBox()
          ]),
          const SizedBox(height:10),
          forecast.when(
            loading:()=>const SizedBox(height:120,child:Center(child:CircularProgressIndicator())),
            error:(e,_)=>Container(padding:const EdgeInsets.all(12),decoration:BoxDecoration(color:const Color(0xFFFFF0F0),borderRadius:BorderRadius.circular(8)),child:Text('Forecast unavailable: $e',style:const TextStyle(fontSize:11))),
            data:(pts)=>ForecastChart(points:pts,metric:_metric,lineColor:selectedColor),
          ),
        ])),
        const SizedBox(height:10),
        // Model info
        Container(padding:const EdgeInsets.all(14), decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(12)), child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
          const Text('Model Info',style:TextStyle(fontSize:12,fontWeight:FontWeight.w600)),
          const SizedBox(height:8),
          _InfoRow('Algorithm','LSTM + linear regression'),
          _InfoRow('Training data','Last 7 days (hourly)'),
          _InfoRow('Anomaly detection','Isolation Forest'),
          _InfoRow('Update cadence','Daily auto-retrain'),
          const SizedBox(height:8),
          const Text('Note: Forecasts are probabilistic estimates; actual values may vary.',style:TextStyle(fontSize:9,color:Color(0xFF9CA3AF),fontStyle:FontStyle.italic)),
        ])),
        const SizedBox(height:10),
        // Data table
        Container(padding:const EdgeInsets.all(14), decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(12)), child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
          const Text('Forecast Data',style:TextStyle(fontSize:12,fontWeight:FontWeight.w600)),
          const SizedBox(height:8),
          forecast.maybeWhen(data:(pts)=>Column(children:[
            const Row(children:[Expanded(child:Text('Hour',style:TextStyle(fontSize:10,fontWeight:FontWeight.w700,color:Color(0xFF6B7280)))),Expanded(child:Text('Temp',style:TextStyle(fontSize:10,fontWeight:FontWeight.w700,color:Color(0xFF6B7280)))),Expanded(child:Text('Hum.',style:TextStyle(fontSize:10,fontWeight:FontWeight.w700,color:Color(0xFF6B7280)))),Expanded(child:Text('IAQ',style:TextStyle(fontSize:10,fontWeight:FontWeight.w700,color:Color(0xFF6B7280))))]),
            const Divider(),
            ...pts.where((p)=>p.hoursAhead%4==0||p.hoursAhead==1).map((p)=>Padding(padding:const EdgeInsets.symmetric(vertical:3), child:Row(children:[
              Expanded(child:Text(p.hoursAhead==0?'Now':'+${p.hoursAhead}h',style:const TextStyle(fontSize:10))),
              Expanded(child:Text(p.temperature!=null?'${p.temperature!.toStringAsFixed(1)}°C':'—',style:const TextStyle(fontSize:10))),
              Expanded(child:Text(p.humidity!=null?'${p.humidity!.toStringAsFixed(0)}%':'—',style:const TextStyle(fontSize:10))),
              Expanded(child:Text(p.aqi!=null?'${p.aqi!.toStringAsFixed(0)}':'—',style:const TextStyle(fontSize:10))),
            ]))),
          ]), orElse:()=>const SizedBox()),
        ])),
        const SizedBox(height:20),
      ]),
    );
  }
  Widget _InfoRow(String k, String v) => Padding(padding:const EdgeInsets.symmetric(vertical:3), child:Row(children:[Text(k,style:const TextStyle(fontSize:10.5,color:Color(0xFF6B7280))),const Spacer(),Text(v,style:const TextStyle(fontSize:10.5,fontWeight:FontWeight.w500))]));
  Future<void> _train() async {
    if(_sensorId==null) return;
    setState(()=>_training=true);
    try {
      await ref.read(apiProvider).trainModel(_sensorId!);
      if(mounted){ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Model re-trained successfully')));ref.invalidate(forecastProvider(_sensorId!));}
    } catch(e) { if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('Training failed: $e'))); }
    finally { if(mounted) setState(()=>_training=false); }
  }
}
