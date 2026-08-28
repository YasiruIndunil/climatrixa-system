// Stub notification service — uses in-app GlobalAlertPopup instead of system notifications
// System push notifications can be added later via Firebase

class NotificationService {
  static Future<void> init() async {
    // No external packages needed — alerts shown via GlobalAlertPopup overlay
  }
  static Future<void> showAlert({
    required String title,
    required String body,
    required String alertId,
  }) async {
    // In-app display handled by GlobalAlertPopup in each shell
  }
  static Future<void> saveJwt(String token) async {}
  static Future<void> clearJwt() async {}
  static Future<void> cancelAll() async {}
}
