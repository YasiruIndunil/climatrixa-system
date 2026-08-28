
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import '../../core/theme.dart';
import '../../core/app_bar.dart';
import '../../providers/providers.dart';

class AddEditSensorScreen extends ConsumerStatefulWidget {
  final String? sensorId;
  const AddEditSensorScreen({super.key, this.sensorId});
  @override ConsumerState<AddEditSensorScreen> createState() => _S();
}
class _S extends ConsumerState<AddEditSensorScreen> {
  final _nameC  = TextEditingController();
  final _locC   = TextEditingController();
  final _macC   = TextEditingController();
  final _latC   = TextEditingController();
  final _lngC   = TextEditingController();
  String _industry = 'general';
  bool _loading = false;
  LatLng? _pin;
  final _mapCtrl = MapController();
  bool _loaded = false;
  bool get isEdit => widget.sensorId != null;

  static const _industries = ['general','spice factory','supermarket','hospital','warehouse','factory'];

  @override void initState() {
    super.initState();
    if (isEdit) _loadSensor();
  }

  Future<void> _loadSensor() async {
    final s = await ref.read(apiProvider).getSensor(widget.sensorId!);
    _nameC.text  = s.name;
    _locC.text    = s.location;
    _macC.text    = s.macAddress ?? '';
    _industry      = s.industryProfile ?? 'general';
    if (s.latitude != null && s.longitude != null) {
      _pin = LatLng(s.latitude!, s.longitude!);
      _latC.text = s.latitude!.toStringAsFixed(4);
      _lngC.text = s.longitude!.toStringAsFixed(4);
      WidgetsBinding.instance.addPostFrameCallback((_) =>
        _mapCtrl.move(_pin!, 12));
    }
    setState(() => _loaded = true);
  }

  void _onMapTap(TapPosition _, LatLng pt) {
    setState(() {
      _pin = pt;
      _latC.text = pt.latitude.toStringAsFixed(4);
      _lngC.text = pt.longitude.toStringAsFixed(4);
    });
  }

  Future<void> _save() async {
    if (_nameC.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Sensor name is required')));
      return;
    }
    setState(() => _loading = true);
    final body = {
      'name': _nameC.text.trim(),
      'location': _locC.text.trim(),
      'mac_address': _macC.text.trim().toUpperCase(),
      'industry_profile': _industry,
      'is_active': true,
      if (_pin != null) 'latitude':  _pin!.latitude,
      if (_pin != null) 'longitude': _pin!.longitude,
    };
    try {
      final api = ref.read(apiProvider);
      if (isEdit) { await api.updateSensor(widget.sensorId!, body); }
      else         { await api.createSensor(body); }
      ref.invalidate(sensorsProvider);
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(isEdit ? 'Sensor updated' : 'Sensor registered')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override Widget build(BuildContext context) {
    final dark  = ref.watch(themeModeProvider) == ThemeMode.dark;
    final bg    = dark ? kGray950 : kGray50;
    final card  = dark ? kGray900 : kGrayWhite;
    final bd    = dark ? kGray800 : kGray100;
    final textP = dark ? Colors.white : kGray900Text;

    InputDecoration _deco(String hint) => InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: kGray500, fontSize: 13),
      filled: true, fillColor: dark ? kGray800 : kGray50,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: bd)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: bd)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kTeal600, width: 1.5)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
    );

    Widget _lbl(String t) => Padding(padding: const EdgeInsets.only(bottom: 6, top: 14),
      child: Text(t, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: .6, color: kGray500)));

    return Scaffold(
      backgroundColor: bg,
      appBar: climatrixaAppBar(context, ref, canPop: true),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // Header
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(color: card, borderRadius: BorderRadius.circular(16), border: Border.all(color: bd)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(isEdit ? 'Edit sensor' : 'Register new sensor',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: textP)),
                const SizedBox(height: 3),
                Text(isEdit ? 'Update sensor details' : 'Add a new sensor node to the system',
                  style: const TextStyle(fontSize: 12, color: kGray500)),
              ])),
            ]),
            const SizedBox(height: 2),

            _lbl('SENSOR NAME'),
            TextFormField(controller: _nameC,
              style: TextStyle(color: textP, fontSize: 13),
              decoration: _deco('e.g. Sensor Alpha')),

            _lbl('LOCATION DESCRIPTION'),
            TextFormField(controller: _locC,
              style: TextStyle(color: textP, fontSize: 13),
              decoration: _deco('e.g. Factory Floor A, Colombo')),

            _lbl('MAC ADDRESS'),
            TextFormField(controller: _macC,
              style: TextStyle(color: textP, fontSize: 13, fontFamily: 'monospace'),
              decoration: _deco('AA:BB:CC:DD:EE:FF')),

            _lbl('INDUSTRY PROFILE'),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: dark ? kGray800 : kGray50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: bd)),
              child: DropdownButtonHideUnderline(child: DropdownButton<String>(
                value: _industries.contains(_industry) ? _industry : 'general',
                isExpanded: true, dropdownColor: dark ? kGray900 : kGrayWhite,
                style: TextStyle(color: textP, fontSize: 13),
                onChanged: (v) { if (v != null) setState(() => _industry = v); },
                items: _industries.map((i) => DropdownMenuItem(
                  value: i,
                  child: Text(i, style: TextStyle(color: textP)))).toList(),
              ))),

            _lbl('GPS LOCATION — CLICK MAP TO PLACE PIN'),
            Container(
              height: 220,
              clipBehavior: Clip.hardEdge,
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: bd)),
              child: FlutterMap(
                mapController: _mapCtrl,
                options: MapOptions(
                  initialCenter: _pin ?? const LatLng(7.8731, 80.7718),
                  initialZoom: _pin != null ? 12 : 7,
                  onTap: _onMapTap,
                ),
                children: [
                  TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.climatrixa.app'),
                  if (_pin != null) MarkerLayer(markers: [
                    Marker(
                      point: _pin!,
                      width: 30, height: 40,
                      child: const Icon(Icons.location_pin, size: 36, color: kTeal600),
                    ),
                  ]),
                ],
              ),
            ),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Latitude', style: TextStyle(fontSize: 10, color: kGray500)),
                const SizedBox(height: 4),
                TextFormField(controller: _latC,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  style: TextStyle(color: textP, fontSize: 13),
                  onChanged: (v) {
                    final lat = double.tryParse(v);
                    final lng = double.tryParse(_lngC.text);
                    if (lat != null && lng != null) setState(() => _pin = LatLng(lat, lng));
                  },
                  decoration: _deco('e.g. 6.9271')),
              ])),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Longitude', style: TextStyle(fontSize: 10, color: kGray500)),
                const SizedBox(height: 4),
                TextFormField(controller: _lngC,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  style: TextStyle(color: textP, fontSize: 13),
                  onChanged: (v) {
                    final lat = double.tryParse(_latC.text);
                    final lng = double.tryParse(v);
                    if (lat != null && lng != null) setState(() => _pin = LatLng(lat, lng));
                  },
                  decoration: _deco('e.g. 79.8612')),
              ])),
            ]),

            const SizedBox(height: 20),
            Row(children: [
              Expanded(child: OutlinedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: OutlinedButton.styleFrom(
                  foregroundColor: dark ? kGray300 : kGray700,
                  side: BorderSide(color: bd),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(vertical: 13)),
                child: const Text('Cancel', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
              )),
              const SizedBox(width: 12),
              Expanded(child: ElevatedButton(
                onPressed: _loading ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: kTeal600, foregroundColor: Colors.white, elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(vertical: 13)),
                child: _loading
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(isEdit ? 'Save changes' : 'Register sensor',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              )),
            ]),
          ]),
        ),
        const SizedBox(height: 24),
      ]),
    );
  }

  Widget text(String t) => Text(t, style: const TextStyle(color: Colors.white, fontSize: 13));
}
