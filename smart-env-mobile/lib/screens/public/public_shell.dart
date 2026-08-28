import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../core/constants.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';
import '../../widgets/widgets.dart';

class PublicShell extends ConsumerStatefulWidget {
  final Widget child;
  const PublicShell({super.key, required this.child});
  static final scaffoldKey = GlobalKey<ScaffoldState>();
  @override ConsumerState<PublicShell> createState() => _S();
}
class _S extends ConsumerState<PublicShell> {
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
  int _idx(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    if (loc.startsWith('/dashboard/sensors')) return 1;
    if (loc.startsWith('/dashboard/map'))     return 2;
    if (loc.startsWith('/dashboard/alerts'))  return 3;
    return 0;
  }
  @override Widget build(BuildContext context) {
    final auth   = ref.watch(authProvider);
    final unread = ref.watch(unreadAlertCountProvider);
    final conn   = ref.watch(connProvider);
    final dark   = ref.watch(themeModeProvider) == ThemeMode.dark;
    final idx    = _idx(context);
    ref.listen(alertsProvider, (_, n) { if (n.hasValue) _check(); });
    return Scaffold(
      key: PublicShell.scaffoldKey,
      body: Stack(children:[
        widget.child,
        if (_popup != null) GlobalAlertPopup(
          event:_popup!,
          onDismiss:(){ setState((){ _dismissed[_popup!.id]=DateTime.now().millisecondsSinceEpoch; _popup=null; }); },
          onAcknowledge:(id)=>ref.read(alertsProvider.notifier).acknowledge(id)),
      ]),
      bottomNavigationBar: Container(
        decoration:BoxDecoration(color:dark?kGray950:kGrayWhite,border:Border(top:BorderSide(color:dark?kGray800:kGray100))),
        child:SafeArea(child:Padding(padding:const EdgeInsets.symmetric(horizontal:8,vertical:6),child:Row(children:[
          _BNI(Icons.grid_view_rounded,        'Home',    idx==0, ()=>context.go('/dashboard')),
          _BNI(Icons.wifi_tethering_rounded,   'Sensors', idx==1, ()=>context.go('/dashboard/sensors')),
          _BNI(Icons.map_outlined,             'Map',     idx==2, ()=>context.go('/dashboard/map')),
          _BNI(Icons.notifications_outlined,   'Alerts',  idx==3, ()=>context.go('/dashboard/alerts'), badge:unread),
        ]))),
      ),
      drawer: _Drawer(user:auth.user, unread:unread, conn:conn, dark:dark,
        onToggleTheme:()=>ref.read(themeModeProvider.notifier).toggle(),
        onLogout:() async { await ref.read(authProvider.notifier).logout(); if(context.mounted) context.go('/login'); }),
    );
  }
}

class _Drawer extends StatelessWidget {
  final AuthUser? user; final int unread; final ConnStatus conn;
  final bool dark; final VoidCallback onToggleTheme; final VoidCallback onLogout;
  const _Drawer({required this.user,required this.unread,required this.conn,required this.dark,required this.onToggleTheme,required this.onLogout});
  @override Widget build(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    final items = [
      (Icons.grid_view_rounded,     'Overview',   '/dashboard'),
      (Icons.wifi_tethering_rounded,'My Sensors', '/dashboard/sensors'),
      (Icons.map_outlined,          'Sensor Map', '/dashboard/map'),
      (Icons.notifications_outlined,'Alerts',     '/dashboard/alerts'),
      (Icons.download_outlined,     'Export',     '/dashboard/export'),
      (Icons.person_outline_rounded,'Profile',    '/dashboard/profile'),
    ];
    return Drawer(backgroundColor:kGray900,child:SafeArea(child:Column(children:[
      Padding(padding:const EdgeInsets.fromLTRB(16,16,16,12),child:Row(children:[
        Container(width:36,height:36,
          decoration:BoxDecoration(gradient:const LinearGradient(colors:[kTeal400,kTeal600]),borderRadius:BorderRadius.circular(10)),
          child:const Icon(Icons.eco_rounded,size:20,color:Colors.white)),
        const SizedBox(width:10),
        const Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
          Text('Climatrixa',style:TextStyle(color:Colors.white,fontWeight:FontWeight.w700,fontSize:15)),
          Text('Environmental Monitor',style:TextStyle(color:kGray500,fontSize:11)),
        ]),
      ])),
      const Divider(color:kGray800,height:1),
      const SizedBox(height:6),
      Expanded(child:ListView(padding:const EdgeInsets.symmetric(horizontal:8,vertical:4),children:items.map((item){
        final (icon,label,path)=item;
        final active=loc==path||(path!='/dashboard'&&loc.startsWith(path));
        return _NavItem(icon:icon,label:label,isActive:active,
          badge:label=='Alerts'&&unread>0?unread:null,
          onTap:(){ Navigator.pop(context); context.go(path); });
      }).toList())),
      const Divider(color:kGray800,height:1),
      // Connection status
      Padding(padding:const EdgeInsets.fromLTRB(12,10,12,0),child:Container(
        padding:const EdgeInsets.symmetric(horizontal:12,vertical:8),
        decoration:BoxDecoration(color:conn==ConnStatus.connected?kTeal600.withValues(alpha:0.15):kGray800,borderRadius:BorderRadius.circular(8)),
        child:Row(children:[
          Icon(conn==ConnStatus.connected?Icons.wifi_rounded:Icons.wifi_off_rounded,size:14,color:conn==ConnStatus.connected?kTeal500:kGray500),
          const SizedBox(width:8),
          Text(conn==ConnStatus.connected?'Connected':'Reconnecting...',
            style:TextStyle(fontSize:12,color:conn==ConnStatus.connected?kTeal500:kGray500,fontWeight:FontWeight.w500)),
        ]))),
      // Theme toggle
      GestureDetector(onTap:onToggleTheme,child:Padding(
        padding:const EdgeInsets.symmetric(horizontal:12,vertical:4),
        child:Container(padding:const EdgeInsets.symmetric(horizontal:12,vertical:10),
          child:Row(children:[
            Icon(dark?Icons.light_mode_outlined:Icons.dark_mode_outlined,size:16,color:kGray400),
            const SizedBox(width:10),
            Text(dark?'Light mode':'Dark mode',style:const TextStyle(color:kGray400,fontSize:13)),
          ])))),
      // User + sign out
      Padding(padding:const EdgeInsets.fromLTRB(12,0,12,12),child:Column(children:[
        Container(padding:const EdgeInsets.all(10),decoration:BoxDecoration(color:kGray800,borderRadius:BorderRadius.circular(10)),
          child:Row(children:[
            CircleAvatar(radius:18,backgroundColor:kTeal700,
              child:Text((user?.email.isNotEmpty==true?user!.email[0].toUpperCase():'U'),style:const TextStyle(color:Colors.white,fontWeight:FontWeight.w700,fontSize:14))),
            const SizedBox(width:10),
            Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
              Text(user?.email??'—',style:const TextStyle(color:Colors.white,fontWeight:FontWeight.w600,fontSize:11),maxLines:1,overflow:TextOverflow.ellipsis),
              Container(margin:const EdgeInsets.only(top:3),padding:const EdgeInsets.symmetric(horizontal:6,vertical:1),
                decoration:BoxDecoration(color:kGray700,borderRadius:BorderRadius.circular(4)),
                child:const Text('Public User',style:TextStyle(color:kGray300,fontSize:9,fontWeight:FontWeight.w500))),
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
    ])));
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon; final String label; final bool isActive; final int? badge; final VoidCallback onTap;
  const _NavItem({required this.icon,required this.label,required this.isActive,this.badge,required this.onTap});
  @override Widget build(BuildContext context) => GestureDetector(onTap:onTap,child:Container(
    margin:const EdgeInsets.only(bottom:2),
    padding:const EdgeInsets.symmetric(horizontal:12,vertical:10),
    decoration:BoxDecoration(color:isActive?kTeal600.withValues(alpha:0.15):Colors.transparent,borderRadius:BorderRadius.circular(8)),
    child:Row(children:[
      Icon(icon,size:18,color:isActive?kTeal500:kGray400),
      const SizedBox(width:12),
      Expanded(child:Text(label,style:TextStyle(fontSize:13,fontWeight:isActive?FontWeight.w600:FontWeight.w400,color:isActive?kTeal500:kGray400))),
      if(badge!=null) Container(padding:const EdgeInsets.symmetric(horizontal:6,vertical:2),decoration:BoxDecoration(color:kRed500,borderRadius:BorderRadius.circular(10)),
        child:Text('$badge',style:const TextStyle(color:Colors.white,fontSize:10,fontWeight:FontWeight.w700))),
    ])));
}

class _BNI extends StatelessWidget {
  final IconData icon; final String label; final bool selected; final VoidCallback onTap; final int badge;
  const _BNI(this.icon, this.label, this.selected, this.onTap, {this.badge=0});
  @override Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Expanded(child:GestureDetector(onTap:onTap,child:Container(
      padding:const EdgeInsets.symmetric(vertical:6),
      decoration:selected?BoxDecoration(color:kTeal600.withValues(alpha:0.1),borderRadius:BorderRadius.circular(10)):null,
      child:Column(mainAxisSize:MainAxisSize.min,children:[
        Stack(clipBehavior:Clip.none,children:[
          Icon(icon,size:20,color:selected?kTeal500:(dark?kGray600:kGray400)),
          if(badge>0) Positioned(top:-3,right:-3,child:Container(width:14,height:14,decoration:const BoxDecoration(color:kRed500,shape:BoxShape.circle),
            child:Center(child:Text(badge>9?'9+':'$badge',style:const TextStyle(color:Colors.white,fontSize:7,fontWeight:FontWeight.w700))))),
        ]),
        const SizedBox(height:3),
        Text(label,style:TextStyle(fontSize:9.5,fontWeight:selected?FontWeight.w600:FontWeight.w400,color:selected?kTeal500:(dark?kGray600:kGray400))),
        if(selected)...[const SizedBox(height:2),Container(width:4,height:4,decoration:const BoxDecoration(color:kTeal500,shape:BoxShape.circle))],
      ]))));
  }
}
