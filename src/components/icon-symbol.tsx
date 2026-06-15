import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

export type IconSymbolName = SymbolViewProps['name'];

/** Thin wrapper over SF Symbols (iOS-first). */
export function IconSymbol({
  name,
  size = 26,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: ColorValue;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      resizeMode="scaleAspectFit"
      style={style}
    />
  );
}
