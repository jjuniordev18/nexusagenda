'use client';

import { useState, useEffect } from 'react';

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

  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const dateLabel = time.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="before:absolute before:bg-sky-500 before:w-1.5 before:h-9 before:top-[4.25rem] before:-right-1.5 before:-z-10 before:rounded-2xl before:shadow-inner before:shadow-gray-50 relative w-28 h-28 bg-sky-500 shadow-inner shadow-gray-50 flex justify-center items-center rounded-2xl">
      <div className="w-24 h-24 bg-neutral-900 shadow-inner shadow-gray-50 flex justify-center items-center rounded-2xl">
        <div className="flex flex-col items-center justify-center rounded-xl bg-neutral-900 shadow-inner shadow-gray-50 w-[5.5rem] h-[5.5rem]">
          <div className="before:absolute before:w-5 before:h-5 before:bg-orange-800 before:rounded-full before:blur-lg before:top-9 relative flex flex-col justify-around items-center w-20 h-[4.6rem] bg-neutral-900 text-gray-50">
            <span className="capitalize text-[9px] leading-none">{dateLabel}</span>
            <span className="z-10 flex items-center text-3xl text-amber-600 [text-shadow:_1px_1px_#fff,_1px_1px_#fff]">
              {hours}
              <span className="text-base font-bold text-gray-50 [text-shadow:none]">:</span>
              {minutes}
            </span>
            <div className="text-gray-50 w-16 flex flex-row justify-evenly">
              <span className="text-[7px] font-bold leading-none">BPM</span>
              <div className="flex flex-row items-center">
                <svg y="0" xmlns="http://www.w3.org/2000/svg" x="0" width="100" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" height="100" className="w-2.5 h-2.5 fill-red-500 animate-pulse">
                  <path fillRule="evenodd" d="M23,27.6a15.8,15.8,0,0,1,22.4,0L50,32.2l4.6-4.6A15.8,15.8,0,0,1,77,50L50,77,23,50A15.8,15.8,0,0,1,23,27.6Z" />
                </svg>
                <svg y="0" xmlns="http://www.w3.org/2000/svg" x="0" width="100" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" height="100" className="w-2.5 h-2.5 fill-gray-50">
                  <path d="M80.2,40.7l-1.1-2-.2-.3.3-.3c2.2-14.7-21.3-25.6-20.7-21S57,38.1,45.4,31.8c-9.3-5.1-12.9,12.1-22.8,33.7C16.2,79.4,20.8,82.3,27,81l.3.4L29,83.3a1.4,1.4,0,0,0,1.8.5l.9-.3a1.6,1.6,0,0,0,1.1-1.9l-.5-2.5a38.2,38.2,0,0,0,4.5-2.7L38.6,78a1.8,1.8,0,0,0,2.4-.1l1.2-1.1a1.9,1.9,0,0,0,.4-1.9l-1-2.5L45.5,69l1.7,1.6a1.8,1.8,0,0,0,2.4-.1l.9-1a1.7,1.7,0,0,0,.4-1.8L50,65c5.6-5,11.9-10.9,17.3-15.8l.4.2,1.9,1.1a1.6,1.6,0,0,0,2.1-.2l.8-.8a1.6,1.6,0,0,0,.3-2.1l-1.3-2.1,3.2-3.1,2.2,1.5a1.8,1.8,0,0,0,2.2-.1l.8-.8A1.7,1.7,0,0,0,80.2,40.7Z" />
                </svg>
                <svg y="0" xmlns="http://www.w3.org/2000/svg" x="0" width="100" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" height="100" className="w-2.5 h-2.5 fill-gray-50">
                  <path fillRule="evenodd" d="M59.5,20.5a3.9,3.9,0,0,0-2.5-2,4.3,4.3,0,0,0-3.3.5,11.9,11.9,0,0,0-3.2,3.5,26,26,0,0,0-2.3,4.4,76.2,76.2,0,0,0-3.3,10.8,120.4,120.4,0,0,0-2.4,14.2,11.4,11.4,0,0,1-3.8-4.2c-1.3-2.7-1.5-6.1-1.5-10.5a4,4,0,0,0-2.5-3.7,3.8,3.8,0,0,0-4.3.9,27.7,27.7,0,1,0,39.2,0,62.4,62.4,0,0,1-5.3-5.8A42.9,42.9,0,0,1,59.5,20.5ZM58.4,70.3a11.9,11.9,0,0,1-20.3-8.4s3.5,2,9.9,2c0-4,2-15.9,5-17.9a21.7,21.7,0,0,0,5.4,7.5,11.8,11.8,0,0,1,3.5,8.4A12,12,0,0,1,58.4,70.3Z" />
                </svg>
              </div>
            </div>
          </div>
          <span className="text-gray-500 text-[9px] font-semibold tracking-wider leading-none mt-0.5">fitbit</span>
        </div>
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
      <div className="overflow-hidden bg-gradient-to-r from-sky-400 via-sky-500 to-sky-700 rounded-lg [box-shadow:6px_6px_0px_0px_#0d0d0d] backdrop-blur-md border border-neutral-600">
        <div className="animate-pulse flex items-center gap-2 p-2">
          <div className="h-6 w-12 bg-white/30 rounded" />
          <div className="h-4 w-16 bg-white/30 rounded" />
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-gradient-to-r from-slate-600 to-slate-700 rounded-lg [box-shadow:6px_6px_0px_0px_#0d0d0d] border border-neutral-600">
        <p className="text-sm text-white/80 p-2">Sem dados</p>
      </div>
    );
  }

  const today = weather.forecast?.[0];

  return (
    <div className="group hover:-rotate-0 [transform:rotate3d(1_,-1,_1,_8deg)] duration-500 overflow-hidden bg-gradient-to-r from-sky-400 via-sky-500 to-sky-700 rounded-lg hover:shadow-lg [box-shadow:6px_6px_0px_0px_#0d0d0d] backdrop-blur-md border border-neutral-600">
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="text-xl leading-none">{weather.icon}</span>
        <div className="leading-tight whitespace-nowrap">
          <p className="text-base font-bold text-white">{weather.temperature}°</p>
          {today && (
            <p className="text-[10px] text-white/85">
              <span className="font-semibold">{today.maxTemp}°</span>
              <span className="mx-0.5 text-white/60">/</span>
              <span>{today.minTemp}°</span>
            </p>
          )}
        </div>
        <div className="border-l border-white/25 pl-2 flex items-center gap-1 whitespace-nowrap">
          <span className="text-sm leading-none">💨</span>
          <span className="text-[10px] text-white/90">{weather.windSpeed} km/h</span>
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
