import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { apiClient } from '../lib/api';
import type { UnsplashPhoto } from '@on-deck/shared';

interface Props {
  visible: boolean;
  query: string;
  onSelect: (photo: UnsplashPhoto) => void;
  onClose: () => void;
}

export function UnsplashPickerModal({ visible, query, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !query) return;
    setSelected(null);
    setError(null);
    setLoading(true);
    apiClient.unsplash.search(query)
      .then(setPhotos)
      .catch(() => setError('Could not load photos. Check your connection.'))
      .finally(() => setLoading(false));
  }, [visible, query]);

  async function handleSelect(photo: UnsplashPhoto) {
    setSelected(photo.id);
    try {
      await apiClient.unsplash.track(photo.downloadLocation);
    } catch {
      // non-blocking
    }
    onSelect(photo);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Choose a Cover Photo</Text>
          <View style={{ width: 36 }} />
        </View>

        <Text style={styles.sub}>Photos from Unsplash · tap to select</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.gold} size="large" />
            <Text style={[styles.sub, { marginTop: 12 }]}>Searching Unsplash…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.sub, { marginTop: 8 }]}>{error}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {photos.map((photo) => {
              const isSelected = selected === photo.id;
              return (
                <TouchableOpacity
                  key={photo.id}
                  style={[styles.photoCell, isSelected && styles.photoCellSelected]}
                  onPress={() => handleSelect(photo)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: photo.thumb }} style={styles.photoThumb} resizeMode="cover" />
                  {isSelected && (
                    <View style={styles.selectedOverlay}>
                      <Ionicons name="checkmark-circle" size={32} color="#fff" />
                    </View>
                  )}
                  <Text style={styles.attribution} numberOfLines={1}>
                    {photo.photographer}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeBtn: { padding: 4 },
    title: { fontSize: 17, fontWeight: '800', color: colors.text },
    sub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 10 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 8,
      gap: 4,
    },
    photoCell: {
      width: '32%',
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    photoCellSelected: {
      borderColor: colors.gold,
    },
    photoThumb: {
      width: '100%',
      aspectRatio: 1.6,
    },
    selectedOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    attribution: {
      fontSize: 9,
      color: colors.textMuted,
      paddingHorizontal: 4,
      paddingVertical: 3,
      backgroundColor: colors.surface,
    },
  });
}
