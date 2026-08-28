import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/models.dart';

class GlobalAlertPopup extends StatefulWidget {
  final AlertEvent event; final VoidCallback onDismiss; final Function(String) onAcknowledge;
  const GlobalAlertPopup({super.key, required this.event, required this.onDismiss, required this.onAcknowledge});
  @override State<GlobalAlertPopup> createState() => _GlobalAlertPopupState();
}
class _GlobalAlertPopupState extends State<GlobalAlertPopup> {
  @override Widget build(BuildContext context) {
    final e = widget.event;
    final color = e.isAnomaly ? kViolet600 : e.isPredicted ? kAlertAmber : kRed500;
    final icon  = e.isAnomaly ? Icons.manage_search : e.isPredicted ? Icons.auto_awesome : Icons.warning_amber_rounded;
    final title = e.isAnomaly ? 'Anomaly Detected' : e.isPredicted ? 'AI Predicted Alert' : 'Threshold Alert';
    return Positioned.fill(child: Material(color: Colors.black54, child: Center(child: Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: kGray900, borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.5))),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Row(children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
          Text(title, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 14)),
          const Spacer(),
          GestureDetector(onTap: widget.onDismiss,
            child: const Icon(Icons.close, color: kGray400, size: 18)),
        ]),
        const SizedBox(height: 10),
        Text(e.message, style: const TextStyle(color: Colors.white, fontSize: 13), textAlign: TextAlign.center),
        const SizedBox(height: 14),
        Row(children: [
          Expanded(child: OutlinedButton(
            onPressed: widget.onDismiss,
            style: OutlinedButton.styleFrom(side: const BorderSide(color: kGray700)),
            child: const Text('Dismiss', style: TextStyle(color: kGray400)))),
          const SizedBox(width: 10),
          Expanded(child: ElevatedButton(
            onPressed: () { widget.onAcknowledge(e.id); widget.onDismiss(); },
            style: ElevatedButton.styleFrom(backgroundColor: color, foregroundColor: Colors.white, elevation: 0),
            child: const Text('Acknowledge'))),
        ]),
      ]),
    ))));
  }
}