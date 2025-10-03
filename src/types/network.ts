export interface WifiNetwork {
  id: string;
  ssid: string;
  bandwidthMbps: number;
  security: 'WPA3' | 'WPA2' | 'Open';
  shareable: boolean;
}
