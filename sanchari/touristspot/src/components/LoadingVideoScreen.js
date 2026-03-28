import React, { useCallback, useEffect, useRef } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import Video from 'react-native-video';

const loadingVideo = require('../assets/loading-screen-v2.mp4');
const FALLBACK_DURATION_MS = 15000;

export default function LoadingVideoScreen({ onFinish }) {
  const finishCalledRef = useRef(false);
  const fallbackTimeoutRef = useRef(null);

  const finishOnce = useCallback(() => {
    if (finishCalledRef.current) return;
    finishCalledRef.current = true;

    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }

    onFinish?.();
  }, [onFinish]);

  useEffect(() => {
    fallbackTimeoutRef.current = setTimeout(() => {
      finishOnce();
    }, FALLBACK_DURATION_MS);

    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    };
  }, [finishOnce]);

  return (
    <View style={styles.container}>
      <StatusBar hidden translucent backgroundColor="transparent" />
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
        controls={false}
        onEnd={finishOnce}
        onError={finishOnce}
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
