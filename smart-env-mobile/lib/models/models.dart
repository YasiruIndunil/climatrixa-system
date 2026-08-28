class AuthUser {
  final String id, email, role; final String? displayName;
  AuthUser({required this.id, required this.email, required this.role, this.displayName});
  bool get isAdmin => role == 'admin';
  factory AuthUser.fromJson(Map<String, dynamic> j) => AuthUser(
    id: j['id']?.toString()??'', email: j['email']??'', role: j['role']??'public', displayName: j['display_name']);
}
class AuthResponse {
  final String accessToken; final AuthUser user;
  AuthResponse({required this.accessToken, required this.user});
  factory AuthResponse.fromJson(Map<String, dynamic> j) =>
    AuthResponse(accessToken: j['access_token']??'', user: AuthUser.fromJson(j['user']??j));
}
class Sensor {
  final String id, name, location; final bool isActive;
  final double? latitude, longitude; final String? macAddress, industryProfile;
  Sensor({required this.id, required this.name, required this.location, required this.isActive,
    this.latitude, this.longitude, this.macAddress, this.industryProfile});
  factory Sensor.fromJson(Map<String, dynamic> j) => Sensor(
    id: j['id']?.toString()??'', name: j['name']??'', location: j['location']??'',
    isActive: j['is_active']??false,
    latitude: (j['latitude'] as num?)?.toDouble(), longitude: (j['longitude'] as num?)?.toDouble(),
    macAddress: j['mac_address'], industryProfile: j['industry_profile']);
}
class Reading {
  final String id, sensorId, recordedAt; final double temperature, humidity, aqi;
  final double? pressure; final String? sensorName, aqiStatus;
  Reading({required this.id, required this.sensorId, required this.temperature,
    required this.humidity, required this.aqi, required this.recordedAt,
    this.pressure, this.sensorName, this.aqiStatus});
  String get aqiLabel {
    if (aqiStatus!=null && aqiStatus!.isNotEmpty) return aqiStatus!;
    if (aqi<=50) return 'Good'; if (aqi<=100) return 'Moderate';
    if (aqi<=150) return 'Unhealthy (Sensitive)'; if (aqi<=200) return 'Unhealthy';
    if (aqi<=300) return 'Very Unhealthy'; return 'Hazardous';
  }
  factory Reading.fromJson(Map<String, dynamic> j) => Reading(
    id: j['id']?.toString()??'', sensorId: j['sensor_id']?.toString()??'',
    temperature: (j['temperature'] as num?)?.toDouble()??0,
    humidity: (j['humidity'] as num?)?.toDouble()??0,
    aqi: (j['aqi'] as num?)?.toDouble()??0,
    pressure: (j['pressure'] as num?)?.toDouble(),
    recordedAt: j['recorded_at']??'', sensorName: j['sensor_name'], aqiStatus: j['aqi_status']);
}
class AlertEvent {
  final String id, sensorId, alertType, message, triggeredAt;
  final double thresholdValue; final double? actualValue;
  final bool acknowledged, isPredicted; final double? predictedHoursAhead;
  AlertEvent({required this.id, required this.sensorId, required this.alertType,
    required this.thresholdValue, required this.message, required this.triggeredAt,
    required this.acknowledged, required this.isPredicted, this.actualValue, this.predictedHoursAhead});
  bool get isAnomaly => alertType.contains('anomaly');
  factory AlertEvent.fromJson(Map<String, dynamic> j) => AlertEvent(
    id: j['id']?.toString()??'', sensorId: j['sensor_id']?.toString()??'',
    alertType: j['alert_type']??'', message: j['message']??'',
    thresholdValue: (j['threshold_value'] as num?)?.toDouble()??0,
    actualValue: (j['actual_value'] as num?)?.toDouble(),
    triggeredAt: j['triggered_at']??'', acknowledged: j['acknowledged']??false,
    isPredicted: j['is_predicted']??false,
    predictedHoursAhead: (j['predicted_hours_ahead'] as num?)?.toDouble());
}
class ForecastPoint {
  final int hoursAhead; final double? temperature, humidity, aqi, pressure;
  ForecastPoint({required this.hoursAhead, this.temperature, this.humidity, this.aqi, this.pressure});
  factory ForecastPoint.fromJson(Map<String, dynamic> j) => ForecastPoint(
    hoursAhead: (j['hours_ahead'] as num?)?.toInt()??0,
    temperature: (j['temperature'] as num?)?.toDouble(),
    humidity: (j['humidity'] as num?)?.toDouble(),
    aqi: (j['aqi'] as num?)?.toDouble(),
    pressure: (j['pressure'] as num?)?.toDouble());
}
class AppUser {
  final String id, email; final String? displayName; final bool isAdmin, isActive;
  AppUser({required this.id, required this.email, required this.isAdmin, required this.isActive, this.displayName});
  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
    id: j['id']?.toString()??'', email: j['email']??'', displayName: j['display_name'],
    isAdmin: (j['role']??'')=='admin', isActive: j['is_active']??true);
}
class AlertRule {
  final String id, sensorId, alertType;
  final double thresholdValue;
  final bool isActive, triggerOnPredicted;
  AlertRule({required this.id, required this.sensorId, required this.alertType,
    required this.thresholdValue, required this.isActive, required this.triggerOnPredicted});
  factory AlertRule.fromJson(Map<String, dynamic> j) => AlertRule(
    id: j['id']?.toString()??'', sensorId: j['sensor_id']?.toString()??'',
    alertType: j['alert_type']??'',
    thresholdValue: (j['threshold_value'] as num?)?.toDouble()??0,
    isActive: j['is_active']??true,
    triggerOnPredicted: j['trigger_on_predicted']??false);
}
