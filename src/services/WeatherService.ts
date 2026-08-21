import { WeatherStatus } from '../types/neural';

class WeatherService {
  private currentWeather: WeatherStatus = {
    temperature: 26,
    condition: 'Clear Sky',
    windSpeed: 12,
    humidity: 42,
    city: 'Tashkent',
    isDay: true
  };

  private listeners: ((status: WeatherStatus) => void)[] = [];

  constructor() {
    this.fetchWeather();
    // Refresh weather every 15 minutes
    if (typeof window !== 'undefined') {
      setInterval(() => this.fetchWeather(), 15 * 60 * 1000);
    }
  }

  public async fetchWeather(): Promise<WeatherStatus> {
    try {
      // Default to Tashkent (41.2995, 69.2401) or browser geolocation
      let lat = 41.2995;
      let lon = 69.2401;
      let cityName = 'Tashkent';

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m`
      );

      if (res.ok) {
        const data = await res.json();
        const current = data.current;
        const temp = Math.round(current.temperature_2m);
        const wind = Math.round(current.wind_speed_10m);
        const humidity = current.relative_humidity_2m;
        const isDay = current.is_day === 1;
        const condition = this.interpretWeatherCode(current.weather_code);

        this.currentWeather = {
          temperature: temp,
          condition,
          windSpeed: wind,
          humidity,
          city: cityName,
          isDay
        };
        this.notify();
      }
    } catch {
      // Keep existing default
    }
    return this.currentWeather;
  }

  private interpretWeatherCode(code: number): string {
    if (code === 0) return 'Clear Sky';
    if (code === 1 || code === 2 || code === 3) return 'Partly Cloudy';
    if (code >= 45 && code <= 48) return 'Foggy Atmosphere';
    if (code >= 51 && code <= 67) return 'Light Rain';
    if (code >= 71 && code <= 77) return 'Snow Fall';
    if (code >= 80 && code <= 82) return 'Rain Showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Optimal Atmospheric Conditions';
  }

  public subscribe(callback: (status: WeatherStatus) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentWeather);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentWeather));
  }

  public getWeather(): WeatherStatus {
    return this.currentWeather;
  }
}

export const weatherService = new WeatherService();
