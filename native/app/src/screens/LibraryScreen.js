import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Storage } from '../utils/storage';

export default function LibraryScreen({ navigation }) {
  const [likedSongs, setLikedSongs] = useState([]);
  const [downloadedSongs, setDownloadedSongs] = useState([]);
  const [activeTab, setActiveTab] = useState('liked');

  useEffect(() => {
    loadLibraryData();
  }, [activeTab]);

  const loadLibraryData = async () => {
    try {
      const [liked, downloaded] = await Promise.all([
        Storage.getLikedSongs(),
        Storage.getDownloadedSongs()
      ]);
      setLikedSongs(liked);
      setDownloadedSongs(downloaded);
    } catch (error) {
      console.error('Error loading library data:', error);
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
    const playlist = activeTab === 'liked' ? likedSongs : downloadedSongs;
    navigation.navigate('Player', { song, playlist });
  };

  const isLiked = (songId) => likedSongs.some(s => s.id === songId);

  const renderSongItem = ({ item }) => (
    <TouchableOpacity style={styles.songItem} onPress={() => playSong(item)}>
      <Image 
        source={{ uri: item.coverUrl || 'https://via.placeholder.com/60' }} 
        style={styles.songImage}
      />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
      </View>
      {activeTab === 'liked' && (
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
      )}
      {activeTab === 'downloaded' && (
        <Ionicons name="download-done" size={24} color="#00d4e8" />
      )}
    </TouchableOpacity>
  );

  const songs = activeTab === 'liked' ? likedSongs : downloadedSongs;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Library</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'liked' && styles.tabActive]}
          onPress={() => setActiveTab('liked')}
        >
          <Text style={[styles.tabText, activeTab === 'liked' && styles.tabTextActive]}>
            Liked Songs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'downloaded' && styles.tabActive]}
          onPress={() => setActiveTab('downloaded')}
        >
          <Text style={[styles.tabText, activeTab === 'downloaded' && styles.tabTextActive]}>
            Downloads
          </Text>
        </TouchableOpacity>
      </View>

      {songs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons 
            name={activeTab === 'liked' ? 'heart-outline' : 'download-outline'} 
            size={64} 
            color="#444" 
          />
          <Text style={styles.emptyText}>
            {activeTab === 'liked' ? 'No liked songs yet' : 'No downloads yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {activeTab === 'liked' 
              ? 'Tap the heart icon on any song to save it here' 
              : 'Download songs to listen offline'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={songs}
          renderItem={renderSongItem}
          keyExtractor={item => item.id}
          style={styles.songList}
          contentContainerStyle={styles.songListContent}
        />
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
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#00d4e8',
  },
  tabText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#00d4e8',
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
