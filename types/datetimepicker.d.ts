declare module '@react-native-community/datetimepicker' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export type DateTimePickerEvent = { type: 'set' | 'dismissed'; nativeEvent: { timestamp: number } };

  export interface DateTimePickerProps extends ViewProps {
    value: Date;
    mode?: 'date' | 'time' | 'datetime';
    display?: any;
    minimumDate?: Date;
    maximumDate?: Date;
    onChange?: (event: DateTimePickerEvent, date?: Date) => void;
  }

  const DateTimePicker: React.ComponentType<DateTimePickerProps>;
  export default DateTimePicker;
}
