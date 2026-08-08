import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/providers.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final sensors = ref.watch(sensorsProvider);
    const teal = Color(0xFF14B8A6);
    final user = auth.user;
    return Scaffold(
      appBar: AppBar(title: const Text('My Profile')),
      body: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          // Account card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
                color: Colors.white, borderRadius: BorderRadius.circular(12)),
            child: Row(children: [
              CircleAvatar(
                  backgroundColor: teal,
                  radius: 24,
                  child: Text((user?.email[0] ?? 'U').toUpperCase(),
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 18))),
              const SizedBox(width: 12),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(user?.displayName ?? user?.email ?? '—',
                        style: const TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w700)),
                    if (user?.email != null)
                      Text(user!.email,
                          style: const TextStyle(
                              fontSize: 10.5, color: Color(0xFF6B7280))),
                    const SizedBox(height: 4),
                    Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                            color: const Color(0xFFCCFBF1),
                            borderRadius: BorderRadius.circular(6)),
                        child: const Text('Public User',
                            style: TextStyle(
                                fontSize: 9,
                                color: Color(0xFF0F766E),
                                fontWeight: FontWeight.w600))),
                  ])),
            ]),
          ),
          const SizedBox(height: 10),
          // Assigned sensors
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
                color: Colors.white, borderRadius: BorderRadius.circular(12)),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              sensors.when(
                  data: (list) => Text('Assigned Sensors (${list.length})',
                      style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w600)),
                  loading: () => const Text('Assigned Sensors',
                      style:
                          TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  error: (_, __) => const Text('Assigned Sensors',
                      style: TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w600))),
              const SizedBox(height: 8),
              sensors.when(
                loading: () => const CircularProgressIndicator(),
                error: (e, _) =>
                    Text('$e', style: const TextStyle(fontSize: 11)),
                data: (list) => Column(
                    children: list
                        .map((s) => Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(children: [
                                Icon(Icons.sensors,
                                    size: 13,
                                    color: s.isActive
                                        ? teal
                                        : const Color(0xFF9CA3AF)),
                                const SizedBox(width: 8),
                                Expanded(
                                    child: Text(s.name,
                                        style:
                                            const TextStyle(fontSize: 11.5))),
                                Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 6, vertical: 1),
                                    decoration: BoxDecoration(
                                        color: s.isActive
                                            ? const Color(0xFFCCFBF1)
                                            : const Color(0xFFF3F4F6),
                                        borderRadius: BorderRadius.circular(6)),
                                    child: Text(
                                        s.isActive ? 'Active' : 'Inactive',
                                        style: TextStyle(
                                            fontSize: 8.5,
                                            fontWeight: FontWeight.w600,
                                            color: s.isActive
                                                ? const Color(0xFF0F766E)
                                                : const Color(0xFF6B7280)))),
                                const Icon(Icons.chevron_right,
                                    size: 14, color: Color(0xFF9CA3AF)),
                              ]),
                            ))
                        .toList()),
              ),
            ]),
          ),
          const SizedBox(height: 10),
          // Notifications (UI-only toggles — implement with user preferences endpoint)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
                color: Colors.white, borderRadius: BorderRadius.circular(12)),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Notifications',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              ...[
                'Threshold Alerts',
                'AI Predictions',
                'Anomaly Alerts'
              ].map((label) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Row(children: [
                      Expanded(
                          child: Text(label,
                              style: const TextStyle(fontSize: 12))),
                      Switch(value: true, activeColor: teal, onChanged: (_) {})
                    ]),
                  )),
            ]),
          ),
          const SizedBox(height: 10),
          ListTile(
            tileColor: Colors.white,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            leading: const Icon(Icons.lock_outline,
                size: 18, color: Color(0xFF6B7280)),
            title:
                const Text('Change Password', style: TextStyle(fontSize: 13)),
            trailing: const Icon(Icons.chevron_right, size: 16),
            onTap: () {},
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () async {
                await ref.read(authProvider.notifier).logout();
                if (context.mounted) context.go('/login');
              },
              icon:
                  const Icon(Icons.logout, size: 16, color: Color(0xFFEF4444)),
              label: const Text('Sign Out',
                  style: TextStyle(
                      color: Color(0xFFEF4444), fontWeight: FontWeight.w700)),
              style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFFCA5A5)),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(vertical: 12)),
            ),
          ),
          const SizedBox(height: 30),
        ],
      ),
    );
  }
}
