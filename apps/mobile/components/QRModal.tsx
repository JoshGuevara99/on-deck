import { View, Text, Modal, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// react-native-qrcode-svg ships a default export
// eslint-disable-next-line @typescript-eslint/no-var-requires
const QRCode = require('react-native-qrcode-svg').default;

interface Props {
  visible: boolean;
  url: string;
  title: string;
  onClose: () => void;
}

export function QRModal({ visible, url, title, onClose }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceHigh }]}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* QR code */}
          <View style={[styles.qrWrap, { backgroundColor: '#fff' }]}>
            <QRCode
              value={url}
              size={220}
              color="#000000"
              backgroundColor="#ffffff"
            />
          </View>

          {/* URL label */}
          <Text style={[styles.urlText, { color: colors.textMuted }]} numberOfLines={2}>{url}</Text>

          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {Platform.OS === 'web'
              ? 'Right-click the QR code to save it.'
              : 'Screenshot this to share via IG story, print, or send directly.'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1, fontSize: 15, fontWeight: '700', marginRight: 10 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrWrap: {
    alignSelf: 'center',
    padding: 16,
    borderRadius: 12,
    marginVertical: 20,
  },
  urlText: {
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    lineHeight: 18,
  },
});
