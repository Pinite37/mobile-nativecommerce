import * as React from "react";
import { Dimensions, FlatList, Pressable, View, ViewStyle } from "react-native";
import Animated, {
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    interpolate,
    Extrapolation,
    withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<any>);

interface CarouselComponentProps<T> {
    data: T[];
    renderItem: (info: { item: T; index: number }) => React.ReactElement;
    height?: number;
    autoPlayInterval?: number;
    containerStyle?: ViewStyle;
}

function DotPagination({
    count,
    activeIndex,
}: {
    count: number;
    activeIndex: Animated.SharedValue<number>;
}) {
    return (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 5, marginBottom: 10 }}>
            {Array.from({ length: count }).map((_, i) => (
                <AnimatedDot key={i} index={i} activeIndex={activeIndex} />
            ))}
        </View>
    );
}

function AnimatedDot({
    index,
    activeIndex,
}: {
    index: number;
    activeIndex: Animated.SharedValue<number>;
}) {
    const style = useAnimatedStyle(() => {
        const isActive = Math.round(activeIndex.value) === index;
        return {
            width: withTiming(isActive ? 20 : 8, { duration: 200 }),
            backgroundColor: withTiming(isActive ? "#10B981" : "#D1D5DB", { duration: 200 }),
        };
    });

    return (
        <Animated.View
            style={[
                { height: 8, borderRadius: 50 },
                style,
            ]}
        />
    );
}

export default function CarouselComponent<T extends object>({
    data,
    renderItem,
    height = SCREEN_WIDTH * 0.6,
    autoPlayInterval = 3000,
    containerStyle,
}: CarouselComponentProps<T>) {
    const flatListRef = React.useRef<FlatList<T>>(null);
    const scrollX = useSharedValue(0);
    const activeIndex = useSharedValue(0);
    const currentIndex = React.useRef(0);

    const onScroll = useAnimatedScrollHandler({
        onScroll: (e) => {
            scrollX.value = e.contentOffset.x;
            activeIndex.value = e.contentOffset.x / SCREEN_WIDTH;
        },
        onMomentumEnd: (e) => {
            currentIndex.current = Math.round(e.contentOffset.x / SCREEN_WIDTH);
        },
    });

    // Auto-play
    React.useEffect(() => {
        if (!data || data.length <= 1) return;
        const timer = setInterval(() => {
            const next = (currentIndex.current + 1) % data.length;
            flatListRef.current?.scrollToOffset({
                offset: next * SCREEN_WIDTH,
                animated: true,
            });
            currentIndex.current = next;
        }, autoPlayInterval);
        return () => clearInterval(timer);
    }, [data, autoPlayInterval]);

    if (!data || data.length === 0) return null;

    return (
        <View style={[{ gap: 10 }, containerStyle]}>
            <AnimatedFlatList
                ref={flatListRef as any}
                data={data}
                keyExtractor={(_, i) => String(i)}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                renderItem={({ item, index }) => (
                    <View style={{ width: SCREEN_WIDTH, height, alignItems: "center", justifyContent: "center" }}>
                        {renderItem({ item: item as T, index })}
                    </View>
                )}
            />
            {data.length > 1 && (
                <DotPagination count={data.length} activeIndex={activeIndex} />
            )}
        </View>
    );
}
