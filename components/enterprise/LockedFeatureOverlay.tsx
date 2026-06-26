import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Linking, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  /** Nombre d'éléments cachés à afficher dans le teaser (ex: 4 conversations) */
  itemCount?: number;
  /** Titre de la feature bloquée */
  featureTitle: string;
  /** Phrase d'accroche personnalisée */
  teaser: string;
  /** Description courte des avantages */
  benefits: string[];
  /** URL web de souscription (iOS uniquement) */
  webUrl?: string;
}

export default function LockedFeatureOverlay({
  itemCount,
  featureTitle,
  teaser,
  benefits,
  webUrl = 'https://aximarketplace.com/subscription',
}: Props) {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const pulse = useRef(new Animated.Value(1)).current;
  const slideUp = useRef(new Animated.Value(60)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleCTA = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL(webUrl);
    } else {
      router.push('/(app)/(enterprise)/subscriptions' as any);
    }
  };

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        opacity: fadeIn,
        transform: [{ translateY: slideUp }],
        zIndex: 50,
      }}
    >
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.93)', '#000']}
        locations={[0, 0.15, 0.4, 1]}
        style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 40 }}
      >
        <View style={{ paddingHorizontal: 28 }}>

          {/* Badge premium */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: 'rgba(16,185,129,0.2)',
              borderWidth: 1, borderColor: '#10B981',
              paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
            }}>
              <Ionicons name="diamond" size={14} color="#10B981" />
              <Text style={{ color: '#10B981', fontSize: 12, fontFamily: 'Quicksand-Bold', letterSpacing: 1 }}>
                FONCTIONNALITÉ PREMIUM
              </Text>
            </View>
          </View>

          {/* Icône cadenas animée */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Animated.View style={{
              transform: [{ scale: pulse }],
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: 'rgba(16,185,129,0.15)',
              borderWidth: 2, borderColor: 'rgba(16,185,129,0.4)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="lock-closed" size={32} color="#10B981" />
            </Animated.View>
          </View>

          {/* Titre avec compteur */}
          {itemCount !== undefined && itemCount > 0 && (
            <Text style={{
              color: '#10B981', textAlign: 'center',
              fontSize: 15, fontFamily: 'Quicksand-Bold', marginBottom: 6,
            }}>
              {itemCount} {featureTitle} {itemCount > 1 ? 'vous attendent' : 'vous attend'} 🔒
            </Text>
          )}

          <Text style={{
            color: '#fff', textAlign: 'center',
            fontSize: 22, fontFamily: 'Quicksand-Bold',
            lineHeight: 30, marginBottom: 12,
          }}>
            {teaser}
          </Text>

          {/* Avantages */}
          <View style={{ marginBottom: 28, gap: 8 }}>
            {benefits.map((b, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  backgroundColor: 'rgba(16,185,129,0.25)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="checkmark" size={12} color="#10B981" />
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: 'Quicksand-Medium', flex: 1 }}>
                  {b}
                </Text>
              </View>
            ))}
          </View>

          {/* CTA principal */}
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <TouchableOpacity onPress={handleCTA} activeOpacity={0.85}>
              <LinearGradient
                colors={['#059669', '#10B981']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 16, borderRadius: 16,
                  alignItems: 'center', flexDirection: 'row',
                  justifyContent: 'center', gap: 8,
                }}
              >
                <Ionicons name="rocket" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Quicksand-Bold' }}>
                  Activer ma boutique
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Message iOS / Android */}
          {Platform.OS === 'ios' ? (
            <Text style={{
              color: 'rgba(255,255,255,0.45)', textAlign: 'center',
              fontSize: 12, fontFamily: 'Quicksand-Medium', marginTop: 14, lineHeight: 18,
            }}>
              Gestion des abonnements disponible sur{'\n'}
              <Text style={{ color: 'rgba(16,185,129,0.8)' }}>aximarketplace.com</Text>
            </Text>
          ) : (
            <Text style={{
              color: 'rgba(255,255,255,0.45)', textAlign: 'center',
              fontSize: 12, fontFamily: 'Quicksand-Medium', marginTop: 14,
            }}>
              Sans engagement · Résiliable à tout moment
            </Text>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
