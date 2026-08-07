import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/providers.dart';
import '../screens/login_screen.dart';
import '../screens/public/public_shell.dart';
import '../screens/public/dashboard_screen.dart';
import '../screens/public/sensors_screen.dart';
import '../screens/public/sensor_detail_screen.dart';
import '../screens/public/map_screen.dart';
import '../screens/public/alerts_screen.dart';
import '../screens/public/export_screen.dart';
import '../screens/public/profile_screen.dart';
import '../screens/admin/admin_shell.dart';
import '../screens/admin/overview_screen.dart';
import '../screens/admin/sensors_screen.dart';
import '../screens/admin/add_edit_sensor_screen.dart';
import '../screens/admin/ai_predictions_screen.dart';
import '../screens/admin/users_screen.dart';
import '../screens/admin/alerts_screen.dart';
import '../screens/admin/export_screen.dart';

final _routerKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final notifier = _AuthChangeNotifier(ref);

  return GoRouter(
    navigatorKey: _routerKey,
    initialLocation: '/login',
    refreshListenable: notifier,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final isLogin = state.matchedLocation == '/login';

      if (!auth.isAuthenticated) return isLogin ? null : '/login';
      if (isLogin) return auth.isAdmin ? '/admin' : '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),

      // ── Public shell ──────────────────────────────────────────────────
      ShellRoute(
        builder: (_, __, child) => PublicShell(child: child),
        routes: [
          GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen()),
          GoRoute(path: '/dashboard/sensors', builder: (_, __) => const SensorsScreen()),
          GoRoute(path: '/dashboard/sensor/:id', builder: (_, s) => SensorDetailScreen(sensorId: s.pathParameters['id']!)),
          GoRoute(path: '/dashboard/map', builder: (_, __) => const MapScreen()),
          GoRoute(path: '/dashboard/alerts', builder: (_, __) => const AlertsScreen()),
          GoRoute(path: '/dashboard/export', builder: (_, __) => const ExportScreen()),
          GoRoute(path: '/dashboard/profile', builder: (_, __) => const ProfileScreen()),
        ],
      ),

      // ── Admin shell ───────────────────────────────────────────────────
      ShellRoute(
        builder: (_, __, child) => AdminShell(child: child),
        routes: [
          GoRoute(path: '/admin', builder: (_, __) => const AdminOverviewScreen()),
          GoRoute(path: '/admin/sensors', builder: (_, __) => const AdminSensorsScreen()),
          GoRoute(path: '/admin/sensor/new', builder: (_, __) => const AddEditSensorScreen()),
          GoRoute(path: '/admin/sensor/:id/edit', builder: (_, s) => AddEditSensorScreen(sensorId: s.pathParameters['id'])),
          GoRoute(path: '/admin/map', builder: (_, __) => const MapScreen(adminMode: true)),
          GoRoute(path: '/admin/ai', builder: (_, __) => const AiPredictionsScreen()),
          GoRoute(path: '/admin/users', builder: (_, __) => const UsersScreen()),
          GoRoute(path: '/admin/alerts', builder: (_, __) => const AdminAlertsScreen()),
          GoRoute(path: '/admin/export', builder: (_, __) => const AdminExportScreen()),
        ],
      ),
    ],
  );
});

/// Notifies GoRouter whenever auth state changes.
class _AuthChangeNotifier extends ChangeNotifier {
  late final ProviderSubscription<AuthState> _sub;

  _AuthChangeNotifier(Ref ref) {
    _sub = ref.listen(authProvider, (_, __) => notifyListeners());
  }

  @override
  void dispose() {
    _sub.close();
    super.dispose();
  }
}
