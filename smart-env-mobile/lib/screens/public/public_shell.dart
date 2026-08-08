import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';
import '../../widgets/widgets.dart';

class PublicShell extends ConsumerStatefulWidget {
  final Widget child;
  const PublicShell({super.key, required this.child});

  // Static key so any child screen can open the drawer
  static final scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  ConsumerState<PublicShell> createState() => _PublicShellState();
}

class _PublicShellState extends ConsumerState<PublicShell> {
  // Track dismissed alerts with last-dismissed timestamp (mirrors web sessionStorage)
  final Map<String, int> _dismissed = {};
  AlertEvent? _pendingPopup;

  static const _destinations = [
    (icon: Icons.home_rounded,    label: 'Home',    path: '/dashboard'),
    (icon: Icons.sensors,         label: 'Sensors', path: '/dashboard/sensors'),
    (icon: Icons.map_outlined,    label: 'Map',     path: '/dashboard/map'),
    (icon: Icons.notifications_outlined, label: 'Alerts', path: '/dashboard/alerts'),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkAlerts());
  }

  void _checkAlerts() {
    final events = ref.read(alertsProvider).valueOrNull;
    if (events == null || _pendingPopup != null) return;
    final now = DateTime.now().millisecondsSinceEpoch;
    final next = events.firstWhere(
      (e) {
        if (e.acknowledged) return false;
        final last = _dismissed[e.id];
        final interval =
            e.isAnomaly ? kAnomalyRemindMs : kAlertRemindMs;
        return last == null || (now - last) >= interval;
      },
      orElse: () => AlertEvent(
        id: '', sensorId: '', alertType: '', thresholdValue: 0,
        message: '', triggeredAt: '', acknowledged: true, isPredicted: false,
      ),
    );
    if (!next.acknowledged && next.id.isNotEmpty) {
      setState(() => _pendingPopup = next);
    }
  }

  int _currentIndex(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    if (loc.startsWith('/dashboard/sensors')) return 1;
    if (loc.startsWith('/dashboard/map'))     return 2;
    if (loc.startsWith('/dashboard/alerts'))  return 3;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final auth        = ref.watch(authProvider);
    final unread      = ref.watch(unreadAlertCountProvider);
    final isDark      = Theme.of(context).brightness == Brightness.dark;
    final idx         = _currentIndex(context);
    const teal        = Color(0xFF14B8A6);


    // Re-check for new popups whenever alerts update
    ref.listen(alertsProvider, (_, next) {
      if (next.hasValue) _checkAlerts();
    });

    return Scaffold(
      key: PublicShell.scaffoldKey,
      body: Stack(children: [
        widget.child,
        if (_pendingPopup != null)
          GlobalAlertPopup(
            event: _pendingPopup!,
            onDismiss: () {
              setState(() {
                _dismissed[_pendingPopup!.id] =
                    DateTime.now().millisecondsSinceEpoch;
                _pendingPopup = null;
              });
            },
            onAcknowledge: (id) =>
                ref.read(alertsProvider.notifier).acknowledge(id),
          ),
      ]),

      // ── Bottom navigation bar ──────────────────────────────────────────
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF111827) : Colors.white,
          border: Border(
              top: BorderSide(
                  color: isDark
                      ? const Color(0xFF1F2937)
                      : const Color(0xFFF3F4F6))),
        ),
        child: SafeArea(
          child: Padding(
            padding:
                const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: Row(
              children: List.generate(_destinations.length, (i) {
                final d   = _destinations[i];
                final sel = i == idx;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => context.go(d.path),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      decoration: sel
                          ? BoxDecoration(
                              color: teal.withValues(alpha: .1),
                              borderRadius: BorderRadius.circular(10))
                          : null,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Stack(
                            clipBehavior: Clip.none,
                            children: [
                              Icon(d.icon,
                                  size: 20,
                                  color: sel
                                      ? teal
                                      : const Color(0xFF9CA3AF)),
                              if (d.label == 'Alerts' && unread > 0)
                                Positioned(
                                  top: -4,
                                  right: -4,
                                  child: Container(
                                    width: 14,
                                    height: 14,
                                    decoration: const BoxDecoration(
                                        color: Color(0xFFEF4444),
                                        shape: BoxShape.circle),
                                    child: Center(
                                      child: Text(
                                        unread > 9
                                            ? '9+'
                                            : '$unread',
                                        style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 7,
                                            fontWeight: FontWeight.w700),
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(d.label,
                              style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: sel
                                      ? FontWeight.w600
                                      : FontWeight.w400,
                                  color: sel
                                      ? teal
                                      : const Color(0xFF9CA3AF))),
                          if (sel)
                            const SizedBox(height: 2),
                          if (sel)
                            Container(
                                width: 4,
                                height: 4,
                                decoration: const BoxDecoration(
                                    color: teal,
                                    shape: BoxShape.circle)),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),

      // ── Slide-in navigation drawer ────────────────────────────────────
      drawer: _PublicDrawer(
        user: auth.user,
        unread: unread,
        onLogout: () async {
          await ref.read(authProvider.notifier).logout();
          if (context.mounted) context.go('/login');
        },
      ),
    );
  }
}

// ── Drawer ────────────────────────────────────────────────────────────────────
class _PublicDrawer extends StatelessWidget {
  final AuthUser? user;
  final int unread;
  final VoidCallback onLogout;

  const _PublicDrawer({
    required this.user,
    required this.unread,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    const teal = Color(0xFF14B8A6);

    final navItems = [
      (Icons.home_rounded,               'Dashboard',  '/dashboard',          false),
      (Icons.sensors,                    'My Sensors', '/dashboard/sensors',   false),
      (Icons.map_outlined,               'Sensor Map', '/dashboard/map',       false),
      (Icons.notifications_outlined,     'Alerts',     '/dashboard/alerts',    true),
      (Icons.download_outlined,          'Export',     '/dashboard/export',    false),
      (Icons.account_circle_outlined,    'Profile',    '/dashboard/profile',   false),
    ];

    final loc = GoRouterState.of(context).matchedLocation;

    return Drawer(
      child: SafeArea(
        child: Column(children: [
          // ── User header ──────────────────────────────────────────────
          Container(
            color: teal,
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
            child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
              CircleAvatar(
                backgroundColor: Colors.white,
                radius: 22,
                child: Text(
                  (user?.email[0] ?? 'U').toUpperCase(),
                  style: const TextStyle(
                      color: teal,
                      fontWeight: FontWeight.w700,
                      fontSize: 16),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(
                    user?.displayName ?? user?.email ?? '—',
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 13),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (user?.email != null)
                    Text(user!.email,
                        style: const TextStyle(
                            color: Color(0xFFCCFBF1), fontSize: 10),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                        color: const Color(0xFF0D9488),
                        borderRadius: BorderRadius.circular(6)),
                    child: const Text('Public User',
                        style: TextStyle(
                            color: Color(0xFFCCFBF1), fontSize: 9)),
                  ),
                ]),
              ),
            ]),
          ),

          // ── Nav items ────────────────────────────────────────────────
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
              children: navItems.map((item) {
                final (icon, label, path, hasBadge) = item;
                final active = loc == path ||
                    (path != '/dashboard' && loc.startsWith(path));
                return ListTile(
                  dense: true,
                  leading: Icon(icon,
                      size: 18,
                      color: active ? teal : const Color(0xFF6B7280)),
                  title: Text(label,
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: active
                              ? FontWeight.w600
                              : FontWeight.w400,
                          color: active
                              ? teal
                              : const Color(0xFF374151))),
                  trailing: hasBadge && unread > 0
                      ? Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                              color: const Color(0xFFEF4444),
                              borderRadius: BorderRadius.circular(10)),
                          child: Text('$unread',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700)),
                        )
                      : null,
                  tileColor: active
                      ? teal.withValues(alpha: .08)
                      : Colors.transparent,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                  onTap: () {
                    Navigator.pop(context);
                    context.go(path);
                  },
                );
              }).toList(),
            ),
          ),

          // ── Sign out ─────────────────────────────────────────────────
          const Divider(height: 1),
          ListTile(
            dense: true,
            leading: const Icon(Icons.logout,
                size: 18, color: Color(0xFFEF4444)),
            title: const Text('Sign Out',
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFFEF4444))),
            onTap: () {
              Navigator.pop(context);
              onLogout();
            },
          ),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }
}
