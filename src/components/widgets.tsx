'use client';

import { useState, useEffect } from 'react';
import { MapPin, Clock } from 'lucide-react';

interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  location: string;
  feelsLike: number;
  forecast?: {
    day: string;
    maxTemp: number;
    minTemp: number;
    icon: string;
  }[];
}

export function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl px-3 py-2 text-white shadow-lg">
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-lg font-bold tracking-tight">{formatTime(time)}</p>
          <p className="text-xs text-slate-400 capitalize">{formatDate(time)}</p>
        </div>
        <Clock className="w-5 h-5 text-purple-400" />
      </div>
    </div>
  );
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const CACHE_KEY = 'weather_cache';
    const CACHE_DURATION = 30 * 60 * 1000;

    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setWeather(data);
          setLoading(false);
          return;
        }
      } catch {
        localStorage.removeItem(CACHE_KEY);
      }
    }

    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const [weatherResponse, forecastResponse] = await Promise.all([
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`
          ),
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`
          ),
        ]);

        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();

        const weatherCode = weatherData.current.weather_code;
        const weatherInfo = getWeatherInfo(weatherCode);

        const newWeather: WeatherData = {
          temperature: Math.round(weatherData.current.temperature_2m),
          description: weatherInfo.description,
          icon: weatherInfo.icon,
          humidity: weatherData.current.relative_humidity_2m,
          windSpeed: Math.round(weatherData.current.wind_speed_10m),
          feelsLike: Math.round(weatherData.current.apparent_temperature),
          location: 'Sua região',
          forecast: forecastData.daily.time.map((day: string, i: number) => ({
            day: new Date(day).toLocaleDateString('pt-BR', { weekday: 'short' }),
            maxTemp: Math.round(forecastData.daily.temperature_2m_max[i]),
            minTemp: Math.round(forecastData.daily.temperature_2m_min[i]),
            icon: getWeatherInfo(forecastData.daily.weather_code[i]).icon,
          })),
        };

        setWeather(newWeather);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: newWeather, timestamp: Date.now() }));
      } catch (err) {
        setError('Erro ao carregar clima');
      } finally {
        setLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          fetchWeather(-23.5505, -46.6333);
        }
      );
    } else {
      fetchWeather(-23.5505, -46.6333);
    }
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl px-3 py-2 text-white shadow-lg">
        <div className="animate-pulse flex items-center gap-2">
          <div className="h-5 w-10 bg-white/30 rounded" />
          <div className="text-2xl">🌤️</div>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl px-3 py-2 text-white shadow-lg">
        <p className="text-xs">Sem dados</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl px-3 py-2 text-white shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <p className="text-2xl font-bold">{weather.temperature}°</p>
            <p className="text-xs text-white/80">{weather.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-xs opacity-80">{weather.humidity}%</span>
          <span className="text-3xl">{weather.icon}</span>
        </div>
      </div>
    </div>
  );
}

function getWeatherInfo(code: number): { description: string; icon: string } {
  const weatherMap: Record<number, { description: string; icon: string }> = {
    0: { description: 'Céu limpo', icon: '☀️' },
    1: { description: 'Principalmente limpo', icon: '🌤️' },
    2: { description: 'Parcialmente nublado', icon: '⛅' },
    3: { description: 'Nublado', icon: '☁️' },
    45: { description: 'Neblina', icon: '🌫️' },
    48: { description: 'Geada', icon: '🌫️' },
    51: { description: 'Garoa leve', icon: '🌧️' },
    53: { description: 'Garoa moderada', icon: '🌧️' },
    55: { description: 'Garoa intensa', icon: '🌧️' },
    61: { description: 'Chuva leve', icon: '🌧️' },
    63: { description: 'Chuva moderada', icon: '🌧️' },
    65: { description: 'Chuva forte', icon: '🌧️' },
    71: { description: 'Neve leve', icon: '🌨️' },
    73: { description: 'Neve moderada', icon: '🌨️' },
    75: { description: 'Neve forte', icon: '❄️' },
    80: { description: 'Pancadas', icon: '🌦️' },
    81: { description: 'Pancadas', icon: '🌦️' },
    82: { description: 'Tempestade', icon: '⛈️' },
    95: { description: 'Tempestade', icon: '⛈️' },
    96: { description: 'Tempestade com granizo', icon: '⛈️' },
    99: { description: 'Tempestade severa', icon: '⛈️' },
  };

  return weatherMap[code] || { description: 'Variável', icon: '🌤️' };
}
