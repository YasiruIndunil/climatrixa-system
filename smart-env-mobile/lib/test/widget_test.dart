import 'package:flutter_test/flutter_test.dart';
import 'package:climatrixa_mobile/models/models.dart';

void main() {
  group('AuthUser', () {
    test('isAdmin true for admin role', () {
      final u = AuthUser.fromJson({'id':'1','email':'a@b.com','role':'admin'});
      expect(u.isAdmin, isTrue);
    });
    test('isAdmin false for public role', () {
      final u = AuthUser.fromJson({'id':'2','email':'a@b.com','role':'public'});
      expect(u.isAdmin, isFalse);
    });
  });
  group('Reading', () {
    test('aqiLabel returns Hazardous for aqi > 300', () {
      final r = Reading.fromJson({'id':'r','sensor_id':'s','temperature':25,'humidity':60,'aqi':400,'recorded_at':''});
      expect(r.aqiLabel, 'Hazardous');
    });
  });
}