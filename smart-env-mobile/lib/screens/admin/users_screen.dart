import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';

class UsersScreen extends ConsumerStatefulWidget {
  const UsersScreen({super.key});
  @override ConsumerState<UsersScreen> createState() => _S();
}
class _S extends ConsumerState<UsersScreen> {
  @override
  Widget build(BuildContext context) {
    final users = ref.watch(usersProvider);
    const purple = Color(0xFF7C3AED);
    return Scaffold(
      appBar: AppBar(
        backgroundColor:purple, foregroundColor:Colors.white,
        leading:Builder(builder:(ctx)=>IconButton(icon:const Icon(Icons.menu,color:Colors.white),onPressed:()=>Scaffold.of(ctx).openDrawer())),
        title:const Text('User Management',style:TextStyle(color:Colors.white)),
        actions:[IconButton(icon:const Icon(Icons.person_add,color:Colors.white),onPressed:()=>_showAddUser(context,ref)), const SizedBox(width:8)],
      ),
      body:users.when(
        loading:()=>const Center(child:CircularProgressIndicator()),
        error:(e,_)=>Center(child:Text('$e')),
        data:(list)=>RefreshIndicator(onRefresh:()async=>ref.invalidate(usersProvider), child:ListView.builder(
          padding:const EdgeInsets.all(14),
          itemCount:list.length,
          itemBuilder:(_,i){
            final u=list[i];
            return Container(margin:const EdgeInsets.only(bottom:10), padding:const EdgeInsets.all(12), decoration:BoxDecoration(color:Colors.white,borderRadius:BorderRadius.circular(12),border:Border.all(color:const Color(0xFFE5E7EB))), child:Row(children:[
              CircleAvatar(backgroundColor:u.isAdmin?purple:const Color(0xFF14B8A6), radius:18, child:Text(u.email[0].toUpperCase(),style:const TextStyle(color:Colors.white,fontWeight:FontWeight.w700,fontSize:12))),
              const SizedBox(width:10),
              Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
                Text(u.displayName??u.email, style:const TextStyle(fontSize:11.5,fontWeight:FontWeight.w600), maxLines:1, overflow:TextOverflow.ellipsis),
                Text(u.email, style:const TextStyle(fontSize:9.5,color:Color(0xFF6B7280)), maxLines:1, overflow:TextOverflow.ellipsis),
                const SizedBox(height:3),
                Row(children:[
                  Container(padding:const EdgeInsets.symmetric(horizontal:6,vertical:1),decoration:BoxDecoration(color:u.isAdmin?const Color(0xFFEDE9FE):const Color(0xFFCCFBF1),borderRadius:BorderRadius.circular(6)),child:Text(u.isAdmin?'Admin':'Public',style:TextStyle(fontSize:8.5,fontWeight:FontWeight.w700,color:u.isAdmin?purple:const Color(0xFF0F766E)))),
                  const SizedBox(width:6),
                  Text('${u.sensorCount} sensor${u.sensorCount==1?'':'s'}',style:const TextStyle(fontSize:9,color:Color(0xFF9CA3AF))),
                ]),
              ])),
              PopupMenuButton<String>(
                onSelected:(v){
                  if(v=='deactivate') _confirmDeactivate(context,ref,u);
                  if(v=='sensors') _showSensorAccess(context,ref,u);
                },
                itemBuilder:(_)=>[
                  const PopupMenuItem(value:'sensors',child:Text('Manage Sensors',style:TextStyle(fontSize:12))),
                  const PopupMenuItem(value:'deactivate',child:Text('Deactivate',style:TextStyle(fontSize:12,color:Color(0xFFEF4444)))),
                ],
              ),
            ]));
          },
        )),
      ),
    );
  }
  void _showAddUser(BuildContext context, WidgetRef ref){
    final emailCtrl=TextEditingController(); final passCtrl=TextEditingController(); final nameCtrl=TextEditingController();
    String role='public';
    showModalBottomSheet(context:context, isScrollControlled:true, shape:const RoundedRectangleBorder(borderRadius:BorderRadius.vertical(top:Radius.circular(20))), builder:(ctx)=>StatefulBuilder(builder:(ctx,setSt)=>Padding(
      padding:EdgeInsets.only(bottom:MediaQuery.of(ctx).viewInsets.bottom,left:20,right:20,top:20),
      child:Column(mainAxisSize:MainAxisSize.min, crossAxisAlignment:CrossAxisAlignment.start, children:[
        Container(width:36,height:4,decoration:BoxDecoration(color:const Color(0xFFE5E7EB),borderRadius:BorderRadius.circular(2))),
        const SizedBox(height:16),
        const Text('Create User',style:TextStyle(fontSize:16,fontWeight:FontWeight.w700)),
        const SizedBox(height:14),
        TextField(controller:nameCtrl, decoration:const InputDecoration(labelText:'Display Name (optional)')),
        const SizedBox(height:8),
        TextField(controller:emailCtrl, keyboardType:TextInputType.emailAddress, decoration:const InputDecoration(labelText:'Email address')),
        const SizedBox(height:8),
        TextField(controller:passCtrl, obscureText:true, decoration:const InputDecoration(labelText:'Temporary password')),
        const SizedBox(height:8),
        Row(children:['public','admin'].map((r)=>GestureDetector(onTap:()=>setSt(()=>role=r),child:Container(margin:const EdgeInsets.only(right:8),padding:const EdgeInsets.symmetric(horizontal:12,vertical:6),decoration:BoxDecoration(color:role==r?const Color(0xFF7C3AED):Colors.transparent,borderRadius:BorderRadius.circular(8),border:Border.all(color:role==r?const Color(0xFF7C3AED):const Color(0xFFE5E7EB))),child:Text(role==r?r:r,style:TextStyle(fontSize:11,color:role==r?Colors.white:const Color(0xFF6B7280)))))).toList()),
        const SizedBox(height:14),
        SizedBox(width:double.infinity,child:ElevatedButton(style:ElevatedButton.styleFrom(backgroundColor:const Color(0xFF7C3AED),foregroundColor:Colors.white,shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(12))),onPressed:()async{try{await ref.read(apiProvider).createUser({'email':emailCtrl.text.trim(),'password':passCtrl.text,'role':role,'display_name':nameCtrl.text.trim()});ref.invalidate(usersProvider);if(context.mounted){Navigator.pop(ctx);ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('User created')));}}catch(e){if(context.mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('Error: $e')));}}child:const Text('Create User'))),
        const SizedBox(height:20),
      ]),
    )));
  }
  void _confirmDeactivate(BuildContext context, WidgetRef ref, AppUser u){
    showDialog(context:context,builder:(_)=>AlertDialog(title:const Text('Deactivate user?'),content:Text('Remove ${u.email} from the system?'),actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('Cancel')),TextButton(onPressed:()async{Navigator.pop(context);await ref.read(apiProvider).deactivateUser(u.id);ref.invalidate(usersProvider);},child:const Text('Deactivate',style:TextStyle(color:Color(0xFFEF4444))))]));
  }
  void _showSensorAccess(BuildContext context, WidgetRef ref, AppUser u){
    showDialog(context:context,builder:(_)=>AlertDialog(title:Text('${u.displayName??u.email} — Sensors'),content:const Text('Sensor assignment UI — assign sensors from the sensor management list or via the API.'),actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('OK'))]));
  }
}
