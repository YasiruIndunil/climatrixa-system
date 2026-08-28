import 'dart:async';
import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/constants.dart';
import '../models/models.dart';

final apiProvider = Provider<ApiClient>((ref) => ApiClient.instance);

// ── Theme mode ────────────────────────────────────────────────────────────────
class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  ThemeModeNotifier() : super(ThemeMode.dark);
  void toggle() => state = state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
}
final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, ThemeMode>(
    (ref) => ThemeModeNotifier());

// ── Connection status ─────────────────────────────────────────────────────────
enum ConnStatus { connected, reconnecting }
class ConnNotifier extends StateNotifier<ConnStatus> {
  Timer? _timer;
  ConnNotifier() : super(ConnStatus.reconnecting) {
    _check();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _check());
  }
  Future<void> _check() async {
    try {
      final s = await Socket.connect(
          'climatrixa-system-api.onrender.com', 443,
          timeout: const Duration(seconds: 5));
      s.destroy();
      if (mounted) state = ConnStatus.connected;
    } catch (_) {
      if (mounted) state = ConnStatus.reconnecting;
    }
  }
  @override void dispose() { _timer?.cancel(); super.dispose(); }
}
final connProvider = StateNotifierProvider<ConnNotifier, ConnStatus>(
    (ref) => ConnNotifier());

// ── Auth ──────────────────────────────────────────────────────────────────────
class AuthState {
  final AuthUser? user; final bool loading; final String? error;
  const AuthState({this.user, this.loading = false, this.error});
  bool get isAuthenticated => user != null;
  bool get isAdmin => user?.isAdmin ?? false;
  AuthState copyWith({AuthUser? user, bool? loading, String? error}) =>
      AuthState(user: user ?? this.user, loading: loading ?? this.loading, error: error);
}
class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _api;
  AuthNotifier(this._api) : super(const AuthState());
  Future<void> init() async {
    await _api.loadToken();
    if (_api.hasToken) {
      try { state = AuthState(user: await _api.me()); }
      catch (_) { await _api.clearToken(); }
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
      state = state.copyWith(loading: false, error: 'Connection error.');
      return false;
    }
  }
  Future<void> logout() async {
    await _api.logout();
    state = const AuthState();
  }
}
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>(
    (ref) => AuthNotifier(ref.watch(apiProvider)));

// ── Sensors ───────────────────────────────────────────────────────────────────
final sensorsProvider = FutureProvider<List<Sensor>>((ref) async {
  final api  = ref.watch(apiProvider);
  final auth = ref.watch(authProvider);
  return auth.isAdmin ? api.getSensors() : api.getMySensors();
});
final sensorDetailProvider = FutureProvider.family<Sensor, String>(
    (ref, id) => ref.watch(apiProvider).getSensor(id));

// ── Readings ──────────────────────────────────────────────────────────────────
final readingsProvider = StreamProvider<List<Reading>>((ref) async* {
  final api = ref.watch(apiProvider);
  while (true) {
    yield await api.getLatestReadings();
    await Future.delayed(const Duration(milliseconds: kReadingPollMs));
  }
});

// ── Alerts ────────────────────────────────────────────────────────────────────
class AlertsNotifier extends StateNotifier<AsyncValue<List<AlertEvent>>> {
  final ApiClient _api;
  Timer? _timer;
  AlertsNotifier(this._api) : super(const AsyncLoading()) {
    _load();
    _timer = Timer.periodic(const Duration(milliseconds: kAlertPollMs), (_) => _load());
  }
  Future<void> _load() async {
    try { state = AsyncData(await _api.getAlertEvents(limit: 100)); }
    catch (e) { if (state is! AsyncData) state = AsyncError(e, StackTrace.current); }
  }
  Future<void> acknowledge(String id) async {
    await _api.acknowledgeAlert(id);
    await _load();
  }
  Future<void> refresh() => _load();
  @override void dispose() { _timer?.cancel(); super.dispose(); }
}
final alertsProvider = StateNotifierProvider<AlertsNotifier, AsyncValue<List<AlertEvent>>>(
    (ref) => AlertsNotifier(ref.watch(apiProvider)));
final unreadAlertCountProvider = Provider<int>((ref) =>
    ref.watch(alertsProvider).whenOrNull(
        data: (e) => e.where((a) => !a.acknowledged).length) ?? 0);

// ── Forecast ──────────────────────────────────────────────────────────────────
final forecastProvider = FutureProvider.family<List<ForecastPoint>, String>(
    (ref, id) => ref.watch(apiProvider).getForecast(id));

// ── Users ─────────────────────────────────────────────────────────────────────
final usersProvider = FutureProvider<List<AppUser>>(
    (ref) => ref.watch(apiProvider).getUsers());
