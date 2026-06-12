import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

export type LeafletMapPoint = {
  latitude: number;
  longitude: number;
};

export type LeafletMapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  color?: string;
  label?: string;
  actionLabel?: string;
};

export type LeafletMapCircle = {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  strokeColor?: string;
  fillColor?: string;
  fillOpacity?: number;
};

export type LeafletMapPolyline = {
  id: string;
  coordinates: LeafletMapPoint[];
  color?: string;
  weight?: number;
  dashArray?: string;
  opacity?: number;
};

type LeafletMapPayload = {
  center: LeafletMapPoint;
  zoom: number;
  fitToData: boolean;
  markers: LeafletMapMarker[];
  circles: LeafletMapCircle[];
  polylines: LeafletMapPolyline[];
};

export interface LeafletMapViewProps {
  center: LeafletMapPoint;
  zoom?: number;
  fitToData?: boolean;
  markers?: LeafletMapMarker[];
  circles?: LeafletMapCircle[];
  polylines?: LeafletMapPolyline[];
  style?: StyleProp<ViewStyle>;
  onMarkerPress?: (id: string) => void;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function buildHtml(initialPayload: LeafletMapPayload) {
  const initialData = safeJson(initialPayload);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body, #map {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        background: #e8eef2;
        overflow: hidden;
      }

      .leaflet-container {
        font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: #e8eef2;
      }

      .cr-watermark {
        position: absolute;
        left: 14px;
        bottom: 14px;
        z-index: 500;
        background: rgba(15, 23, 42, 0.78);
        color: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 9999px;
        padding: 8px 12px;
        font-size: 11px;
        letter-spacing: 0.04em;
        font-weight: 700;
        box-shadow: 0 14px 30px rgba(15, 23, 42, 0.18);
        pointer-events: none;
      }

      .cr-watermark span {
        color: #7dd3fc;
      }

      .cr-marker {
        width: 34px;
        height: 34px;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.96);
        border: 2px solid var(--marker-color, #2563eb);
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.24);
        display: grid;
        place-items: center;
        transform: translate(-50%, -50%);
      }

      .cr-marker__core {
        width: 22px;
        height: 22px;
        border-radius: 9999px;
        background: var(--marker-color, #2563eb);
        color: #fff;
        display: grid;
        place-items: center;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.04em;
      }

      .cr-marker--warning .cr-marker__core {
        background: #dc2626;
      }

      .cr-marker--success .cr-marker__core {
        background: #059669;
      }

      .cr-popup {
        min-width: 180px;
        max-width: 240px;
        font-size: 13px;
      }

      .cr-popup__title {
        font-weight: 800;
        font-size: 14px;
        color: #0f172a;
        margin-bottom: 6px;
      }

      .cr-popup__description {
        color: #475569;
        line-height: 1.45;
        margin-bottom: 10px;
      }

      .cr-popup__button {
        appearance: none;
        border: none;
        border-radius: 9999px;
        background: #0f172a;
        color: #fff;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
      }

      .cr-popup__button:active {
        transform: scale(0.98);
      }
    </style>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  </head>
  <body>
    <div id="map"></div>
    <div class="cr-watermark">CrisisRespond <span>Leaflet</span> Voyager</div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      (function () {
        var initialPayload = ${initialData};
        var map = L.map('map', {
          zoomControl: true,
          preferCanvas: true,
          attributionControl: true,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 20,
          subdomains: 'abcd',
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        }).addTo(map);

        var markerLayer = L.layerGroup().addTo(map);
        var circleLayer = L.layerGroup().addTo(map);
        var lineLayer = L.layerGroup().addTo(map);

        function escapeHtml(value) {
          return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        }

        function createMarkerIcon(marker) {
          var cssClass = 'cr-marker';
          if (marker.color === '#dc2626') cssClass += ' cr-marker--warning';
          if (marker.color === '#059669') cssClass += ' cr-marker--success';
          var style = '--marker-color:' + (marker.color || '#2563eb') + ';';
          var label = escapeHtml(marker.label || '•');
          return L.divIcon({
            className: '',
            html: '<div class="' + cssClass + '" style="' + style + '"><div class="cr-marker__core">' + label + '</div></div>',
            iconSize: [34, 34],
            iconAnchor: [17, 17],
            popupAnchor: [0, -15],
          });
        }

        function buildPopup(marker) {
          var html = '<div class="cr-popup"><div class="cr-popup__title">' + escapeHtml(marker.title) + '</div>';
          if (marker.description) {
            html += '<div class="cr-popup__description">' + escapeHtml(marker.description) + '</div>';
          }
          if (marker.actionLabel) {
            html += '<button class="cr-popup__button" type="button" onclick="window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:\'marker-press\', id:' + JSON.stringify(marker.id) + '}))">' + escapeHtml(marker.actionLabel) + '</button>';
          }
          html += '</div>';
          return html;
        }

        function fitToData(bounds) {
          if (!bounds.isValid()) return;
          if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
            map.setView(bounds.getCenter(), initialPayload.zoom || 15);
            return;
          }
          map.fitBounds(bounds, { padding: [36, 36], maxZoom: 18 });
        }

        function render(payload) {
          markerLayer.clearLayers();
          circleLayer.clearLayers();
          lineLayer.clearLayers();

          var bounds = L.latLngBounds([]);
          var hasData = false;

          (payload.circles || []).forEach(function (circle) {
            var circleMarker = L.circle([circle.latitude, circle.longitude], {
              radius: circle.radius,
              color: circle.strokeColor || '#ef4444',
              fillColor: circle.fillColor || 'rgba(239, 68, 68, 0.22)',
              fillOpacity: circle.fillOpacity == null ? 0.22 : circle.fillOpacity,
              weight: 2,
            });
            circleMarker.addTo(circleLayer);
            var circleBounds = circleMarker.getBounds();
            bounds.extend(circleBounds.getNorthEast());
            bounds.extend(circleBounds.getSouthWest());
            hasData = true;
          });

          (payload.polylines || []).forEach(function (line) {
            if (!line.coordinates || !line.coordinates.length) return;
            var coords = line.coordinates.map(function (point) { return [point.latitude, point.longitude]; });
            var polyline = L.polyline(coords, {
              color: line.color || '#10b981',
              weight: line.weight || 4,
              opacity: line.opacity == null ? 0.95 : line.opacity,
              dashArray: line.dashArray,
            });
            polyline.addTo(lineLayer);
            var lineBounds = polyline.getBounds();
            bounds.extend(lineBounds.getNorthEast());
            bounds.extend(lineBounds.getSouthWest());
            hasData = true;
          });

          (payload.markers || []).forEach(function (marker) {
            var leafletMarker = L.marker([marker.latitude, marker.longitude], {
              icon: createMarkerIcon(marker),
            });
            leafletMarker.bindPopup(buildPopup(marker), { closeButton: true, autoPan: true });
            leafletMarker.addTo(markerLayer);
            bounds.extend([marker.latitude, marker.longitude]);
            hasData = true;
          });

          if (payload.fitToData && hasData) {
            fitToData(bounds);
          } else {
            map.setView([payload.center.latitude, payload.center.longitude], payload.zoom || 16, { animate: false });
          }
        }

        window.__updateMap = function (payload) {
          render(payload);
        };

        window.__setCenter = function (point, zoom) {
          map.setView([point.latitude, point.longitude], zoom || initialPayload.zoom || 16, { animate: false });
        };

        render(initialPayload);

        setTimeout(function () {
          map.invalidateSize(true);
        }, 200);

        window.addEventListener('resize', function () {
          map.invalidateSize(true);
        });
      })();
    </script>
  </body>
</html>`;
}

export default function LeafletMapView({
  center,
  zoom = 16,
  fitToData = true,
  markers = [],
  circles = [],
  polylines = [],
  style,
  onMarkerPress,
}: LeafletMapViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  const payload = useMemo<LeafletMapPayload>(() => ({
    center,
    zoom,
    fitToData,
    markers,
    circles,
    polylines,
  }), [center, zoom, fitToData, markers, circles, polylines]);

  const html = useMemo(() => buildHtml(payload), [payload]);

  useEffect(() => {
    if (!ready) return;
    const message = `window.__updateMap(${safeJson(payload)}); true;`;
    webViewRef.current?.injectJavaScript(message);
  }, [payload, ready]);

  const handleMessage = (event: WebViewMessageEvent) => {
    if (!onMarkerPress) return;
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === 'marker-press' && data.id != null) {
        onMarkerPress(String(data.id));
      }
    } catch {
      // Ignore malformed messages from the webview.
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        onLoadEnd={() => setReady(true)}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        bounces={false}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#0f172a" />
          </View>
        )}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8eef2',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8eef2',
  },
});