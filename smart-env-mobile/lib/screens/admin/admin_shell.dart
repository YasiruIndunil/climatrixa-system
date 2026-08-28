import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../core/constants.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';
import '../../widgets/widgets.dart';

class AdminShell extends ConsumerStatefulWidget {
  final Widget child;
  const AdminShell({super.key, required this.child});
  static final scaffoldKey = GlobalKey<ScaffoldState>();
  @override ConsumerState<AdminShell> createState() => _S();
}
class _S extends ConsumerState<AdminShell> {
  final Map<String,int> _dismissed = {};
  AlertEvent? _popup;
  void _check() {
    final events = ref.read(alertsProvider).valueOrNull;
    if (events == null || _popup != null) return;
    final now = DateTime.now().millisecondsSinceEpoch;
    final next = events.firstWhere((e) {
      if (e.acknowledged) return false;
      final l = _dismissed[e.id];
      return l == null || (now - l) >= (e.isAnomaly ? kAnomalyRemindMs : kAlertRemindMs);
    }, orElse: () => AlertEvent(id:'',sensorId:'',alertType:'',thresholdValue:0,message:'',triggeredAt:'',acknowledged:true,isPredicted:false));
    if (!next.acknowledged && next.id.isNotEmpty) setState(() => _popup = next);
  }
  @override Widget build(BuildContext context) {
    final unread = ref.watch(unreadAlertCountProvider);
    final auth   = ref.watch(authProvider);
    final conn   = ref.watch(connProvider);
    final dark   = ref.watch(themeModeProvider) == ThemeMode.dark;
    ref.listen(alertsProvider, (_, n) { if (n.hasValue) _check(); });
    return Scaffold(
      key: AdminShell.scaffoldKey,
      body: Stack(children: [
        widget.child,
        if (_popup != null) GlobalAlertPopup(
          event: _popup!,
          onDismiss: () { setState(() { _dismissed[_popup!.id] = DateTime.now().millisecondsSinceEpoch; _popup = null; }); },
          onAcknowledge: (id) => ref.read(alertsProvider.notifier).acknowledge(id),
        ),
      ]),
      drawer: _Drawer(user: auth.user, unread: unread, conn: conn, dark: dark,
        onToggleTheme: () => ref.read(themeModeProvider.notifier).toggle(),
        onLogout: () async { await ref.read(authProvider.notifier).logout(); if (context.mounted) context.go('/login'); }),
    );
  }
}

class _Drawer extends StatelessWidget {
  final AuthUser? user; final int unread; final ConnStatus conn;
  final bool dark; final VoidCallback onToggleTheme; final VoidCallback onLogout;
  const _Drawer({required this.user, required this.unread, required this.conn,
    required this.dark, required this.onToggleTheme, required this.onLogout});

  @override Widget build(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    final items = [
      (Icons.grid_view_rounded,      'Overview',        '/admin'),
      (Icons.wifi_tethering_rounded, 'Sensors',         '/admin/sensors'),
      (Icons.map_outlined,           'Sensor Map',      '/admin/map'),
      (Icons.auto_awesome_outlined,  'AI Predictions',  '/admin/ai'),
      (Icons.people_outline,         'Users',           '/admin/users'),
      (Icons.notifications_outlined, 'Alerts',          '/admin/alerts'),
      (Icons.download_outlined,      'Export',          '/admin/export'),
    ];
    return Drawer(
      backgroundColor: kGray900,
      child: SafeArea(child: Column(children: [
        // Header
        Padding(padding: const EdgeInsets.fromLTRB(16,16,16,12), child: Row(children: [
          Container(width:36,height:36,
            decoration:BoxDecoration(gradient:const LinearGradient(colors:[kTeal400,kTeal600]),borderRadius:BorderRadius.circular(10)),
            child:const Icon(Icons.eco_rounded,size:20,color:Colors.white)),
          const SizedBox(width:10),
          const Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
            Text('Climatrixa',style:TextStyle(color:Colors.white,fontWeight:FontWeight.w700,fontSize:15)),
            Text('Admin Console',style:TextStyle(color:kGray500,fontSize:11)),
          ]),
        ])),
        const Divider(color:kGray800,height:1),
        const SizedBox(height:6),
        // Nav
        Expanded(child:ListView(padding:const EdgeInsets.symmetric(horizontal:8,vertical:4), children:items.map((item){
          final (icon,label,path)=item;
          final active=loc==path||(path!='/admin'&&loc.startsWith(path));
          return _NavItem(icon:icon,label:label,isActive:active,
            badge:label=='Alerts'&&unread>0?unread:null,
            onTap:(){ Navigator.pop(context); context.go(path); });
        }).toList())),
        const Divider(color:kGray800,height:1),
        // Connection status
        Padding(padding:const EdgeInsets.fromLTRB(12,10,12,0), child:Container(
          padding:const EdgeInsets.symmetric(horizontal:12,vertical:8),
          decoration:BoxDecoration(
            color:conn==ConnStatus.connected?kTeal600.withValues(alpha:0.15):kGray800,
            borderRadius:BorderRadius.circular(8),
          ),
          child:Row(children:[
            Icon(conn==ConnStatus.connected?Icons.wifi_rounded:Icons.wifi_off_rounded,
              size:14,color:conn==ConnStatus.connected?kTeal500:kGray500),
            const SizedBox(width:8),
            Text(conn==ConnStatus.connected?'Connected':'Reconnecting...',
              style:TextStyle(fontSize:12,color:conn==ConnStatus.connected?kTeal500:kGray500,fontWeight:FontWeight.w500)),
          ]),
        )),
        // Light/dark toggle
        GestureDetector(onTap:onToggleTheme,child:Padding(
          padding:const EdgeInsets.symmetric(horizontal:12,vertical:4),
          child:Container(padding:const EdgeInsets.symmetric(horizontal:12,vertical:10),
            decoration:BoxDecoration(borderRadius:BorderRadius.circular(8)),
            child:Row(children:[
              Icon(dark?Icons.light_mode_outlined:Icons.dark_mode_outlined,size:16,color:kGray400),
              const SizedBox(width:10),
              Text(dark?'Light mode':'Dark mode',style:const TextStyle(color:kGray400,fontSize:13,fontWeight:FontWeight.w400)),
            ])),
        )),
        // User card + sign out
        Padding(padding:const EdgeInsets.fromLTRB(12,0,12,12),child:Column(children:[
          Container(padding:const EdgeInsets.all(10),
            decoration:BoxDecoration(color:kGray800,borderRadius:BorderRadius.circular(10)),
            child:Row(children:[
              CircleAvatar(radius:18,backgroundColor:kViolet600,
                child:Text((user?.email.isNotEmpty==true?user!.email[0].toUpperCase():'A'),
                  style:const TextStyle(color:Colors.white,fontWeight:FontWeight.w700,fontSize:14))),
              const SizedBox(width:10),
              Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
                Text(user?.email??'—',style:const TextStyle(color:Colors.white,fontWeight:FontWeight.w600,fontSize:11),maxLines:1,overflow:TextOverflow.ellipsis),
                Container(margin:const EdgeInsets.only(top:3),padding:const EdgeInsets.symmetric(horizontal:6,vertical:1),
                  decoration:BoxDecoration(color:kGray700,borderRadius:BorderRadius.circular(4)),
                  child:const Text('Admin',style:TextStyle(color:kGray300,fontSize:9,fontWeight:FontWeight.w500))),
              ])),
            ])),
          const SizedBox(height:4),
          GestureDetector(onTap:(){ Navigator.pop(context); onLogout(); },
            child:Container(padding:const EdgeInsets.symmetric(horizontal:12,vertical:10),
              child:const Row(children:[
                Icon(Icons.logout_rounded,size:16,color:kRed500),
                SizedBox(width:10),
                Text('Sign out',style:TextStyle(color:kRed500,fontSize:13,fontWeight:FontWeight.w500)),
              ]))),
        ])),
      ])),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon; final String label; final bool isActive;
  final int? badge; final VoidCallback onTap;
  const _NavItem({required this.icon,required this.label,required this.isActive,this.badge,required this.onTap});
  @override Widget build(BuildContext context) => GestureDetector(
    onTap:onTap,
    child:Container(
      margin:const EdgeInsets.only(bottom:2),
      padding:const EdgeInsets.symmetric(horizontal:12,vertical:10),
      decoration:BoxDecoration(
        color:isActive?kTeal600.withValues(alpha:0.15):Colors.transparent,
        borderRadius:BorderRadius.circular(8)),
      child:Row(children:[
        Icon(icon,size:18,color:isActive?kTeal500:kGray400),
        const SizedBox(width:12),
        Expanded(child:Text(label,style:TextStyle(fontSize:13,fontWeight:isActive?FontWeight.w600:FontWeight.w400,color:isActive?kTeal500:kGray400))),
        if(badge!=null) Container(
          padding:const EdgeInsets.symmetric(horizontal:6,vertical:2),
          decoration:BoxDecoration(color:kRed500,borderRadius:BorderRadius.circular(10)),
          child:Text('$badge',style:const TextStyle(color:Colors.white,fontSize:10,fontWeight:FontWeight.w700))),
      ])));
}
