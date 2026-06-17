import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Animated, StyleSheet, Text, LayoutChangeEvent } from 'react-native';

const NOTES = ['♪', '♫', '♬', '♩', '♭', '♯'];
const COLORS = ['#00F900', '#0433FF', '#00FDFF', '#d97706', '#FF40FF', '#7960DF', '#0891b2', '#ca8a04', '#0096FF', '#000000', '#005A00'];

interface NoteItem {
  id: number;
  note: string;
  color: string;
  size: number;
  opacity: number;
  duration: number;
  sway: number;
  x: number;
  animY: Animated.Value;
  animX: Animated.Value;
  animO: Animated.Value;
}

interface Props {
  text?: string;
}

export default function MusicalNotesLoading({ text = 'Loading...' }: Props) {
  const [width, setWidth] = useState(0);
  const [noteItems, setNoteItems] = useState<NoteItem[]>([]);
  const counterRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  function onLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && width === 0) setWidth(w);
  }

  const spawnNote = useCallback(() => {
    if (width === 0) return;
    const id = counterRef.current++;
    const animY = new Animated.Value(0);
    const animX = new Animated.Value(0);
    const animO = new Animated.Value(0);

    const item: NoteItem = {
      id,
      note: NOTES[id % NOTES.length],
      color: COLORS[id % COLORS.length],
      size: 14 + Math.random() * 10,
      opacity: 0.3 + Math.random() * 0.5,
      duration: 3000 + Math.random() * 4000,
      sway: -20 + Math.random() * 40,
      x: width * 0.05 + Math.random() * width * 0.9,
      animY, animX, animO,
    };

    setNoteItems(prev => [...prev, item]);

    Animated.parallel([
      Animated.timing(animY, {
        toValue: 1,
        duration: item.duration,
        useNativeDriver: false,
      }),
      Animated.timing(animX, {
        toValue: 1,
        duration: item.duration,
        useNativeDriver: false,
      }),
      Animated.timing(animO, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setNoteItems(prev => prev.filter(n => n.id !== id));
    });
  }, [width]);

  useEffect(() => {
    if (width === 0) return;

    const initialTimers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < 6; i++) {
      initialTimers.push(setTimeout(spawnNote, i * 400));
    }

    intervalRef.current = setInterval(spawnNote, 600);

    return () => {
      initialTimers.forEach(clearTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [width, spawnNote]);

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View style={styles.notesContainer} pointerEvents="none">
        {noteItems.map(note => (
          <Animated.Text
            key={note.id}
            style={[
              styles.note,
              {
                left: note.x,
                fontSize: note.size,
                color: note.color,
                opacity: note.animO.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, note.opacity],
                }),
                transform: [
                  {
                    translateY: note.animY.interpolate({
                      inputRange: [0, 1],
                      outputRange: [200, -400],
                    }),
                  },
                  {
                    translateX: note.animX.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, note.sway],
                    }),
                  },
                ],
              },
            ]}>
            {note.note}
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
    fontWeight: '400',

  },
  text: {
    marginTop: 80,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
});
