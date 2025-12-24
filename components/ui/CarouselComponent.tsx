import * as React from "react";
import { Dimensions, View, ViewStyle } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import Carousel, {
    ICarouselInstance,
    Pagination,
} from "react-native-reanimated-carousel";

const PAGE_WIDTH = Dimensions.get('window').width;

interface CarouselComponentProps<T> {
    data: T[];
    renderItem: (info: { item: T; index: number }) => React.ReactElement;
    height?: number;
    autoPlayInterval?: number;
    containerStyle?: ViewStyle;
}

export default function CarouselComponent<T extends object>({
    data,
    renderItem,
    height = PAGE_WIDTH * 0.6,
    autoPlayInterval = 3000,
    containerStyle
}: CarouselComponentProps<T>) {
    const progress = useSharedValue<number>(0);
    const baseOptions = {
        vertical: false,
        width: PAGE_WIDTH,
        height: height,
    };

    const ref = React.useRef<ICarouselInstance>(null);

    const handlePaginationPress = (index: number) => {
        ref.current?.scrollTo({
            count: index - progress.value,
            animated: true,
        });
    };

    if (!data || data.length === 0) {
        return null; // Or return a placeholder if desired
    }

    return (
        <View style={[{ gap: 10 }, containerStyle]}>
            <View style={{ marginBottom: 10 }}>
                <Carousel
                    ref={ref}
                    {...baseOptions}
                    loop
                    autoPlay={true}
                    autoPlayInterval={autoPlayInterval}
                    onProgressChange={progress}
                    style={{ width: PAGE_WIDTH }}
                    data={data}
                    renderItem={(info) => (
                        <View style={{ width: PAGE_WIDTH, alignItems: "center", justifyContent: "center" }}>
                            {renderItem(info)}
                        </View>
                    )}
                />
            </View>

            <Pagination.Basic
                progress={progress}
                data={data}
                dotStyle={{ backgroundColor: "#D1D5DB", borderRadius: 50 }}
                activeDotStyle={{ backgroundColor: "#10B981", borderRadius: 50 }}
                containerStyle={{ gap: 5, marginBottom: 10 }}
                onPress={handlePaginationPress}
            />
        </View>
    );
}
