import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';
import '../../core/api_client.dart';
import '../../providers/providers.dart';

class AdminExportScreen extends ConsumerStatefulWidget {
  const AdminExportScreen({super.key});
  @override ConsumerState<AdminExportScreen> createState() => _S();
}
class _S extends ConsumerState<AdminExportScreen> {
  DateTime _from = DateTime.now().subtract(const Duration(days:30));
  DateTime _to   = DateTime.now();
  final Set<String> _selected = {};
  String _dataType = 'readings';
  bool _allSensors = true;
  bool _loading = false;
  String? _lastFile;

  Future<void> _export() async {
    setState(()=>_loading=true);
    try {
      final api = ref.read(apiProvider);
      final fmt = DateFormat('yyyy-MM-dd');
      final sensorIds = _allSensors ? (ref.read(sensorsProvider).valueOrNull??[]).map((s)=>s.id).toList() : _selected.toList();
      for(final id in sensorIds.isNotEmpty?sensorIds:['']) {
        final file = _dataType=='readings'
          ? await api.downloadReadings(sensorId:id.isEmpty?null:id,from:fmt.format(_from),to:fmt.format(_to))
          : await api.downloadAlertEvents(sensorId:id.isEmpty?null:id,from:fmt.format(_from),to:fmt.format(_to));
        setState(()=>_lastFile=file.path);
      }
      if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:const Text('Export complete'),action:SnackBarAction(label:'Open',onPressed:()=>OpenFilex.open(_lastFile!))));
    } catch(e) { if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('Error: $e'))); }
    finally { if(mounted) setState(()=>_loading=false); }
  }

  @override
  Widget build(BuildContext context) {
    final sensors = ref.watch(sensorsProvider).valueOrNull??[];
    final fmt = DateFormat('yyyy-MM-dd');
    const purple = Color(0xFF7C3AED);
    return Scaffold(
      appBar: AppBar(backgroundColor:purple, foregroundColor:Colors.white,
        leading:Builder(builder:(ctx)=>IconButton(icon:const Icon(Icons.menu,color:Colors.white),onPressed:()=>Scaffold.of(ctx).openDrawer())),
        title:const Text('Export',style:TextStyle(color:Colors.white)),
      ),
      body:ListView(padding:const EdgeInsets.all(14),children:[
        _section('Date Range',Row(children:[
          Expanded(child:_DateTile('From',fmt.format(_from),()async{final p=await showDatePicker(context:context,initialDate:_from,firstDate:DateTime(2024),lastDate:DateTime.now());if(p!=null)setState(()=>_from=p);})),
          const SizedBox(width:10),
          Expanded(child:_DateTile('To',fmt.format(_to),()async{final p=await showDatePicker(context:context,initialDate:_to,firstDate:DateTime(2024),lastDate:DateTime.now());if(p!=null)setState(()=>_to=p);})),
        ])),
        const SizedBox(height:10),
        _section('Sensor Scope',Column(children:[
          CheckboxListTile(dense:true,contentPadding:EdgeInsets.zero,title:const Text('All sensors',style:TextStyle(fontSize:12)),value:_allSensors,activeColor:purple,onChanged:(v)=>setState(()=>_allSensors=v!)),
          if(!_allSensors) ...sensors.map((s)=>CheckboxListTile(dense:true,contentPadding:EdgeInsets.zero,title:Text(s.name,style:const TextStyle(fontSize:12)),value:_selected.contains(s.id),activeColor:purple,onChanged:(v)=>setState(()=>v!?_selected.add(s.id):_selected.remove(s.id)))),
        ])),
        const SizedBox(height:10),
        _section('Data Type',Column(children:[
          RadioListTile(dense:true,contentPadding:EdgeInsets.zero,title:const Text('Sensor Readings (CSV)',style:TextStyle(fontSize:12)),value:'readings',groupValue:_dataType,activeColor:purple,onChanged:(v)=>setState(()=>_dataType=v!)),
          RadioListTile(dense:true,contentPadding:EdgeInsets.zero,title:const Text('Alert Events (CSV)',style:TextStyle(fontSize:12)),value:'alerts',groupValue:_dataType,activeColor:purple,onChanged:(v)=>setState(()=>_dataType=v!)),
        ])),
        const SizedBox(height:16),
        SizedBox(width:double.infinity,child:ElevatedButton.icon(onPressed:_loading?null:_export, icon:_loading?const SizedBox(width:16,height:16,child:CircularProgressIndicator(color:Colors.white,strokeWidth:2)):const Icon(Icons.download,size:16), label:Text(_loading?'Exporting…':'Export CSV'), style:ElevatedButton.styleFrom(backgroundColor:purple,foregroundColor:Colors.white,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(12)),padding:const EdgeInsets.symmetric(vertical:14)))),
        if(_lastFile!=null)...[const SizedBox(height:10),_section('Last Export',ListTile(dense:true,contentPadding:EdgeInsets.zero,leading:const Icon(Icons.description_outlined,size:16,color:Color(0xFF6B7280)),title:Text(_lastFile!.split('/').last,style:const TextStyle(fontSize:11)),trailing:TextButton(onPressed:()=>OpenFilex.open(_lastFile!),child:const Text('Open',style:TextStyle(fontSize:11)))))],
        const SizedBox(height:30),
      ]),
    );
  }
  Widget _section(String title, Widget child) => Container(padding:const EdgeInsets.all(14),decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(12)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(title,style:const TextStyle(fontSize:12,fontWeight:FontWeight.w600)),const SizedBox(height:10),child]));
  Widget _DateTile(String label, String date, VoidCallback onTap) => GestureDetector(onTap:onTap,child:Container(padding:const EdgeInsets.all(10),decoration:BoxDecoration(border:Border.all(color:const Color(0xFFE5E7EB)),borderRadius:BorderRadius.circular(8)),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(label,style:const TextStyle(fontSize:8,color:Color(0xFF9CA3AF))),const SizedBox(height:2),Text(date,style:const TextStyle(fontSize:11,fontWeight:FontWeight.w500))])));
}
