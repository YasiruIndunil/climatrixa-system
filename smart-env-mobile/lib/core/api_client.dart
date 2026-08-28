import 'dart:convert';
import 'dart:io';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'constants.dart';
import '../models/models.dart';

class ApiException implements Exception {
  final String message; final int status;
  ApiException(this.message, this.status);
  @override String toString() => message;
}

class ApiClient {
  ApiClient._();
  static final instance = ApiClient._();
  final _storage = const FlutterSecureStorage();
  String? _token;
  bool get hasToken => _token != null && _token!.isNotEmpty;

  Future<void> loadToken() async { _token = await _storage.read(key: kTokenKey); }
  Future<void> clearToken() async { _token = null; await _storage.delete(key: kTokenKey); }
  Future<String?> getStoredToken() async => _token ?? await _storage.read(key: kTokenKey);

  Map<String,String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  Future<dynamic> _get(String path) async {
    final r = await http.get(Uri.parse('$kApiBase$path'), headers: _headers)
        .timeout(const Duration(seconds: 15));
    if (r.statusCode >= 400) throw ApiException(
      jsonDecode(r.body)['detail']?.toString() ?? 'Error ${r.statusCode}', r.statusCode);
    return jsonDecode(r.body);
  }
  Future<dynamic> _post(String path, Map body) async {
    final r = await http.post(Uri.parse('$kApiBase$path'), headers: _headers, body: jsonEncode(body))
        .timeout(const Duration(seconds: 15));
    if (r.statusCode >= 400) throw ApiException(
      jsonDecode(r.body)['detail']?.toString() ?? 'Error ${r.statusCode}', r.statusCode);
    return jsonDecode(r.body);
  }
  Future<dynamic> _patch(String path, Map body) async {
    final r = await http.patch(Uri.parse('$kApiBase$path'), headers: _headers, body: jsonEncode(body))
        .timeout(const Duration(seconds: 15));
    if (r.statusCode >= 400) throw ApiException(
      jsonDecode(r.body)['detail']?.toString() ?? 'Error ${r.statusCode}', r.statusCode);
    return jsonDecode(r.body);
  }
  Future<void> _delete(String path) async {
    final r = await http.delete(Uri.parse('$kApiBase$path'), headers: _headers)
        .timeout(const Duration(seconds: 15));
    if (r.statusCode >= 400) throw ApiException(
      jsonDecode(r.body)['detail']?.toString() ?? 'Error ${r.statusCode}', r.statusCode);
  }

  // Auth
  Future<AuthResponse> login(String email, String password) async {
    final j = await _post('/auth/login', {'email': email, 'password': password});
    _token = j['access_token'];
    await _storage.write(key: kTokenKey, value: _token);
    return AuthResponse.fromJson(j);
  }
  Future<AuthUser> me() async { final j = await _get('/auth/me'); return AuthUser.fromJson(j); }
  Future<void> logout() async { try { await _post('/auth/logout', {}); } catch (_) {} await clearToken(); }

  // Sensors
  Future<List<Sensor>> getSensors()   async { final j = await _get('/sensors');            return (j as List).map((e) => Sensor.fromJson(e)).toList(); }
  Future<List<Sensor>> getMySensors() async { final j = await _get('/sensors/my-sensors'); return (j as List).map((e) => Sensor.fromJson(e)).toList(); }
  Future<Sensor> getSensor(String id) async { return Sensor.fromJson(await _get('/sensors/$id')); }
  Future<Sensor> createSensor(Map body) async { return Sensor.fromJson(await _post('/sensors', body)); }
  Future<Sensor> updateSensor(String id, Map body) async { return Sensor.fromJson(await _patch('/sensors/$id', body)); }
  Future<void> deleteSensor(String id) async { await _delete('/sensors/$id'); }

  // Readings
  Future<List<Reading>> getLatestReadings() async {
    final j = await _get('/readings/latest'); return (j as List).map((e) => Reading.fromJson(e)).toList();
  }
  Future<File> downloadReadings({String? sensorId, String? from, String? to}) async {
    final q = [if (sensorId!=null) 'sensor_id=$sensorId', if (from!=null) 'from_date=$from', if (to!=null) 'to_date=$to'].join('&');
    final r = await http.get(Uri.parse('$kApiBase/readings/export${q.isNotEmpty?"?$q":""}'), headers: _headers).timeout(const Duration(seconds: 30));
    final f = File('${Directory.systemTemp.path}/readings_export.csv');
    await f.writeAsBytes(r.bodyBytes); return f;
  }

  // Alerts
  Future<List<AlertEvent>> getAlertEvents({int limit=50}) async {
    final j = await _get('/alerts/events?limit=$limit'); return (j as List).map((e) => AlertEvent.fromJson(e)).toList();
  }
  Future<void> acknowledgeAlert(String id) async { await _patch('/alerts/events/$id/acknowledge', {}); }
  Future<List<AlertRule>> getAlertRules() async {
    final j = await _get('/alerts/rules'); return (j as List).map((e) => AlertRule.fromJson(e)).toList();
  }
  Future<File> downloadAlertEvents({String? sensorId, String? from, String? to}) async {
    final q = [if (sensorId!=null) 'sensor_id=$sensorId', if (from!=null) 'from_date=$from', if (to!=null) 'to_date=$to'].join('&');
    final r = await http.get(Uri.parse('$kApiBase/alerts/events/export${q.isNotEmpty?"?$q":""}'), headers: _headers).timeout(const Duration(seconds: 30));
    final f = File('${Directory.systemTemp.path}/alerts_export.csv');
    await f.writeAsBytes(r.bodyBytes); return f;
  }

  // AI
  Future<List<ForecastPoint>> getForecast(String sensorId) async {
    final j = await _get('/ai/forecast/$sensorId'); return (j as List).map((e) => ForecastPoint.fromJson(e)).toList();
  }
  Future<void> trainModel(String sensorId) async { await _post('/ai/train/$sensorId', {}); }

  // Users
  Future<List<AppUser>> getUsers() async { final j = await _get('/users'); return (j as List).map((e) => AppUser.fromJson(e)).toList(); }
  Future<void> createUser(Map body) async { await _post('/users', body); }
  Future<void> deactivateUser(String id) async { await _delete('/users/$id'); }
}