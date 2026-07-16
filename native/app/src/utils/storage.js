// AsyncStorage wrapper for React Native app
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  LIKED_SONGS: '@soundaura_liked_songs',
  RECENTLY_PLAYED: '@soundaura_recently_played',
  DOWNLOADED_SONGS: '@soundaura_downloaded_songs',
  BACKEND_VERSION: '@soundaura_backend_version',
};

// Bump when the audio backend changes in a way that makes previously
// cached song objects (old audioUrl/id format) unplayable.
const BACKEND_VERSION = 'audius-v1';

export const Storage = {
  // Wipes cached songs if they came from a previous, incompatible backend.
  async migrateIfNeeded() {
    try {
      const stored = await AsyncStorage.getItem(KEYS.BACKEND_VERSION);
      if (stored === BACKEND_VERSION) return false;
      await AsyncStorage.multiRemove([KEYS.LIKED_SONGS, KEYS.RECENTLY_PLAYED, KEYS.DOWNLOADED_SONGS]);
      await AsyncStorage.setItem(KEYS.BACKEND_VERSION, BACKEND_VERSION);
      return true;
    } catch (error) {
      console.error('Error migrating storage:', error);
      return false;
    }
  },

  async getLikedSongs() {
    try {
      const data = await AsyncStorage.getItem(KEYS.LIKED_SONGS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting liked songs:', error);
      return [];
    }
  },
  
  async addLikedSong(song) {
    try {
      const liked = await this.getLikedSongs();
      const exists = liked.some(s => s.id === song.id);
      if (!exists) {
        liked.push(song);
        await AsyncStorage.setItem(KEYS.LIKED_SONGS, JSON.stringify(liked));
      }
    } catch (error) {
      console.error('Error adding liked song:', error);
    }
  },
  
  async removeLikedSong(songId) {
    try {
      const liked = await this.getLikedSongs();
      const filtered = liked.filter(s => s.id !== songId);
      await AsyncStorage.setItem(KEYS.LIKED_SONGS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing liked song:', error);
    }
  },
  
  async getRecentlyPlayed() {
    try {
      const data = await AsyncStorage.getItem(KEYS.RECENTLY_PLAYED);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting recently played:', error);
      return [];
    }
  },
  
  async addRecentlyPlayed(song) {
    try {
      const recent = await this.getRecentlyPlayed();
      const filtered = recent.filter(s => s.id !== song.id);
      const updated = [song, ...filtered].slice(0, 12);
      await AsyncStorage.setItem(KEYS.RECENTLY_PLAYED, JSON.stringify(updated));
    } catch (error) {
      console.error('Error adding recently played:', error);
    }
  },
  
  async clearRecentlyPlayed() {
    try {
      await AsyncStorage.setItem(KEYS.RECENTLY_PLAYED, JSON.stringify([]));
    } catch (error) {
      console.error('Error clearing recently played:', error);
    }
  },
  
  async getDownloadedSongs() {
    try {
      const data = await AsyncStorage.getItem(KEYS.DOWNLOADED_SONGS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting downloaded songs:', error);
      return [];
    }
  },
  
  async addDownloadedSong(song) {
    try {
      const downloaded = await this.getDownloadedSongs();
      const exists = downloaded.some(s => s.id === song.id);
      if (!exists) {
        downloaded.push(song);
        await AsyncStorage.setItem(KEYS.DOWNLOADED_SONGS, JSON.stringify(downloaded));
      }
    } catch (error) {
      console.error('Error adding downloaded song:', error);
    }
  },
  
  async removeDownloadedSong(songId) {
    try {
      const downloaded = await this.getDownloadedSongs();
      const filtered = downloaded.filter(s => s.id !== songId);
      await AsyncStorage.setItem(KEYS.DOWNLOADED_SONGS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing downloaded song:', error);
    }
  },
};
