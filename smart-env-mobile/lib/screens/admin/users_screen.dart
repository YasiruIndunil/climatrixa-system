
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme.dart';
import '../../core/app_bar.dart';
import 'admin_shell.dart';
import '../../models/models.dart';
import '../../providers/providers.dart';

class UsersScreen extends ConsumerStatefulWidget {
  const UsersScreen({super.key});
  @override ConsumerState<UsersScreen> createState() => _S();
}
class _S extends ConsumerState<UsersScreen> {
  String _q = '', _role = 'all';

  @override Widget build(BuildContext context) {
    final users = ref.watch(usersProvider).valueOrNull ?? [];
    final dark  = ref.watch(themeModeProvider) == ThemeMode.dark;
    final bg    = dark ? kGray950 : kGray50;
    final card  = dark ? kGray900 : kGrayWhite;
    final border= dark ? kGray800 : kGray100;
    final textP = dark ? Colors.white : kGray900Text;
    final textS = dark ? kGray500 : kGray500;

    final filtered = users.where((u) {
      final q = _q.toLowerCase();
      final match = u.email.toLowerCase().contains(q) ||
          (u.displayName ?? '').toLowerCase().contains(q);
      if (_role == 'admin')  return match && u.isAdmin;
      if (_role == 'public') return match && !u.isAdmin;
      return match;
    }).toList();

    InputDecoration dropDeco(String hint) => InputDecoration(
      hintText: hint, hintStyle: const TextStyle(color: kGray500, fontSize: 13),
      filled: true, fillColor: card, border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: border)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: border)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kTeal600)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    );

    return Scaffold(
      backgroundColor: bg,
      appBar: climatrixaAppBar(context, ref, scaffoldKey: AdminShell.scaffoldKey),
      body: Column(children: [
        Padding(padding: const EdgeInsets.fromLTRB(16,16,16,0), child: Row(children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Users', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: textP)),
            Text('${users.length} of ${users.length} accounts', style: TextStyle(fontSize: 12, color: textS)),
          ]),
          const Spacer(),
          ElevatedButton.icon(
            onPressed: () => _showAddUser(context, ref),
            icon: const Icon(Icons.add, size: 16),
            label: const Text('Add user', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            style: ElevatedButton.styleFrom(backgroundColor: kTeal600, foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10), elevation: 0),
          ),
        ])),
        const SizedBox(height: 12),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child:
          TextField(onChanged: (v) => setState(() => _q = v),
            style: TextStyle(color: textP, fontSize: 13),
            decoration: dropDeco('Search by name or email...').copyWith(
              prefixIcon: const Icon(Icons.search, color: kGray500, size: 18)))),
        const SizedBox(height: 8),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Container(padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(10), border: Border.all(color: border)),
            child: DropdownButtonHideUnderline(child: DropdownButton<String>(
              value: _role, isExpanded: true, dropdownColor: card,
              style: TextStyle(color: textP, fontSize: 13),
              onChanged: (v) { if (v != null) setState(() => _role = v); },
              items: const [
                DropdownMenuItem(value: 'all',    child: Text('All roles')),
                DropdownMenuItem(value: 'admin',  child: Text('Admin')),
                DropdownMenuItem(value: 'public', child: Text('Public')),
              ],
            )))),
        const SizedBox(height: 8),
        Expanded(child: RefreshIndicator(
          color: kTeal600,
          onRefresh: () async => ref.invalidate(usersProvider),
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
            itemCount: filtered.length,
            itemBuilder: (_, i) {
              final u = filtered[i];
              final initial = (u.displayName?.isNotEmpty == true ? u.displayName! : u.email)[0].toUpperCase();
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(14), border: Border.all(color: border)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    CircleAvatar(radius: 20, backgroundColor: kTeal600,
                        child: Text(initial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15))),
                    const SizedBox(width: 10),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(u.displayName ?? u.email,
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: textP)),
                      Text(u.email, style: const TextStyle(fontSize: 11, color: kGray500)),
                    ])),
                  ]),
                  const SizedBox(height: 8),
                  // Role badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: dark ? kGray800 : kGray100, borderRadius: BorderRadius.circular(20)),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.person_outline, size: 11, color: textS),
                      const SizedBox(width: 3),
                      Text(u.isAdmin ? 'admin' : 'public', style: TextStyle(fontSize: 11, color: textS)),
                    ])),
                  const SizedBox(height: 8),
                  // Active bar
                  ClipRRect(borderRadius: BorderRadius.circular(3),
                      child: LinearProgressIndicator(
                          value: 1, minHeight: 5,
                          backgroundColor: dark ? kGray800 : kGray100,
                          valueColor: const AlwaysStoppedAnimation(Color(0xFF22C55E)))),
                  const SizedBox(height: 2),
                  const Text('Active', style: TextStyle(fontSize: 10, color: Color(0xFF22C55E))),
                  const SizedBox(height: 8),
                  // Actions
                  Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                    _IBtn(Icons.edit_outlined, kGray400, () {}),
                    const SizedBox(width: 8),
                    _IBtn(Icons.link_rounded, kGray400, () {}),
                    const SizedBox(width: 8),
                    _IBtn(Icons.person_remove_outlined, const Color(0xFFEF4444),
                        () => _confirmDeactivate(context, ref, u)),
                  ]),
                ]),
              );
            },
          ),
        )),
      ]),
    );
  }

  Widget _IBtn(IconData icon, Color color, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: Container(width: 32, height: 32,
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
      child: Icon(icon, size: 15, color: color)));

  void _showAddUser(BuildContext context, WidgetRef ref) {
    final emailC = TextEditingController(); final passC = TextEditingController();
    final nameC  = TextEditingController(); String role = 'public';
    final dark = ref.read(themeModeProvider) == ThemeMode.dark;
    showModalBottomSheet(context: context, isScrollControlled: true,
      backgroundColor: dark ? kGray900 : kGrayWhite,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSt) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(width: 36, height: 4, margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(color: kGray700, borderRadius: BorderRadius.circular(2))),
          Text('Add user', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: dark ? Colors.white : kGray900Text)),
          const SizedBox(height: 14),
          TextField(controller: nameC, decoration: const InputDecoration(labelText: 'Display name (optional)')),
          const SizedBox(height: 8),
          TextField(controller: emailC, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email address')),
          const SizedBox(height: 8),
          TextField(controller: passC, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
          const SizedBox(height: 10),
          Row(children: ['public','admin'].map((r) => GestureDetector(
            onTap: () => setSt(() => role = r),
            child: Container(margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: role == r ? kTeal600 : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: role == r ? kTeal600 : kGray700)),
              child: Text(r, style: TextStyle(fontSize: 13, color: role == r ? Colors.white : kGray400))))).toList()),
          const SizedBox(height: 14),
          SizedBox(width: double.infinity, child: ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: kTeal600, foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            onPressed: () async {
              try {
                await ref.read(apiProvider).createUser({'email': emailC.text, 'password': passC.text, 'role': role, 'display_name': nameC.text});
                ref.invalidate(usersProvider);
                if (context.mounted) Navigator.pop(ctx);
              } catch (e) { if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'))); }
            },
            child: const Text('Create user'))),
          const SizedBox(height: 24),
        ]),
      )));
  }

  void _confirmDeactivate(BuildContext context, WidgetRef ref, AppUser u) =>
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('Deactivate user?'),
      content: Text('Remove ${u.email}?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        TextButton(onPressed: () async { Navigator.pop(context); await ref.read(apiProvider).deactivateUser(u.id); ref.invalidate(usersProvider); },
          child: const Text('Deactivate', style: TextStyle(color: kRed500))),
      ]));
}
