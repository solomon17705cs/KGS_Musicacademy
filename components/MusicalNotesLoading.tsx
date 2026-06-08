import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Text, LayoutChangeEvent } from 'react-native';

const NOTES = ['♪', '♫', '♬', '♩', '♭', '♯'];

interface NoteConfig {
  id: number;
  note: string;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  sway: number;
}

function createNotes(count: number, width: number): { config: NoteConfig; x: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    config: {
      id: i,
      note: NOTES[i % NOTES.length],
      size: 16 + Math.random() * 20,
      opacity: 0.3 + Math.random() * 0.5,
      duration: 3000 + Math.random() * 4000,
      delay: Math.random() * 500,
      sway: -20 + Math.random() * 40,
    },
    x: width * 0.05 + Math.random() * width * 0.9,
  }));
}

interface Props {
  text?: string;
}

export default function MusicalNotesLoading({ text = 'Loading...' }: Props) {
  const [width, setWidth] = useState(0);
  const [notes, setNotes] = useState<{ config: NoteConfig; x: number }[]>([]);
  const translateY = useRef<Animated.Value[]>([]);
  const translateX = useRef<Animated.Value[]>([]);
  const opacity = useRef<Animated.Value[]>([]);
  const animRefs = useRef<Animated.CompositeAnimation[]>([]);

  function onLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && width === 0) {
      setWidth(w);
      const generated = createNotes(8, w);
      setNotes(generated);
      translateY.current = generated.map(() => new Animated.Value(0));
      translateX.current = generated.map(() => new Animated.Value(0));
      opacity.current = generated.map(() => new Animated.Value(0));
    }
  }

  useEffect(() => {
    if (notes.length === 0) return;

    animRefs.current = notes.map((note, i) => {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.delay(note.config.delay),
          Animated.parallel([
            Animated.timing(translateY.current[i], {
              toValue: 1,
              duration: note.config.duration,
              useNativeDriver: false,
            }),
            Animated.timing(translateX.current[i], {
              toValue: 1,
              duration: note.config.duration,
              useNativeDriver: false,
            }),
            Animated.timing(opacity.current[i], {
              toValue: 1,
              duration: 300,
              useNativeDriver: false,
            }),
          ]),
          Animated.delay(2000),
        ]),
        { iterations: -1 }
      );
      anim.start();
      return anim;
    });

    return () => {
      animRefs.current.forEach(a => a.stop());
    };
  }, [notes]);

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View style={styles.notesContainer} pointerEvents="none">
        {notes.map((note, i) => (
          <Animated.Text
            key={note.config.id}
            style={[
              styles.note,
              {
                left: note.x,
                fontSize: note.config.size,
                opacity: opacity.current[i]?.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, note.config.opacity],
                }) ?? 0,
                transform: [
                  {
                    translateY: translateY.current[i]?.interpolate({
                      inputRange: [0, 1],
                      outputRange: [200, -400],
                    }) ?? 0,
                  },
                  {
                    translateX: translateX.current[i]?.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, note.config.sway],
                    }) ?? 0,
                  },
                ],
              },
            ]}>
            {note.config.note}
          </Animated.Text>
        ))}
      </View>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  notesContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  note: {
    position: 'absolute',
    bottom: '50%',
    color: '#1e40af',
    fontWeight: '700',
  },
  text: {
    marginTop: 80,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
});
