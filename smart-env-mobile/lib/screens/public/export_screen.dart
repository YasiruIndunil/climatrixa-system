import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';
import '../../core/api_client.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';

class ExportScreen extends ConsumerStatefulWidget {
  const ExportScreen({super.key});
  @override ConsumerState<ExportScreen> createState() => _ExportScreenState();
}
class _ExportScreenState extends ConsumerState<ExportScreen> {
  DateTime _from = DateTime.now().subtract(const Duration(days:7));
  DateTime _to   = DateTime.now();
  final Set<String> _selectedSensors = {};
  String _dataType = 'readings'; // 'readings' | 'alerts'
  bool _loading = false;
  String? _lastFile;

  Future<void> _export() async {
    if(_selectedSensors.isEmpty){
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Select at least one sensor')));
      return;
    }
    setState(()=>_loading=true);
    try{
      final api = ref.read(apiProvider);
      final fmt = DateFormat('yyyy-MM-dd');
      for(final id in _selectedSensors){
        final file = _dataType=='readings'
          ? await api.downloadReadings(sensorId:id, from:fmt.format(_from), to:fmt.format(_to))
          : await api.downloadAlertEvents(sensorId:id, from:fmt.format(_from), to:fmt.format(_to));
        setState(()=>_lastFile=file.path);
      }
      if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('Export saved'), action:SnackBarAction(label:'Open', onPressed:()=>OpenFilex.open(_lastFile!))));
    }catch(e){
      if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('Export failed: $e')));
    } finally { if(mounted) setState(()=>_loading=false); }
  }

  Future<void> _pickDate(bool isFrom) async {
    final picked = await showDatePicker(context:context, initialDate:isFrom?_from:_to, firstDate:DateTime(2024), lastDate:DateTime.now());
    if(picked!=null) setState(()=>isFrom?_from=picked:_to=picked);
  }

  @override
  Widget build(BuildContext context) {
    final sensors = ref.watch(sensorsProvider);
    final fmt = DateFormat('yyyy-MM-dd');
    const teal = Color(0xFF14B8A6);
    return Scaffold(
      appBar: AppBar(title:const Text('Export Data')),
      body: ListView(
        padding:const EdgeInsets.all(14),
        children:[
          _section('Date Range', Column(children:[
            Row(children:[
              Expanded(child:_DateTile(label:'From', date:fmt.format(_from), onTap:()=>_pickDate(true))),
              const SizedBox(width:10),
              Expanded(child:_DateTile(label:'To', date:fmt.format(_to), onTap:()=>_pickDate(false))),
            ]),
          ])),
          const SizedBox(height:10),
          _section('Select Sensors', sensors.when(
            loading:()=>const CircularProgressIndicator(),
            error:(e,_)=>Text('$e'),
            data:(list){
              if(_selectedSensors.isEmpty) _selectedSensors.addAll(list.map((s)=>s.id));
              return Column(children:list.map((s)=>CheckboxListTile(
                dense:true, contentPadding:EdgeInsets.zero,
                title:Text(s.name, style:const TextStyle(fontSize:12)),
                value:_selectedSensors.contains(s.id),
                activeColor:teal,
                onChanged:(v)=>setState(()=>v!?_selectedSensors.add(s.id):_selectedSensors.remove(s.id)),
              )).toList());
            },
          )),
          const SizedBox(height:10),
          _section('Data Type', Column(children:[
            RadioListTile(dense:true, contentPadding:EdgeInsets.zero, title:const Text('Sensor Readings',style:TextStyle(fontSize:12)), value:'readings', groupValue:_dataType, activeColor:teal, onChanged:(v)=>setState(()=>_dataType=v!)),
            RadioListTile(dense:true, contentPadding:EdgeInsets.zero, title:const Text('Alert Events',style:TextStyle(fontSize:12)), value:'alerts', groupValue:_dataType, activeColor:teal, onChanged:(v)=>setState(()=>_dataType=v!)),
          ])),
          const SizedBox(height:16),
          SizedBox(width:double.infinity, child:ElevatedButton.icon(
            onPressed:_loading?null:_export,
            icon:_loading?const SizedBox(width:16,height:16,child:CircularProgressIndicator(color:Colors.white,strokeWidth:2)):const Icon(Icons.download, size:16),
            label:Text(_loading?'Exporting…':'Export CSV'),
            style:ElevatedButton.styleFrom(backgroundColor:teal, foregroundColor:Colors.white, shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(12))),
          )),
          if(_lastFile!=null)...[
            const SizedBox(height:10),
            _section('Last Export', ListTile(dense:true, contentPadding:EdgeInsets.zero, leading:const Icon(Icons.description_outlined, size:16, color:Color(0xFF6B7280)), title:Text(_lastFile!.split('/').last, style:const TextStyle(fontSize:11)), trailing:TextButton(onPressed:()=>OpenFilex.open(_lastFile!), child:const Text('Open',style:TextStyle(fontSize:11))))),
          ],
          const SizedBox(height:30),
        ],
      ),
    );
  }

  Widget _section(String title, Widget child) => Container(
    padding:const EdgeInsets.all(14),
    decoration:BoxDecoration(color:Colors.white, borderRadius:BorderRadius.circular(12)),
    child:Column(crossAxisAlignment:CrossAxisAlignment.start, children:[
      Text(title, style:const TextStyle(fontSize:12, fontWeight:FontWeight.w600, color:Color(0xFF1F2937))),
      const SizedBox(height:10),
      child,
    ]),
  );
}

class _DateTile extends StatelessWidget {
  final String label, date;
  final VoidCallback onTap;
  const _DateTile({required this.label, required this.date, required this.onTap});
  @override Widget build(BuildContext context) => GestureDetector(
    onTap:onTap,
    child:Container(
      padding:const EdgeInsets.all(10),
      decoration:BoxDecoration(border:Border.all(color:const Color(0xFFE5E7EB)), borderRadius:BorderRadius.circular(8)),
      child:Column(crossAxisAlignment:CrossAxisAlignment.start, children:[
        Text(label, style:const TextStyle(fontSize:8, color:Color(0xFF9CA3AF))),
        const SizedBox(height:2),
        Text(date, style:const TextStyle(fontSize:11, fontWeight:FontWeight.w500)),
      ]),
    ),
  );
}
