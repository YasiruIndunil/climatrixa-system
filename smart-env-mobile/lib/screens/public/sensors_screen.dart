import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../providers/providers.dart';
import 'public_shell.dart';

class SensorsScreen extends ConsumerStatefulWidget {
  const SensorsScreen({super.key});

  @override
  ConsumerState<SensorsScreen> createState() => _S();
}

class _S extends ConsumerState<SensorsScreen> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final sensors = ref.watch(sensorsProvider).valueOrNull ?? [];
    final dark = ref.watch(themeModeProvider) == ThemeMode.dark;

    final bg = dark ? kGray950 : kGray50;
    final card = dark ? kGray900 : kGrayWhite;
    final bd = dark ? kGray800 : kGray100;
    final textP = dark ? Colors.white : kGray900Text;

    final filtered = sensors
        .where(
          (s) =>
              s.name.toLowerCase().contains(_q.toLowerCase()) ||
              s.location.toLowerCase().contains(_q.toLowerCase()),
        )
        .toList();

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: dark ? kGray950 : kGrayWhite,
        elevation: 0,
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: Icon(
              Icons.menu,
              color: dark ? kGray400 : kGray600,
            ),
            onPressed: () => PublicShell.scaffoldKey.currentState?.openDrawer(),
          ),
        ),
        title: Text(
          'My Sensors',
          style: TextStyle(
            color: textP,
            fontWeight: FontWeight.w700,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            color: dark ? kGray800 : kGray100,
            height: 1,
          ),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              onChanged: (v) => setState(() => _q = v),
              style: TextStyle(
                color: textP,
                fontSize: 13,
              ),
              decoration: InputDecoration(
                hintText: 'Search sensors…',
                hintStyle: const TextStyle(
                  color: kGray500,
                ),
                prefixIcon: const Icon(
                  Icons.search,
                  size: 18,
                  color: kGray500,
                ),
                filled: true,
                fillColor: card,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: bd),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: bd),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  vertical: 10,
                ),
              ),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              color: kTeal600,
              onRefresh: () async {
                ref.invalidate(sensorsProvider);
              },
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                itemCount: filtered.length,
                itemBuilder: (_, i) {
                  final s = filtered[i];

                  return GestureDetector(
                    onTap: () => context.push('/dashboard/sensor/${s.id}'),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: card,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: bd),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: (s.isActive ? kTeal600 : kGray500)
                                  .withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              Icons.wifi_tethering_rounded,
                              size: 20,
                              color: s.isActive ? kTeal600 : kGray500,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  s.name,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: textP,
                                  ),
                                ),
                                Text(
                                  s.location,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: kGray500,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Row(
                            children: [
                              Container(
                                width: 7,
                                height: 7,
                                decoration: BoxDecoration(
                                  color: s.isActive
                                      ? const Color(0xFF22C55E)
                                      : kGray500,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                s.isActive ? 'Active' : 'Inactive',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: s.isActive
                                      ? const Color(0xFF22C55E)
                                      : kGray500,
                                ),
                              ),
                              const SizedBox(width: 6),
                              const Icon(
                                Icons.chevron_right,
                                size: 16,
                                color: kGray500,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
