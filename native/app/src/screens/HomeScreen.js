import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchSongs } from '../utils/api';
import { Storage } from '../utils/storage';

const LANGUAGES = ['All', 'Tamil', 'Hindi', 'English', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Punjabi', 'Marathi'];

export default function HomeScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState('All');
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [likedSongs, setLikedSongs] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      await Storage.migrateIfNeeded();
      const [liked, recent] = await Promise.all([
        Storage.getLikedSongs(),
        Storage.getRecentlyPlayed()
      ]);
      setLikedSongs(liked);
      setRecentlyPlayed(recent);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const query = selectedLang === 'All' ? searchQuery : `${searchQuery} ${selectedLang.toLowerCase()}`;
      const results = await searchSongs(query, 40);
      setSongs(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (song) => {
    try {
      const isLiked = likedSongs.some(s => s.id === song.id);
      if (isLiked) {
        await Storage.removeLikedSong(song.id);
        setLikedSongs(prev => prev.filter(s => s.id !== song.id));
      } else {
        await Storage.addLikedSong(song);
        setLikedSongs(prev => [...prev, song]);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const playSong = (song) => {
    navigation.navigate('Player', { song, playlist: songs });
    Storage.addRecentlyPlayed(song).catch(console.error);
  };

  const isLiked = (songId) => likedSongs.some(s => s.id === songId);

  const renderSongItem = ({ item, index }) => (
    <TouchableOpacity style={styles.songItem} onPress={() => playSong(item)}>
      <Image 
        source={{ uri: item.coverUrl || 'https://via.placeholder.com/60' }} 
        style={styles.songImage}
      />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
      </View>
      <TouchableOpacity 
        style={styles.likeButton}
        onPress={() => toggleLike(item)}
      >
        <Ionicons 
          name={isLiked(item.id) ? 'heart' : 'heart-outline'} 
          size={24} 
          color={isLiked(item.id) ? '#00d4e8' : '#888'} 
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SoundAura</Text>
        <Text style={styles.subtitle}>Free music in all languages</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search songs, artists, movies..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Ionicons name="search" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.languageScroll}
        contentContainerStyle={styles.languageContainer}
      >
        {LANGUAGES.map(lang => (
          <TouchableOpacity
            key={lang}
            style={[
              styles.languageChip,
              selectedLang === lang && styles.languageChipActive
            ]}
            onPress={() => {
              setSelectedLang(lang);
              if (searchQuery) handleSearch();
            }}
          >
            <Text style={[
              styles.languageText,
              selectedLang === lang && styles.languageTextActive
            ]}>
              {lang}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00d4e8" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : songs.length > 0 ? (
        <FlatList
          data={songs}
          renderItem={renderSongItem}
          keyExtractor={item => item.id}
          style={styles.songList}
          contentContainerStyle={styles.songListContent}
        />
      ) : recentlyPlayed.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          <FlatList
            data={recentlyPlayed}
            renderItem={renderSongItem}
            keyExtractor={item => item.id}
            style={styles.songList}
            contentContainerStyle={styles.songListContent}
          />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes" size={64} color="#444" />
          <Text style={styles.emptyText}>Search for your favorite music</Text>
          <Text style={styles.emptySubtext}>Supports all Indian languages</Text>
        </View>
      )}
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
    color: '#00d4e8',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: '#00d4e8',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageScroll: {
    marginBottom: 16,
  },
  languageContainer: {
    paddingHorizontal: 16,
  },
  languageChip: {
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  languageChipActive: {
    backgroundColor: '#00d4e8',
  },
  languageText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  languageTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
  },
  songList: {
    flex: 1,
  },
  songListContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  songImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  songArtist: {
    color: '#888',
    fontSize: 14,
  },
  likeButton: {
    padding: 8,
  },
  section: {
    flex: 1,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
