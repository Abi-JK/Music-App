import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>SoundAura</Text>
            <Text style={styles.settingValue}>Free Music App</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featureItem}>
            <Ionicons name="musical-notes" size={24} color="#1DB954" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>All Languages</Text>
              <Text style={styles.featureDescription}>Tamil, Hindi, English, Telugu & more</Text>
            </View>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="heart" size={24} color="#1DB954" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Liked Songs</Text>
              <Text style={styles.featureDescription}>Save your favorites permanently</Text>
            </View>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="download" size={24} color="#1DB954" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Offline Downloads</Text>
              <Text style={styles.featureDescription}>Listen without internet</Text>
            </View>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="document-text" size={24} color="#1DB954" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Lyrics</Text>
              <Text style={styles.featureDescription}>View song lyrics</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.privacyItem}>
            <Ionicons name="shield-checkmark" size={24} color="#1DB954" />
            <View style={styles.privacyText}>
              <Text style={styles.privacyTitle}>No Login Required</Text>
              <Text style={styles.privacyDescription}>Your data stays on your device</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1DB954',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  settingLabel: {
    color: '#fff',
    fontSize: 16,
  },
  settingValue: {
    color: '#888',
    fontSize: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  featureText: {
    marginLeft: 12,
    flex: 1,
  },
  featureTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  featureDescription: {
    color: '#888',
    fontSize: 14,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  privacyText: {
    marginLeft: 12,
    flex: 1,
  },
  privacyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  privacyDescription: {
    color: '#888',
    fontSize: 14,
  },
});
