import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Slider, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Storage } from '../utils/storage';

export default function PlayerScreen({ route, navigation }) {
  const { song, playlist } = route.params;
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const sliderRef = useRef(null);

  useEffect(() => {
    loadAudio();
    checkSongStatus();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [song]);

  useEffect(() => {
    return () => {
      if (sliderRef.current) {
        clearInterval(sliderRef.current);
      }
    };
  }, []);

  const checkSongStatus = async () => {
    try {
      const [liked, downloaded] = await Promise.all([
        Storage.getLikedSongs(),
        Storage.getDownloadedSongs()
      ]);
      setIsLiked(liked.some(s => s.id === song.id));
      setIsDownloaded(downloaded.some(s => s.id === song.id));
    } catch (error) {
      console.error('Error checking song status:', error);
    }
  };

  const loadAudio = async () => {
    setIsLoading(true);
    try {
      // Check if song is downloaded
      const downloaded = await Storage.getDownloadedSongs();
      const downloadedSong = downloaded.find(s => s.id === song.id);
      
      let audioUri = song.audioUrl;
      if (downloadedSong && downloadedSong.localUri) {
        audioUri = downloadedSong.localUri;
      }

      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      
      setSound(audioSound);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading audio:', error);
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis);
      setIsPlaying(status.isPlaying);
      
      if (status.didJustFinish) {
        playNext();
      }
    }
  };

  const togglePlayback = async () => {
    if (!sound) return;
    
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const seekAudio = async (value) => {
    if (!sound) return;
    await sound.setPositionAsync(value);
  };

  const playNext = () => {
    if (!playlist || playlist.length === 0) return;
    const currentIndex = playlist.findIndex(s => s.id === song.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    const nextSong = playlist[nextIndex];
    navigation.replace('Player', { song: nextSong, playlist });
  };

  const playPrevious = () => {
    if (!playlist || playlist.length === 0) return;
    const currentIndex = playlist.findIndex(s => s.id === song.id);
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    const prevSong = playlist[prevIndex];
    navigation.replace('Player', { song: prevSong, playlist });
  };

  const toggleLike = async () => {
    try {
      if (isLiked) {
        await Storage.removeLikedSong(song.id);
        setIsLiked(false);
      } else {
        await Storage.addLikedSong(song);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const downloadSong = async () => {
    if (isDownloading || isDownloaded) return;
    
    setIsDownloading(true);
    try {
      const fileUri = `${FileSystem.documentDirectory}${song.id}.mp3`;
      const downloadResult = await FileSystem.downloadAsync(song.audioUrl, fileUri);
      
      if (downloadResult.status === 200) {
        const songWithLocalUri = { ...song, localUri: downloadResult.uri };
        await Storage.addDownloadedSong(songWithLocalUri);
        setIsDownloaded(true);
        
        // Reload audio with local file
        if (sound) {
          await sound.unloadAsync();
        }
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: downloadResult.uri },
          { shouldPlay: isPlaying },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
      }
    } catch (error) {
      console.error('Error downloading song:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const formatTime = (millis) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-down" size={32} color="#fff" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Image 
          source={{ uri: song.coverUrl || 'https://via.placeholder.com/300' }} 
          style={styles.albumArt}
        />

        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={2}>{song.title}</Text>
          <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
        </View>

        <View style={styles.progressContainer}>
          <Slider
 style={styles.slider}
            minimumValue={0}
            maximumValue={duration}
            value={position}
            onSlidingComplete={seekAudio}
            minimumTrackTintColor="#00d4e8"
            maximumTrackTintColor="#333"
            thumbTintColor="#00d4e8"
          />
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={playPrevious}>
            <Ionicons name="play-skip-back" size={32} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.playButton}
            onPress={togglePlayback}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="large" color="#121212" />
            ) : (
              <Ionicons 
                name={isPlaying ? 'pause' : 'play'} 
                size={32} 
                color="#121212" 
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={playNext}>
            <Ionicons name="play-skip-forward" size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={toggleLike}>
            <Ionicons 
              name={isLiked ? 'heart' : 'heart-outline'} 
              size={28} 
              color={isLiked ? '#00d4e8' : '#fff'} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={downloadSong}
            disabled={isDownloading || isDownloaded}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#00d4e8" />
            ) : (
              <Ionicons 
                name={isDownloaded ? 'download-done' : 'download-outline'} 
                size={28} 
                color={isDownloaded ? '#00d4e8' : '#fff'} 
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 16,
    zIndex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  albumArt: {
    width: 300,
    height: 300,
    borderRadius: 12,
    marginBottom: 32,
  },
  songInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  songTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  songArtist: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 32,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  timeText: {
    color: '#888',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  controlButton: {
    marginHorizontal: 24,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#00d4e8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 48,
  },
  actionButton: {
    padding: 8,
  },
});
