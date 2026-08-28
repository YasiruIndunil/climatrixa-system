
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';
import '../../core/theme.dart';
import '../../core/app_bar.dart';
import 'admin_shell.dart';
import '../../providers/providers.dart';

class AdminExportScreen extends ConsumerStatefulWidget {
  const AdminExportScreen({super.key});
  @override ConsumerState<AdminExportScreen> createState() => _S();
}
class _S extends ConsumerState<AdminExportScreen> {
  String _rSensor = 'all', _rFormat = 'csv';
  String _aSensor = 'all', _aFormat = 'csv';
  DateTime? _rFrom, _rTo, _aFrom, _aTo;
  bool _loadingR = false, _loadingA = false;
  String? _lastR, _lastA;

  @override Widget build(BuildContext context) {
    final sensors = ref.watch(sensorsProvider).valueOrNull ?? [];
    final dark    = ref.watch(themeModeProvider) == ThemeMode.dark;
    final bg      = dark ? kGray950 : kGray50;
    final card    = dark ? kGray900 : kGrayWhite;
    final border  = dark ? kGray800 : kGray100;
    final textP   = dark ? Colors.white : kGray900Text;
    final textS   = dark ? kGray500 : kGray500;
    final fmt     = DateFormat('yyyy-MM-dd');

    Widget dropDown(String val, List<DropdownMenuItem<String>> items, ValueChanged<String?> onChange) =>
      Container(height: 44, padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(color: dark ? kGray800 : kGray50, borderRadius: BorderRadius.circular(10), border: Border.all(color: border)),
        child: DropdownButtonHideUnderline(child: DropdownButton<String>(
          value: val, isExpanded: true, dropdownColor: dark ? kGray900 : kGrayWhite,
          style: TextStyle(color: textP, fontSize: 13), onChanged: onChange, items: items)));

    Widget dateBtn(String label, DateTime? date, VoidCallback onTap) =>
      GestureDetector(onTap: onTap, child: Container(height: 44, padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(color: dark ? kGray800 : kGray50, borderRadius: BorderRadius.circular(10), border: Border.all(color: border)),
        child: Row(children: [
          Text(date != null ? fmt.format(date) : '', style: TextStyle(color: textP, fontSize: 13)),
          const Spacer(),
          const Icon(Icons.keyboard_arrow_down, color: kGray500, size: 18),
        ])));

    Widget label(String t) => Padding(padding: const EdgeInsets.only(bottom: 6),
      child: Text(t, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: .5, color: kGray500)));

    Widget sectionCard({required IconData icon, required Color iconColor, required String title, required String subtitle, required Widget child}) =>
      Container(margin: const EdgeInsets.only(bottom: 14), padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(16), border: Border.all(color: border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(width: 36, height: 36,
              decoration: BoxDecoration(color: iconColor.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, size: 18, color: iconColor)),
            const SizedBox(width: 10),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: textP)),
              Text(subtitle, style: const TextStyle(fontSize: 11, color: kGray500)),
            ]),
          ]),
          const Divider(color: kGray800, height: 24),
          child,
        ]));

    final sensorItems = [
      const DropdownMenuItem(value: 'all', child: Text('All sensors')),
      ...sensors.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name, overflow: TextOverflow.ellipsis))),
    ];

    return Scaffold(
      backgroundColor: bg,
      appBar: climatrixaAppBar(context, ref, scaffoldKey: AdminShell.scaffoldKey),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Text('Export data', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: textP)),
        const SizedBox(height: 4),
        Text('Download sensor readings and alert events as CSV or PDF', style: TextStyle(fontSize: 12, color: textS)),
        const SizedBox(height: 16),

        // Sensor readings section
        sectionCard(
          icon: Icons.description_outlined, iconColor: kTeal600,
          title: 'Sensor readings', subtitle: 'Temperature, humidity, AQI, pressure',
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            label('SENSOR'),
            dropDown(_rSensor, sensorItems, (v) { if(v!=null)setState(()=>_rSensor=v); }),
            const SizedBox(height: 12),
            label('FROM DATE *'),
            dateBtn('', _rFrom, () async {
              final p = await showDatePicker(context: context, initialDate: _rFrom ?? DateTime.now().subtract(const Duration(days:7)), firstDate: DateTime(2024), lastDate: DateTime.now());
              if(p!=null) setState(()=>_rFrom=p);
            }),
            const SizedBox(height: 12),
            label('TO DATE *'),
            dateBtn('', _rTo, () async {
              final p = await showDatePicker(context: context, initialDate: _rTo ?? DateTime.now(), firstDate: DateTime(2024), lastDate: DateTime.now());
              if(p!=null) setState(()=>_rTo=p);
            }),
            const SizedBox(height: 12),
            label('FORMAT'),
            Row(children: [
              Expanded(child: GestureDetector(onTap: () => setState(()=>_rFormat='csv'), child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: _rFormat=='csv' ? kGrayWhite : Colors.transparent,
                  borderRadius: const BorderRadius.horizontal(left: Radius.circular(10)),
                  border: Border.all(color: border)),
                child: Center(child: Text('CSV', style: TextStyle(fontSize: 13, color: _rFormat=='csv'?kTeal600:textS, fontWeight: FontWeight.w600)))))),
              Expanded(child: GestureDetector(onTap: () => setState(()=>_rFormat='pdf'), child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: _rFormat=='pdf' ? kGrayWhite : Colors.transparent,
                  borderRadius: const BorderRadius.horizontal(right: Radius.circular(10)),
                  border: Border.all(color: border)),
                child: Center(child: Text('PDF Report', style: TextStyle(fontSize: 13, color: _rFormat=='pdf'?kTeal600:textS, fontWeight: FontWeight.w600)))))),
            ]),
            const SizedBox(height: 14),
            SizedBox(width: double.infinity, child: ElevatedButton.icon(
              onPressed: _loadingR ? null : () => _export(ref, true),
              icon: _loadingR ? const SizedBox(width:16,height:16,child:CircularProgressIndicator(color:Colors.white,strokeWidth:2)) : const Icon(Icons.download, size: 16),
              label: Text(_loadingR ? 'Exporting...' : 'Download readings ${_rFormat.toUpperCase()}'),
              style: ElevatedButton.styleFrom(backgroundColor: kTeal600, foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(vertical: 13), elevation: 0),
            )),
            if (_lastR != null) ...[
              const SizedBox(height: 8),
              ListTile(dense: true, contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.description_outlined, size: 16, color: kGray500),
                title: Text(_lastR!.split('/').last, style: const TextStyle(fontSize: 11)),
                trailing: TextButton(onPressed: () => OpenFilex.open(_lastR!), child: const Text('Open', style: TextStyle(fontSize: 11)))),
            ],
          ]),
        ),

        // Alert events section
        sectionCard(
          icon: Icons.warning_amber_rounded, iconColor: const Color(0xFFF97316),
          title: 'Alert events', subtitle: 'Triggered alerts and acknowledgements',
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            label('SENSOR'),
            dropDown(_aSensor, sensorItems, (v) { if(v!=null)setState(()=>_aSensor=v); }),
            const SizedBox(height: 12),
            label('FROM DATE *'),
            dateBtn('', _aFrom, () async {
              final p = await showDatePicker(context: context, initialDate: _aFrom ?? DateTime.now().subtract(const Duration(days:7)), firstDate: DateTime(2024), lastDate: DateTime.now());
              if(p!=null) setState(()=>_aFrom=p);
            }),
            const SizedBox(height: 12),
            label('TO DATE *'),
            dateBtn('', _aTo, () async {
              final p = await showDatePicker(context: context, initialDate: _aTo ?? DateTime.now(), firstDate: DateTime(2024), lastDate: DateTime.now());
              if(p!=null) setState(()=>_aTo=p);
            }),
            const SizedBox(height: 12),
            label('FORMAT'),
            Row(children: [
              Expanded(child: GestureDetector(onTap: () => setState(()=>_aFormat='csv'), child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(color: _aFormat=='csv' ? kGrayWhite : Colors.transparent,
                  borderRadius: const BorderRadius.horizontal(left: Radius.circular(10)), border: Border.all(color: border)),
                child: Center(child: Text('CSV', style: TextStyle(fontSize: 13, color: _aFormat=='csv'?kTeal600:textS, fontWeight: FontWeight.w600)))))),
              Expanded(child: GestureDetector(onTap: () => setState(()=>_aFormat='pdf'), child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(color: _aFormat=='pdf' ? kGrayWhite : Colors.transparent,
                  borderRadius: const BorderRadius.horizontal(right: Radius.circular(10)), border: Border.all(color: border)),
                child: Center(child: Text('PDF Report', style: TextStyle(fontSize: 13, color: _aFormat=='pdf'?kTeal600:textS, fontWeight: FontWeight.w600)))))),
            ]),
            const SizedBox(height: 14),
            SizedBox(width: double.infinity, child: ElevatedButton.icon(
              onPressed: _loadingA ? null : () => _export(ref, false),
              icon: _loadingA ? const SizedBox(width:16,height:16,child:CircularProgressIndicator(color:Colors.white,strokeWidth:2)) : const Icon(Icons.download, size: 16),
              label: Text(_loadingA ? 'Exporting...' : 'Download alerts ${_aFormat.toUpperCase()}'),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF97316), foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(vertical: 13), elevation: 0),
            )),
          ]),
        ),
        const SizedBox(height: 24),
      ]),
    );
  }

  Future<void> _export(WidgetRef ref, bool isReadings) async {
    final fmt = DateFormat('yyyy-MM-dd');
    if (isReadings) setState(() => _loadingR = true);
    else setState(() => _loadingA = true);
    try {
      final api = ref.read(apiProvider);
      final sId  = isReadings ? (_rSensor == 'all' ? null : _rSensor) : (_aSensor == 'all' ? null : _aSensor);
      final from = isReadings ? (_rFrom != null ? fmt.format(_rFrom!) : null) : (_aFrom != null ? fmt.format(_aFrom!) : null);
      final to   = isReadings ? (_rTo   != null ? fmt.format(_rTo!)   : null) : (_aTo   != null ? fmt.format(_aTo!)   : null);
      final file = isReadings
          ? await api.downloadReadings(sensorId: sId, from: from, to: to)
          : await api.downloadAlertEvents(sensorId: sId, from: from, to: to);
      if (isReadings) setState(() => _lastR = file.path);
      else setState(() => _lastA = file.path);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: const Text('Export saved'), action: SnackBarAction(label: 'Open', onPressed: () => OpenFilex.open(file.path))));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (isReadings) { if (mounted) setState(() => _loadingR = false); }
      else { if (mounted) setState(() => _loadingA = false); }
    }
  }
}
