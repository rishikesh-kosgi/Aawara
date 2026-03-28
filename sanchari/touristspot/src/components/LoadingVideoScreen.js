import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import Video from 'react-native-video';

const loadingVideo = require('../assets/loading-screen.mp4');

export default function LoadingVideoScreen({ onFinish }) {
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onFinish?.();
    }, 6500);

    return () => clearTimeout(timeoutId);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Video
        source={loadingVideo}
        style={styles.video}
        resizeMode="cover"
        repeat={false}
        paused={false}
        muted={false}
        playInBackground={false}
        playWhenInactive={false}
        ignoreSilentSwitch="ignore"
        onEnd={onFinish}
        onError={onFinish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
});
