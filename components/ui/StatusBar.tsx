import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { StatusGroup, StatusItem } from '../../services/api/StatusService';

interface StatusBarProps {
  groups: StatusGroup[];
  currentUserId: string;
  isEnterprise: boolean;
  onPressGroup: (group: StatusGroup) => void;
  onPressAdd: () => void;
}

const CARD_WIDTH = 105;
const CARD_HEIGHT = 158;
const AVATAR_SIZE = 34;

function StatusCard({
  group,
  isMe,
  isEnterprise,
  onPress,
  onPressAdd,
}: {
  group?: StatusGroup;
  isMe: boolean;
  isEnterprise: boolean;
  onPress: () => void;
  onPressAdd: () => void;
}) {
  const { isDark } = useTheme();

  const latestStatus: StatusItem | undefined = group?.statuses[0];
  const hasUnviewed = group?.hasUnviewed ?? false;
  const name = isMe
    ? 'Mon statut'
    : group?.enterprise.companyName || `${group?.enterprise.firstName ?? ''} ${group?.enterprise.lastName ?? ''}`.trim();
  const profileImage = group?.enterprise.profileImage;

  // Fond de la carte selon le type du statut
  const renderCardBackground = () => {
    if (!latestStatus) {
      // Pas encore de statut — placeholder
      return (
        <View
          style={{
            flex: 1,
            borderWidth: 2,
            borderColor: '#10B981',
            borderStyle: 'dashed',
            borderRadius: 16,
            backgroundColor: isDark ? 'rgba(16,185,129,0.07)' : 'rgba(16,185,129,0.05)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: '#10B981',
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </View>
        </View>
      );
    }

    if (latestStatus.type === 'IMAGE' || latestStatus.type === 'IMAGE_TEXT') {
      return (
        <Image
          source={{ uri: latestStatus.imageUrl! }}
          style={{ flex: 1, borderRadius: 16 }}
          contentFit="cover"
        />
      );
    }

    // TEXT
    return (
      <View
        style={{
          flex: 1,
          borderRadius: 16,
          backgroundColor: latestStatus.backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 8,
        }}
      >
        <Text
          numberOfLines={4}
          style={{
            color: latestStatus.textColor,
            fontFamily: 'Quicksand-Bold',
            fontSize: 12,
            textAlign: 'center',
            lineHeight: 16,
          }}
        >
          {latestStatus.text}
        </Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      onPress={isMe && !group ? onPressAdd : onPress}
      activeOpacity={0.85}
      style={{ width: CARD_WIDTH, marginRight: 8 }}
    >
      <View
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          borderRadius: 16,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {renderCardBackground()}

        {/* Dégradé bas pour lisibilité du nom */}
        {!!latestStatus && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.65)']}
            style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              height: 60,
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
            }}
          />
        )}

        {/* Avatar enterprise en haut à gauche */}
        {!!group && (
          <View
            style={{
              position: 'absolute',
              top: 8, left: 8,
              width: AVATAR_SIZE + 4,
              height: AVATAR_SIZE + 4,
              borderRadius: (AVATAR_SIZE + 4) / 2,
              padding: 2,
              backgroundColor: hasUnviewed ? '#10B981' : (isDark ? '#4B5563' : '#D1D5DB'),
            }}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: AVATAR_SIZE, height: AVATAR_SIZE,
                  borderRadius: AVATAR_SIZE / 2,
                  backgroundColor: isDark ? '#1F2937' : '#E5E7EB',
                  justifyContent: 'center', alignItems: 'center',
                }}
              >
                <Ionicons name="business" size={16} color="#10B981" />
              </View>
            )}
          </View>
        )}

        {/* Bouton + en overlay (pour mes statuts existants) */}
        {isMe && isEnterprise && !!group && (
          <TouchableOpacity
            onPress={onPressAdd}
            style={{
              position: 'absolute',
              top: 28, left: 28,
              width: 18, height: 18,
              borderRadius: 9,
              backgroundColor: '#10B981',
              justifyContent: 'center', alignItems: 'center',
              borderWidth: 1.5, borderColor: '#fff',
            }}
          >
            <Ionicons name="add" size={11} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Nom en bas */}
        <Text
          numberOfLines={2}
          style={{
            position: 'absolute',
            bottom: 8, left: 6, right: 6,
            color: latestStatus ? '#fff' : (isDark ? 'rgba(255,255,255,0.7)' : '#374151'),
            fontFamily: 'Quicksand-SemiBold',
            fontSize: 11,
            textAlign: 'center',
            lineHeight: 14,
          }}
        >
          {name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function StatusBar({ groups, currentUserId, isEnterprise, onPressGroup, onPressAdd }: StatusBarProps) {
  const myGroup = groups.find(g => String(g.enterprise._id) === String(currentUserId));
  const othersRaw = groups.filter(g => String(g.enterprise._id) !== String(currentUserId));
  // Statuts non vus en premier, vus à la fin
  const othersGroups = [
    ...othersRaw.filter(g => g.hasUnviewed),
    ...othersRaw.filter(g => !g.hasUnviewed),
  ];

  return (
    <View style={{ paddingVertical: 12 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14 }}
      >
        {/* Ma carte (enterprise) */}
        {isEnterprise && (
          <StatusCard
            group={myGroup}
            isMe={true}
            isEnterprise={isEnterprise}
            onPress={() => myGroup && onPressGroup(myGroup)}
            onPressAdd={onPressAdd}
          />
        )}

        {/* Cartes des autres */}
        {othersGroups.map(group => (
          <StatusCard
            key={group.enterprise._id}
            group={group}
            isMe={false}
            isEnterprise={isEnterprise}
            onPress={() => onPressGroup(group)}
            onPressAdd={onPressAdd}
          />
        ))}
      </ScrollView>
    </View>
  );
}
