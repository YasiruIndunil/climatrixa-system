import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/providers.dart';

class AddEditSensorScreen extends ConsumerStatefulWidget {
  final String? sensorId;
  const AddEditSensorScreen({super.key, this.sensorId});
  @override ConsumerState<AddEditSensorScreen> createState() => _S();
}
class _S extends ConsumerState<AddEditSensorScreen> {
  final _nameCtrl = TextEditingController();
  final _locCtrl  = TextEditingController();
  final _idCtrl   = TextEditingController();
  final _macCtrl  = TextEditingController();
  final _tempMaxCtrl = TextEditingController(text:'35.0');
  final _humMaxCtrl  = TextEditingController(text:'80.0');
  final _co2MaxCtrl  = TextEditingController(text:'1000');
  final _aiTempCtrl  = TextEditingController(text:'29.0');
  final _form = GlobalKey<FormState>();
  bool _loading = false;
  bool get isEdit => widget.sensorId != null;

  @override void dispose() { for(final c in [_nameCtrl,_locCtrl,_idCtrl,_macCtrl,_tempMaxCtrl,_humMaxCtrl,_co2MaxCtrl,_aiTempCtrl]) c.dispose(); super.dispose(); }

  Future<void> _save() async {
    if(!(_form.currentState?.validate()??false)) return;
    setState(()=>_loading=true);
    final api = ref.read(apiProvider);
    try {
      final body = {'name':_nameCtrl.text.trim(),'location':_locCtrl.text.trim(),'mac_address':_macCtrl.text.trim().toUpperCase(),'is_active':true};
      if(isEdit) await api.updateSensor(widget.sensorId!, body);
      else await api.createSensor(body);
      ref.invalidate(sensorsProvider);
      if(mounted) { context.go('/admin/sensors'); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(isEdit?'Sensor updated':'Sensor created'))); }
    } catch(e) {
      if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('Error: $e')));
    } finally { if(mounted) setState(()=>_loading=false); }
  }

  @override
  Widget build(BuildContext context) {
    const purple = Color(0xFF7C3AED);
    return Scaffold(
      appBar: AppBar(backgroundColor:purple, foregroundColor:Colors.white, leading:const BackButton(color:Colors.white), title:Text(isEdit?'Edit Sensor':'Add Sensor',style:const TextStyle(color:Colors.white))),
      body: Form(key:_form, child:ListView(padding:const EdgeInsets.all(14), children:[
        _section('Sensor Identity',[
          _field('Sensor ID (CLM-xxx)',_idCtrl,required:!isEdit),
          _field('MAC Address',_macCtrl, hint:'AA:BB:CC:DD:EE:FF'),
          _field('Display Name',_nameCtrl,required:true),
          _field('Location',_locCtrl,required:true,hint:'Building A, Floor 2'),
        ]),
        const SizedBox(height:10),
        _section('Alert Thresholds',[
          Row(children:[Expanded(child:_field('Temp Max',_tempMaxCtrl,keyboardType:TextInputType.number)),const SizedBox(width:8),const Text('°C')]),
          Row(children:[Expanded(child:_field('Humidity Max',_humMaxCtrl,keyboardType:TextInputType.number)),const SizedBox(width:8),const Text('%')]),
          Row(children:[Expanded(child:_field('CO₂ Max',_co2MaxCtrl,keyboardType:TextInputType.number)),const SizedBox(width:8),const Text('ppm')]),
          Row(children:[Expanded(child:_field('AI Trigger Temp',_aiTempCtrl,keyboardType:TextInputType.number)),const SizedBox(width:8),const Text('°C')]),
          const SizedBox(height:4),
          const Text('AI Trigger uses trigger_on_predicted rule for early warnings',style:TextStyle(fontSize:9,color:Color(0xFF9CA3AF))),
        ]),
        const SizedBox(height:16),
        SizedBox(width:double.infinity, child:ElevatedButton.icon(
          onPressed:_loading?null:_save,
          icon:_loading?const SizedBox(width:16,height:16,child:CircularProgressIndicator(color:Colors.white,strokeWidth:2)):const Icon(Icons.save,size:16),
          label:Text(_loading?'Saving…':isEdit?'Save Changes':'Create Sensor'),
          style:ElevatedButton.styleFrom(backgroundColor:purple,foregroundColor:Colors.white,padding:const EdgeInsets.symmetric(vertical:14),shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(12))),
        )),
        const SizedBox(height:20),
      ])),
    );
  }
  Widget _section(String title, List<Widget> children) => Container(padding:const EdgeInsets.all(14), decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(12)), child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(title,style:const TextStyle(fontSize:12,fontWeight:FontWeight.w600)),const SizedBox(height:10),...children]));
  Widget _field(String label, TextEditingController ctrl, {bool required=false, String? hint, TextInputType? keyboardType}) => Padding(padding:const EdgeInsets.only(bottom:8), child:TextFormField(controller:ctrl, keyboardType:keyboardType, decoration:InputDecoration(labelText:label,hintText:hint), validator:required?(v)=>v==null||v.isEmpty?'$label is required':null:null));
}
