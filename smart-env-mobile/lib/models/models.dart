// ── Climatrixa Models ─────────────────────────────────────────────────────────
// Single barrel file — import 'models/models.dart' everywhere.

// ── Auth ──────────────────────────────────────────────────────────────────────
class AuthUser {
  final String id;
  final String email;
  final String role; // 'admin' | 'public'
  final String? displayName;

  const AuthUser({
    required this.id,
    required this.email,
    required this.role,
    this.displayName,
  });

  bool get isAdmin => role == 'admin';

  factory AuthUser.fromJson(Map<String, dynamic> j) => AuthUser(
        id: j['id'] ?? j['sub'] ?? '',
        email: j['email'] ?? '',
        role: j['role'] ?? 'public',
        displayName: j['display_name'],
      );

  Map<String, dynamic> toJson() =>
      {'id': id, 'email': email, 'role': role, 'display_name': displayName};
}

class AuthResponse {
  final String accessToken;
  final AuthUser user;

  const AuthResponse({required this.accessToken, required this.user});

  factory AuthResponse.fromJson(Map<String, dynamic> j) => AuthResponse(
        accessToken: j['access_token'] ?? '',
        user: AuthUser.fromJson(j['user'] ?? j),
      );
}

// ── Sensor ────────────────────────────────────────────────────────────────────
class Sensor {
  final String id;
  final String name;
  final String location;
  final bool isActive;
  final String? macAddress;
  final double? latitude;
  final double? longitude;
  final String? industryProfile;
  final String? apiKey;

  const Sensor({
    required this.id,
    required this.name,
    required this.location,
    required this.isActive,
    this.macAddress,
    this.latitude,
    this.longitude,
    this.industryProfile,
    this.apiKey,
  });

  factory Sensor.fromJson(Map<String, dynamic> j) => Sensor(
        id: j['id'] ?? '',
        name: j['name'] ?? '',
        location: j['location'] ?? '',
        isActive: j['is_active'] ?? false,
        macAddress: j['mac_address'],
        latitude: (j['latitude'] as num?)?.toDouble(),
        longitude: (j['longitude'] as num?)?.toDouble(),
        industryProfile: j['industry_profile'],
        apiKey: j['api_key'],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'location': location,
        'is_active': isActive,
        'mac_address': macAddress,
        'latitude': latitude,
        'longitude': longitude,
        'industry_profile': industryProfile,
      };

  Sensor copyWith({
    String? name,
    String? location,
    bool? isActive,
    double? latitude,
    double? longitude,
    String? industryProfile,
  }) =>
      Sensor(
        id: id,
        name: name ?? this.name,
        location: location ?? this.location,
        isActive: isActive ?? this.isActive,
        macAddress: macAddress,
        latitude: latitude ?? this.latitude,
        longitude: longitude ?? this.longitude,
        industryProfile: industryProfile ?? this.industryProfile,
        apiKey: apiKey,
      );
}

// ── Reading ───────────────────────────────────────────────────────────────────
class Reading {
  final String id;
  final String sensorId;
  final double temperature;
  final double humidity;
  final double aqi;
  final double? pressure;
  final String recordedAt;
  // Enriched by backend /readings/latest
  final String? sensorName;
  final String? location;
  final String? aqiStatus;
  final String? recordedAtLocal;

  const Reading({
    required this.id,
    required this.sensorId,
    required this.temperature,
    required this.humidity,
    required this.aqi,
    this.pressure,
    required this.recordedAt,
    this.sensorName,
    this.location,
    this.aqiStatus,
    this.recordedAtLocal,
  });

  factory Reading.fromJson(Map<String, dynamic> j) => Reading(
        id: j['id'] ?? '',
        sensorId: j['sensor_id'] ?? '',
        temperature: (j['temperature'] as num?)?.toDouble() ?? 0,
        humidity: (j['humidity'] as num?)?.toDouble() ?? 0,
        aqi: (j['aqi'] as num?)?.toDouble() ?? 0,
        pressure: (j['pressure'] as num?)?.toDouble(),
        recordedAt: j['recorded_at'] ?? '',
        sensorName: j['sensor_name'],
        location: j['location'],
        aqiStatus: j['aqi_status'],
        recordedAtLocal: j['recorded_at_local'] ?? j['recorded_at_display'],
      );

  String get aqiLabel {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  }
}

// ── Alert ─────────────────────────────────────────────────────────────────────
class AlertEvent {
  final String id;
  final String sensorId;
  final String alertType;
  final double? actualValue;
  final double thresholdValue;
  final String message;
  final String triggeredAt;
  final bool acknowledged;
  final bool isPredicted;
  final double? predictedHoursAhead;

  const AlertEvent({
    required this.id,
    required this.sensorId,
    required this.alertType,
    this.actualValue,
    required this.thresholdValue,
    required this.message,
    required this.triggeredAt,
    required this.acknowledged,
    required this.isPredicted,
    this.predictedHoursAhead,
  });

  bool get isAnomaly => alertType == 'anomaly';

  factory AlertEvent.fromJson(Map<String, dynamic> j) => AlertEvent(
        id: j['id'] ?? '',
        sensorId: j['sensor_id'] ?? '',
        alertType: j['alert_type'] ?? '',
        actualValue: (j['actual_value'] as num?)?.toDouble(),
        thresholdValue: (j['threshold_value'] as num?)?.toDouble() ?? 0,
        message: j['message'] ?? '',
        triggeredAt: j['triggered_at'] ?? '',
        acknowledged: j['acknowledged'] ?? false,
        isPredicted: j['is_predicted'] ?? false,
        predictedHoursAhead:
            (j['predicted_hours_ahead'] as num?)?.toDouble(),
      );
}

class AlertRule {
  final String id;
  final String sensorId;
  final String alertType;
  final double thresholdValue;
  final bool triggerOnActual;
  final bool triggerOnPredicted;
  final String? notifyEmail;

  const AlertRule({
    required this.id,
    required this.sensorId,
    required this.alertType,
    required this.thresholdValue,
    required this.triggerOnActual,
    required this.triggerOnPredicted,
    this.notifyEmail,
  });

  factory AlertRule.fromJson(Map<String, dynamic> j) => AlertRule(
        id: j['id'] ?? '',
        sensorId: j['sensor_id'] ?? '',
        alertType: j['alert_type'] ?? '',
        thresholdValue: (j['threshold_value'] as num?)?.toDouble() ?? 0,
        triggerOnActual: j['trigger_on_actual'] ?? true,
        triggerOnPredicted: j['trigger_on_predicted'] ?? false,
        notifyEmail: j['notify_email'],
      );
}

// ── Forecast ──────────────────────────────────────────────────────────────────
class ForecastPoint {
  final int hoursAhead;
  final double? temperature;
  final double? humidity;
  final double? aqi;
  final double? pressure;

  const ForecastPoint({
    required this.hoursAhead,
    this.temperature,
    this.humidity,
    this.aqi,
    this.pressure,
  });

  factory ForecastPoint.fromJson(Map<String, dynamic> j) => ForecastPoint(
        hoursAhead: (j['hours_ahead'] as num?)?.toInt() ?? 0,
        temperature: (j['temperature'] as num?)?.toDouble(),
        humidity: (j['humidity'] as num?)?.toDouble(),
        aqi: (j['aqi'] as num?)?.toDouble(),
        pressure: (j['pressure'] as num?)?.toDouble(),
      );
}

// ── App User (admin management) ───────────────────────────────────────────────
class AppUser {
  final String id;
  final String email;
  final String role;
  final String? displayName;
  final int sensorCount;
  final String? lastLogin;

  const AppUser({
    required this.id,
    required this.email,
    required this.role,
    this.displayName,
    this.sensorCount = 0,
    this.lastLogin,
  });

  bool get isAdmin => role == 'admin';

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['id'] ?? '',
        email: j['email'] ?? '',
        role: j['role'] ?? 'public',
        displayName: j['display_name'],
        sensorCount: j['sensor_count'] ?? 0,
        lastLogin: j['last_login'],
      );
}
