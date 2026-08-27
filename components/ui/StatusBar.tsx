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

const CARD_WIDTH = 86;
const CARD_HEIGHT = 118;
const AVATAR_SIZE = 26;

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
            borderRadius: 14,
            backgroundColor: isDark ? 'rgba(16,185,129,0.07)' : 'rgba(16,185,129,0.05)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: '#10B981',
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <Ionicons name="add" size={17} color="#fff" />
          </View>
        </View>
      );
    }

    if (latestStatus.type === 'IMAGE' || latestStatus.type === 'IMAGE_TEXT') {
      return (
        <Image
          source={{ uri: latestStatus.imageUrl! }}
          style={{ flex: 1, borderRadius: 14 }}
          contentFit="cover"
        />
      );
    }

    // TEXT
    return (
      <View
        style={{
          flex: 1,
          borderRadius: 14,
          backgroundColor: latestStatus.backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 6,
        }}
      >
        <Text
          numberOfLines={3}
          style={{
            color: latestStatus.textColor,
            fontFamily: 'Poppins-Bold',
            fontSize: 11,
            textAlign: 'center',
            lineHeight: 15,
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
          borderRadius: 14,
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
              height: 44,
              borderBottomLeftRadius: 14,
              borderBottomRightRadius: 14,
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
              top: 22, left: 22,
              width: 16, height: 16,
              borderRadius: 8,
              backgroundColor: '#10B981',
              justifyContent: 'center', alignItems: 'center',
              borderWidth: 1.5, borderColor: '#fff',
            }}
          >
            <Ionicons name="add" size={10} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Nom en bas */}
        <Text
          numberOfLines={2}
          style={{
            position: 'absolute',
            bottom: 6, left: 5, right: 5,
            color: latestStatus ? '#fff' : (isDark ? 'rgba(255,255,255,0.7)' : '#374151'),
            fontFamily: 'Poppins-SemiBold',
            fontSize: 10,
            textAlign: 'center',
            lineHeight: 13,
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

  // Tri : plus récent en premier (date du statut le plus récent du groupe)
  const byRecent = (a: StatusGroup, b: StatusGroup) => {
    const dateA = Math.max(...a.statuses.map(s => new Date(s.createdAt).getTime()));
    const dateB = Math.max(...b.statuses.map(s => new Date(s.createdAt).getTime()));
    return dateB - dateA;
  };

  // Non vus en premier (triés par récence), vus à la fin (triés par récence)
  const othersGroups = [
    ...othersRaw.filter(g => g.hasUnviewed).sort(byRecent),
    ...othersRaw.filter(g => !g.hasUnviewed).sort(byRecent),
  ];

  return (
    <View style={{ paddingVertical: 8 }}>
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
