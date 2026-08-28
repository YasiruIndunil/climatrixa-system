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

final routerProvider = Provider<GoRouter>((ref) {
  final notifier = _AuthNotifier(ref);
  return GoRouter(
    refreshListenable: notifier,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final loggedIn = auth.isAuthenticated;
      final onLogin  = state.matchedLocation == '/login';
      if (!loggedIn && !onLogin) return '/login';
      if (loggedIn && onLogin) return auth.isAdmin ? '/admin' : '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      ShellRoute(
        builder: (_, __, child) => PublicShell(child: child),
        routes: [
          GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen(),
            routes: [
              GoRoute(path: 'sensors', builder: (_, __) => const SensorsScreen()),
              GoRoute(path: 'sensor/:id', builder: (_, s) => SensorDetailScreen(sensorId: s.pathParameters['id']!)),
              GoRoute(path: 'map',     builder: (_, __) => const MapScreen()),
              GoRoute(path: 'alerts',  builder: (_, __) => const AlertsScreen()),
              GoRoute(path: 'export',  builder: (_, __) => const ExportScreen()),
              GoRoute(path: 'profile', builder: (_, __) => const ProfileScreen()),
            ]),
        ]),
      ShellRoute(
        builder: (_, __, child) => AdminShell(child: child),
        routes: [
          GoRoute(path: '/admin', builder: (_, __) => const AdminOverviewScreen(),
            routes: [
              GoRoute(path: 'sensors',       builder: (_, __) => const AdminSensorsScreen()),
              GoRoute(path: 'sensor/new',    builder: (_, __) => const AddEditSensorScreen()),
              GoRoute(path: 'sensor/:id/edit', builder: (_, s) => AddEditSensorScreen(sensorId: s.pathParameters['id'])),
              GoRoute(path: 'map',           builder: (_, __) => const MapScreen(adminMode: true)),
              GoRoute(path: 'ai',            builder: (_, __) => const AiPredictionsScreen()),
              GoRoute(path: 'users',         builder: (_, __) => const UsersScreen()),
              GoRoute(path: 'alerts',        builder: (_, __) => const AdminAlertsScreen()),
              GoRoute(path: 'export',        builder: (_, __) => const AdminExportScreen()),
            ]),
        ]),
    ],
  );
});

class _AuthNotifier extends ChangeNotifier {
  final Ref _ref;
  _AuthNotifier(this._ref) { _ref.listen(authProvider, (_, __) => notifyListeners()); }
}