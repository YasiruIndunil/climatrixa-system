import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:open_filex/open_filex.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../providers/providers.dart';
import 'public_shell.dart';

class ExportScreen extends ConsumerStatefulWidget {
  const ExportScreen({super.key});
  @override ConsumerState<ExportScreen> createState() => _S();
}
class _S extends ConsumerState<ExportScreen> {
  String _sensor = 'all'; DateTime? _from, _to; bool _loading = false;
  @override Widget build(BuildContext context) {
    final sensors = ref.watch(sensorsProvider).valueOrNull ?? [];
    final dark = ref.watch(themeModeProvider) == ThemeMode.dark;
    final bg = dark ? kGray950 : kGray50;
    final card = dark ? kGray900 : kGrayWhite;
    final bd = dark ? kGray800 : kGray100;
    final textP = dark ? Colors.white : kGray900Text;
    final fmt = DateFormat('yyyy-MM-dd');
    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(backgroundColor: dark ? kGray950 : kGrayWhite, elevation: 0,
        leading: Builder(builder: (ctx) => IconButton(icon: Icon(Icons.menu, color: dark ? kGray400 : kGray600), onPressed: () => PublicShell.scaffoldKey.currentState?.openDrawer())),
        title: Text('Export Data', style: TextStyle(color: textP, fontWeight: FontWeight.w700)),
        bottom: PreferredSize(preferredSize: const Size.fromHeight(1), child: Container(color: dark ? kGray800 : kGray100, height: 1))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(14), border: Border.all(color: bd)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Sensor readings', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: textP)),
            const SizedBox(height: 12),
            _lbl('SENSOR', dark),
            Container(padding: const EdgeInsets.symmetric(horizontal: 12), decoration: BoxDecoration(color: dark ? kGray800 : kGray50, borderRadius: BorderRadius.circular(10), border: Border.all(color: bd)),
              child: DropdownButtonHideUnderline(child: DropdownButton<String>(value: _sensor, isExpanded: true, dropdownColor: dark ? kGray900 : kGrayWhite,
                style: TextStyle(color: textP, fontSize: 13),
                onChanged: (v) { if (v != null) setState(() => _sensor = v); },
                items: [const DropdownMenuItem(value: 'all', child: Text('All sensors')),
                  ...sensors.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name, overflow: TextOverflow.ellipsis)))]))),
            const SizedBox(height: 10),
            _lbl('FROM DATE', dark),
            _datePicker(_from, (d) => setState(() => _from = d), context, dark, bd, textP),
            const SizedBox(height: 10),
            _lbl('TO DATE', dark),
            _datePicker(_to, (d) => setState(() => _to = d), context, dark, bd, textP),
            const SizedBox(height: 14),
            SizedBox(width: double.infinity, child: ElevatedButton.icon(
              onPressed: _loading ? null : () async {
                setState(() => _loading = true);
                try {
                  final f = await ref.read(apiProvider).downloadReadings(
                    sensorId: _sensor == 'all' ? null : _sensor,
                    from: _from != null ? fmt.format(_from!) : null,
                    to: _to != null ? fmt.format(_to!) : null);
                  if (mounted) OpenFilex.open(f.path);
                } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'))); }
                finally { if (mounted) setState(() => _loading = false); }
              },
              icon: _loading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Icon(Icons.download, size: 16),
              label: Text(_loading ? 'Exporting…' : 'Download CSV'),
              style: ElevatedButton.styleFrom(backgroundColor: kTeal600, foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 12)))),
          ])),
      ]),
    );
  }
  Widget _lbl(String t, bool dark) => Padding(padding: const EdgeInsets.only(bottom: 5),
    child: Text(t, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: .5, color: kGray500)));
  Widget _datePicker(DateTime? date, Function(DateTime) onPick, BuildContext ctx, bool dark, Color bd, Color textP) =>
    GestureDetector(onTap: () async {
      final p = await showDatePicker(context: ctx, initialDate: date ?? DateTime.now(), firstDate: DateTime(2024), lastDate: DateTime.now());
      if (p != null) onPick(p);
    }, child: Container(height: 44, padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(color: dark ? kGray800 : kGray50, borderRadius: BorderRadius.circular(10), border: Border.all(color: bd)),
      child: Row(children: [
        Text(date != null ? DateFormat('yyyy-MM-dd').format(date) : 'Select date', style: TextStyle(color: date != null ? textP : kGray500, fontSize: 13)),
        const Spacer(), const Icon(Icons.calendar_today, size: 14, color: kGray500)])));
}