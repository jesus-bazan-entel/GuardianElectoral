#!/bin/bash
# Guardian Electoral Mobile - Project Setup Script
# Run this inside an empty directory or after: flutter create . --org com.apolonext

echo "🛡️ Setting up Guardian Electoral Mobile..."

cat > 'analysis_options.yaml' << 'FILEEOF'
include: package:flutter_lints/flutter.yaml

analyzer:
  exclude:
    - "**/*.g.dart"
    - "**/*.freezed.dart"
  errors:
    invalid_annotation_target: ignore

linter:
  rules:
    - prefer_const_constructors
    - prefer_const_declarations
    - prefer_final_fields
    - prefer_final_locals
    - avoid_print
    - require_trailing_commas
    - sort_child_properties_last
    - use_build_context_synchronously

FILEEOF

cat > '.gitignore' << 'FILEEOF'
# Miscellaneous
*.class
*.log
*.pyc
*.swp
.DS_Store
.atom/
.buildlog/
.history
.svn/
migrate_working_dir/

# IntelliJ related
*.iml
*.ipr
*.iws
.idea/

# VS Code related
.vscode/

# Flutter/Dart/Pub related
**/doc/api/
**/ios/Flutter/.last_build_id
.dart_tool/
.flutter-plugins
.flutter-plugins-dependencies
.packages
.pub-cache/
.pub/
/build/
pubspec.lock

# Symbolication related
app.*.symbols

# Obfuscation related
app.*.map.json

# Android Studio will place build artifacts here
/android/app/debug
/android/app/profile
/android/app/release

# Generated files
*.g.dart
*.freezed.dart

# Environment
.env
.env.*

FILEEOF

cat > 'pubspec.yaml' << 'FILEEOF'
name: guardian_electoral_mobile
description: Guardian Electoral - Mobile app for poll watchers (personeros) in Peru'\''s 2026 elections.
publish_to: '\''none'\''
version: 1.0.0+1

environment:
  sdk: '\''>=3.2.0 <4.0.0'\''
  flutter: '\''>=3.16.0'\''

dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter

  # State management
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.5

  # Backend
  supabase_flutter: ^2.5.0
  dio: ^5.4.3

  # Navigation
  go_router: ^14.2.0

  # Local database (offline-first)
  drift: ^2.18.0
  sqlite3_flutter_libs: ^0.5.21

  # Location & maps
  geolocator: ^12.0.0
  geocoding: ^3.0.0
  flutter_map: ^7.0.2
  latlong2: ^0.9.1

  # Camera & images
  camera: ^0.11.0+1
  image_picker: ^1.1.2
  image_compression_flutter: ^1.0.4

  # Security
  flutter_secure_storage: ^9.2.2

  # Connectivity
  connectivity_plus: ^6.0.3

  # Utils
  path_provider: ^2.1.3
  intl: ^0.19.0
  uuid: ^4.4.0
  path: ^1.9.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0
  drift_dev: ^2.18.0
  build_runner: ^2.4.9
  riverpod_generator: ^2.4.0

flutter:
  uses-material-design: true

  assets:
    - assets/images/

  fonts:
    - family: Roboto
      fonts:
        - asset: assets/fonts/Roboto-Regular.ttf
        - asset: assets/fonts/Roboto-Bold.ttf
          weight: 700
        - asset: assets/fonts/Roboto-Medium.ttf
          weight: 500

FILEEOF

mkdir -p "test"
cat > 'test/widget_test.dart' << 'FILEEOF'
import '\''package:flutter_test/flutter_test.dart'\'';
import '\''package:guardian_electoral_mobile/core/constants.dart'\'';
import '\''package:guardian_electoral_mobile/data/checkin_repository.dart'\'';
import '\''package:guardian_electoral_mobile/domain/models/session.dart'\'';
import '\''package:guardian_electoral_mobile/domain/models/acta.dart'\'';

void main() {
  group('\''AppConstants'\'', () {
    test('\''GPS tolerance is 500 meters'\'', () {
      expect(AppConstants.gpsToleranceMeters, 500.0);
    });

    test('\''DNI length is 8'\'', () {
      expect(AppConstants.dniLength, 8);
    });

    test('\''PIN length is 6'\'', () {
      expect(AppConstants.pinLength, 6);
    });
  });

  group('\''Haversine Distance'\'', () {
    test('\''calculates distance between two known points'\'', () {
      // Lima, Peru: Plaza Mayor to Miraflores (~8 km)
      final distance = CheckinRepository.haversineDistance(
        -12.0464, -77.0428, // Plaza Mayor
        -12.1191, -77.0311, // Miraflores
      );

      expect(distance, greaterThan(7000)); // > 7 km
      expect(distance, lessThan(9000)); // < 9 km
    });

    test('\''same point returns zero'\'', () {
      final distance = CheckinRepository.haversineDistance(
        -12.0464, -77.0428,
        -12.0464, -77.0428,
      );
      expect(distance, closeTo(0, 0.01));
    });
  });

  group('\''PersoneroSession'\'', () {
    test('\''serialization roundtrip'\'', () {
      final session = PersoneroSession(
        personeroId: '\''test-id'\'',
        fullName: '\''Juan Perez'\'',
        role: '\''personero'\'',
        assignedCentro: '\''IE 1234'\'',
        assignedMesa: '\''001'\'',
        assignedVotingCenterId: '\''vc-123'\'',
        centroLatitude: -12.0464,
        centroLongitude: -77.0428,
        loginTime: DateTime(2026, 4, 13, 8, 0),
      );

      final json = session.toJsonString();
      final restored = PersoneroSession.fromJsonString(json);

      expect(restored.personeroId, session.personeroId);
      expect(restored.fullName, session.fullName);
      expect(restored.assignedCentro, session.assignedCentro);
      expect(restored.centroLatitude, session.centroLatitude);
      expect(restored.hasCoordinates, true);
    });
  });

  group('\''Acta'\'', () {
    test('\''party results serialization'\'', () {
      final result = PartyResult(partyName: '\''Partido A'\'', votes: 150);
      final json = result.toJson();
      final restored = PartyResult.fromJson(json);

      expect(restored.partyName, '\''Partido A'\'');
      expect(restored.votes, 150);
    });
  });
}

FILEEOF

mkdir -p "lib"
cat > 'lib/main.dart' << 'FILEEOF'
import '\''package:flutter/material.dart'\'';
import '\''package:flutter/services.dart'\'';
import '\''package:flutter_riverpod/flutter_riverpod.dart'\'';

import '\''core/router.dart'\'';
import '\''core/theme.dart'\'';
import '\''data/supabase_client.dart'\'';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock to portrait orientation for mobile-first design
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  // Initialize Supabase
  await SupabaseClientManager.initialize();

  runApp(
    const ProviderScope(
      child: GuardianElectoralApp(),
    ),
  );
}

/// Root application widget.
class GuardianElectoralApp extends ConsumerWidget {
  const GuardianElectoralApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: '\''Guardian Electoral'\'',
      debugShowCheckedModeBanner: false,
      theme: GuardianTheme.lightTheme,
      routerConfig: router,
      builder: (context, child) {
        // Ensure text scaling does not break layout
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(
              MediaQuery.of(context).textScaler.scale(1.0).clamp(0.8, 1.3),
            ),
          ),
          child: child!,
        );
      },
    );
  }
}

FILEEOF

mkdir -p "lib/presentation/screens"
cat > 'lib/presentation/screens/incidents_screen.dart' << 'FILEEOF'
import '\''package:flutter/material.dart'\'';
import '\''package:flutter_riverpod/flutter_riverpod.dart'\'';
import '\''package:go_router/go_router.dart'\'';
import '\''package:image_picker/image_picker.dart'\'';
import '\''package:intl/intl.dart'\'';

import '\''../../core/router.dart'\'';
import '\''../../core/theme.dart'\'';
import '\''../../domain/providers/auth_provider.dart'\'';

/// Incident categories for Peruvian elections.
enum IncidentCategory {
  materialFaltante('\''Material faltante'\'', Icons.inventory_2),
  intimacion('\''Intimidacion o violencia'\'', Icons.warning),
  irregularidadMesa('\''Irregularidad en mesa'\'', Icons.gavel),
  suplantacion('\''Suplantacion'\'', Icons.person_off),
  propagandaIndebida('\''Propaganda indebida'\'', Icons.campaign),
  problemaTecnico('\''Problema tecnico'\'', Icons.build),
  otro('\''Otro'\'', Icons.report);

  final String label;
  final IconData icon;
  const IncidentCategory(this.label, this.icon);
}

/// Simple incident model stored locally.
class Incident {
  final String id;
  final String category;
  final String description;
  final String? photoPath;
  final DateTime timestamp;
  final bool synced;

  const Incident({
    required this.id,
    required this.category,
    required this.description,
    this.photoPath,
    required this.timestamp,
    this.synced = false,
  });
}

/// Local incidents provider.
final incidentsProvider = StateProvider<List<Incident>>((ref) => []);

/// Screen for reporting and viewing election incidents.
class IncidentsScreen extends ConsumerStatefulWidget {
  const IncidentsScreen({super.key});

  @override
  ConsumerState<IncidentsScreen> createState() => _IncidentsScreenState();
}

class _IncidentsScreenState extends ConsumerState<IncidentsScreen> {
  @override
  Widget build(BuildContext context) {
    final incidents = ref.watch(incidentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('\''Incidencias'\''),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go(RoutePaths.dashboard),
        ),
      ),
      body: incidents.isEmpty ? _buildEmptyState() : _buildIncidentsList(incidents),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showNewIncidentSheet(context),
        icon: const Icon(Icons.add),
        label: const Text('\''Reportar'\''),
        backgroundColor: GuardianTheme.errorRed,
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.check_circle_outline,
              size: 80,
              color: GuardianTheme.successGreen.withOpacity(0.5),
            ),
            const SizedBox(height: 16),
            const Text(
              '\''Sin incidencias reportadas'\'',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: GuardianTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '\''Si observas alguna irregularidad, reportala presionando el boton de abajo.'\'',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: GuardianTheme.textSecondary.withOpacity(0.7),
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIncidentsList(List<Incident> incidents) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: incidents.length,
      itemBuilder: (context, index) {
        final incident = incidents[index];
        final dateStr = DateFormat('\''dd/MM/yyyy HH:mm'\'').format(incident.timestamp);
        final category = IncidentCategory.values.firstWhere(
          (c) => c.name == incident.category,
          orElse: () => IncidentCategory.otro,
        );

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: GuardianTheme.errorRed.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(category.icon, color: GuardianTheme.errorRed, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            category.label,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                          Text(
                            dateStr,
                            style: const TextStyle(
                              color: GuardianTheme.textSecondary,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      incident.synced ? Icons.cloud_done : Icons.cloud_upload_outlined,
                      size: 18,
                      color: incident.synced
                          ? GuardianTheme.syncComplete
                          : GuardianTheme.syncPending,
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  incident.description,
                  style: const TextStyle(fontSize: 14),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showNewIncidentSheet(BuildContext context) {
    final descriptionController = TextEditingController();
    IncidentCategory? selectedCategory;
    String? photoPath;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            return Padding(
              padding: EdgeInsets.fromLTRB(
                20,
                20,
                20,
                MediaQuery.of(ctx).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Handle
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey[300],
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      '\''Reportar Incidencia'\'',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Category selection
                    const Text(
                      '\''Tipo de incidencia:'\'',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: IncidentCategory.values.map((cat) {
                        final isSelected = selectedCategory == cat;
                        return ChoiceChip(
                          label: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(cat.icon, size: 16),
                              const SizedBox(width: 4),
                              Text(cat.label),
                            ],
                          ),
                          selected: isSelected,
                          selectedColor: GuardianTheme.errorRed.withOpacity(0.15),
                          onSelected: (selected) {
                            setSheetState(() {
                              selectedCategory = selected ? cat : null;
                            });
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),

                    // Description
                    TextField(
                      controller: descriptionController,
                      decoration: const InputDecoration(
                        labelText: '\''Descripcion'\'',
                        hintText: '\''Describe la incidencia con detalle...'\'',
                      ),
                      maxLines: 4,
                      maxLength: 1000,
                    ),
                    const SizedBox(height: 12),

                    // Photo option
                    OutlinedButton.icon(
                      onPressed: () async {
                        final picker = ImagePicker();
                        final photo = await picker.pickImage(
                          source: ImageSource.camera,
                          imageQuality: 80,
                        );
                        if (photo != null) {
                          setSheetState(() => photoPath = photo.path);
                        }
                      },
                      icon: Icon(
                        photoPath != null ? Icons.check_circle : Icons.camera_alt,
                        color: photoPath != null
                            ? GuardianTheme.successGreen
                            : GuardianTheme.primaryBlue,
                      ),
                      label: Text(
                        photoPath != null ? '\''Foto adjuntada'\'' : '\''Adjuntar foto (opcional)'\'',
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Submit
                    ElevatedButton(
                      onPressed: selectedCategory == null ||
                              descriptionController.text.trim().isEmpty
                          ? null
                          : () {
                              final incident = Incident(
                                id: DateTime.now().millisecondsSinceEpoch.toString(),
                                category: selectedCategory!.name,
                                description: descriptionController.text.trim(),
                                photoPath: photoPath,
                                timestamp: DateTime.now(),
                              );

                              ref.read(incidentsProvider.notifier).state = [
                                incident,
                                ...ref.read(incidentsProvider),
                              ];

                              Navigator.pop(ctx);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('\''Incidencia reportada'\''),
                                  backgroundColor: GuardianTheme.successGreen,
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: GuardianTheme.errorRed,
                        minimumSize: const Size(double.infinity, 50),
                      ),
                      child: const Text(
                        '\''Reportar Incidencia'\'',
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

FILEEOF

mkdir -p "lib/presentation/screens"
cat > 'lib/presentation/screens/dashboard_screen.dart' << 'FILEEOF'
import '\''package:flutter/material.dart'\'';
import '\''package:flutter_riverpod/flutter_riverpod.dart'\'';
import '\''package:go_router/go_router.dart'\'';
import '\''package:intl/intl.dart'\'';

import '\''../../core/router.dart'\'';
import '\''../../core/theme.dart'\'';
import '\''../../domain/providers/auth_provider.dart'\'';
import '\''../../domain/providers/checkin_provider.dart'\'';
import '\''../../domain/providers/sync_provider.dart'\'';
import '\''../widgets/sync_indicator.dart'\'';

/// Main dashboard showing status, assigned centro, and quick actions.
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(currentSessionProvider);
    final isCheckedIn = ref.watch(checkinStatusProvider);
    final syncState = ref.watch(syncStateProvider);

    if (session == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('\''Guardian Electoral'\''),
        actions: [
          const SyncIndicator(compact: true),
          const SizedBox(width: 8),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: (value) {
              if (value == '\''logout'\'') {
                _showLogoutDialog(context, ref);
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: '\''logout'\'',
                child: Row(
                  children: [
                    Icon(Icons.logout, size: 20, color: GuardianTheme.errorRed),
                    SizedBox(width: 8),
                    Text('\''Cerrar sesion'\''),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(checkinStatusProvider);
          await ref.read(syncStateProvider.notifier).syncNow();
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Personero info card
            _buildPersoneroCard(context, session),
            const SizedBox(height: 12),

            // Assigned centro card
            _buildCentroCard(context, session),
            const SizedBox(height: 12),

            // Sync status
            const SyncIndicator(),
            const SizedBox(height: 16),

            // Check-in status
            _buildCheckinStatus(context, isCheckedIn),
            const SizedBox(height: 24),

            // Quick actions
            const Text(
              '\''Acciones Rapidas'\'',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: GuardianTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 12),

            _buildActionGrid(context, isCheckedIn),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: 0,
        onTap: (index) {
          switch (index) {
            case 0:
              break; // Already on dashboard
            case 1:
              context.go(RoutePaths.checkin);
            case 2:
              context.go(RoutePaths.actaList);
            case 3:
              context.go(RoutePaths.incidents);
          }
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: '\''Inicio'\''),
          BottomNavigationBarItem(icon: Icon(Icons.location_on), label: '\''Check-in'\''),
          BottomNavigationBarItem(icon: Icon(Icons.description), label: '\''Actas'\''),
          BottomNavigationBarItem(icon: Icon(Icons.report_problem), label: '\''Incidencias'\''),
        ],
      ),
    );
  }

  Widget _buildPersoneroCard(BuildContext context, session) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: GuardianTheme.primaryBlue,
              child: Text(
                _initials(session.fullName),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    session.fullName,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '\''Rol: ${_formatRole(session.role)}'\'',
                    style: const TextStyle(
                      color: GuardianTheme.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                  if (session.assignedMesa != null)
                    Text(
                      '\''Mesa: ${session.assignedMesa}'\'',
                      style: const TextStyle(
                        color: GuardianTheme.textSecondary,
                        fontSize: 14,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCentroCard(BuildContext context, session) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: GuardianTheme.accentGold.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.how_to_vote,
                color: GuardianTheme.accentGold,
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '\''Centro Asignado'\'',
                    style: TextStyle(
                      color: GuardianTheme.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    session.assignedCentro,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (session.hasCoordinates)
                    const Text(
                      '\''Coordenadas disponibles'\'',
                      style: TextStyle(
                        color: GuardianTheme.successGreen,
                        fontSize: 12,
                      ),
                    )
                  else
                    const Text(
                      '\''Sin coordenadas'\'',
                      style: TextStyle(
                        color: GuardianTheme.warningAmber,
                        fontSize: 12,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCheckinStatus(BuildContext context, AsyncValue<bool> isCheckedIn) {
    return isCheckedIn.when(
      data: (checkedIn) {
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: checkedIn
                ? GuardianTheme.successGreen.withOpacity(0.1)
                : GuardianTheme.warningAmber.withOpacity(0.1),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: checkedIn
                  ? GuardianTheme.successGreen.withOpacity(0.3)
                  : GuardianTheme.warningAmber.withOpacity(0.3),
            ),
          ),
          child: Row(
            children: [
              Icon(
                checkedIn ? Icons.check_circle : Icons.info_outline,
                color: checkedIn
                    ? GuardianTheme.successGreen
                    : GuardianTheme.warningAmber,
                size: 28,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      checkedIn ? '\''Check-in activo'\'' : '\''Sin check-in'\'',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                        color: checkedIn
                            ? GuardianTheme.successGreen
                            : GuardianTheme.warningAmber,
                      ),
                    ),
                    Text(
                      checkedIn
                          ? '\''Estas registrado en tu centro de votacion'\''
                          : '\''Realiza tu check-in al llegar al centro'\'',
                      style: TextStyle(
                        color: (checkedIn
                                ? GuardianTheme.successGreen
                                : GuardianTheme.warningAmber)
                            .withOpacity(0.8),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  Widget _buildActionGrid(BuildContext context, AsyncValue<bool> isCheckedIn) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.3,
      children: [
        _ActionTile(
          icon: Icons.location_on,
          label: '\''Check-in'\'',
          color: GuardianTheme.successGreen,
          onTap: () => context.go(RoutePaths.checkin),
        ),
        _ActionTile(
          icon: Icons.description,
          label: '\''Actas'\'',
          color: GuardianTheme.primaryBlue,
          onTap: () => context.go(RoutePaths.actaList),
        ),
        _ActionTile(
          icon: Icons.add_a_photo,
          label: '\''Subir Acta'\'',
          color: GuardianTheme.accentGold,
          onTap: () => context.go(RoutePaths.actaUpload),
        ),
        _ActionTile(
          icon: Icons.report_problem,
          label: '\''Incidencias'\'',
          color: GuardianTheme.errorRed,
          onTap: () => context.go(RoutePaths.incidents),
        ),
      ],
    );
  }

  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('\''Cerrar sesion'\''),
        content: const Text(
          '\''Los datos pendientes se sincronizaran cuando vuelvas a iniciar sesion. Deseas cerrar sesion?'\'',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('\''Cancelar'\''),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(authStateProvider.notifier).logout();
              context.go(RoutePaths.login);
            },
            style: TextButton.styleFrom(foregroundColor: GuardianTheme.errorRed),
            child: const Text('\''Cerrar sesion'\''),
          ),
        ],
      ),
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\''\s+'\''));
    if (parts.length >= 2) {
      return '\''${parts[0][0]}${parts[1][0]}'\''.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '\''?'\'';
  }

  String _formatRole(String role) {
    switch (role) {
      case '\''personero'\'':
        return '\''Personero de Mesa'\'';
      case '\''coordinador'\'':
        return '\''Coordinador'\'';
      case '\''supervisor'\'':
        return '\''Supervisor'\'';
      default:
        return role;
    }
  }
}

class _ActionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionTile({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      borderRadius: BorderRadius.circular(16),
      color: Colors.white,
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: color, size: 30),
              ),
              const SizedBox(height: 10),
              Text(
                label,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

FILEEOF

mkdir -p "lib/presentation/screens"
cat > 'lib/presentation/screens/checkin_screen.dart' << 'FILEEOF'
import '\''package:flutter/material.dart'\'';
import '\''package:flutter_map/flutter_map.dart'\'';
import '\''package:flutter_riverpod/flutter_riverpod.dart'\'';
import '\''package:go_router/go_router.dart'\'';
import '\''package:intl/intl.dart'\'';
import '\''package:latlong2/latlong.dart'\'';

import '\''../../core/constants.dart'\'';
import '\''../../core/router.dart'\'';
import '\''../../core/theme.dart'\'';
import '\''../../domain/models/checkin.dart'\'';
import '\''../../domain/providers/auth_provider.dart'\'';
import '\''../../domain/providers/checkin_provider.dart'\'';
import '\''../../domain/providers/location_provider.dart'\'';
import '\''../widgets/distance_indicator.dart'\'';
import '\''../widgets/guardian_button.dart'\'';

/// Check-in / check-out screen with GPS, map, and distance validation.
class CheckinScreen extends ConsumerStatefulWidget {
  const CheckinScreen({super.key});

  @override
  ConsumerState<CheckinScreen> createState() => _CheckinScreenState();
}

class _CheckinScreenState extends ConsumerState<CheckinScreen> {
  final _mapController = MapController();
  bool _actionInProgress = false;

  @override
  void initState() {
    super.initState();
    // Request location on screen open
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshLocation();
    });
  }

  Future<void> _refreshLocation() async {
    final session = ref.read(currentSessionProvider);
    await ref.read(locationProvider.notifier).getCurrentPosition(session: session);
  }

  Future<void> _performCheckin() async {
    final location = ref.read(locationProvider);
    if (location.position == null) {
      _showSnackBar('\''Esperando ubicacion GPS...'\'');
      return;
    }

    setState(() => _actionInProgress = true);

    final checkin = await ref.read(checkinActionProvider.notifier).performCheckin(
          latitude: location.position!.latitude,
          longitude: location.position!.longitude,
          accuracy: location.position!.accuracy,
        );

    setState(() => _actionInProgress = false);

    if (checkin != null && mounted) {
      _showSnackBar(
        '\''Check-in registrado exitosamente'\'',
        isError: false,
      );
    }
  }

  Future<void> _performCheckout() async {
    final location = ref.read(locationProvider);
    if (location.position == null) {
      _showSnackBar('\''Esperando ubicacion GPS...'\'');
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('\''Confirmar Check-out'\''),
        content: const Text(
          '\''Estas seguro que deseas hacer check-out? '\''
          '\''Esto indica que te retiras del centro de votacion.'\'',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('\''Cancelar'\''),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: GuardianTheme.errorRed),
            child: const Text('\''Check-out'\''),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _actionInProgress = true);

    final checkout = await ref.read(checkinActionProvider.notifier).performCheckout(
          latitude: location.position!.latitude,
          longitude: location.position!.longitude,
          accuracy: location.position!.accuracy,
        );

    setState(() => _actionInProgress = false);

    if (checkout != null && mounted) {
      _showSnackBar('\''Check-out registrado exitosamente'\'', isError: false);
    }
  }

  void _showSnackBar(String message, {bool isError = true}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? GuardianTheme.errorRed : GuardianTheme.successGreen,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(currentSessionProvider);
    final location = ref.watch(locationProvider);
    final isCheckedIn = ref.watch(checkinStatusProvider);
    final latestCheckin = ref.watch(latestCheckinProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('\''Check-in / Check-out'\''),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go(RoutePaths.dashboard),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshLocation,
            tooltip: '\''Actualizar ubicacion'\'',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Map section
          _buildMap(session, location),
          const SizedBox(height: 16),

          // Distance indicator
          DistanceIndicator(
            distanceMeters: location.distanceToCenter,
            isLoading: location.isLoading,
            error: location.error,
          ),
          const SizedBox(height: 8),

          // GPS accuracy info
          if (location.position != null) _buildGpsInfo(location),
          const SizedBox(height: 24),

          // Big action buttons
          isCheckedIn.when(
            data: (checkedIn) => _buildActionButtons(checkedIn),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, __) => _buildActionButtons(false),
          ),
          const SizedBox(height: 24),

          // Latest check-in info
          latestCheckin.when(
            data: (checkin) => checkin != null
                ? _buildLatestCheckinInfo(checkin)
                : const SizedBox.shrink(),
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  Widget _buildMap(session, LocationState location) {
    // Default center: Lima, Peru
    LatLng center = const LatLng(-12.0464, -77.0428);
    final markers = <Marker>[];

    // Centro marker
    if (session != null && session.hasCoordinates) {
      final centroPos = LatLng(session.centroLatitude!, session.centroLongitude!);
      center = centroPos;
      markers.add(
        Marker(
          point: centroPos,
          width: 50,
          height: 50,
          child: const Column(
            children: [
              Icon(Icons.how_to_vote, color: GuardianTheme.primaryBlue, size: 32),
              Text(
                '\''Centro'\'',
                style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
      );
    }

    // User position marker
    if (location.position != null) {
      final userPos = LatLng(
        location.position!.latitude,
        location.position!.longitude,
      );
      if (!session.hasCoordinates) center = userPos;

      markers.add(
        Marker(
          point: userPos,
          width: 40,
          height: 40,
          child: Container(
            decoration: BoxDecoration(
              color: GuardianTheme.successGreen,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.3),
                  blurRadius: 6,
                ),
              ],
            ),
            child: const Icon(Icons.person, color: Colors.white, size: 22),
          ),
        ),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        height: 250,
        child: FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: center,
            initialZoom: 16,
          ),
          children: [
            TileLayer(
              urlTemplate: '\''https://tile.openstreetmap.org/{z}/{x}/{y}.png'\'',
              userAgentPackageName: '\''com.guardianelectoral.mobile'\'',
            ),
            // Geofence circle around centro
            if (session != null && session.hasCoordinates)
              CircleLayer(
                circles: [
                  CircleMarker(
                    point: LatLng(session.centroLatitude!, session.centroLongitude!),
                    radius: AppConstants.gpsToleranceMeters,
                    useRadiusInMeter: true,
                    color: GuardianTheme.primaryBlue.withOpacity(0.08),
                    borderColor: GuardianTheme.primaryBlue.withOpacity(0.4),
                    borderStrokeWidth: 2,
                  ),
                ],
              ),
            MarkerLayer(markers: markers),
          ],
        ),
      ),
    );
  }

  Widget _buildGpsInfo(LocationState location) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Row(
        children: [
          const Icon(Icons.gps_fixed, size: 14, color: GuardianTheme.textSecondary),
          const SizedBox(width: 4),
          Text(
            '\''Precision: ${location.position!.accuracy.toStringAsFixed(0)}m'\'',
            style: const TextStyle(
              color: GuardianTheme.textSecondary,
              fontSize: 12,
            ),
          ),
          const SizedBox(width: 16),
          Text(
            '\''${location.position!.latitude.toStringAsFixed(5)}, '\''
            '\''${location.position!.longitude.toStringAsFixed(5)}'\'',
            style: const TextStyle(
              color: GuardianTheme.textSecondary,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(bool isCheckedIn) {
    if (isCheckedIn) {
      return Column(
        children: [
          // Checked-in state - show checkout button
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: GuardianTheme.successGreen.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.check_circle, color: GuardianTheme.successGreen, size: 28),
                SizedBox(width: 8),
                Text(
                  '\''Check-in activo'\'',
                  style: TextStyle(
                    color: GuardianTheme.successGreen,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          GuardianButton.large(
            label: '\''HACER CHECK-OUT'\'',
            icon: Icons.logout,
            onPressed: _actionInProgress ? null : _performCheckout,
            isLoading: _actionInProgress,
            backgroundColor: GuardianTheme.errorRed,
          ),
        ],
      );
    }

    // Not checked in - show big check-in button
    return GuardianButton.large(
      label: '\''HACER CHECK-IN'\'',
      icon: Icons.login,
      onPressed: _actionInProgress ? null : _performCheckin,
      isLoading: _actionInProgress,
      backgroundColor: GuardianTheme.successGreen,
    );
  }

  Widget _buildLatestCheckinInfo(Checkin checkin) {
    final dateStr = DateFormat('\''dd/MM/yyyy HH:mm'\'').format(checkin.timestamp);
    final typeStr = checkin.type == CheckinType.checkin ? '\''Check-in'\'' : '\''Check-out'\'';
    final distStr = checkin.distanceMeters < 1000
        ? '\''${checkin.distanceMeters.toStringAsFixed(0)}m'\''
        : '\''${(checkin.distanceMeters / 1000).toStringAsFixed(1)}km'\'';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '\''Ultimo registro'\'',
              style: TextStyle(
                color: GuardianTheme.textSecondary,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  checkin.type == CheckinType.checkin ? Icons.login : Icons.logout,
                  color: checkin.type == CheckinType.checkin
                      ? GuardianTheme.successGreen
                      : GuardianTheme.errorRed,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(
                  '\''$typeStr - $dateStr'\'',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '\''Distancia: $distStr'\'',
              style: const TextStyle(
                color: GuardianTheme.textSecondary,
                fontSize: 13,
              ),
            ),
            _buildSyncStatusChip(checkin.syncStatus),
          ],
        ),
      ),
    );
  }

  Widget _buildSyncStatusChip(SyncStatus status) {
    Color color;
    String label;
    IconData icon;

    switch (status) {
      case SyncStatus.synced:
        color = GuardianTheme.syncComplete;
        label = '\''Sincronizado'\'';
        icon = Icons.cloud_done;
      case SyncStatus.syncing:
        color = GuardianTheme.syncInProgress;
        label = '\''Sincronizando...'\'';
        icon = Icons.sync;
      case SyncStatus.error:
        color = GuardianTheme.syncError;
        label = '\''Error de sincronizacion'\'';
        icon = Icons.error_outline;
      case SyncStatus.pending:
        color = GuardianTheme.syncPending;
        label = '\''Pendiente'\'';
        icon = Icons.cloud_upload_outlined;
    }

    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

FILEEOF

mkdir -p "lib/presentation/screens"
cat > 'lib/presentation/screens/login_screen.dart' << 'FILEEOF'
import '\''package:flutter/material.dart'\'';
import '\''package:flutter/services.dart'\'';
import '\''package:flutter_riverpod/flutter_riverpod.dart'\'';
import '\''package:go_router/go_router.dart'\'';

import '\''../../core/constants.dart'\'';
import '\''../../core/router.dart'\'';
import '\''../../core/theme.dart'\'';
import '\''../../data/auth_repository.dart'\'';
import '\''../../domain/providers/auth_provider.dart'\'';
import '\''../widgets/guardian_button.dart'\'';

/// Login screen with DNI + 6-digit PIN authentication.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _dniController = TextEditingController();
  final _pinController = TextEditingController();
  final _dniFocus = FocusNode();
  final _pinFocus = FocusNode();

  bool _isLoading = false;
  bool _obscurePin = true;
  String? _errorMessage;

  @override
  void dispose() {
    _dniController.dispose();
    _pinController.dispose();
    _dniFocus.dispose();
    _pinFocus.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ref.read(authStateProvider.notifier).login(
            _dniController.text.trim(),
            _pinController.text.trim(),
          );

      if (mounted) {
        context.go(RoutePaths.dashboard);
      }
    } on AuthException catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (e) {
      setState(() => _errorMessage = '\''Error de conexion. Verifique su internet.'\'');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo and branding
                  _buildHeader(),
                  const SizedBox(height: 40),

                  // Error message
                  if (_errorMessage != null) ...[
                    _buildErrorBanner(),
                    const SizedBox(height: 16),
                  ],

                  // DNI field
                  _buildDniField(),
                  const SizedBox(height: 16),

                  // PIN field
                  _buildPinField(),
                  const SizedBox(height: 32),

                  // Login button
                  GuardianButton(
                    label: '\''Ingresar'\'',
                    icon: Icons.login,
                    onPressed: _isLoading ? null : _handleLogin,
                    isLoading: _isLoading,
                  ),
                  const SizedBox(height: 24),

                  // Help text
                  _buildHelpText(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: GuardianTheme.primaryBlue,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: GuardianTheme.primaryBlue.withOpacity(0.3),
                blurRadius: 12,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: const Icon(
            Icons.verified_user,
            size: 48,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          AppConstants.appName,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: GuardianTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          '\''Acceso para Personeros'\'',
          style: TextStyle(
            fontSize: 14,
            color: GuardianTheme.textSecondary.withOpacity(0.8),
          ),
        ),
      ],
    );
  }

  Widget _buildErrorBanner() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: GuardianTheme.errorRed.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: GuardianTheme.errorRed.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: GuardianTheme.errorRed, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _errorMessage!,
              style: const TextStyle(
                color: GuardianTheme.errorRed,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDniField() {
    return TextFormField(
      controller: _dniController,
      focusNode: _dniFocus,
      keyboardType: TextInputType.number,
      maxLength: AppConstants.dniLength,
      inputFormatters: [
        FilteringTextInputFormatter.digitsOnly,
        LengthLimitingTextInputFormatter(AppConstants.dniLength),
      ],
      decoration: const InputDecoration(
        labelText: '\''DNI'\'',
        hintText: '\''Ingrese su DNI de 8 digitos'\'',
        prefixIcon: Icon(Icons.badge_outlined),
        counterText: '\'''\'',
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return '\''Ingrese su DNI'\'';
        }
        if (value.length != AppConstants.dniLength) {
          return '\''El DNI debe tener ${AppConstants.dniLength} digitos'\'';
        }
        return null;
      },
      onFieldSubmitted: (_) => _pinFocus.requestFocus(),
      textInputAction: TextInputAction.next,
    );
  }

  Widget _buildPinField() {
    return TextFormField(
      controller: _pinController,
      focusNode: _pinFocus,
      keyboardType: TextInputType.number,
      maxLength: AppConstants.pinLength,
      obscureText: _obscurePin,
      inputFormatters: [
        FilteringTextInputFormatter.digitsOnly,
        LengthLimitingTextInputFormatter(AppConstants.pinLength),
      ],
      decoration: InputDecoration(
        labelText: '\''PIN'\'',
        hintText: '\''Ingrese su PIN de 6 digitos'\'',
        prefixIcon: const Icon(Icons.lock_outline),
        counterText: '\'''\'',
        suffixIcon: IconButton(
          icon: Icon(
            _obscurePin ? Icons.visibility_off : Icons.visibility,
            color: GuardianTheme.textSecondary,
          ),
          onPressed: () => setState(() => _obscurePin = !_obscurePin),
        ),
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return '\''Ingrese su PIN'\'';
        }
        if (value.length != AppConstants.pinLength) {
          return '\''El PIN debe tener ${AppConstants.pinLength} digitos'\'';
        }
        return null;
      },
      onFieldSubmitted: (_) => _handleLogin(),
      textInputAction: TextInputAction.done,
    );
  }

  Widget _buildHelpText() {
    return Column(
      children: [
        Text(
          '\''Contacte a su coordinador si no tiene su PIN'\'',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: GuardianTheme.textSecondary.withOpacity(0.7),
            fontSize: 13,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '\''Elecciones Peru ${AppConstants.electionYear}'\'',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: GuardianTheme.textSecondary.withOpacity(0.5),
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}

FILEEOF

mkdir -p "lib/presentation/screens"
cat > 'lib/presentation/screens/acta_upload_screen.dart' << 'FILEEOF'
import '\''package:flutter/material.dart'\'';
import '\''package:flutter/services.dart'\'';
import '\''package:flutter_riverpod/flutter_riverpod.dart'\'';
import '\''package:go_router/go_router.dart'\'';
import '\''package:image_picker/image_picker.dart'\'';

import '\''../../core/router.dart'\'';
import '\''../../core/theme.dart'\'';
import '\''../../domain/models/acta.dart'\'';
import '\''../../domain/providers/acta_provider.dart'\'';
import '\''../../domain/providers/auth_provider.dart'\'';
import '\''../widgets/guardian_button.dart'\'';
import '\''../widgets/photo_grid.dart'\'';

/// Screen for uploading acta photos, entering top 3 party results, and AI indicator.
class ActaUploadScreen extends ConsumerStatefulWidget {
  const ActaUploadScreen({super.key});

  @override
  ConsumerState<ActaUploadScreen> createState() => _ActaUploadScreenState();
}

class _ActaUploadScreenState extends ConsumerState<ActaUploadScreen> {
  final _formKey = GlobalKey<FormState>();
  final _mesaController = TextEditingController();
  final _totalVotesController = TextEditingController();
  final _blankVotesController = TextEditingController();
  final _nullVotesController = TextEditingController();
  final _observationsController = TextEditingController();
  final _imagePicker = ImagePicker();

  // Top 3 party controllers
  final List<TextEditingController> _partyNameControllers = [
    TextEditingController(),
    TextEditingController(),
    TextEditingController(),
  ];
  final List<TextEditingController> _partyVotesControllers = [
    TextEditingController(),
    TextEditingController(),
    TextEditingController(),
  ];

  @override
  void initState() {
    super.initState();
    // Pre-fill mesa from session if available
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final session = ref.read(currentSessionProvider);
      if (session?.assignedMesa != null) {
        _mesaController.text = session!.assignedMesa!;
        ref.read(actaFormProvider.notifier).setMesaNumber(session.assignedMesa!);
      }
    });
  }

  @override
  void dispose() {
    _mesaController.dispose();
    _totalVotesController.dispose();
    _blankVotesController.dispose();
    _nullVotesController.dispose();
    _observationsController.dispose();
    for (final c in _partyNameControllers) {
      c.dispose();
    }
    for (final c in _partyVotesControllers) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _takePhoto() async {
    try {
      final photo = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 90,
        maxWidth: 1920,
      );
      if (photo != null) {
        ref.read(actaFormProvider.notifier).addPhotoPath(photo.path);
      }
    } catch (e) {
      _showSnackBar('\''Error al abrir la camara: $e'\'');
    }
  }

  Future<void> _pickFromGallery() async {
    try {
      final photo = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 90,
        maxWidth: 1920,
      );
      if (photo != null) {
        ref.read(actaFormProvider.notifier).addPhotoPath(photo.path);
      }
    } catch (e) {
      _showSnackBar('\''Error al abrir la galeria: $e'\'');
    }
  }

  void _updatePartyResults() {
    final notifier = ref.read(actaFormProvider.notifier);
    for (int i = 0; i < 3; i++) {
      final name = _partyNameControllers[i].text.trim();
      final votesText = _partyVotesControllers[i].text.trim();
      if (name.isNotEmpty && votesText.isNotEmpty) {
        final votes = int.tryParse(votesText) ?? 0;
        notifier.updatePartyResult(i, name, votes);
      }
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    _updatePartyResults();

    final notifier = ref.read(actaFormProvider.notifier);
    notifier.setMesaNumber(_mesaController.text.trim());

    final totalVotes = int.tryParse(_totalVotesController.text.trim());
    final blankVotes = int.tryParse(_blankVotesController.text.trim());
    final nullVotes = int.tryParse(_nullVotesController.text.trim());

    notifier.setTotalVotes(totalVotes);
    notifier.setBlankVotes(blankVotes);
    notifier.setNullVotes(nullVotes);
    notifier.setObservations(_observationsController.text.trim().isNotEmpty
        ? _observationsController.text.trim()
        : null);

    final acta = await notifier.submit();

    if (acta != null && mounted) {
      _showSnackBar('\''Acta guardada exitosamente. Se sincronizara automaticamente.'\'', isError: false);
      notifier.reset();
      context.go(RoutePaths.actaList);
    }
  }

  void _showSnackBar(String message, {bool isError = true}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? GuardianTheme.errorRed : GuardianTheme.successGreen,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final formState = ref.watch(actaFormProvider);

    // Show error from provider
    if (formState.error != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _showSnackBar(formState.error!);
      });
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('\''Registrar Acta'\''),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (formState.photoPaths.isNotEmpty || _mesaController.text.isNotEmpty) {
              _showDiscardDialog();
            } else {
              context.go(RoutePaths.actaList);
            }
          },
        ),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Step 1: Photos
            _buildSectionHeader('\''1. Foto del Acta'\'', Icons.camera_alt),
            const SizedBox(height: 8),
            PhotoGrid(
              photoPaths: formState.photoPaths,
              onAddFromCamera: _takePhoto,
              onAddFromGallery: _pickFromGallery,
              onRemove: (index) =>
                  ref.read(actaFormProvider.notifier).removePhotoPath(index),
            ),
            const SizedBox(height: 8),
            _buildAiIndicator(),
            const SizedBox(height: 24),

            // Step 2: Mesa number
            _buildSectionHeader('\''2. Datos de la Mesa'\'', Icons.confirmation_number),
            const SizedBox(height: 8),
            TextFormField(
              controller: _mesaController,
              decoration: const InputDecoration(
                labelText: '\''Numero de Mesa'\'',
                hintText: '\''Ej: 001'\'',
                prefixIcon: Icon(Icons.tag),
              ),
              keyboardType: TextInputType.number,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return '\''Ingrese el numero de mesa'\'';
                }
                return null;
              },
            ),
            const SizedBox(height: 24),

            // Step 3: Top 3 party results
            _buildSectionHeader('\''3. Top 3 Partidos (Votos)'\'', Icons.how_to_vote),
            const SizedBox(height: 8),
            ..._buildPartyFields(),
            const SizedBox(height: 16),

            // Additional vote fields
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _totalVotesController,
                    decoration: const InputDecoration(
                      labelText: '\''Total Votos'\'',
                      prefixIcon: Icon(Icons.people),
                    ),
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _blankVotesController,
                    decoration: const InputDecoration(
                      labelText: '\''En Blanco'\'',
                      prefixIcon: Icon(Icons.block),
                    ),
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _nullVotesController,
                    decoration: const InputDecoration(
                      labelText: '\''Nulos'\'',
                      prefixIcon: Icon(Icons.cancel_outlined),
                    ),
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  ),
                ),
                const Expanded(child: SizedBox()),
              ],
            ),
            const SizedBox(height: 24),

            // Step 4: Observations
            _buildSectionHeader('\''4. Observaciones (Opcional)'\'', Icons.note),
            const SizedBox(height: 8),
            TextFormField(
              controller: _observationsController,
              decoration: const InputDecoration(
                hintText: '\''Alguna observacion o incidencia...'\'',
                prefixIcon: Icon(Icons.edit_note),
              ),
              maxLines: 3,
              maxLength: 500,
            ),
            const SizedBox(height: 24),

            // Submit
            GuardianButton(
              label: '\''Guardar Acta'\'',
              icon: Icons.save,
              onPressed: formState.isSubmitting ? null : _submit,
              isLoading: formState.isSubmitting,
            ),
            const SizedBox(height: 8),
            Text(
              '\''El acta se guardara localmente y se sincronizara automaticamente.'\'',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: GuardianTheme.textSecondary.withOpacity(0.7),
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 20, color: GuardianTheme.primaryBlue),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: GuardianTheme.textPrimary,
          ),
        ),
      ],
    );
  }

  List<Widget> _buildPartyFields() {
    return List.generate(3, (i) {
      final position = ['\''1er'\'', '\''2do'\'', '\''3er'\''][i];
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: GuardianTheme.primaryBlue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Text(
                  '\''${i + 1}'\'',
                  style: const TextStyle(
                    color: GuardianTheme.primaryBlue,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 3,
              child: TextFormField(
                controller: _partyNameControllers[i],
                decoration: InputDecoration(
                  labelText: '\''$position Partido'\'',
                  hintText: '\''Nombre del partido'\'',
                  isDense: true,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 1,
              child: TextFormField(
                controller: _partyVotesControllers[i],
                decoration: const InputDecoration(
                  labelText: '\''Votos'\'',
                  isDense: true,
                ),
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      );
    });
  }

  Widget _buildAiIndicator() {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.purple.withOpacity(0.06),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.purple.withOpacity(0.15)),
      ),
      child: Row(
        children: [
          const Icon(Icons.auto_awesome, size: 18, color: Colors.purple),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              '\''La foto sera procesada por IA en el servidor para verificar los resultados automaticamente.'\'',
              style: TextStyle(
                color: Colors.purple.withOpacity(0.8),
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showDiscardDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('\''Descartar cambios?'\''),
        content: const Text(
          '\''Tienes datos sin guardar. Si sales se perderan.'\'',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('\''Continuar editando'\''),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(actaFormProvider.notifier).reset();
              context.go(RoutePaths.actaList);
            },
            style: TextButton.styleFrom(foregroundColor: GuardianTheme.errorRed),
            child: const Text('\''Descartar'\''),
          ),
        ],
      ),
    );
  }
}

FILEEOF

mkdir -p "lib/presentation/screens"
cat > 'lib/presentation/screens/splash_screen.dart' << 'FILEEOF'
import '\''package:flutter/material.dart'\'';
import '\''package:flutter_riverpod/flutter_riverpod.dart'\'';
import '\''package:go_router/go_router.dart'\'';

import '\''../../core/constants.dart'\'';
import '\''../../core/router.dart'\'';
import '\''../../core/theme.dart'\'';
import '\''../../domain/providers/auth_provider.dart'\'';

/// Splash screen with animated shield logo.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.elasticOut),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.6, curve: Curves.easeIn),
      ),
    );

    _controller.forward();

    // Navigate after animation
    Future.delayed(const Duration(milliseconds: 2200), () {
      if (!mounted) return;
      _navigate();
    });
  }

  void _navigate() {
    final authState = ref.read(authStateProvider);
    final isLoggedIn = authState.valueOrNull != null;

    if (isLoggedIn) {
      context.go(RoutePaths.dashboard);
    } else {
      context.go(RoutePaths.login);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              GuardianTheme.primaryDark,
              GuardianTheme.primaryBlue,
              Color(0xFF1976D2),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AnimatedBuilder(
                animation: _controller,
                builder: (context, child) {
                  return Opacity(
                    opacity: _fadeAnimation.value,
                    child: Transform.scale(
                      scale: _scaleAnimation.value,
                      child: child,
                    ),
                  );
                },
                child: _buildShieldLogo(),
              ),
              const SizedBox(height: 32),
              FadeTransition(
                opacity: _fadeAnimation,
                child: Column(
                  children: [
                    const Text(
                      AppConstants.appName,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '\''Elecciones Peru ${AppConstants.electionYear}'\'',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.85),
                        fontSize: 16,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                    const SizedBox(height: 48),
                    SizedBox(
                      width: 32,
                      height: 32,
                      child: CircularProgressIndicator(
                        strokeWidth: 3,
                        color: Colors.white.withOpacity(0.7),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildShieldLogo() {
    return Container(
      width: 120,
      height: 140,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Shield shape
          CustomPaint(
            size: const Size(80, 100),
            painter: _ShieldPainter(),
          ),
          // Check mark
          const Icon(
            Icons.verified_user,
            size: 60,
            color: GuardianTheme.primaryBlue,
          ),
        ],
      ),
    );
  }
}

class _ShieldPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = GuardianTheme.primaryBlue.withOpacity(0.1)
      ..style = PaintingStyle.fill;

    final path = Path()
      ..moveTo(size.width / 2, 0)
      ..lineTo(size.width, size.height * 0.15)
      ..lineTo(size.width, size.height * 0.6)
      ..quadraticBezierTo(
        size.width / 2,
        size.height * 1.1,
        size.width / 2,
        size.height,
      )
      ..quadraticBezierTo(
        size.width / 2,
        size.height * 1.1,
        0,
        size.height * 0.6,
      )
      ..lineTo(0, size.height * 0.15)
      ..close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

FILEEOF

mkdir -p "lib/presentation/screens"
cat > 'lib/presentation/screens/acta_list_screen.dart' << 'FILEEOF'
import '\''package:flutter/material.dart'\'';
import '\''package:flutter_riverpod/flutter_riverpod.dart'\'';
import '\''package:go_router/go_router.dart'\'';
import '\''package:intl/intl.dart'\'';

import '\''../../core/router.dart'\'';
import '\''../../core/theme.dart'\'';
import '\''../../domain/models/acta.dart'\'';
import '\''../../domain/models/checkin.dart'\'' show SyncStatus;
import '\''../../domain/providers/acta_provider.dart'\'';
import '\''../../domain/providers/sync_provider.dart'\'';
import '\''../widgets/sync_indicator.dart'\'';

/// Offline-first list of actas with sync status indicators.
class ActaListScreen extends ConsumerWidget {
  const ActaListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final actasAsync = ref.watch(actasListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('\''Actas'\''),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go(RoutePaths.dashboard),
        ),
        actions: [
          const SyncIndicator(compact: true),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(actasListProvider),
          ),
        ],
      ),
      body: actasAsync.when(
        data: (actas) {
          if (actas.isEmpty) {
            return _buildEmptyState(context);
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(actasListProvider);
              await ref.read(syncStateProvider.notifier).syncNow();
            },
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: actas.length,
              itemBuilder: (context, index) => _buildActaCard(context, actas[index]),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: GuardianTheme.errorRed),
              const SizedBox(height: 16),
              Text('\''Error: $error'\''),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(actasListProvider),
                child: const Text('\''Reintentar'\''),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go(RoutePaths.actaUpload),
        icon: const Icon(Icons.add_a_photo),
        label: const Text('\''Nueva Acta'\''),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.description_outlined,
              size: 80,
              color: GuardianTheme.textSecondary.withOpacity(0.4),
            ),
            const SizedBox(height: 16),
            const Text(
              '\''No hay actas registradas'\'',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: GuardianTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '\''Toma una foto del acta de tu mesa para registrarla'\'',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: GuardianTheme.textSecondary.withOpacity(0.7),
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => context.go(RoutePaths.actaUpload),
              icon: const Icon(Icons.add_a_photo),
              label: const Text('\''Registrar Acta'\''),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActaCard(BuildContext context, Acta acta) {
    final dateStr = DateFormat('\''dd/MM/yyyy HH:mm'\'').format(acta.createdAt);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          // Could navigate to detail view
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: GuardianTheme.primaryBlue.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '\''Mesa ${acta.mesaNumber}'\'',
                      style: const TextStyle(
                        color: GuardianTheme.primaryBlue,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ),
                  const Spacer(),
                  _buildSyncChip(acta.syncStatus),
                ],
              ),
              const SizedBox(height: 12),

              // Results summary
              if (acta.topResults.isNotEmpty) ...[
                const Text(
                  '\''Resultados:'\'',
                  style: TextStyle(
                    color: GuardianTheme.textSecondary,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 4),
                ...acta.topResults.take(3).map(
                      (r) => Padding(
                        padding: const EdgeInsets.only(bottom: 2),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                r.partyName,
                                style: const TextStyle(fontSize: 14),
                              ),
                            ),
                            Text(
                              '\''${r.votes} votos'\'',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                const Divider(height: 16),
              ],

              // Footer
              Row(
                children: [
                  const Icon(Icons.schedule, size: 14, color: GuardianTheme.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    dateStr,
                    style: const TextStyle(
                      color: GuardianTheme.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                  const Spacer(),
                  if (acta.photos.isNotEmpty) ...[
                    const Icon(Icons.photo, size: 14, color: GuardianTheme.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      '\''${acta.photos.length} foto${acta.photos.length != 1 ? "s" : ""}'\'',
                      style: const TextStyle(
                        color: GuardianTheme.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                  if (acta.aiProcessed) ...[
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.purple.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.auto_awesome, size: 12, color: Colors.purple),
                          SizedBox(width: 2),
                          Text(
                            '\''IA'\'',
                            style: TextStyle(
                              color: Colors.purple,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSyncChip(SyncStatus status) {
    Color color;
    String label;
    IconData icon;

    switch (status) {
      case SyncStatus.synced:
        color = GuardianTheme.syncComplete;
        label = '\''Sincronizado'\'';
        icon = Icons.cloud_done;
      case SyncStatus.syncing:
        color = GuardianTheme.syncInProgress;
        label = '\''Sincronizando'\'';
        icon = Icons.sync;
      case SyncStatus.error:
        color = GuardianTheme.syncError;
        label = '\''Error'\'';
        icon = Icons.error_outline;
      case SyncStatus.pending:
        color = GuardianTheme.syncPending;
        label = '\''Pendiente'\'';
        icon = Icons.cloud_upload_outlined;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

FILEEOF

mkdir -p "lib/presentation/widgets"
cat > 'lib/presentation/widgets/distance_indicator.dart' << 'FILEEOF'
import '\''package:flutter/material.dart'\'';
import '\''../../core/constants.dart'\'';
import '\''../../core/theme.dart'\'';

/// Visual indicator showing distance from current position to voting center.
/// Green = within tolerance, Amber = warning zone, Red = too far.
class DistanceIndicator extends StatelessWidget {
  final double? distanceMeters;
  final bool isLoading;
  final String? error;

  const DistanceIndicator({
    super.key,
    this.distanceMeters,
    this.isLoading = false,
    this.error,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return _buildContainer(
        context,
        color: GuardianTheme.textSecondary,
        icon: Icons.gps_not_fixed,
        label: '\''Obteniendo ubicacion...'\'',
        showProgress: true,
      );
    }

    if (error != null) {
      return _buildContainer(
        context,
        color: GuardianTheme.errorRed,
        icon: Icons.gps_off,
        label: error!,
      );
    }

    if (distanceMeters == null) {
      return _buildContainer(
        context,
        color: GuardianTheme.textSecondary,
        icon: Icons.location_off,
        label: '\''Ubicacion no disponible'\'',
      );
    }

    final distance = distanceMeters!;
    final Color color;
    final IconData icon;
    final String status;

    if (distance <= AppConstants.gpsWarningMeters) {
      color = GuardianTheme.successGreen;
      icon = Icons.check_circle;
      status = '\''Dentro del rango'\'';
    } else if (distance <= AppConstants.gpsToleranceMeters) {
      color = GuardianTheme.warningAmber;
      icon = Icons.warning_amber_rounded;
      status = '\''Cerca del limite'\'';
    } else {
      color = GuardianTheme.errorRed;
      icon = Icons.error;
      status = '\''Fuera del rango permitido'\'';
    }

    final distanceStr = distance < 1000
        ? '\''${distance.toStringAsFixed(0)} m'\''
        : '\''${(distance / 1000).toStringAsFixed(1)} km'\'';

    return _buildContainer(
      context,
      color: color,
      icon: icon,
      label: status,
      distance: distanceStr,
    );
  }

  Widget _buildContainer(
    BuildContext context, {
    required Color color,
    required IconData icon,
    required String label,
    String? distance,
    bool showProgress = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          if (showProgress)
            SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(
                strokeWidth: 3,
                color: color,
              ),
            )
          else
            Icon(icon, color: color, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                if (distance != null)
                  Text(
                    '\''Distancia: $distance'\'',
                    style: TextStyle(
                      color: color.withOpacity(0.8),
                      fontSize: 13,
                    ),
                  ),
              ],
            ),
          ),
          if (distance != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                distance,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

FILEEOF

mkdir -p "lib/presentation/widgets"
cat > 'lib/presentation/widgets/sync_indicator.dart' << 'FILEEOF'
import '\''package:flutter/material.dart'\'';
import '\''package:flutter_riverpod/flutter_riverpod.dart'\'';
import '\''package:intl/intl.dart'\'';

import '\''../../core/theme.dart'\'';
import '\''../../domain/providers/sync_provider.dart'\'';

/// Shows current sync status: pending count, syncing animation, last sync time.
class SyncIndicator extends ConsumerWidget {
  final bool compact;

  const SyncIndicator({super.key, this.compact = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncState = ref.watch(syncStateProvider);
    final isOnline = ref.watch(isOnlineProvider);

    if (compact) {
      return _buildCompact(context, syncState, isOnline, ref);
    }
    return _buildFull(context, syncState, isOnline, ref);
  }

  Widget _buildCompact(
    BuildContext context,
    SyncState syncState,
    bool isOnline,
    WidgetRef ref,
  ) {
    Color color;
    IconData icon;

    if (!isOnline) {
      color = GuardianTheme.textSecondary;
      icon = Icons.cloud_off;
    } else if (syncState.isSyncing) {
      color = GuardianTheme.syncInProgress;
      icon = Icons.sync;
    } else if (syncState.pendingCount > 0) {
      color = GuardianTheme.syncPending;
      icon = Icons.cloud_upload_outlined;
    } else {
      color = GuardianTheme.syncComplete;
      icon = Icons.cloud_done;
    }

    return GestureDetector(
      onTap: () => ref.read(syncStateProvider.notifier).syncNow(),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (syncState.isSyncing)
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: color,
              ),
            )
          else
            Icon(icon, size: 20, color: color),
          if (syncState.pendingCount > 0) ...[
            const SizedBox(width: 4),
            Text(
              '\''${syncState.pendingCount}'\'',
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFull(
    BuildContext context,
    SyncState syncState,
    bool isOnline,
    WidgetRef ref,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isOnline ? Icons.wifi : Icons.wifi_off,
                  color: isOnline
                      ? GuardianTheme.successGreen
                      : GuardianTheme.textSecondary,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(
                  isOnline ? '\''En linea'\'' : '\''Sin conexion'\'',
                  style: TextStyle(
                    color: isOnline
                        ? GuardianTheme.successGreen
                        : GuardianTheme.textSecondary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                if (syncState.pendingCount > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: GuardianTheme.syncPending.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '\''${syncState.pendingCount} pendiente${syncState.pendingCount != 1 ? "s" : ""}'\'',
                      style: const TextStyle(
                        color: GuardianTheme.syncPending,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
            if (syncState.lastSyncTime != null) ...[
              const SizedBox(height: 4),
              Text(
                '\''Ultima sincronizacion: ${DateFormat('\''HH:mm:ss'\'').format(syncState.lastSyncTime!)}'\'',
                style: const TextStyle(
                  color: GuardianTheme.textSecondary,
                  fontSize: 12,
                ),
              ),
            ],
            if (syncState.isSyncing) ...[
              const SizedBox(height: 8),
              const LinearProgressIndicator(),
            ],
            if (syncState.pendingCount > 0 && isOnline && !syncState.isSyncing) ...[
              const SizedBox(height: 8),
              SizedBox(
                height: 32,
                child: TextButton.icon(
                  onPressed: () =>
                      ref.read(syncStateProvider.notifier).syncNow(),
                  icon: const Icon(Icons.sync, size: 16),
                  label: const Text('\''Sincronizar ahora'\''),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

FILEEOF

mkdir -p "lib/presentation/widgets"
cat > 'lib/presentation/widgets/guardian_button.dart' << 'FILEEOF'
import '\''package:flutter/material.dart'\'';
import '\''../../core/theme.dart'\'';

/// Large, mobile-friendly action button for Guardian Electoral.
class GuardianButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isOutlined;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final double height;
  final double? width;
  final double borderRadius;
  final double fontSize;

  const GuardianButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.isLoading = false,
    this.isOutlined = false,
    this.backgroundColor,
    this.foregroundColor,
    this.height = 60,
    this.width,
    this.borderRadius = 16,
    this.fontSize = 18,
  });

  /// Large prominent check-in / check-out button.
  factory GuardianButton.large({
    Key? key,
    required String label,
    required IconData icon,
    VoidCallback? onPressed,
    bool isLoading = false,
    Color? backgroundColor,
    Color? foregroundColor,
  }) {
    return GuardianButton(
      key: key,
      label: label,
      icon: icon,
      onPressed: onPressed,
      isLoading: isLoading,
      backgroundColor: backgroundColor,
      foregroundColor: foregroundColor,
      height: 80,
      fontSize: 22,
      borderRadius: 20,
    );
  }

  /// Danger / destructive action button.
  factory GuardianButton.danger({
    Key? key,
    required String label,
    IconData? icon,
    VoidCallback? onPressed,
    bool isLoading = false,
  }) {
    return GuardianButton(
      key: key,
      label: label,
      icon: icon,
      onPressed: onPressed,
      isLoading: isLoading,
      backgroundColor: GuardianTheme.errorRed,
      foregroundColor: Colors.white,
    );
  }

  @override
  Widget build(BuildContext context) {
    final bgColor = backgroundColor ?? GuardianTheme.primaryBlue;
    final fgColor = foregroundColor ?? Colors.white;

    if (isOutlined) {
      return SizedBox(
        height: height,
        width: width ?? double.infinity,
        child: OutlinedButton.icon(
          onPressed: isLoading ? null : onPressed,
          icon: isLoading
              ? SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: bgColor,
                  ),
                )
              : (icon != null ? Icon(icon, size: 28) : const SizedBox.shrink()),
          label: Text(
            label,
            style: TextStyle(fontSize: fontSize, fontWeight: FontWeight.w600),
          ),
          style: OutlinedButton.styleFrom(
            foregroundColor: bgColor,
            side: BorderSide(color: bgColor, width: 2),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(borderRadius),
            ),
          ),
        ),
      );
    }

    return SizedBox(
      height: height,
      width: width ?? double.infinity,
      child: ElevatedButton.icon(
        onPressed: isLoading ? null : onPressed,
        icon: isLoading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: Colors.white,
                ),
              )
            : (icon != null ? Icon(icon, size: 28) : const SizedBox.shrink()),
        label: Text(
          label,
          style: TextStyle(fontSize: fontSize, fontWeight: FontWeight.w600),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: bgColor,
          foregroundColor: fgColor,
          disabledBackgroundColor: bgColor.withOpacity(0.6),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(borderRadius),
          ),
          elevation: 4,
        ),
      ),
    );
  }
}

FILEEOF

mkdir -p "lib/presentation/widgets"
cat > 'lib/presentation/widgets/photo_grid.dart' << 'FILEEOF'
import '\''dart:io'\'';

import '\''package:flutter/material.dart'\'';
import '\''../../core/theme.dart'\'';

/// Grid display for acta photos with add/remove capability.
class PhotoGrid extends StatelessWidget {
  final List<String> photoPaths;
  final VoidCallback? onAddFromCamera;
  final VoidCallback? onAddFromGallery;
  final void Function(int index)? onRemove;
  final void Function(int index)? onTap;
  final int maxPhotos;
  final int crossAxisCount;

  const PhotoGrid({
    super.key,
    required this.photoPaths,
    this.onAddFromCamera,
    this.onAddFromGallery,
    this.onRemove,
    this.onTap,
    this.maxPhotos = 5,
    this.crossAxisCount = 3,
  });

  @override
  Widget build(BuildContext context) {
    final canAdd = photoPaths.length < maxPhotos;
    final itemCount = photoPaths.length + (canAdd ? 1 : 0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.photo_library, size: 20, color: GuardianTheme.textSecondary),
            const SizedBox(width: 8),
            Text(
              '\''Fotos del Acta (${photoPaths.length}/$maxPhotos)'\'',
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: GuardianTheme.textSecondary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
          ),
          itemCount: itemCount,
          itemBuilder: (context, index) {
            if (index == photoPaths.length && canAdd) {
              return _buildAddButton(context);
            }
            return _buildPhotoTile(context, index);
          },
        ),
      ],
    );
  }

  Widget _buildAddButton(BuildContext context) {
    return GestureDetector(
      onTap: () => _showAddOptions(context),
      child: Container(
        decoration: BoxDecoration(
          color: GuardianTheme.primaryBlue.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: GuardianTheme.primaryBlue.withOpacity(0.3),
            width: 2,
            strokeAlign: BorderSide.strokeAlignInside,
          ),
        ),
        child: const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.add_a_photo,
              size: 32,
              color: GuardianTheme.primaryBlue,
            ),
            SizedBox(height: 4),
            Text(
              '\''Agregar'\'',
              style: TextStyle(
                color: GuardianTheme.primaryBlue,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPhotoTile(BuildContext context, int index) {
    final path = photoPaths[index];
    final file = File(path);

    return GestureDetector(
      onTap: () => onTap?.call(index),
      child: Stack(
        fit: StackFit.expand,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: file.existsSync()
                ? Image.file(
                    file,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _buildPlaceholder(),
                  )
                : _buildPlaceholder(),
          ),
          if (onRemove != null)
            Positioned(
              top: 4,
              right: 4,
              child: GestureDetector(
                onTap: () => onRemove?.call(index),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: GuardianTheme.errorRed,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.close,
                    size: 16,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          Positioned(
            bottom: 4,
            left: 4,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '\''${index + 1}'\'',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Icon(Icons.broken_image, color: Colors.grey),
    );
  }

  void _showAddOptions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  '\''Agregar foto del acta'\'',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 20),
                ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: GuardianTheme.primaryBlue,
                    child: Icon(Icons.camera_alt, color: Colors.white),
                  ),
                  title: const Text('\''Tomar foto'\''),
                  subtitle: const Text('\''Usar la camara del dispositivo'\''),
                  onTap: () {
                    Navigator.pop(context);
                    onAddFromCamera?.call();
                  },
                ),
                ListTile(
                  leading: CircleAvatar(
                    backgroundColor: GuardianTheme.primaryBlue.withOpacity(0.8),
                    child: const Icon(Icons.photo_library, color: Colors.white),
                  ),
                  title: const Text('\''Elegir de galeria'\''),
                  subtitle: const Text('\''Seleccionar una foto existente'\''),
                  onTap: () {
                    Navigator.pop(context);
                    onAddFromGallery?.call();
                  },
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        );
      },
    );
  }
}

FILEEOF

mkdir -p "lib/data"
cat > 'lib/data/checkin_repository.dart' << 'FILEEOF'
import '\''dart:math'\'';
import '\''package:drift/drift.dart'\'';
import '\''package:uuid/uuid.dart'\'';

import '\''../core/constants.dart'\'';
import '\''../domain/models/checkin.dart'\'';
import '\''../domain/models/session.dart'\'';
import '\''local_database.dart'\'';
import '\''supabase_client.dart'\'';

/// Repository for check-in / check-out operations with offline-first support.
class CheckinRepository {
  final LocalDatabase _db;
  static const _uuid = Uuid();

  CheckinRepository(this._db);

  /// Calculate Haversine distance between two GPS points, in meters.
  static double haversineDistance(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    const earthRadiusM = 6371000.0;
    final dLat = _toRadians(lat2 - lat1);
    final dLon = _toRadians(lon2 - lon1);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_toRadians(lat1)) *
            cos(_toRadians(lat2)) *
            sin(dLon / 2) *
            sin(dLon / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return earthRadiusM * c;
  }

  static double _toRadians(double degrees) => degrees * pi / 180;

  /// Perform a check-in. Stores locally, queues for sync.
  Future<Checkin> performCheckin({
    required PersoneroSession session,
    required double latitude,
    required double longitude,
    double? accuracy,
  }) async {
    return _performAction(
      session: session,
      latitude: latitude,
      longitude: longitude,
      accuracy: accuracy,
      type: CheckinType.checkin,
    );
  }

  /// Perform a check-out. Stores locally, queues for sync.
  Future<Checkin> performCheckout({
    required PersoneroSession session,
    required double latitude,
    required double longitude,
    double? accuracy,
  }) async {
    return _performAction(
      session: session,
      latitude: latitude,
      longitude: longitude,
      accuracy: accuracy,
      type: CheckinType.checkout,
    );
  }

  Future<Checkin> _performAction({
    required PersoneroSession session,
    required double latitude,
    required double longitude,
    double? accuracy,
    required CheckinType type,
  }) async {
    // Calculate distance to assigned centro
    double distanceMeters = 0;
    if (session.hasCoordinates) {
      distanceMeters = haversineDistance(
        latitude,
        longitude,
        session.centroLatitude!,
        session.centroLongitude!,
      );
    }

    final id = _uuid.v4();
    final now = DateTime.now();

    final checkin = Checkin(
      id: id,
      personeroId: session.personeroId,
      votingCenterId: session.assignedVotingCenterId,
      type: type,
      latitude: latitude,
      longitude: longitude,
      distanceMeters: distanceMeters,
      accuracy: accuracy,
      timestamp: now,
      syncStatus: SyncStatus.pending,
    );

    // Save to local database
    await _db.insertCheckin(LocalCheckinsCompanion(
      id: Value(id),
      personeroId: Value(session.personeroId),
      votingCenterId: Value(session.assignedVotingCenterId),
      type: Value(type.name),
      latitude: Value(latitude),
      longitude: Value(longitude),
      distanceMeters: Value(distanceMeters),
      accuracy: Value(accuracy),
      timestamp: Value(now),
      syncStatus: const Value('\''pending'\''),
    ));

    // Add to sync queue
    await _db.addToSyncQueue(SyncQueueCompanion(
      entityType: const Value('\''checkin'\''),
      entityId: Value(id),
      action: const Value('\''insert'\''),
      payload: Value(_checkinToPayload(checkin)),
      createdAt: Value(now),
    ));

    return checkin;
  }

  /// Get all local check-ins.
  Future<List<Checkin>> getCheckins() async {
    final rows = await _db.getAllCheckins();
    return rows.map(_fromLocalCheckin).toList();
  }

  /// Get the latest check-in for a personero to determine current state.
  Future<Checkin?> getLatestCheckin(String personeroId) async {
    final row = await _db.getLatestCheckin(personeroId);
    if (row == null) return null;
    return _fromLocalCheckin(row);
  }

  /// Determine if personero is currently checked in.
  Future<bool> isCheckedIn(String personeroId) async {
    final latest = await getLatestCheckin(personeroId);
    return latest != null && latest.type == CheckinType.checkin;
  }

  /// Sync a single check-in to Supabase.
  Future<bool> syncCheckin(Checkin checkin) async {
    try {
      await _db.updateCheckinSyncStatus(checkin.id, '\''syncing'\'');

      final response = await SupabaseClientManager.from(AppConstants.checkinsTable)
          .insert(checkin.toRemoteJson())
          .select()
          .single();

      final remoteId = response['\''id'\''] as String?;
      await _db.updateCheckinSyncStatus(checkin.id, '\''synced'\'', remoteId: remoteId);
      return true;
    } catch (e) {
      await _db.updateCheckinSyncStatus(
        checkin.id,
        '\''error'\'',
        error: e.toString(),
      );
      return false;
    }
  }

  Checkin _fromLocalCheckin(LocalCheckin row) {
    return Checkin(
      id: row.id,
      personeroId: row.personeroId,
      votingCenterId: row.votingCenterId,
      type: row.type == '\''checkout'\'' ? CheckinType.checkout : CheckinType.checkin,
      latitude: row.latitude,
      longitude: row.longitude,
      distanceMeters: row.distanceMeters,
      accuracy: row.accuracy,
      timestamp: row.timestamp,
      syncStatus: SyncStatus.values.firstWhere(
        (e) => e.name == row.syncStatus,
        orElse: () => SyncStatus.pending,
      ),
      remoteId: row.remoteId,
      errorMessage: row.errorMessage,
    );
  }

  String _checkinToPayload(Checkin c) {
    return '\''{"personero_id":"${c.personeroId}","voting_center_id":"${c.votingCenterId}",'\''
        '\''"type":"${c.type.name}","latitude":${c.latitude},"longitude":${c.longitude},'\''
        '\''"distance_meters":${c.distanceMeters},"timestamp":"${c.timestamp.toIso8601String()}"}'\'';
  }
}

FILEEOF

mkdir -p "lib/data"
cat > 'lib/data/local_database.dart' << 'FILEEOF'
import '\''dart:io'\'';
import '\''package:drift/drift.dart'\'';
import '\''package:drift/native.dart'\'';
import '\''package:path_provider/path_provider.dart'\'';
import '\''package:path/path.dart'\'' as p;

part '\''local_database.g.dart'\'';

/// Local check-in records.
class LocalCheckins extends Table {
  TextColumn get id => text()();
  TextColumn get personeroId => text()();
  TextColumn get votingCenterId => text()();
  TextColumn get type => text()(); // '\''checkin'\'' or '\''checkout'\''
  RealColumn get latitude => real()();
  RealColumn get longitude => real()();
  RealColumn get distanceMeters => real()();
  RealColumn get accuracy => real().nullable()();
  DateTimeColumn get timestamp => dateTime()();
  TextColumn get syncStatus => text().withDefault(const Constant('\''pending'\''))();
  TextColumn get remoteId => text().nullable()();
  TextColumn get errorMessage => text().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

/// Local acta records.
class LocalActas extends Table {
  TextColumn get id => text()();
  TextColumn get personeroId => text()();
  TextColumn get votingCenterId => text()();
  TextColumn get mesaNumber => text()();
  TextColumn get topResultsJson => text().withDefault(const Constant('\''[]'\''))();
  IntColumn get totalVotes => integer().nullable()();
  IntColumn get blankVotes => integer().nullable()();
  IntColumn get nullVotes => integer().nullable()();
  TextColumn get observations => text().nullable()();
  TextColumn get syncStatus => text().withDefault(const Constant('\''pending'\''))();
  TextColumn get remoteId => text().nullable()();
  BoolColumn get aiProcessed => boolean().withDefault(const Constant(false))();
  TextColumn get aiStatus => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

/// Local photo records.
class LocalPhotos extends Table {
  TextColumn get id => text()();
  TextColumn get actaId => text()();
  TextColumn get localPath => text()();
  TextColumn get remoteUrl => text().nullable()();
  TextColumn get syncStatus => text().withDefault(const Constant('\''pending'\''))();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

/// Queue of items waiting to sync.
class SyncQueue extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get entityType => text()(); // '\''checkin'\'', '\''acta'\'', '\''photo'\''
  TextColumn get entityId => text()();
  TextColumn get action => text()(); // '\''insert'\'', '\''update'\'', '\''upload'\''
  TextColumn get payload => text()(); // JSON payload
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  TextColumn get status => text().withDefault(const Constant('\''pending'\''))();
  TextColumn get errorMessage => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get processedAt => dateTime().nullable()();
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, '\''guardian_electoral.sqlite'\''));
    return NativeDatabase.createInBackground(file);
  });
}

@DriftDatabase(tables: [LocalCheckins, LocalActas, LocalPhotos, SyncQueue])
class LocalDatabase extends _$LocalDatabase {
  LocalDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  // ──────────── Check-ins ────────────

  Future<List<LocalCheckin>> getAllCheckins() => select(localCheckins).get();

  Future<List<LocalCheckin>> getPendingCheckins() {
    return (select(localCheckins)
          ..where((t) => t.syncStatus.equals('\''pending'\'')))
        .get();
  }

  Future<LocalCheckin?> getLatestCheckin(String personeroId) {
    return (select(localCheckins)
          ..where((t) => t.personeroId.equals(personeroId))
          ..orderBy([(t) => OrderingTerm.desc(t.timestamp)])
          ..limit(1))
        .getSingleOrNull();
  }

  Future<int> insertCheckin(LocalCheckinsCompanion entry) {
    return into(localCheckins).insert(entry);
  }

  Future<bool> updateCheckinSyncStatus(String id, String status, {String? remoteId, String? error}) {
    return (update(localCheckins)..where((t) => t.id.equals(id))).write(
      LocalCheckinsCompanion(
        syncStatus: Value(status),
        remoteId: Value(remoteId),
        errorMessage: Value(error),
      ),
    ).then((rows) => rows > 0);
  }

  // ──────────── Actas ────────────

  Future<List<LocalActa>> getAllActas() {
    return (select(localActas)..orderBy([(t) => OrderingTerm.desc(t.createdAt)])).get();
  }

  Future<List<LocalActa>> getPendingActas() {
    return (select(localActas)..where((t) => t.syncStatus.equals('\''pending'\''))).get();
  }

  Future<int> insertActa(LocalActasCompanion entry) {
    return into(localActas).insert(entry);
  }

  Future<bool> updateActa(String id, LocalActasCompanion entry) {
    return (update(localActas)..where((t) => t.id.equals(id)))
        .write(entry)
        .then((rows) => rows > 0);
  }

  Future<bool> updateActaSyncStatus(String id, String status, {String? remoteId}) {
    return (update(localActas)..where((t) => t.id.equals(id))).write(
      LocalActasCompanion(
        syncStatus: Value(status),
        remoteId: Value(remoteId),
      ),
    ).then((rows) => rows > 0);
  }

  // ──────────── Photos ────────────

  Future<List<LocalPhoto>> getPhotosForActa(String actaId) {
    return (select(localPhotos)..where((t) => t.actaId.equals(actaId))).get();
  }

  Future<List<LocalPhoto>> getPendingPhotos() {
    return (select(localPhotos)..where((t) => t.syncStatus.equals('\''pending'\''))).get();
  }

  Future<int> insertPhoto(LocalPhotosCompanion entry) {
    return into(localPhotos).insert(entry);
  }

  Future<bool> updatePhotoSyncStatus(String id, String status, {String? remoteUrl}) {
    return (update(localPhotos)..where((t) => t.id.equals(id))).write(
      LocalPhotosCompanion(
        syncStatus: Value(status),
        remoteUrl: Value(remoteUrl),
      ),
    ).then((rows) => rows > 0);
  }

  // ──────────── Sync Queue ────────────

  Future<List<SyncQueueData>> getPendingSyncItems() {
    return (select(syncQueue)
          ..where((t) => t.status.equals('\''pending'\''))
          ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
        .get();
  }

  Future<int> addToSyncQueue(SyncQueueCompanion entry) {
    return into(syncQueue).insert(entry);
  }

  Future<bool> markSyncItemProcessed(int id, {String? error}) {
    return (update(syncQueue)..where((t) => t.id.equals(id))).write(
      SyncQueueCompanion(
        status: Value(error != null ? '\''error'\'' : '\''processed'\''),
        errorMessage: Value(error),
        processedAt: Value(DateTime.now()),
      ),
    ).then((rows) => rows > 0);
  }

  Future<bool> incrementRetryCount(int id) {
    return customStatement(
      '\''UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?'\'',
      [id],
    ).then((_) => true);
  }

  Future<int> getPendingSyncCount() async {
    final result = await (select(syncQueue)
          ..where((t) => t.status.equals('\''pending'\'')))
        .get();
    return result.length;
  }

  // ──────────── Utility ────────────

  Future<void> clearAllData() async {
    await delete(localCheckins).go();
    await delete(localActas).go();
    await delete(localPhotos).go();
    await delete(syncQueue).go();
  }
}

FILEEOF

mkdir -p "lib/data"
cat > 'lib/data/acta_repository.dart' << 'FILEEOF'
import '\''dart:convert'\'';
import '\''dart:io'\'';

import '\''package:drift/drift.dart'\'';
import '\''package:uuid/uuid.dart'\'';
import '\''package:image_compression_flutter/image_compression_flutter.dart'\'';
import '\''package:path_provider/path_provider.dart'\'';
import '\''package:path/path.dart'\'' as p;

import '\''../core/constants.dart'\'';
import '\''../domain/models/acta.dart'\'';
import '\''../domain/models/checkin.dart'\'' show SyncStatus;
import '\''../domain/models/session.dart'\'';
import '\''local_database.dart'\'';
import '\''supabase_client.dart'\'';

/// Repository for acta (tally sheet) operations with offline-first support.
class ActaRepository {
  final LocalDatabase _db;
  static const _uuid = Uuid();

  ActaRepository(this._db);

  /// Create a new acta locally.
  Future<Acta> createActa({
    required PersoneroSession session,
    required String mesaNumber,
    List<PartyResult> topResults = const [],
    int? totalVotes,
    int? blankVotes,
    int? nullVotes,
    String? observations,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();

    final acta = Acta(
      id: id,
      personeroId: session.personeroId,
      votingCenterId: session.assignedVotingCenterId,
      mesaNumber: mesaNumber,
      topResults: topResults,
      totalVotes: totalVotes,
      blankVotes: blankVotes,
      nullVotes: nullVotes,
      observations: observations,
      syncStatus: SyncStatus.pending,
      createdAt: now,
      updatedAt: now,
    );

    await _db.insertActa(LocalActasCompanion(
      id: Value(id),
      personeroId: Value(session.personeroId),
      votingCenterId: Value(session.assignedVotingCenterId),
      mesaNumber: Value(mesaNumber),
      topResultsJson: Value(jsonEncode(topResults.map((e) => e.toJson()).toList())),
      totalVotes: Value(totalVotes),
      blankVotes: Value(blankVotes),
      nullVotes: Value(nullVotes),
      observations: Value(observations),
      syncStatus: const Value('\''pending'\''),
      createdAt: Value(now),
      updatedAt: Value(now),
    ));

    // Add to sync queue
    await _db.addToSyncQueue(SyncQueueCompanion(
      entityType: const Value('\''acta'\''),
      entityId: Value(id),
      action: const Value('\''insert'\''),
      payload: Value(jsonEncode(acta.toRemoteJson())),
      createdAt: Value(now),
    ));

    return acta;
  }

  /// Update an existing acta locally.
  Future<Acta> updateActa(Acta acta) async {
    final now = DateTime.now();

    await _db.updateActa(acta.id, LocalActasCompanion(
      topResultsJson: Value(jsonEncode(acta.topResults.map((e) => e.toJson()).toList())),
      totalVotes: Value(acta.totalVotes),
      blankVotes: Value(acta.blankVotes),
      nullVotes: Value(acta.nullVotes),
      observations: Value(acta.observations),
      syncStatus: const Value('\''pending'\''),
      updatedAt: Value(now),
    ));

    return acta.copyWith(syncStatus: SyncStatus.pending);
  }

  /// Add a photo to an acta. Compresses the image and stores locally.
  Future<ActaPhoto> addPhoto({
    required String actaId,
    required String sourcePath,
  }) async {
    final photoId = _uuid.v4();
    final now = DateTime.now();

    // Compress image
    final compressedPath = await _compressImage(sourcePath, photoId);

    final photo = ActaPhoto(
      id: photoId,
      actaId: actaId,
      localPath: compressedPath,
      syncStatus: SyncStatus.pending,
      createdAt: now,
    );

    await _db.insertPhoto(LocalPhotosCompanion(
      id: Value(photoId),
      actaId: Value(actaId),
      localPath: Value(compressedPath),
      syncStatus: const Value('\''pending'\''),
      createdAt: Value(now),
    ));

    // Add photo upload to sync queue
    await _db.addToSyncQueue(SyncQueueCompanion(
      entityType: const Value('\''photo'\''),
      entityId: Value(photoId),
      action: const Value('\''upload'\''),
      payload: Value(jsonEncode({
        '\''photo_id'\'': photoId,
        '\''acta_id'\'': actaId,
        '\''local_path'\'': compressedPath,
      })),
      createdAt: Value(now),
    ));

    return photo;
  }

  /// Compress an image and save to app documents directory.
  Future<String> _compressImage(String sourcePath, String photoId) async {
    final appDir = await getApplicationDocumentsDirectory();
    final photosDir = Directory(p.join(appDir.path, '\''acta_photos'\''));
    if (!await photosDir.exists()) {
      await photosDir.create(recursive: true);
    }

    final ext = p.extension(sourcePath).isNotEmpty ? p.extension(sourcePath) : '\''.jpg'\'';
    final outputPath = p.join(photosDir.path, '\''$photoId$ext'\'');

    try {
      final input = ImageFile(
        rawBytes: await File(sourcePath).readAsBytes(),
        filePath: sourcePath,
      );

      final config = Configuration(
        outputType: ImageOutputType.jpg,
        quality: AppConstants.imageQuality,
      );

      final output = await compressor.compress(ImageFileConfiguration(
        input: input,
        config: config,
      ));

      await File(outputPath).writeAsBytes(output.rawBytes);
    } catch (e) {
      // Fallback: just copy the file
      await File(sourcePath).copy(outputPath);
    }

    return outputPath;
  }

  /// Get all actas with their photos.
  Future<List<Acta>> getAllActas() async {
    final rows = await _db.getAllActas();
    final actas = <Acta>[];

    for (final row in rows) {
      final photos = await _db.getPhotosForActa(row.id);
      actas.add(_fromLocalActa(row, photos));
    }

    return actas;
  }

  /// Get photos for a specific acta.
  Future<List<ActaPhoto>> getPhotosForActa(String actaId) async {
    final rows = await _db.getPhotosForActa(actaId);
    return rows.map(_fromLocalPhoto).toList();
  }

  /// Sync an acta record to Supabase.
  Future<bool> syncActa(String actaId) async {
    try {
      await _db.updateActaSyncStatus(actaId, '\''syncing'\'');

      final rows = await _db.getAllActas();
      final localActa = rows.firstWhere((r) => r.id == actaId);
      final acta = _fromLocalActa(localActa, []);

      final response = await SupabaseClientManager.from(AppConstants.actasTable)
          .insert(acta.toRemoteJson())
          .select()
          .single();

      final remoteId = response['\''id'\''] as String?;
      await _db.updateActaSyncStatus(actaId, '\''synced'\'', remoteId: remoteId);
      return true;
    } catch (e) {
      await _db.updateActaSyncStatus(actaId, '\''error'\'');
      return false;
    }
  }

  /// Upload a photo to Supabase Storage.
  Future<bool> syncPhoto(String photoId) async {
    try {
      await _db.updatePhotoSyncStatus(photoId, '\''syncing'\'');

      final pendingPhotos = await _db.getPendingPhotos();
      final allPhotos = await _db.getPendingPhotos();
      // Find the specific photo - get all photos and filter
      LocalPhoto? localPhoto;
      for (final photo in allPhotos) {
        if (photo.id == photoId) {
          localPhoto = photo;
          break;
        }
      }

      if (localPhoto == null) {
        // Try from pending
        for (final photo in pendingPhotos) {
          if (photo.id == photoId) {
            localPhoto = photo;
            break;
          }
        }
      }

      if (localPhoto == null) {
        throw Exception('\''Photo not found: $photoId'\'');
      }

      final file = File(localPhoto.localPath);
      if (!await file.exists()) {
        throw Exception('\''Photo file not found: ${localPhoto.localPath}'\'');
      }

      final storagePath = '\''${localPhoto.actaId}/$photoId${p.extension(localPhoto.localPath)}'\'';

      await SupabaseClientManager.storage
          .from(AppConstants.actaPhotoBucket)
          .upload(storagePath, file);

      final remoteUrl = SupabaseClientManager.storage
          .from(AppConstants.actaPhotoBucket)
          .getPublicUrl(storagePath);

      await _db.updatePhotoSyncStatus(photoId, '\''synced'\'', remoteUrl: remoteUrl);

      // Also record in acta_photos table
      await SupabaseClientManager.from(AppConstants.actaPhotosTable).insert({
        '\''acta_id'\'': localPhoto.actaId,
        '\''photo_url'\'': remoteUrl,
        '\''storage_path'\'': storagePath,
      });

      return true;
    } catch (e) {
      await _db.updatePhotoSyncStatus(photoId, '\''error'\'');
      return false;
    }
  }

  Acta _fromLocalActa(LocalActa row, List<LocalPhoto> photoRows) {
    List<PartyResult> topResults = [];
    try {
      final decoded = jsonDecode(row.topResultsJson) as List<dynamic>;
      topResults = decoded
          .map((e) => PartyResult.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {}

    return Acta(
      id: row.id,
      personeroId: row.personeroId,
      votingCenterId: row.votingCenterId,
      mesaNumber: row.mesaNumber,
      topResults: topResults,
      totalVotes: row.totalVotes,
      blankVotes: row.blankVotes,
      nullVotes: row.nullVotes,
      observations: row.observations,
      photos: photoRows.map(_fromLocalPhoto).toList(),
      syncStatus: SyncStatus.values.firstWhere(
        (e) => e.name == row.syncStatus,
        orElse: () => SyncStatus.pending,
      ),
      remoteId: row.remoteId,
      aiProcessed: row.aiProcessed,
      aiStatus: row.aiStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    );
  }

  ActaPhoto _fromLocalPhoto(LocalPhoto row) {
    return ActaPhoto(
      id: row.id,
      actaId: row.actaId,
      localPath: row.localPath,
      remoteUrl: row.remoteUrl,
      syncStatus: SyncStatus.values.firstWhere(
        (e) => e.name == row.syncStatus,
        orElse: () => SyncStatus.pending,
      ),
      createdAt: row.createdAt,
    );
  }
}

FILEEOF

mkdir -p "lib/data"
cat > 'lib/data/sync_service.dart' << 'FILEEOF'
import '\''dart:async'\'';
import '\''dart:convert'\'';

import '\''package:connectivity_plus/connectivity_plus.dart'\'';

import '\''../core/constants.dart'\'';
import '\''local_database.dart'\'';
import '\''checkin_repository.dart'\'';
import '\''acta_repository.dart'\'';

/// Sync status summary.
class SyncSummary {
  final int pendingCheckins;
  final int pendingActas;
  final int pendingPhotos;
  final int totalPending;
  final bool isSyncing;
  final DateTime? lastSyncTime;

  const SyncSummary({
    this.pendingCheckins = 0,
    this.pendingActas = 0,
    this.pendingPhotos = 0,
    this.totalPending = 0,
    this.isSyncing = false,
    this.lastSyncTime,
  });

  bool get hasPending => totalPending > 0;
}

/// Offline queue processor. Syncs local data to Supabase when online.
class SyncService {
  final LocalDatabase _db;
  final CheckinRepository _checkinRepo;
  final ActaRepository _actaRepo;
  final Connectivity _connectivity;

  Timer? _syncTimer;
  bool _isSyncing = false;
  DateTime? _lastSyncTime;

  StreamController<SyncSummary>? _summaryController;
  Stream<SyncSummary> get summaryStream {
    _summaryController ??= StreamController<SyncSummary>.broadcast();
    return _summaryController!.stream;
  }

  SyncService({
    required LocalDatabase db,
    required CheckinRepository checkinRepo,
    required ActaRepository actaRepo,
    Connectivity? connectivity,
  })  : _db = db,
        _checkinRepo = checkinRepo,
        _actaRepo = actaRepo,
        _connectivity = connectivity ?? Connectivity();

  /// Start the periodic sync timer.
  void startPeriodicSync() {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(
      Duration(seconds: AppConstants.syncIntervalSeconds),
      (_) => syncAll(),
    );

    // Also listen for connectivity changes
    _connectivity.onConnectivityChanged.listen((results) {
      final hasConnection = results.any((r) => r != ConnectivityResult.none);
      if (hasConnection && !_isSyncing) {
        syncAll();
      }
    });
  }

  /// Stop periodic sync.
  void stopPeriodicSync() {
    _syncTimer?.cancel();
    _syncTimer = null;
  }

  /// Check if device is online.
  Future<bool> isOnline() async {
    final results = await _connectivity.checkConnectivity();
    return results.any((r) => r != ConnectivityResult.none);
  }

  /// Process all pending sync items.
  Future<SyncSummary> syncAll() async {
    if (_isSyncing) return _getCurrentSummary();

    final online = await isOnline();
    if (!online) return _getCurrentSummary();

    _isSyncing = true;
    _emitSummary();

    try {
      // 1. Sync pending check-ins
      await _syncPendingCheckins();

      // 2. Sync pending actas
      await _syncPendingActas();

      // 3. Upload pending photos
      await _syncPendingPhotos();

      // 4. Process general sync queue
      await _processSyncQueue();

      _lastSyncTime = DateTime.now();
    } catch (e) {
      // Log but don'\''t rethrow - sync failures are non-fatal
    } finally {
      _isSyncing = false;
      _emitSummary();
    }

    return _getCurrentSummary();
  }

  Future<void> _syncPendingCheckins() async {
    final pending = await _db.getPendingCheckins();
    for (final row in pending) {
      final checkin = _checkinRowToModel(row);
      await _checkinRepo.syncCheckin(checkin);
    }
  }

  Future<void> _syncPendingActas() async {
    final pending = await _db.getPendingActas();
    for (final row in pending) {
      await _actaRepo.syncActa(row.id);
    }
  }

  Future<void> _syncPendingPhotos() async {
    final pending = await _db.getPendingPhotos();
    for (final row in pending) {
      await _actaRepo.syncPhoto(row.id);
    }
  }

  Future<void> _processSyncQueue() async {
    final items = await _db.getPendingSyncItems();

    for (final item in items) {
      if (item.retryCount >= AppConstants.maxRetryAttempts) {
        await _db.markSyncItemProcessed(item.id, error: '\''Max retries exceeded'\'');
        continue;
      }

      try {
        bool success = false;

        switch (item.entityType) {
          case '\''checkin'\'':
            // Already handled above, mark as processed
            success = true;
            break;
          case '\''acta'\'':
            success = true;
            break;
          case '\''photo'\'':
            success = true;
            break;
          default:
            success = false;
        }

        if (success) {
          await _db.markSyncItemProcessed(item.id);
        } else {
          await _db.incrementRetryCount(item.id);
        }
      } catch (e) {
        await _db.incrementRetryCount(item.id);
        await _db.markSyncItemProcessed(item.id, error: e.toString());
      }
    }
  }

  Future<SyncSummary> _getCurrentSummary() async {
    final pendingCheckins = (await _db.getPendingCheckins()).length;
    final pendingActas = (await _db.getPendingActas()).length;
    final pendingPhotos = (await _db.getPendingPhotos()).length;

    return SyncSummary(
      pendingCheckins: pendingCheckins,
      pendingActas: pendingActas,
      pendingPhotos: pendingPhotos,
      totalPending: pendingCheckins + pendingActas + pendingPhotos,
      isSyncing: _isSyncing,
      lastSyncTime: _lastSyncTime,
    );
  }

  void _emitSummary() {
    _getCurrentSummary().then((summary) {
      _summaryController?.add(summary);
    });
  }

  /// Build a Checkin model from a local database row.
  _CheckinMinimal _checkinRowToModel(LocalCheckin row) {
    return _CheckinMinimal(
      id: row.id,
      personeroId: row.personeroId,
      votingCenterId: row.votingCenterId,
      type: row.type,
      latitude: row.latitude,
      longitude: row.longitude,
      distanceMeters: row.distanceMeters,
      accuracy: row.accuracy,
      timestamp: row.timestamp,
    );
  }

  void dispose() {
    stopPeriodicSync();
    _summaryController?.close();
  }
}

/// Minimal checkin data for sync purposes.
class _CheckinMinimal {
  final String id;
  final String personeroId;
  final String votingCenterId;
  final String type;
  final double latitude;
  final double longitude;
  final double distanceMeters;
  final double? accuracy;
  final DateTime timestamp;

  _CheckinMinimal({
    required this.id,
    required this.personeroId,
    required this.votingCenterId,
    required this.type,
    required this.latitude,
    required this.longitude,
    required this.distanceMeters,
    this.accuracy,
    required this.timestamp,
  });
}

FILEEOF

mkdir -p "lib/data"
cat > 'lib/data/supabase_client.dart' << 'FILEEOF'
import '\''package:supabase_flutter/supabase_flutter.dart'\'';
import '\''../core/constants.dart'\'';

/// Singleton access to Supabase client instance.
class SupabaseClientManager {
  SupabaseClientManager._();

  static SupabaseClient get client => Supabase.instance.client;

  /// Initialize Supabase. Call once in main().
  static Future<void> initialize() async {
    await Supabase.initialize(
      url: AppConstants.supabaseUrl,
      anonKey: AppConstants.supabaseAnonKey,
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
      ),
    );
  }

  /// Shortcut accessors.
  static SupabaseQueryBuilder from(String table) => client.from(table);

  static SupabaseStorageClient get storage => client.storage;

  static FunctionsClient get functions => client.functions;

  /// Call an RPC function.
  static Future<dynamic> rpc(String functionName, {Map<String, dynamic>? params}) {
    return client.rpc(functionName, params: params ?? {});
  }
}

FILEEOF

mkdir -p "lib/data"
cat > 'lib/data/auth_repository.dart' << 'FILEEOF'
import '\''dart:convert'\'';
import '\''package:flutter_secure_storage/flutter_secure_storage.dart'\'';

import '\''../core/constants.dart'\'';
import '\''../domain/models/session.dart'\'';
import '\''../domain/models/voting_center.dart'\'';
import '\''supabase_client.dart'\'';

/// Authentication repository using DNI + 6-digit PIN via Supabase RPC.
class AuthRepository {
  final FlutterSecureStorage _secureStorage;

  AuthRepository({FlutterSecureStorage? secureStorage})
      : _secureStorage = secureStorage ?? const FlutterSecureStorage();

  /// Authenticate personero with DNI and 6-digit PIN.
  /// Calls verify_personero_pin RPC, then fetches centro coordinates.
  Future<PersoneroSession> login(String dni, String pin) async {
    if (dni.length != AppConstants.dniLength) {
      throw AuthException('\''El DNI debe tener ${AppConstants.dniLength} digitos'\'');
    }
    if (pin.length != AppConstants.pinLength) {
      throw AuthException('\''El PIN debe tener ${AppConstants.pinLength} digitos'\'');
    }

    // Call RPC to verify credentials
    final response = await SupabaseClientManager.rpc(
      AppConstants.verifyPersoneroPinRpc,
      params: {'\''p_dni'\'': dni, '\''p_pin'\'': pin},
    );

    if (response == null) {
      throw AuthException('\''DNI o PIN incorrectos'\'');
    }

    final data = response is String
        ? jsonDecode(response) as Map<String, dynamic>
        : response as Map<String, dynamic>;

    // Build initial session
    var session = PersoneroSession.fromJson({
      ...data,
      '\''login_time'\'': DateTime.now().toIso8601String(),
    });

    // Fetch voting center coordinates
    try {
      final centerData = await SupabaseClientManager.from(AppConstants.votingCentersTable)
          .select()
          .eq('\''id'\'', session.assignedVotingCenterId)
          .single();

      final votingCenter = VotingCenter.fromJson(centerData);
      session = session.copyWith(
        centroLatitude: votingCenter.latitude,
        centroLongitude: votingCenter.longitude,
      );
    } catch (e) {
      // Continue without coordinates - can be fetched later
    }

    // Persist session securely
    await _saveSession(session);

    return session;
  }

  /// Retrieve saved session from secure storage.
  Future<PersoneroSession?> getStoredSession() async {
    final jsonString = await _secureStorage.read(key: AppConstants.sessionKey);
    if (jsonString == null) return null;

    try {
      return PersoneroSession.fromJsonString(jsonString);
    } catch (e) {
      await _secureStorage.delete(key: AppConstants.sessionKey);
      return null;
    }
  }

  /// Log out and clear stored session.
  Future<void> logout() async {
    await _secureStorage.delete(key: AppConstants.sessionKey);
    await _secureStorage.delete(key: AppConstants.centroCoordinatesKey);
  }

  /// Check if a session exists.
  Future<bool> hasStoredSession() async {
    return await _secureStorage.containsKey(key: AppConstants.sessionKey);
  }

  Future<void> _saveSession(PersoneroSession session) async {
    await _secureStorage.write(
      key: AppConstants.sessionKey,
      value: session.toJsonString(),
    );
  }

  /// Update stored session (e.g., after fetching coordinates).
  Future<void> updateSession(PersoneroSession session) async {
    await _saveSession(session);
  }
}

/// Custom auth exception.
class AuthException implements Exception {
  final String message;
  const AuthException(this.message);

  @override
  String toString() => '\''AuthException: $message'\'';
}

FILEEOF

mkdir -p "lib/domain/providers"
cat > 'lib/domain/providers/auth_provider.dart' << 'FILEEOF'
import '\''package:flutter_riverpod/flutter_riverpod.dart'\'';

import '\''../../data/auth_repository.dart'\'';
import '\''../../data/local_database.dart'\'';
import '\''../models/session.dart'\'';

/// Provides the AuthRepository instance.
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository();
});

/// Provides the local database singleton.
final localDatabaseProvider = Provider<LocalDatabase>((ref) {
  final db = LocalDatabase();
  ref.onDispose(() => db.close());
  return db;
});

/// Manages the current authentication state.
/// null = not authenticated, PersoneroSession = authenticated.
final authStateProvider =
    StateNotifierProvider<AuthStateNotifier, AsyncValue<PersoneroSession?>>((ref) {
  return AuthStateNotifier(ref.read(authRepositoryProvider));
});

class AuthStateNotifier extends StateNotifier<AsyncValue<PersoneroSession?>> {
  final AuthRepository _authRepo;

  AuthStateNotifier(this._authRepo) : super(const AsyncValue.data(null)) {
    _loadStoredSession();
  }

  Future<void> _loadStoredSession() async {
    try {
      final session = await _authRepo.getStoredSession();
      state = AsyncValue.data(session);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Login with DNI and 6-digit PIN.
  Future<void> login(String dni, String pin) async {
    state = const AsyncValue.loading();
    try {
      final session = await _authRepo.login(dni, pin);
      state = AsyncValue.data(session);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  /// Logout and clear session.
  Future<void> logout() async {
    await _authRepo.logout();
    state = const AsyncValue.data(null);
  }

  /// Update the stored session (e.g., after fetching new coordinates).
  Future<void> updateSession(PersoneroSession session) async {
    await _authRepo.updateSession(session);
    state = AsyncValue.data(session);
  }
}

/// Convenience provider for current session (non-nullable when logged in).
final currentSessionProvider = Provider<PersoneroSession?>((ref) {
  return ref.watch(authStateProvider).valueOrNull;
});

/// Whether user is currently authenticated.
final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(currentSessionProvider) != null;
});

FILEEOF

mkdir -p "lib/domain/providers"
cat > 'lib/domain/providers/location_provider.dart' << 'FILEEOF'
import '\''package:flutter_riverpod/flutter_riverpod.dart'\'';
import '\''package:geolocator/geolocator.dart'\'';

import '\''../../core/constants.dart'\'';
import '\''../../data/checkin_repository.dart'\'';
import '\''../models/session.dart'\'';

/// Current device position.
class LocationState {
  final Position? position;
  final double? distanceToCenter;
  final bool isLoading;
  final String? error;
  final bool permissionGranted;

  const LocationState({
    this.position,
    this.distanceToCenter,
    this.isLoading = false,
    this.error,
    this.permissionGranted = false,
  });

  bool get isNearCenter =>
      distanceToCenter != null &&
      distanceToCenter! <= AppConstants.gpsToleranceMeters;

  bool get isWarningDistance =>
      distanceToCenter != null &&
      distanceToCenter! > AppConstants.gpsWarningMeters &&
      distanceToCenter! <= AppConstants.gpsToleranceMeters;

  bool get isFarFromCenter =>
      distanceToCenter != null &&
      distanceToCenter! > AppConstants.gpsToleranceMeters;

  LocationState copyWith({
    Position? position,
    double? distanceToCenter,
    bool? isLoading,
    String? error,
    bool? permissionGranted,
  }) {
    return LocationState(
      position: position ?? this.position,
      distanceToCenter: distanceToCenter ?? this.distanceToCenter,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      permissionGranted: permissionGranted ?? this.permissionGranted,
    );
  }
}

/// Manages GPS location state and distance calculations.
final locationProvider =
    StateNotifierProvider<LocationNotifier, LocationState>((ref) {
  return LocationNotifier();
});

class LocationNotifier extends StateNotifier<LocationState> {
  LocationNotifier() : super(const LocationState());

  /// Check and request location permissions.
  Future<bool> checkPermissions() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      state = state.copyWith(
        error: '\''Los servicios de ubicacion estan desactivados. '\''
            '\''Por favor activalos en la configuracion.'\'',
        permissionGranted: false,
      );
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        state = state.copyWith(
          error: '\''Se requiere permiso de ubicacion para el check-in.'\'',
          permissionGranted: false,
        );
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      state = state.copyWith(
        error: '\''Los permisos de ubicacion estan permanentemente denegados. '\''
            '\''Ve a Configuracion para habilitarlos.'\'',
        permissionGranted: false,
      );
      return false;
    }

    state = state.copyWith(permissionGranted: true, error: null);
    return true;
  }

  /// Get current position and calculate distance to voting center.
  Future<Position?> getCurrentPosition({PersoneroSession? session}) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final hasPermission = await checkPermissions();
      if (!hasPermission) {
        state = state.copyWith(isLoading: false);
        return null;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: AppConstants.gpsTimeoutSeconds),
        ),
      );

      double? distance;
      if (session != null && session.hasCoordinates) {
        distance = CheckinRepository.haversineDistance(
          position.latitude,
          position.longitude,
          session.centroLatitude!,
          session.centroLongitude!,
        );
      }

      state = state.copyWith(
        position: position,
        distanceToCenter: distance,
        isLoading: false,
        error: null,
      );

      return position;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: '\''Error obteniendo ubicacion: ${e.toString()}'\'',
      );
      return null;
    }
  }

  /// Clear location state.
  void clear() {
    state = const LocationState();
  }
}

FILEEOF

mkdir -p "lib/domain/providers"
cat > 'lib/domain/providers/sync_provider.dart' << 'FILEEOF'
import '\''dart:async'\'';

import '\''package:connectivity_plus/connectivity_plus.dart'\'';
import '\''package:flutter_riverpod/flutter_riverpod.dart'\'';

import '\''../../data/sync_service.dart'\'';
import '\''auth_provider.dart'\'';
import '\''checkin_provider.dart'\'';
import '\''acta_provider.dart'\'';

/// Connectivity state provider.
final connectivityProvider = StreamProvider<List<ConnectivityResult>>((ref) {
  return Connectivity().onConnectivityChanged;
});

/// Whether the device is currently online.
final isOnlineProvider = Provider<bool>((ref) {
  final connectivity = ref.watch(connectivityProvider);
  return connectivity.when(
    data: (results) => results.any((r) => r != ConnectivityResult.none),
    loading: () => true,
    error: (_, __) => false,
  );
});

/// Provides the SyncService singleton.
final syncServiceProvider = Provider<SyncService>((ref) {
  final db = ref.read(localDatabaseProvider);
  final checkinRepo = ref.read(checkinRepositoryProvider);
  final actaRepo = ref.read(actaRepositoryProvider);

  final service = SyncService(
    db: db,
    checkinRepo: checkinRepo,
    actaRepo: actaRepo,
  );

  ref.onDispose(() => service.dispose());
  return service;
});

/// Sync summary stream.
final syncSummaryStreamProvider = StreamProvider<SyncSummary>((ref) {
  final service = ref.read(syncServiceProvider);
  return service.summaryStream;
});

/// Manages overall sync state.
final syncStateProvider =
    StateNotifierProvider<SyncStateNotifier, SyncState>((ref) {
  return SyncStateNotifier(ref);
});

class SyncState {
  final bool isSyncing;
  final int pendingCount;
  final DateTime? lastSyncTime;
  final String? lastError;

  const SyncState({
    this.isSyncing = false,
    this.pendingCount = 0,
    this.lastSyncTime,
    this.lastError,
  });

  SyncState copyWith({
    bool? isSyncing,
    int? pendingCount,
    DateTime? lastSyncTime,
    String? lastError,
  }) {
    return SyncState(
      isSyncing: isSyncing ?? this.isSyncing,
      pendingCount: pendingCount ?? this.pendingCount,
      lastSyncTime: lastSyncTime ?? this.lastSyncTime,
      lastError: lastError,
    );
  }
}

class SyncStateNotifier extends StateNotifier<SyncState> {
  final Ref _ref;
  StreamSubscription? _syncSub;

  SyncStateNotifier(this._ref) : super(const SyncState()) {
    _init();
  }

  void _init() {
    final service = _ref.read(syncServiceProvider);

    // Listen to sync summary updates
    _syncSub = service.summaryStream.listen((summary) {
      state = state.copyWith(
        isSyncing: summary.isSyncing,
        pendingCount: summary.totalPending,
        lastSyncTime: summary.lastSyncTime,
      );
    });

    // Start periodic sync
    service.startPeriodicSync();
  }

  /// Trigger an immediate sync.
  Future<void> syncNow() async {
    state = state.copyWith(isSyncing: true);
    try {
      final service = _ref.read(syncServiceProvider);
      final summary = await service.syncAll();
      state = state.copyWith(
        isSyncing: false,
        pendingCount: summary.totalPending,
        lastSyncTime: summary.lastSyncTime,
        lastError: null,
      );
    } catch (e) {
      state = state.copyWith(
        isSyncing: false,
        lastError: e.toString(),
      );
    }
  }

  @override
  void dispose() {
    _syncSub?.cancel();
    super.dispose();
  }
}

FILEEOF

mkdir -p "lib/domain/providers"
cat > 'lib/domain/providers/acta_provider.dart' << 'FILEEOF'
import '\''package:flutter_riverpod/flutter_riverpod.dart'\'';

import '\''../../data/acta_repository.dart'\'';
import '\''../models/acta.dart'\'';
import '\''../models/session.dart'\'';
import '\''auth_provider.dart'\'';

/// Provides the ActaRepository.
final actaRepositoryProvider = Provider<ActaRepository>((ref) {
  final db = ref.read(localDatabaseProvider);
  return ActaRepository(db);
});

/// List of all local actas.
final actasListProvider = FutureProvider<List<Acta>>((ref) async {
  final repo = ref.read(actaRepositoryProvider);
  return repo.getAllActas();
});

/// Photos for a specific acta.
final actaPhotosProvider =
    FutureProvider.family<List<ActaPhoto>, String>((ref, actaId) async {
  final repo = ref.read(actaRepositoryProvider);
  return repo.getPhotosForActa(actaId);
});

/// Notifier for creating and managing actas.
final actaFormProvider =
    StateNotifierProvider<ActaFormNotifier, ActaFormState>((ref) {
  return ActaFormNotifier(ref);
});

class ActaFormState {
  final String mesaNumber;
  final List<PartyResult> topResults;
  final int? totalVotes;
  final int? blankVotes;
  final int? nullVotes;
  final String? observations;
  final List<String> photoPaths;
  final bool isSubmitting;
  final String? error;
  final Acta? savedActa;

  const ActaFormState({
    this.mesaNumber = '\'''\'',
    this.topResults = const [],
    this.totalVotes,
    this.blankVotes,
    this.nullVotes,
    this.observations,
    this.photoPaths = const [],
    this.isSubmitting = false,
    this.error,
    this.savedActa,
  });

  ActaFormState copyWith({
    String? mesaNumber,
    List<PartyResult>? topResults,
    int? totalVotes,
    int? blankVotes,
    int? nullVotes,
    String? observations,
    List<String>? photoPaths,
    bool? isSubmitting,
    String? error,
    Acta? savedActa,
  }) {
    return ActaFormState(
      mesaNumber: mesaNumber ?? this.mesaNumber,
      topResults: topResults ?? this.topResults,
      totalVotes: totalVotes ?? this.totalVotes,
      blankVotes: blankVotes ?? this.blankVotes,
      nullVotes: nullVotes ?? this.nullVotes,
      observations: observations ?? this.observations,
      photoPaths: photoPaths ?? this.photoPaths,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: error,
      savedActa: savedActa ?? this.savedActa,
    );
  }
}

class ActaFormNotifier extends StateNotifier<ActaFormState> {
  final Ref _ref;

  ActaFormNotifier(this._ref) : super(const ActaFormState());

  void setMesaNumber(String value) {
    state = state.copyWith(mesaNumber: value);
  }

  void updatePartyResult(int index, String partyName, int votes) {
    final results = List<PartyResult>.from(state.topResults);
    if (index < results.length) {
      results[index] = PartyResult(partyName: partyName, votes: votes);
    } else {
      results.add(PartyResult(partyName: partyName, votes: votes));
    }
    state = state.copyWith(topResults: results);
  }

  void removePartyResult(int index) {
    final results = List<PartyResult>.from(state.topResults);
    if (index < results.length) {
      results.removeAt(index);
      state = state.copyWith(topResults: results);
    }
  }

  void setTotalVotes(int? value) => state = state.copyWith(totalVotes: value);
  void setBlankVotes(int? value) => state = state.copyWith(blankVotes: value);
  void setNullVotes(int? value) => state = state.copyWith(nullVotes: value);
  void setObservations(String? value) =>
      state = state.copyWith(observations: value);

  void addPhotoPath(String path) {
    state = state.copyWith(photoPaths: [...state.photoPaths, path]);
  }

  void removePhotoPath(int index) {
    final paths = List<String>.from(state.photoPaths);
    if (index < paths.length) {
      paths.removeAt(index);
      state = state.copyWith(photoPaths: paths);
    }
  }

  /// Save the acta locally with all photos.
  Future<Acta?> submit() async {
    final session = _ref.read(currentSessionProvider);
    if (session == null) {
      state = state.copyWith(error: '\''No hay sesion activa'\'');
      return null;
    }

    if (state.mesaNumber.isEmpty) {
      state = state.copyWith(error: '\''Ingrese el numero de mesa'\'');
      return null;
    }

    if (state.photoPaths.isEmpty) {
      state = state.copyWith(error: '\''Debe tomar al menos una foto del acta'\'');
      return null;
    }

    state = state.copyWith(isSubmitting: true, error: null);

    try {
      final repo = _ref.read(actaRepositoryProvider);

      // Create the acta
      final acta = await repo.createActa(
        session: session,
        mesaNumber: state.mesaNumber,
        topResults: state.topResults,
        totalVotes: state.totalVotes,
        blankVotes: state.blankVotes,
        nullVotes: state.nullVotes,
        observations: state.observations,
      );

      // Add photos
      for (final path in state.photoPaths) {
        await repo.addPhoto(actaId: acta.id, sourcePath: path);
      }

      state = state.copyWith(isSubmitting: false, savedActa: acta);

      // Refresh acta list
      _ref.invalidate(actasListProvider);

      return acta;
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        error: '\''Error guardando acta: ${e.toString()}'\'',
      );
      return null;
    }
  }

  /// Reset the form.
  void reset() {
    state = const ActaFormState();
  }
}

FILEEOF

mkdir -p "lib/domain/providers"
cat > 'lib/domain/providers/checkin_provider.dart' << 'FILEEOF'
import '\''package:flutter_riverpod/flutter_riverpod.dart'\'';

import '\''../../data/checkin_repository.dart'\'';
import '\''../../data/local_database.dart'\'';
import '\''../models/checkin.dart'\'';
import '\''../models/session.dart'\'';
import '\''auth_provider.dart'\'';

/// Provides the CheckinRepository.
final checkinRepositoryProvider = Provider<CheckinRepository>((ref) {
  final db = ref.read(localDatabaseProvider);
  return CheckinRepository(db);
});

/// Current check-in status for the logged-in personero.
final checkinStatusProvider = FutureProvider<bool>((ref) async {
  final session = ref.watch(currentSessionProvider);
  if (session == null) return false;

  final repo = ref.read(checkinRepositoryProvider);
  return repo.isCheckedIn(session.personeroId);
});

/// List of all local check-ins.
final checkinsListProvider = FutureProvider<List<Checkin>>((ref) async {
  final repo = ref.read(checkinRepositoryProvider);
  return repo.getCheckins();
});

/// Latest check-in for the current personero.
final latestCheckinProvider = FutureProvider<Checkin?>((ref) async {
  final session = ref.watch(currentSessionProvider);
  if (session == null) return null;

  final repo = ref.read(checkinRepositoryProvider);
  return repo.getLatestCheckin(session.personeroId);
});

/// Notifier for performing check-in/checkout actions.
final checkinActionProvider =
    StateNotifierProvider<CheckinActionNotifier, AsyncValue<Checkin?>>((ref) {
  return CheckinActionNotifier(ref);
});

class CheckinActionNotifier extends StateNotifier<AsyncValue<Checkin?>> {
  final Ref _ref;

  CheckinActionNotifier(this._ref) : super(const AsyncValue.data(null));

  Future<Checkin?> performCheckin({
    required double latitude,
    required double longitude,
    double? accuracy,
  }) async {
    final session = _ref.read(currentSessionProvider);
    if (session == null) {
      state = AsyncValue.error(
        Exception('\''No hay sesion activa'\''),
        StackTrace.current,
      );
      return null;
    }

    state = const AsyncValue.loading();

    try {
      final repo = _ref.read(checkinRepositoryProvider);
      final checkin = await repo.performCheckin(
        session: session,
        latitude: latitude,
        longitude: longitude,
        accuracy: accuracy,
      );

      state = AsyncValue.data(checkin);

      // Refresh related providers
      _ref.invalidate(checkinStatusProvider);
      _ref.invalidate(checkinsListProvider);
      _ref.invalidate(latestCheckinProvider);

      return checkin;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return null;
    }
  }

  Future<Checkin?> performCheckout({
    required double latitude,
    required double longitude,
    double? accuracy,
  }) async {
    final session = _ref.read(currentSessionProvider);
    if (session == null) {
      state = AsyncValue.error(
        Exception('\''No hay sesion activa'\''),
        StackTrace.current,
      );
      return null;
    }

    state = const AsyncValue.loading();

    try {
      final repo = _ref.read(checkinRepositoryProvider);
      final checkin = await repo.performCheckout(
        session: session,
        latitude: latitude,
        longitude: longitude,
        accuracy: accuracy,
      );

      state = AsyncValue.data(checkin);

      _ref.invalidate(checkinStatusProvider);
      _ref.invalidate(checkinsListProvider);
      _ref.invalidate(latestCheckinProvider);

      return checkin;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return null;
    }
  }
}

FILEEOF

mkdir -p "lib/domain/models"
cat > 'lib/domain/models/voting_center.dart' << 'FILEEOF'
/// Voting center (centro de votacion) model.
class VotingCenter {
  final String id;
  final String name;
  final String address;
  final String? district;
  final String? province;
  final String? department;
  final double latitude;
  final double longitude;
  final int? totalMesas;
  final String? tenantId;

  const VotingCenter({
    required this.id,
    required this.name,
    required this.address,
    this.district,
    this.province,
    this.department,
    required this.latitude,
    required this.longitude,
    this.totalMesas,
    this.tenantId,
  });

  factory VotingCenter.fromJson(Map<String, dynamic> json) {
    return VotingCenter(
      id: json['\''id'\''] as String,
      name: json['\''name'\''] as String,
      address: json['\''address'\''] as String? ?? '\'''\'',
      district: json['\''district'\''] as String?,
      province: json['\''province'\''] as String?,
      department: json['\''department'\''] as String?,
      latitude: (json['\''latitude'\''] as num).toDouble(),
      longitude: (json['\''longitude'\''] as num).toDouble(),
      totalMesas: json['\''total_mesas'\''] as int?,
      tenantId: json['\''tenant_id'\''] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        '\''id'\'': id,
        '\''name'\'': name,
        '\''address'\'': address,
        '\''district'\'': district,
        '\''province'\'': province,
        '\''department'\'': department,
        '\''latitude'\'': latitude,
        '\''longitude'\'': longitude,
        '\''total_mesas'\'': totalMesas,
        '\''tenant_id'\'': tenantId,
      };

  String get fullLocation {
    final parts = [district, province, department].where((p) => p != null && p.isNotEmpty);
    return parts.join('\'', '\'');
  }
}

FILEEOF

mkdir -p "lib/domain/models"
cat > 'lib/domain/models/checkin.dart' << 'FILEEOF'
/// Check-in / check-out record for a personero at a voting center.
enum CheckinType { checkin, checkout }

enum SyncStatus { pending, syncing, synced, error }

class Checkin {
  final String id;
  final String personeroId;
  final String votingCenterId;
  final CheckinType type;
  final double latitude;
  final double longitude;
  final double distanceMeters;
  final double? accuracy;
  final DateTime timestamp;
  final SyncStatus syncStatus;
  final String? remoteId;
  final String? errorMessage;

  const Checkin({
    required this.id,
    required this.personeroId,
    required this.votingCenterId,
    required this.type,
    required this.latitude,
    required this.longitude,
    required this.distanceMeters,
    this.accuracy,
    required this.timestamp,
    this.syncStatus = SyncStatus.pending,
    this.remoteId,
    this.errorMessage,
  });

  factory Checkin.fromJson(Map<String, dynamic> json) {
    return Checkin(
      id: json['\''id'\''] as String,
      personeroId: json['\''personero_id'\''] as String,
      votingCenterId: json['\''voting_center_id'\''] as String,
      type: json['\''type'\''] == '\''checkout'\'' ? CheckinType.checkout : CheckinType.checkin,
      latitude: (json['\''latitude'\''] as num).toDouble(),
      longitude: (json['\''longitude'\''] as num).toDouble(),
      distanceMeters: (json['\''distance_meters'\''] as num).toDouble(),
      accuracy: (json['\''accuracy'\''] as num?)?.toDouble(),
      timestamp: DateTime.parse(json['\''timestamp'\''] as String),
      syncStatus: SyncStatus.values.firstWhere(
        (e) => e.name == (json['\''sync_status'\''] as String? ?? '\''pending'\''),
        orElse: () => SyncStatus.pending,
      ),
      remoteId: json['\''remote_id'\''] as String?,
      errorMessage: json['\''error_message'\''] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '\''id'\'': id,
      '\''personero_id'\'': personeroId,
      '\''voting_center_id'\'': votingCenterId,
      '\''type'\'': type.name,
      '\''latitude'\'': latitude,
      '\''longitude'\'': longitude,
      '\''distance_meters'\'': distanceMeters,
      '\''accuracy'\'': accuracy,
      '\''timestamp'\'': timestamp.toIso8601String(),
      '\''sync_status'\'': syncStatus.name,
      '\''remote_id'\'': remoteId,
      '\''error_message'\'': errorMessage,
    };
  }

  /// JSON payload for Supabase insert (excludes local-only fields).
  Map<String, dynamic> toRemoteJson() {
    return {
      '\''personero_id'\'': personeroId,
      '\''voting_center_id'\'': votingCenterId,
      '\''type'\'': type.name,
      '\''latitude'\'': latitude,
      '\''longitude'\'': longitude,
      '\''distance_meters'\'': distanceMeters,
      '\''accuracy'\'': accuracy,
      '\''timestamp'\'': timestamp.toIso8601String(),
    };
  }

  Checkin copyWith({SyncStatus? syncStatus, String? remoteId, String? errorMessage}) {
    return Checkin(
      id: id,
      personeroId: personeroId,
      votingCenterId: votingCenterId,
      type: type,
      latitude: latitude,
      longitude: longitude,
      distanceMeters: distanceMeters,
      accuracy: accuracy,
      timestamp: timestamp,
      syncStatus: syncStatus ?? this.syncStatus,
      remoteId: remoteId ?? this.remoteId,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

FILEEOF

mkdir -p "lib/domain/models"
cat > 'lib/domain/models/acta.dart' << 'FILEEOF'
import '\''checkin.dart'\'';

/// A single party result entry on an acta.
class PartyResult {
  final String partyName;
  final int votes;

  const PartyResult({required this.partyName, required this.votes});

  factory PartyResult.fromJson(Map<String, dynamic> json) {
    return PartyResult(
      partyName: json['\''party_name'\''] as String,
      votes: json['\''votes'\''] as int,
    );
  }

  Map<String, dynamic> toJson() => {
        '\''party_name'\'': partyName,
        '\''votes'\'': votes,
      };
}

/// Photo attached to an acta.
class ActaPhoto {
  final String id;
  final String actaId;
  final String localPath;
  final String? remoteUrl;
  final SyncStatus syncStatus;
  final DateTime createdAt;

  const ActaPhoto({
    required this.id,
    required this.actaId,
    required this.localPath,
    this.remoteUrl,
    this.syncStatus = SyncStatus.pending,
    required this.createdAt,
  });

  factory ActaPhoto.fromJson(Map<String, dynamic> json) {
    return ActaPhoto(
      id: json['\''id'\''] as String,
      actaId: json['\''acta_id'\''] as String,
      localPath: json['\''local_path'\''] as String,
      remoteUrl: json['\''remote_url'\''] as String?,
      syncStatus: SyncStatus.values.firstWhere(
        (e) => e.name == (json['\''sync_status'\''] as String? ?? '\''pending'\''),
        orElse: () => SyncStatus.pending,
      ),
      createdAt: DateTime.parse(json['\''created_at'\''] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        '\''id'\'': id,
        '\''acta_id'\'': actaId,
        '\''local_path'\'': localPath,
        '\''remote_url'\'': remoteUrl,
        '\''sync_status'\'': syncStatus.name,
        '\''created_at'\'': createdAt.toIso8601String(),
      };

  ActaPhoto copyWith({String? remoteUrl, SyncStatus? syncStatus}) {
    return ActaPhoto(
      id: id,
      actaId: actaId,
      localPath: localPath,
      remoteUrl: remoteUrl ?? this.remoteUrl,
      syncStatus: syncStatus ?? this.syncStatus,
      createdAt: createdAt,
    );
  }
}

/// Acta (tally sheet) record from a specific mesa.
class Acta {
  final String id;
  final String personeroId;
  final String votingCenterId;
  final String mesaNumber;
  final List<PartyResult> topResults;
  final int? totalVotes;
  final int? blankVotes;
  final int? nullVotes;
  final String? observations;
  final List<ActaPhoto> photos;
  final SyncStatus syncStatus;
  final String? remoteId;
  final bool aiProcessed;
  final String? aiStatus;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Acta({
    required this.id,
    required this.personeroId,
    required this.votingCenterId,
    required this.mesaNumber,
    this.topResults = const [],
    this.totalVotes,
    this.blankVotes,
    this.nullVotes,
    this.observations,
    this.photos = const [],
    this.syncStatus = SyncStatus.pending,
    this.remoteId,
    this.aiProcessed = false,
    this.aiStatus,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Acta.fromJson(Map<String, dynamic> json) {
    return Acta(
      id: json['\''id'\''] as String,
      personeroId: json['\''personero_id'\''] as String,
      votingCenterId: json['\''voting_center_id'\''] as String,
      mesaNumber: json['\''mesa_number'\''] as String,
      topResults: (json['\''top_results'\''] as List<dynamic>?)
              ?.map((e) => PartyResult.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      totalVotes: json['\''total_votes'\''] as int?,
      blankVotes: json['\''blank_votes'\''] as int?,
      nullVotes: json['\''null_votes'\''] as int?,
      observations: json['\''observations'\''] as String?,
      photos: (json['\''photos'\''] as List<dynamic>?)
              ?.map((e) => ActaPhoto.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      syncStatus: SyncStatus.values.firstWhere(
        (e) => e.name == (json['\''sync_status'\''] as String? ?? '\''pending'\''),
        orElse: () => SyncStatus.pending,
      ),
      remoteId: json['\''remote_id'\''] as String?,
      aiProcessed: json['\''ai_processed'\''] as bool? ?? false,
      aiStatus: json['\''ai_status'\''] as String?,
      createdAt: DateTime.parse(json['\''created_at'\''] as String),
      updatedAt: DateTime.parse(json['\''updated_at'\''] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        '\''id'\'': id,
        '\''personero_id'\'': personeroId,
        '\''voting_center_id'\'': votingCenterId,
        '\''mesa_number'\'': mesaNumber,
        '\''top_results'\'': topResults.map((e) => e.toJson()).toList(),
        '\''total_votes'\'': totalVotes,
        '\''blank_votes'\'': blankVotes,
        '\''null_votes'\'': nullVotes,
        '\''observations'\'': observations,
        '\''photos'\'': photos.map((e) => e.toJson()).toList(),
        '\''sync_status'\'': syncStatus.name,
        '\''remote_id'\'': remoteId,
        '\''ai_processed'\'': aiProcessed,
        '\''ai_status'\'': aiStatus,
        '\''created_at'\'': createdAt.toIso8601String(),
        '\''updated_at'\'': updatedAt.toIso8601String(),
      };

  Map<String, dynamic> toRemoteJson() => {
        '\''personero_id'\'': personeroId,
        '\''voting_center_id'\'': votingCenterId,
        '\''mesa_number'\'': mesaNumber,
        '\''top_results'\'': topResults.map((e) => e.toJson()).toList(),
        '\''total_votes'\'': totalVotes,
        '\''blank_votes'\'': blankVotes,
        '\''null_votes'\'': nullVotes,
        '\''observations'\'': observations,
        '\''created_at'\'': createdAt.toIso8601String(),
      };

  Acta copyWith({
    List<PartyResult>? topResults,
    int? totalVotes,
    int? blankVotes,
    int? nullVotes,
    String? observations,
    List<ActaPhoto>? photos,
    SyncStatus? syncStatus,
    String? remoteId,
    bool? aiProcessed,
    String? aiStatus,
  }) {
    return Acta(
      id: id,
      personeroId: personeroId,
      votingCenterId: votingCenterId,
      mesaNumber: mesaNumber,
      topResults: topResults ?? this.topResults,
      totalVotes: totalVotes ?? this.totalVotes,
      blankVotes: blankVotes ?? this.blankVotes,
      nullVotes: nullVotes ?? this.nullVotes,
      observations: observations ?? this.observations,
      photos: photos ?? this.photos,
      syncStatus: syncStatus ?? this.syncStatus,
      remoteId: remoteId ?? this.remoteId,
      aiProcessed: aiProcessed ?? this.aiProcessed,
      aiStatus: aiStatus ?? this.aiStatus,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
    );
  }
}

FILEEOF

mkdir -p "lib/domain/models"
cat > 'lib/domain/models/session.dart' << 'FILEEOF'
import '\''dart:convert'\'';

/// Authenticated personero session data.
class PersoneroSession {
  final String personeroId;
  final String fullName;
  final String role;
  final String assignedCentro;
  final String? assignedMesa;
  final String assignedVotingCenterId;
  final double? centroLatitude;
  final double? centroLongitude;
  final String? tenantId;
  final DateTime loginTime;

  const PersoneroSession({
    required this.personeroId,
    required this.fullName,
    required this.role,
    required this.assignedCentro,
    this.assignedMesa,
    required this.assignedVotingCenterId,
    this.centroLatitude,
    this.centroLongitude,
    this.tenantId,
    required this.loginTime,
  });

  factory PersoneroSession.fromJson(Map<String, dynamic> json) {
    return PersoneroSession(
      personeroId: json['\''personero_id'\''] as String,
      fullName: json['\''full_name'\''] as String,
      role: json['\''role'\''] as String? ?? '\''personero'\'',
      assignedCentro: json['\''assigned_centro'\''] as String,
      assignedMesa: json['\''assigned_mesa'\''] as String?,
      assignedVotingCenterId: json['\''assigned_voting_center_id'\''] as String,
      centroLatitude: (json['\''centro_latitude'\''] as num?)?.toDouble(),
      centroLongitude: (json['\''centro_longitude'\''] as num?)?.toDouble(),
      tenantId: json['\''tenant_id'\''] as String?,
      loginTime: json['\''login_time'\''] != null
          ? DateTime.parse(json['\''login_time'\''] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '\''personero_id'\'': personeroId,
      '\''full_name'\'': fullName,
      '\''role'\'': role,
      '\''assigned_centro'\'': assignedCentro,
      '\''assigned_mesa'\'': assignedMesa,
      '\''assigned_voting_center_id'\'': assignedVotingCenterId,
      '\''centro_latitude'\'': centroLatitude,
      '\''centro_longitude'\'': centroLongitude,
      '\''tenant_id'\'': tenantId,
      '\''login_time'\'': loginTime.toIso8601String(),
    };
  }

  String toJsonString() => jsonEncode(toJson());

  factory PersoneroSession.fromJsonString(String jsonString) {
    return PersoneroSession.fromJson(
      jsonDecode(jsonString) as Map<String, dynamic>,
    );
  }

  PersoneroSession copyWith({
    double? centroLatitude,
    double? centroLongitude,
  }) {
    return PersoneroSession(
      personeroId: personeroId,
      fullName: fullName,
      role: role,
      assignedCentro: assignedCentro,
      assignedMesa: assignedMesa,
      assignedVotingCenterId: assignedVotingCenterId,
      centroLatitude: centroLatitude ?? this.centroLatitude,
      centroLongitude: centroLongitude ?? this.centroLongitude,
      tenantId: tenantId,
      loginTime: loginTime,
    );
  }

  bool get hasCoordinates => centroLatitude != null && centroLongitude != null;
}

FILEEOF

mkdir -p "lib/core"
cat > 'lib/core/router.dart' << 'FILEEOF'
import '\''package:flutter/material.dart'\'';
import '\''package:flutter_riverpod/flutter_riverpod.dart'\'';
import '\''package:go_router/go_router.dart'\'';

import '\''../domain/providers/auth_provider.dart'\'';
import '\''../presentation/screens/splash_screen.dart'\'';
import '\''../presentation/screens/login_screen.dart'\'';
import '\''../presentation/screens/dashboard_screen.dart'\'';
import '\''../presentation/screens/checkin_screen.dart'\'';
import '\''../presentation/screens/acta_list_screen.dart'\'';
import '\''../presentation/screens/acta_upload_screen.dart'\'';
import '\''../presentation/screens/incidents_screen.dart'\'';

/// Route paths used throughout the app.
class RoutePaths {
  RoutePaths._();

  static const String splash = '\''/'\'';
  static const String login = '\''/login'\'';
  static const String dashboard = '\''/dashboard'\'';
  static const String checkin = '\''/checkin'\'';
  static const String actaList = '\''/actas'\'';
  static const String actaUpload = '\''/actas/upload'\'';
  static const String incidents = '\''/incidents'\'';
}

/// GoRouter provider with authentication guard.
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: RoutePaths.splash,
    debugLogDiagnostics: true,
    redirect: (BuildContext context, GoRouterState state) {
      final isLoggedIn = authState.valueOrNull != null;
      final isGoingToLogin = state.matchedLocation == RoutePaths.login;
      final isGoingToSplash = state.matchedLocation == RoutePaths.splash;

      // Allow splash screen always
      if (isGoingToSplash) return null;

      // Not logged in and not going to login -> redirect to login
      if (!isLoggedIn && !isGoingToLogin) {
        return RoutePaths.login;
      }

      // Logged in and going to login -> redirect to dashboard
      if (isLoggedIn && isGoingToLogin) {
        return RoutePaths.dashboard;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: RoutePaths.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: RoutePaths.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: RoutePaths.dashboard,
        builder: (context, state) => const DashboardScreen(),
      ),
      GoRoute(
        path: RoutePaths.checkin,
        builder: (context, state) => const CheckinScreen(),
      ),
      GoRoute(
        path: RoutePaths.actaList,
        builder: (context, state) => const ActaListScreen(),
      ),
      GoRoute(
        path: RoutePaths.actaUpload,
        builder: (context, state) => const ActaUploadScreen(),
      ),
      GoRoute(
        path: RoutePaths.incidents,
        builder: (context, state) => const IncidentsScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              '\''Pagina no encontrada'\'',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text('\''Ruta: ${state.matchedLocation}'\''),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.go(RoutePaths.dashboard),
              child: const Text('\''Volver al inicio'\''),
            ),
          ],
        ),
      ),
    ),
  );
});

FILEEOF

mkdir -p "lib/core"
cat > 'lib/core/constants.dart' << 'FILEEOF'
/// Application-wide constants for Guardian Electoral Mobile.
class AppConstants {
  AppConstants._();

  // Supabase configuration - replace with actual values
  static const String supabaseUrl = '\''https://YOUR_PROJECT.supabase.co'\'';
  static const String supabaseAnonKey = '\''YOUR_ANON_KEY'\'';

  // GPS / Geofencing
  static const double gpsToleranceMeters = 500.0;
  static const double gpsWarningMeters = 300.0;
  static const int gpsTimeoutSeconds = 15;
  static const double gpsDesiredAccuracyMeters = 50.0;

  // Authentication
  static const int pinLength = 6;
  static const int dniLength = 8;
  static const String sessionKey = '\''guardian_session'\'';
  static const String centroCoordinatesKey = '\''centro_coordinates'\'';

  // Sync
  static const int syncIntervalSeconds = 30;
  static const int maxRetryAttempts = 5;
  static const int imageMaxWidthPx = 1920;
  static const int imageQuality = 80;

  // Supabase Storage
  static const String actaPhotoBucket = '\''acta-photos'\'';

  // RPC function names
  static const String verifyPersoneroPinRpc = '\''verify_personero_pin'\'';

  // Table names
  static const String votingCentersTable = '\''voting_centers'\'';
  static const String checkinsTable = '\''checkins'\'';
  static const String actasTable = '\''actas'\'';
  static const String actaPhotosTable = '\''acta_photos'\'';
  static const String incidentsTable = '\''incidents'\'';

  // App info
  static const String appName = '\''Guardian Electoral'\'';
  static const String appVersion = '\''1.0.0'\'';
  static const String electionYear = '\''2026'\'';
}

FILEEOF

mkdir -p "lib/core"
cat > 'lib/core/theme.dart' << 'FILEEOF'
import '\''package:flutter/material.dart'\'';

/// Guardian Electoral app theme - mobile-first design.
class GuardianTheme {
  GuardianTheme._();

  // Brand colors
  static const Color primaryBlue = Color(0xFF1565C0);
  static const Color primaryDark = Color(0xFF0D47A1);
  static const Color primaryLight = Color(0xFF42A5F5);
  static const Color accentGold = Color(0xFFFFB300);
  static const Color successGreen = Color(0xFF2E7D32);
  static const Color warningAmber = Color(0xFFF57F17);
  static const Color errorRed = Color(0xFFC62828);
  static const Color backgroundLight = Color(0xFFF5F7FA);
  static const Color surfaceWhite = Color(0xFFFFFFFF);
  static const Color textPrimary = Color(0xFF212121);
  static const Color textSecondary = Color(0xFF757575);
  static const Color dividerColor = Color(0xFFE0E0E0);

  // Sync status colors
  static const Color syncPending = Color(0xFFFFA726);
  static const Color syncInProgress = Color(0xFF42A5F5);
  static const Color syncComplete = Color(0xFF66BB6A);
  static const Color syncError = Color(0xFFEF5350);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryBlue,
        primary: primaryBlue,
        secondary: accentGold,
        error: errorRed,
        surface: surfaceWhite,
        brightness: Brightness.light,
      ),
      scaffoldBackgroundColor: backgroundLight,
      appBarTheme: const AppBarTheme(
        backgroundColor: primaryBlue,
        foregroundColor: Colors.white,
        elevation: 2,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryBlue,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primaryBlue,
          minimumSize: const Size(double.infinity, 56),
          side: const BorderSide(color: primaryBlue, width: 2),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: dividerColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: dividerColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primaryBlue, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: errorRed),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        labelStyle: const TextStyle(color: textSecondary),
      ),
      cardTheme: CardTheme(
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: primaryBlue,
        foregroundColor: Colors.white,
        elevation: 4,
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.white,
        selectedItemColor: primaryBlue,
        unselectedItemColor: textSecondary,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
      dividerTheme: const DividerThemeData(
        color: dividerColor,
        thickness: 1,
      ),
    );
  }
}

FILEEOF

echo "✅ Project setup complete! 31 files created."
echo "Next: flutter pub get && dart run build_runner build"
