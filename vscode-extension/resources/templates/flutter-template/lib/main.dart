import 'package:flutter/material.dart';
import 'pages/home_page.dart';

void main() {
  runApp(const GenesisForgeApp());
}

class GenesisForgeApp extends StatelessWidget {
  const GenesisForgeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(home: HomePage());
  }
}
