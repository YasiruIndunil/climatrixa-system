import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/theme.dart';
import '../providers/providers.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override ConsumerState<LoginScreen> createState() => _S();
}
class _S extends ConsumerState<LoginScreen> {
  final _email = TextEditingController();
  final _pass  = TextEditingController();
  final _form  = GlobalKey<FormState>();
  bool _obs    = true;

  @override void dispose() { _email.dispose(); _pass.dispose(); super.dispose(); }

  Future<void> _signIn() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    final ok = await ref.read(authProvider.notifier).login(_email.text.trim(), _pass.text);
    if (!mounted) return;
    if (ok) context.go(ref.read(authProvider).isAdmin ? '/admin' : '/dashboard');
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final dark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: dark ? kGray950 : kGray50,
      body: SafeArea(child: Center(child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Form(key: _form, child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(28),
          decoration: BoxDecoration(
            color: dark ? kGray900 : kGrayWhite,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: dark ? kGray800 : kGray100),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.center, children: [
            // Logo
            Container(
              width: 56, height: 56,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [kTeal400, kTeal600],
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(Icons.eco_rounded, size: 30, color: Colors.white),
            ),
            const SizedBox(height: 14),
            Text('Climatrixa', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: dark ? Colors.white : kGray900Text)),
            const SizedBox(height: 4),
            Text('Environmental Monitoring System', style: TextStyle(fontSize: 13, color: kGray500)),
            const SizedBox(height: 28),

            // Email
            _label('EMAIL ADDRESS', dark),
            const SizedBox(height: 6),
            TextFormField(
              controller: _email, keyboardType: TextInputType.emailAddress, textInputAction: TextInputAction.next,
              style: TextStyle(color: dark ? Colors.white : kGray900Text, fontSize: 14),
              decoration: _fieldDeco('you@example.com', dark),
              validator: (v) => (v == null || !v.contains('@')) ? 'Enter a valid email' : null,
            ),
            const SizedBox(height: 16),

            // Password
            _label('PASSWORD', dark),
            const SizedBox(height: 6),
            TextFormField(
              controller: _pass, obscureText: _obs, onFieldSubmitted: (_) => _signIn(),
              style: TextStyle(color: dark ? Colors.white : kGray900Text, fontSize: 14),
              decoration: _fieldDeco('••••••••', dark, suffix: IconButton(
                icon: Icon(_obs ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18, color: kGray500),
                onPressed: () => setState(() => _obs = !_obs),
              )),
              validator: (v) => (v == null || v.isEmpty) ? 'Password is required' : null,
            ),
            const SizedBox(height: 8),

            Align(alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () {},
                style: TextButton.styleFrom(foregroundColor: kTeal600, padding: EdgeInsets.zero, tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                child: const Text('Forgot password?', style: TextStyle(fontSize: 13)),
              )),
            const SizedBox(height: 16),

            // Sign in
            SizedBox(width: double.infinity,
              child: ElevatedButton(
                onPressed: auth.loading ? null : _signIn,
                style: ElevatedButton.styleFrom(
                  backgroundColor: kTeal600, foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), elevation: 0,
                ),
                child: auth.loading
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Sign in', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              )),

            if (auth.error != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: kRed500.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: kRed500.withValues(alpha: 0.3)),
                ),
                child: Row(children: [
                  const Icon(Icons.error_outline, size: 16, color: kRed500),
                  const SizedBox(width: 8),
                  Expanded(child: Text(auth.error!, style: const TextStyle(fontSize: 12, color: kRed500))),
                ]),
              ),
            ],

            const SizedBox(height: 20),
            Text('Accounts are created by administrators only',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: dark ? kGray600 : kGray400)),
          ]),
        )),
      ))),
    );
  }

  Widget _label(String t, bool dark) => Align(
    alignment: Alignment.centerLeft,
    child: Text(t, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: .6, color: dark ? kGray400 : kGray600)),
  );

  InputDecoration _fieldDeco(String hint, bool dark, {Widget? suffix}) => InputDecoration(
    hintText: hint,
    hintStyle: TextStyle(color: dark ? kGray600 : kGray400, fontSize: 14),
    filled: true, fillColor: dark ? kGray800 : kGray50,
    suffixIcon: suffix,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: dark ? kGray700 : kGray100)),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: dark ? kGray700 : kGray100)),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kTeal600, width: 1.5)),
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
  );
}
