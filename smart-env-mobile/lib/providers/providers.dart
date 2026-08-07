import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/api_client.dart';
import '../core/constants.dart';
import '../models/models.dart';

// ── API client (singleton) ─────────────────────────────────────────────────────
final apiProvider = Provider<ApiClient>((ref) => ApiClient.instance);

// ── Auth state ────────────────────────────────────────────────────────────────
class AuthState {
  final AuthUser? user;
  final bool loading;
  final String? error;

  const AuthState({this.user, this.loading = false, this.error});

  bool get isAuthenticated => user != null;
  bool get isAdmin => user?.isAdmin ?? false;
  AuthState copyWith({AuthUser? user, bool? loading, String? error}) =>
      AuthState(
          user: user ?? this.user,
          loading: loading ?? this.loading,
          error: error);
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _api;
  AuthNotifier(this._api) : super(const AuthState());

  Future<void> init() async {
    await _api.loadToken();
    if (_api.hasToken) {
      try {
        final user = await _api.me();
        state = AuthState(user: user);
      } catch (_) {
        await _api.clearToken();
      }
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(loading: true, error: null);
    try {
      final res = await _api.login(email, password);
      state = AuthState(user: res.user);
      return true;
    } on ApiException catch (e) {
      state = state.copyWith(loading: false, error: e.message);
      return false;
    } catch (_) {
      state = state.copyWith(
          loading: false, error: 'Connection error. Check your network.');
      return false;
    }
  }

  Future<void> logout() async {
    await _api.logout();
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(apiProvider));
});

// ── Sensors ───────────────────────────────────────────────────────────────────
final sensorsProvider = FutureProvider<List<Sensor>>((ref) async {
  final api = ref.watch(apiProvider);
  final auth = ref.watch(authProvider);
  return auth.isAdmin ? api.getSensors() : api.getMySensors();
});

final sensorDetailProvider =
    FutureProvider.family<Sensor, String>((ref, id) async {
  return ref.watch(apiProvider).getSensor(id);
});

// ── Readings (live — polled every 30 s) ──────────────────────────────────────
final readingsProvider = StreamProvider<List<Reading>>((ref) async* {
  final api = ref.watch(apiProvider);
  while (true) {
    yield await api.getLatestReadings();
    await Future.delayed(Duration(milliseconds: kReadingPollMs));
  }
});

// ── Alerts (polled every 20 s) ────────────────────────────────────────────────
class AlertsNotifier extends StateNotifier<AsyncValue<List<AlertEvent>>> {
  final ApiClient _api;
  Timer? _timer;

  AlertsNotifier(this._api) : super(const AsyncLoading()) {
    _load();
    _timer = Timer.periodic(
        Duration(milliseconds: kAlertPollMs), (_) => _load());
  }

  Future<void> _load() async {
    try {
      final events = await _api.getAlertEvents(limit: 100);
      state = AsyncData(events);
    } catch (e) {
      if (state is! AsyncData) state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> acknowledge(String id) async {
    await _api.acknowledgeAlert(id);
    await _load();
  }

  Future<void> refresh() => _load();

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}

final alertsProvider =
    StateNotifierProvider<AlertsNotifier, AsyncValue<List<AlertEvent>>>((ref) {
  return AlertsNotifier(ref.watch(apiProvider));
});

// Unread count — derived from alertsProvider
final unreadAlertCountProvider = Provider<int>((ref) {
  return ref.watch(alertsProvider).whenOrNull(
            data: (events) => events.where((e) => !e.acknowledged).length,
          ) ??
      0;
});

// ── Forecast ──────────────────────────────────────────────────────────────────
final forecastProvider =
    FutureProvider.family<List<ForecastPoint>, String>((ref, sensorId) async {
  return ref.watch(apiProvider).getForecast(sensorId);
});

// ── Alert rules ───────────────────────────────────────────────────────────────
final alertRulesProvider = FutureProvider<List<AlertRule>>((ref) async {
  return ref.watch(apiProvider).getAlertRules();
});

// ── Users (admin) ─────────────────────────────────────────────────────────────
final usersProvider = FutureProvider<List<AppUser>>((ref) async {
  return ref.watch(apiProvider).getUsers();
});
