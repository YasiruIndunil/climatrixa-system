import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';
import '../../widgets/widgets.dart';

class AdminShell extends ConsumerStatefulWidget {
  final Widget child;
  const AdminShell({super.key, required this.child});

  // Static key so any admin screen can open the drawer
  static final scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  ConsumerState<AdminShell> createState() => _AdminShellState();
}
class _AdminShellState extends ConsumerState<AdminShell> {
  final Map<String,int> _dismissed = {};
  AlertEvent? _pendingPopup;
  void _checkAlerts() {
    final events = ref.read(alertsProvider).valueOrNull;
    if(events==null||_pendingPopup!=null) return;
    final now = DateTime.now().millisecondsSinceEpoch;
    final next = events.firstWhere((e){
      if(e.acknowledged) return false;
      final last = _dismissed[e.id];
      return last==null||(now-last)>=(e.isAnomaly?kAnomalyRemindMs:kAlertRemindMs);
    }, orElse:()=>AlertEvent(id:'',sensorId:'',alertType:'',thresholdValue:0,message:'',triggeredAt:'',acknowledged:true,isPredicted:false));
    if(!next.acknowledged&&next.id.isNotEmpty) setState(()=>_pendingPopup=next);
  }
  @override
  Widget build(BuildContext context) {
    final unread = ref.watch(unreadAlertCountProvider);
    final auth = ref.watch(authProvider);
    ref.listen(alertsProvider,(_,next){if(next.hasValue)_checkAlerts();});
    return Scaffold(
      key: AdminShell.scaffoldKey,
      body: Stack(children:[
        widget.child,
        if(_pendingPopup!=null) GlobalAlertPopup(event:_pendingPopup!, onDismiss:(){setState((){_dismissed[_pendingPopup!.id]=DateTime.now().millisecondsSinceEpoch;_pendingPopup=null;});}, onAcknowledge:(id)=>ref.read(alertsProvider.notifier).acknowledge(id)),
      ]),
      drawer:_AdminDrawer(user:auth.user, unread:unread, onLogout:()async{await ref.read(authProvider.notifier).logout();if(context.mounted)context.go('/login');}),
    );
  }
}
class _AdminDrawer extends StatelessWidget {
  final AuthUser? user; final int unread; final VoidCallback onLogout;
  const _AdminDrawer({required this.user, required this.unread, required this.onLogout});
  @override
  Widget build(BuildContext context) {
    const purple = Color(0xFF7C3AED);
    final loc = GoRouterState.of(context).matchedLocation;
    final items = [(Icons.dashboard_outlined,'Overview','/admin',false),(Icons.sensors,'Sensors','/admin/sensors',false),(Icons.map_outlined,'Sensor Map','/admin/map',false),(Icons.auto_awesome,'AI Predictions','/admin/ai',false),(Icons.people_outline,'Users','/admin/users',false),(Icons.notifications_outlined,'Alerts','/admin/alerts',true),(Icons.download_outlined,'Export','/admin/export',false)];
    return Drawer(child:SafeArea(child:Column(children:[
      Container(color:purple, padding:const EdgeInsets.fromLTRB(16,20,16,16), child:Row(children:[
        CircleAvatar(backgroundColor:Colors.white, radius:22, child:Text((user?.email[0]??'A').toUpperCase(), style:const TextStyle(color:purple,fontWeight:FontWeight.w700,fontSize:16))),
        const SizedBox(width:12),
        Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start, children:[
          Text(user?.displayName??user?.email??'—', style:const TextStyle(color:Colors.white,fontWeight:FontWeight.w700,fontSize:13), maxLines:1, overflow:TextOverflow.ellipsis),
          if(user?.email!=null) Text(user!.email, style:const TextStyle(color:Color(0xFFEDE9FE),fontSize:10), maxLines:1, overflow:TextOverflow.ellipsis),
          const SizedBox(height:4),
          Container(padding:const EdgeInsets.symmetric(horizontal:6,vertical:2), decoration:BoxDecoration(color:const Color(0xFF5B21B6),borderRadius:BorderRadius.circular(6)), child:const Text('System Administrator',style:TextStyle(color:Color(0xFFEDE9FE),fontSize:9))),
        ])),
      ])),
      Expanded(child:ListView(padding:const EdgeInsets.symmetric(vertical:8,horizontal:8), children:items.map((item){
        final (icon,label,path,hasBadge)=item;
        final active=loc==path||(path!='/admin'&&loc.startsWith(path));
        return ListTile(dense:true, leading:Icon(icon,size:18,color:active?purple:const Color(0xFF6B7280)), title:Text(label,style:TextStyle(fontSize:13,fontWeight:active?FontWeight.w600:FontWeight.w400,color:active?purple:const Color(0xFF374151))), trailing:hasBadge&&unread>0?Container(padding:const EdgeInsets.symmetric(horizontal:6,vertical:2),decoration:BoxDecoration(color:const Color(0xFFEF4444),borderRadius:BorderRadius.circular(10)),child:Text('$unread',style:const TextStyle(color:Colors.white,fontSize:10,fontWeight:FontWeight.w700))):null, tileColor:active?purple.withValues(alpha: .08):Colors.transparent, shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(10)), onTap:(){Navigator.pop(context);context.go(path);});
      }).toList())),
      const Divider(height:1),
      ListTile(dense:true, leading:const Icon(Icons.logout,size:18,color:Color(0xFFEF4444)), title:const Text('Sign Out',style:TextStyle(fontSize:13,fontWeight:FontWeight.w500,color:Color(0xFFEF4444))), onTap:(){Navigator.pop(context);onLogout();}),
      const SizedBox(height:8),
    ])));
  }
}
