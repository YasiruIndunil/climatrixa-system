// Climatrixa Mobile — basic smoke tests
// Verifies that core models and providers instantiate without errors.
// Full widget tests require a running backend; those are covered in UAT (Section 7.3).

import 'package:flutter_test/flutter_test.dart';
import 'package:climatrixa_mobile/models/models.dart';

void main() {
  group('AuthUser', () {
    test('fromJson parses admin role correctly', () {
      final user = AuthUser.fromJson({
        'id': 'abc-123',
        'email': 'admin@climatrixa.com',
        'role': 'admin',
      });
      expect(user.isAdmin, isTrue);
      expect(user.email, 'admin@climatrixa.com');
    });

    test('fromJson parses public role correctly', () {
      final user = AuthUser.fromJson({
        'id': 'xyz-456',
        'email': 'user@climatrixa.com',
        'role': 'public',
      });
      expect(user.isAdmin, isFalse);
    });
  });

  group('Reading', () {
    test('fromJson parses all metric fields', () {
      final reading = Reading.fromJson({
        'id': 'r1',
        'sensor_id': 's1',
        'temperature': 28.5,
        'humidity': 72.0,
        'aqi': 95.0,
        'pressure': 1013.0,
        'recorded_at': '2026-08-07T10:00:00Z',
        'sensor_name': 'Sensor A',
        'aqi_status': 'Moderate',
      });
      expect(reading.temperature, 28.5);
      expect(reading.humidity, 72.0);
      expect(reading.aqi, 95.0);
      expect(reading.aqiLabel, 'Moderate');
    });

    test('aqiLabel returns Good for aqi <= 50', () {
      final r = Reading.fromJson({'id':'r','sensor_id':'s','temperature':25,'humidity':60,'aqi':40,'recorded_at':''});
      expect(r.aqiLabel, 'Good');
    });

    test('aqiLabel returns Hazardous for aqi > 300', () {
      final r = Reading.fromJson({'id':'r','sensor_id':'s','temperature':25,'humidity':60,'aqi':400,'recorded_at':''});
      expect(r.aqiLabel, 'Hazardous');
    });
  });

  group('AlertEvent', () {
    test('isAnomaly returns true for anomaly type', () {
      final alert = AlertEvent.fromJson({
        'id': 'a1',
        'sensor_id': 's1',
        'alert_type': 'anomaly',
        'threshold_value': 0,
        'message': 'Unusual pattern detected',
        'triggered_at': '2026-08-07T10:00:00Z',
        'acknowledged': false,
        'is_predicted': false,
      });
      expect(alert.isAnomaly, isTrue);
    });

    test('isPredicted flag parses correctly', () {
      final alert = AlertEvent.fromJson({
        'id': 'a2',
        'sensor_id': 's1',
        'alert_type': 'temperature_high',
        'threshold_value': 35.0,
        'actual_value': 33.0,
        'message': 'Temperature will exceed threshold in 6h',
        'triggered_at': '2026-08-07T10:00:00Z',
        'acknowledged': false,
        'is_predicted': true,
        'predicted_hours_ahead': 6.0,
      });
      expect(alert.isPredicted, isTrue);
      expect(alert.predictedHoursAhead, 6.0);
    });
  });

  group('Sensor', () {
    test('fromJson parses lat/lng correctly', () {
      final sensor = Sensor.fromJson({
        'id': 's1',
        'name': 'Warehouse A',
        'location': 'Colombo',
        'is_active': true,
        'latitude': 6.9271,
        'longitude': 79.8612,
      });
      expect(sensor.latitude, closeTo(6.9271, 0.0001));
      expect(sensor.longitude, closeTo(79.8612, 0.0001));
      expect(sensor.isActive, isTrue);
    });
  });

  group('ForecastPoint', () {
    test('fromJson parses all metric fields', () {
      final point = ForecastPoint.fromJson({
        'hours_ahead': 6,
        'temperature': 29.5,
        'humidity': 68.0,
        'aqi': 110.0,
        'pressure': 1010.0,
      });
      expect(point.hoursAhead, 6);
      expect(point.temperature, 29.5);
    });
  });
}
