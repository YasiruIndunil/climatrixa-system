import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';
import 'constants.dart';
import '../models/models.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  const ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

// ── Singleton API client ──────────────────────────────────────────────────────
class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  final _storage = const FlutterSecureStorage();
  String? _token;

  // ── Auth ───────────────────────────────────────────────────────────────────

  Future<void> loadToken() async {
    _token = await _storage.read(key: kTokenKey);
  }

  Future<void> saveToken(String token) async {
    _token = token;
    await _storage.write(key: kTokenKey, value: token);
  }

  Future<void> clearToken() async {
    _token = null;
    await _storage.deleteAll();
  }

  bool get hasToken => _token != null;

  // ── Request helpers ───────────────────────────────────────────────────────

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Uri _uri(String path, [Map<String, dynamic>? params]) {
    final qp = params?.map((k, v) => MapEntry(k, v.toString())) ?? {};
    return Uri.parse('$kApiBase$path').replace(queryParameters: qp.isEmpty ? null : qp);
  }

  Future<dynamic> _get(String path, [Map<String, dynamic>? params]) async {
    final res = await http.get(_uri(path, params), headers: _headers);
    return _handle(res);
  }

  Future<dynamic> _post(String path, [Map<String, dynamic>? body]) async {
    final res = await http.post(_uri(path),
        headers: _headers, body: body != null ? jsonEncode(body) : null);
    return _handle(res);
  }

  Future<dynamic> _patch(String path, [Map<String, dynamic>? body]) async {
    final res = await http.patch(_uri(path),
        headers: _headers, body: body != null ? jsonEncode(body) : null);
    return _handle(res);
  }

  Future<dynamic> _delete(String path) async {
    final res = await http.delete(_uri(path), headers: _headers);
    _handleStatus(res);
    return null;
  }

  dynamic _handle(http.Response res) {
    _handleStatus(res);
    if (res.body.isEmpty) return null;
    return jsonDecode(res.body);
  }

  void _handleStatus(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    String msg = res.body;
    try {
      msg = jsonDecode(res.body)['detail'] ?? msg;
    } catch (_) {}
    throw ApiException(res.statusCode, msg);
  }

  // ── Auth endpoints ─────────────────────────────────────────────────────────

  Future<AuthResponse> login(String email, String password) async {
    final data = await _post('/auth/login', {'email': email, 'password': password});
    final response = AuthResponse.fromJson(data as Map<String, dynamic>);
    await saveToken(response.accessToken);
    return response;
  }

  Future<void> logout() async {
    try { await _post('/auth/logout'); } catch (_) {}
    await clearToken();
  }

  Future<AuthUser> me() async {
    final data = await _get('/auth/me');
    return AuthUser.fromJson(data as Map<String, dynamic>);
  }

  // ── Sensor endpoints ───────────────────────────────────────────────────────

  Future<List<Sensor>> getSensors() async {
    final data = await _get('/sensors');
    return (data as List).map((j) => Sensor.fromJson(j)).toList();
  }

  // Public — only returns sensors assigned via user_sensor_access
  Future<List<Sensor>> getMySensors() async {
    try {
      final data = await _get('/sensors/my-sensors');
      return (data as List).map((j) => Sensor.fromJson(j)).toList();
    } catch (_) {
      return getSensors(); // fallback for admin
    }
  }

  Future<Sensor> getSensor(String id) async {
    final data = await _get('/sensors/$id');
    return Sensor.fromJson(data as Map<String, dynamic>);
  }

  Future<Sensor> createSensor(Map<String, dynamic> body) async {
    final data = await _post('/sensors', body);
    return Sensor.fromJson(data as Map<String, dynamic>);
  }

  Future<Sensor> updateSensor(String id, Map<String, dynamic> body) async {
    final data = await _patch('/sensors/$id', body);
    return Sensor.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteSensor(String id) => _delete('/sensors/$id');

  Future<void> assignSensorsToUser(String userId, List<String> sensorIds) async {
    await _post('/users/$userId/sensors', {'sensor_ids': sensorIds});
  }

  // ── Reading endpoints ──────────────────────────────────────────────────────

  /// Returns latest reading per active sensor. Enriched with sensor_name, aqi_status.
  Future<List<Reading>> getLatestReadings() async {
    final data = await _get('/readings/latest');
    return (data as List).map((j) => Reading.fromJson(j)).toList();
  }

  /// Download export CSV to the device's Downloads folder.
  Future<File> downloadReadings({
    String? sensorId,
    String? from,
    String? to,
    String format = 'csv',
  }) async {
    final params = <String, dynamic>{
      'format': format,
      if (sensorId != null) 'sensor_id': sensorId,
      if (from != null) 'from': from,
      if (to != null) 'to': to,
    };
    final res = await http.get(_uri('/readings/export', params), headers: _headers);
    _handleStatus(res);
    final dir = await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/readings_export.$format');
    await file.writeAsBytes(res.bodyBytes);
    return file;
  }

  // ── Alert endpoints ────────────────────────────────────────────────────────

  Future<List<AlertEvent>> getAlertEvents({
    String? sensorId,
    int limit = 50,
  }) async {
    final data = await _get('/alerts/events', {
      if (sensorId != null) 'sensor_id': sensorId,
      'limit': limit,
    });
    return (data as List).map((j) => AlertEvent.fromJson(j)).toList();
  }

  Future<AlertEvent> acknowledgeAlert(String eventId) async {
    final data = await _patch('/alerts/events/$eventId/acknowledge');
    return AlertEvent.fromJson(data as Map<String, dynamic>);
  }

  Future<List<AlertRule>> getAlertRules() async {
    final data = await _get('/alerts/rules');
    return (data as List).map((j) => AlertRule.fromJson(j)).toList();
  }

  Future<AlertRule> createAlertRule(Map<String, dynamic> body) async {
    final data = await _post('/alerts/rules', body);
    return AlertRule.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteAlertRule(String id) => _delete('/alerts/rules/$id');

  Future<File> downloadAlertEvents({
    String? sensorId,
    String? from,
    String? to,
    String format = 'csv',
  }) async {
    final params = <String, dynamic>{
      'format': format,
      if (sensorId != null) 'sensor_id': sensorId,
      if (from != null) 'from': from,
      if (to != null) 'to': to,
    };
    final res = await http.get(
        _uri('/alerts/events/export', params), headers: _headers);
    _handleStatus(res);
    final dir = await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/alerts_export.$format');
    await file.writeAsBytes(res.bodyBytes);
    return file;
  }

  // ── AI / Forecast endpoints ────────────────────────────────────────────────

  Future<List<ForecastPoint>> getForecast(String sensorId,
      {int hoursAhead = 24}) async {
    final data = await _get('/ai/forecast/$sensorId', {'hours_ahead': hoursAhead});
    return (data as List).map((j) => ForecastPoint.fromJson(j)).toList();
  }

  Future<Map<String, dynamic>> trainModel(String sensorId) async {
    final data = await _post('/ai/train/$sensorId');
    return data as Map<String, dynamic>;
  }

  // ── User management (admin only) ───────────────────────────────────────────

  Future<List<AppUser>> getUsers() async {
    final data = await _get('/users');
    return (data as List).map((j) => AppUser.fromJson(j)).toList();
  }

  Future<AppUser> createUser(Map<String, dynamic> body) async {
    final data = await _post('/users', body);
    return AppUser.fromJson(data as Map<String, dynamic>);
  }

  Future<AppUser> updateUser(String id, Map<String, dynamic> body) async {
    final data = await _patch('/users/$id', body);
    return AppUser.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deactivateUser(String id) => _delete('/users/$id');
}
