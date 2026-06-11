import React from 'react';
import { View } from 'react-native';

const MapView = ({ children, style }) => <View style={style}>{children}</View>;
export const Marker = () => null;
export const Polyline = () => null;
export const Circle = () => null;
export const PROVIDER_GOOGLE = 'google';

export default MapView;
