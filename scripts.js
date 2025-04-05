
document.addEventListener('DOMContentLoaded', function() {
    // API Keys
    const weatherApiKey = 'b50dd7b88727df4568e1904f50e71b15';
    const airQualityApiKey = 'b50dd7b88727df4568e1904f50e71b15'; // Same key for demo
    
    // DOM Elements
    const cityInput = document.getElementById('cityInput');
    const searchBtn = document.getElementById('searchBtn');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const favoritesBtn = document.getElementById('favoritesBtn');
    const favoritesContent = document.getElementById('favoritesContent');
    const cityNameEl = document.getElementById('cityName');
    const dateEl = document.getElementById('date');
    const temperatureEl = document.getElementById('temperature');
    const unitToggle = document.getElementById('unitToggle');
    const descriptionEl = document.getElementById('description');
    const humidityEl = document.getElementById('humidity');
    const windEl = document.getElementById('wind');
    const feelsLikeEl = document.getElementById('feelsLike');
    const uvIndexEl = document.getElementById('uvIndex');
    const airQualityEl = document.getElementById('airQuality');
    const sunTimesEl = document.getElementById('sunTimes');
    const sunriseTimeEl = document.getElementById('sunriseTime');
    const sunsetTimeEl = document.getElementById('sunsetTime');
    const sunProgressEl = document.getElementById('sunProgress');
    const weatherIconImg = document.getElementById('weatherIconImg');
    const weatherAnimationEl = document.getElementById('weatherAnimation');
    const loadingEl = document.getElementById('loading');
    const errorMessageEl = document.getElementById('errorMessage');
    const weatherInfoEl = document.getElementById('weatherInfo');
    const themeToggleBtn = document.getElementById('themeToggle');
    const hourlyForecastEl = document.getElementById('hourlyForecast');
    const dailyForecastEl = document.getElementById('dailyForecast');
    const mapEl = document.getElementById('map');
    
    // State variables
    let currentWeatherData = null;
    let currentUnit = 'metric';
    let map = null;
    let mapMarker = null;
    let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
    
    // Initialize
    updateFavoritesDropdown();
    updateDate();
    
    // Try to get user's location if they allow it
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            error => {
                console.log("Geolocation error:", error);
                fetchWeather('New York');
            }
        );
    } else {
        fetchWeather('New York');
    }
    
    // Theme toggle
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const icon = themeToggleBtn.querySelector('ion-icon');
        if (document.body.classList.contains('dark-theme')) {
            icon.setAttribute('name', 'sunny-outline');
        } else {
            icon.setAttribute('name', 'moon-outline');
        }
    });
    
    // Event Listeners
    searchBtn.addEventListener('click', fetchWeatherFromInput);
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            fetchWeatherFromInput();
        }
    });
    
    favoriteBtn.addEventListener('click', toggleFavorite);
    favoritesBtn.addEventListener('click', () => {
        favoritesContent.classList.toggle('show');
    });
    
    unitToggle.addEventListener('click', toggleUnits);
    
    // Close favorites dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!favoritesBtn.contains(e.target) && !favoritesContent.contains(e.target)) {
            favoritesContent.classList.remove('show');
        }
    });
    
    // Functions
    function fetchWeatherFromInput() {
        const city = cityInput.value.trim();
        if (city) {
            fetchWeather(city);
        }
    }
    
    function fetchWeather(city) {
        // Show loading
        loadingEl.style.display = 'block';
        weatherInfoEl.style.opacity = '0.5';
        errorMessageEl.style.display = 'none';
        
        // API URLs
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${weatherApiKey}&units=${currentUnit}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${weatherApiKey}&units=${currentUnit}`;
        const airQualityUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid=${airQualityApiKey}`;
        
        console.log("Fetching weather for:", city);
        
        // Fetch current weather
        fetch(weatherUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(getErrorMessage(response.status, city));
                }
                return response.json();
            })
            .then(weatherData => {
                currentWeatherData = weatherData;
                
                // Check if city is in favorites
                const favoriteIndex = favorites.findIndex(fav => 
                    fav.city.toLowerCase() === weatherData.name.toLowerCase() && 
                    fav.country === weatherData.sys.country
                );
                
                const favoriteIcon = favoriteBtn.querySelector('ion-icon');
                favoriteBtn.classList.toggle('active', favoriteIndex !== -1);
                favoriteIcon.setAttribute('name', favoriteIndex !== -1 ? 'star' : 'star-outline');
                
                // Fetch forecast
                return fetch(forecastUrl);
            })
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch forecast');
                return response.json();
            })
            .then(forecastData => {
                updateWeatherUI(currentWeatherData, forecastData);
                
                // Fetch air quality if we have coordinates
                if (currentWeatherData.coord) {
                    const aqUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${currentWeatherData.coord.lat}&lon=${currentWeatherData.coord.lon}&appid=${airQualityApiKey}`;
                    return fetch(aqUrl);
                }
                return null;
            })
            .then(aqResponse => {
                if (aqResponse && aqResponse.ok) {
                    return aqResponse.json();
                }
                return null;
            })
            .then(aqData => {
                if (aqData) {
                    updateAirQualityUI(aqData);
                }
                
                // Initialize or update map
                updateMap(currentWeatherData.coord);
                
                loadingEl.style.display = 'none';
                weatherInfoEl.style.opacity = '1';
            })
            .catch(error => {
                console.error("Error:", error);
                loadingEl.style.display = 'none';
                weatherInfoEl.style.opacity = '1';
                showError(error.message);
            });
    }
    
    function fetchWeatherByCoords(lat, lon) {
        // Show loading
        loadingEl.style.display = 'block';
        weatherInfoEl.style.opacity = '0.5';
        errorMessageEl.style.display = 'none';
        
        // API URLs
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=${currentUnit}`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=${currentUnit}`;
        const airQualityUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${airQualityApiKey}`;
        
        console.log("Fetching weather by coordinates:", lat, lon);
        
        // Fetch current weather
        fetch(weatherUrl)
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch weather data');
                return response.json();
            })
            .then(weatherData => {
                currentWeatherData = weatherData;
                cityInput.value = `${weatherData.name}, ${weatherData.sys.country}`;
                
                // Check if city is in favorites
                const favoriteIndex = favorites.findIndex(fav => 
                    `${fav.city},${fav.country}`.toLowerCase() === `${weatherData.name},${weatherData.sys.country}`.toLowerCase()
                );
                
                const favoriteIcon = favoriteBtn.querySelector('ion-icon');
                favoriteBtn.classList.toggle('active', favoriteIndex !== -1);
                favoriteIcon.setAttribute('name', favoriteIndex !== -1 ? 'star' : 'star-outline');
                
                // Fetch forecast
                return fetch(forecastUrl);
            })
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch forecast');
                return response.json();
            })
            .then(forecastData => {
                updateWeatherUI(currentWeatherData, forecastData);
                
                // Fetch air quality
                return fetch(airQualityUrl);
            })
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch air quality');
                return response.json();
            })
            .then(aqData => {
                updateAirQualityUI(aqData);
                
                // Initialize or update map
                updateMap(currentWeatherData.coord);
                
                loadingEl.style.display = 'none';
                weatherInfoEl.style.opacity = '1';
            })
            .catch(error => {
                console.error("Error:", error);
                loadingEl.style.display = 'none';
                weatherInfoEl.style.opacity = '1';
                showError(error.message);
            });
    }
    
    function getErrorMessage(status, city) {
        switch(status) {
            case 400: return "Invalid request. Please check your input.";
            case 401: return "API key error. Please try again later.";
            case 404: return `City "${city}" not found. Try adding country code (e.g., "London,UK")`;
            case 429: return "Too many requests. Please wait before trying again.";
            case 500: case 502: case 503: case 504: 
                return "Server error. Please try again later.";
            default: return "Failed to fetch weather data. Please try again.";
        }
    }
    
    function updateWeatherUI(weatherData, forecastData) {
        // Update current weather
        cityNameEl.textContent = `${weatherData.name}, ${weatherData.sys.country}`;
        temperatureEl.innerHTML = `${Math.round(weatherData.main.temp)}<button class="unit-toggle" id="unitToggle">°${currentUnit === 'metric' ? 'C' : 'F'}</button>`;
        descriptionEl.textContent = weatherData.weather[0].description;
        humidityEl.textContent = `${weatherData.main.humidity}%`;
        windEl.textContent = `${weatherData.wind.speed} ${currentUnit === 'metric' ? 'm/s' : 'mph'}`;
        feelsLikeEl.textContent = `${Math.round(weatherData.main.feels_like)}°${currentUnit === 'metric' ? 'C' : 'F'}`;
        
        // Weather icon
        const iconCode = weatherData.weather[0].icon;
        weatherIconImg.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        weatherIconImg.alt = weatherData.weather[0].description;
        
        // Weather animations
        setupWeatherAnimation(weatherData.weather[0].main, weatherData.weather[0].id);
        
        // UV index (simulated since we don't have real UV data from this API)
        const uvIndex = Math.floor(Math.random() * 11); // 0-10
        updateUvIndex(uvIndex);
        
        // Sunrise/sunset
        const sunrise = new Date(weatherData.sys.sunrise * 1000);
        const sunset = new Date(weatherData.sys.sunset * 1000);
        const now = new Date();
        
        sunriseTimeEl.textContent = sunrise.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        sunsetTimeEl.textContent = sunset.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        sunTimesEl.textContent = `${sunrise.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} / ${sunset.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        
        // Calculate sun progress
        const dayLength = sunset - sunrise;
        const dayProgress = now - sunrise;
        const progressPercent = Math.min(100, Math.max(0, (dayProgress / dayLength) * 100));
        sunProgressEl.style.width = `${progressPercent}%`;
        
        // Update forecast
        updateForecastUI(forecastData);
    }
    
    function updateAirQualityUI(aqData) {
        if (!aqData || !aqData.list || aqData.list.length === 0) return;
        
        const aqi = aqData.list[0].main.aqi;
        let aqiText = '';
        let aqiColor = '';
        
        switch(aqi) {
            case 1:
                aqiText = 'Good';
                aqiColor = 'var(--aqi-good)';
                break;
            case 2:
                aqiText = 'Fair';
                aqiColor = 'var(--aqi-moderate)';
                break;
            case 3:
                aqiText = 'Moderate';
                aqiColor = 'var(--aqi-sensitive)';
                break;
            case 4:
                aqiText = 'Poor';
                aqiColor = 'var(--aqi-unhealthy)';
                break;
            case 5:
                aqiText = 'Very Poor';
                aqiColor = 'var(--aqi-very-unhealthy)';
                break;
            default:
                aqiText = 'Unknown';
                aqiColor = 'var(--aqi-hazardous)';
        }
        
        airQualityEl.innerHTML = `<span class="aqi-index" style="background-color: ${aqiColor}">${aqiText} (${aqi}/5)</span>`;
    }
    
    function updateUvIndex(uvIndex) {
        let uvText = '';
        let uvColor = '';
        
        if (uvIndex <= 2) {
            uvText = 'Low';
            uvColor = 'var(--uv-low)';
        } else if (uvIndex <= 5) {
            uvText = 'Moderate';
            uvColor = 'var(--uv-moderate)';
        } else if (uvIndex <= 7) {
            uvText = 'High';
            uvColor = 'var(--uv-high)';
        } else if (uvIndex <= 10) {
            uvText = 'Very High';
            uvColor = 'var(--uv-very-high)';
        } else {
            uvText = 'Extreme';
            uvColor = 'var(--uv-extreme)';
        }
        
        uvIndexEl.innerHTML = `<span class="uv-index" style="background-color: ${uvColor}">${uvText} (${uvIndex})</span>`;
    }
    
    function updateForecastUI(forecastData) {
        if (!forecastData || !forecastData.list) return;
        
        // Clear previous forecasts
        hourlyForecastEl.innerHTML = '';
        dailyForecastEl.innerHTML = '';
        
        // Get current hour to start hourly forecast from now
        const now = new Date();
        const currentHour = now.getHours();
        
        // Filter to get only one entry per day for daily forecast
        const dailyForecastMap = new Map();
        
        // Process all forecast items
        forecastData.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayKey = date.toLocaleDateString();
            
            // Add to hourly forecast if it's within the next 24 hours
            if (date.getDate() === now.getDate() || 
                (date.getDate() === now.getDate() + 1 && date.getHours() < currentHour)) {
                const hourlyItem = document.createElement('div');
                hourlyItem.className = 'hourly-item';
                hourlyItem.innerHTML = `
                    <div class="hourly-time">${date.getHours()}:00</div>
                    <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="${item.weather[0].description}" />
                    <div class="hourly-temp">${Math.round(item.main.temp)}°</div>
                `;
                hourlyForecastEl.appendChild(hourlyItem);
            }
            
            // For daily forecast, we take the midday forecast for each day
            if (date.getHours() >= 12 && date.getHours() <= 14) {
                if (!dailyForecastMap.has(dayKey)) {
                    dailyForecastMap.set(dayKey, item);
                }
            }
        });
        
        // Also find min/max temps for each day
        const dailyTemps = {};
        forecastData.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayKey = date.toLocaleDateString();
            
            if (!dailyTemps[dayKey]) {
                dailyTemps[dayKey] = {
                    min: item.main.temp_min,
                    max: item.main.temp_max
                };
            } else {
                if (item.main.temp_min < dailyTemps[dayKey].min) {
                    dailyTemps[dayKey].min = item.main.temp_min;
                }
                if (item.main.temp_max > dailyTemps[dayKey].max) {
                    dailyTemps[dayKey].max = item.main.temp_max;
                }
            }
        });
        
        // Add daily forecast items
        dailyForecastMap.forEach((item, dayKey) => {
            const date = new Date(item.dt * 1000);
            const dayName = date.toLocaleDateString([], { weekday: 'short' });
            const dayTemps = dailyTemps[dayKey] || { min: item.main.temp_min, max: item.main.temp_max };
            
            const dailyItem = document.createElement('div');
            dailyItem.className = 'daily-item';
            dailyItem.innerHTML = `
                <div class="daily-day">${dayName}</div>
                <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="${item.weather[0].description}" />
                <div class="daily-temps">
                    <span class="daily-high">${Math.round(dayTemps.max)}°</span>
                    <span class="daily-low">${Math.round(dayTemps.min)}°</span>
                </div>
            `;
            dailyForecastEl.appendChild(dailyItem);
        });
    }
    
    function setupWeatherAnimation(weatherMain, weatherId) {
        weatherAnimationEl.innerHTML = '';
        
        // Clear any previous animations
        weatherAnimationEl.className = 'weather-animation';
        
        // Weather conditions from https://openweathermap.org/weather-conditions
        switch(weatherMain.toLowerCase()) {
            case 'thunderstorm':
                createThunderAnimation();
                break;
            case 'drizzle':
                createRainAnimation(50, 0.7); // Lighter rain
                break;
            case 'rain':
                if (weatherId >= 500 && weatherId <= 504) {
                    createRainAnimation(30, 1); // Light to moderate rain
                } else {
                    createRainAnimation(50, 1.5); // Heavy rain
                }
                break;
            case 'snow':
                createSnowAnimation();
                break;
            case 'clouds':
                if (weatherId === 801 || weatherId === 802) {
                    createCloudAnimation(3, 0.8); // Few/scattered clouds
                } else {
                    createCloudAnimation(5, 0.9); // Broken/overcast clouds
                }
                break;
            case 'clear':
                // No animation for clear sky
                break;
            // Add more cases as needed
        }
    }
    
    function createRainAnimation(dropCount = 40, intensity = 1) {
        const rainContainer = document.createElement('div');
        rainContainer.className = 'rain';
        
        for (let i = 0; i < dropCount; i++) {
            const drop = document.createElement('div');
            drop.className = 'drop';
            drop.style.left = `${Math.random() * 100}%`;
            drop.style.animationDuration = `${0.5 + Math.random() * 0.5 / intensity}s`;
            drop.style.animationDelay = `${Math.random() * 2}s`;
            drop.style.opacity = intensity;
            rainContainer.appendChild(drop);
        }
        
        weatherAnimationEl.appendChild(rainContainer);
    }
    
    function createCloudAnimation(cloudCount = 3, opacity = 0.8) {
        const cloudContainer = document.createElement('div');
        cloudContainer.className = 'cloud';
        
        for (let i = 0; i < cloudCount; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'cloud-item';
            cloud.style.top = `${20 + Math.random() * 20}%`;
            cloud.style.width = `${30 + Math.random() * 40}px`;
            cloud.style.height = `${15 + Math.random() * 20}px`;
            cloud.style.animationDuration = `${10 + Math.random() * 20}s`;
            cloud.style.animationDelay = `${Math.random() * 10}s`;
            cloud.style.opacity = opacity;
            cloudContainer.appendChild(cloud);
        }
        
        weatherAnimationEl.appendChild(cloudContainer);
    }
    
    function createSnowAnimation() {
        const snowContainer = document.createElement('div');
        snowContainer.className = 'snow';
        
        for (let i = 0; i < 30; i++) {
            const flake = document.createElement('div');
            flake.className = 'snowflake';
            flake.innerHTML = '<ion-icon name="snow-outline"></ion-icon>';
            flake.style.left = `${Math.random() * 100}%`;
            flake.style.animationDuration = `${5 + Math.random() * 10}s`;
            flake.style.animationDelay = `${Math.random() * 5}s`;
            snowContainer.appendChild(flake);
        }
        
        weatherAnimationEl.appendChild(snowContainer);
    }
    
    function createThunderAnimation() {
        const thunderContainer = document.createElement('div');
        thunderContainer.className = 'thunder';
        
        // Create lightning bolts
        for (let i = 0; i < 3; i++) {
            const lightning = document.createElement('div');
            lightning.className = 'lightning';
            lightning.style.left = `${10 + Math.random() * 80}%`;
            lightning.style.animationDelay = `${Math.random() * 10}s`;
            thunderContainer.appendChild(lightning);
        }
        
        weatherAnimationEl.appendChild(thunderContainer);
        
        // Also add rain
        createRainAnimation(50, 1.5);
    }
    
    function updateMap(coords) {
        if (!coords) return;
        
        if (!map) {
            // Initialize map
            map = L.map('map').setView([coords.lat, coords.lon], 10);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
        } else {
            // Update map view
            map.setView([coords.lat, coords.lon], 10);
        }
        
        // Remove previous marker if exists
        if (mapMarker) {
            map.removeLayer(mapMarker);
        }
        
        // Add new marker
        mapMarker = L.marker([coords.lat, coords.lon]).addTo(map)
            .bindPopup(`<b>${cityNameEl.textContent}</b>`)
            .openPopup();
    }
    
    function toggleFavorite() {
        if (!currentWeatherData) return;
        
        const cityName = currentWeatherData.name;
        const country = currentWeatherData.sys.country;
        const cityKey = `${cityName},${country}`.toLowerCase();
        
        const favoriteIndex = favorites.findIndex(fav => 
            `${fav.city},${fav.country}`.toLowerCase() === cityKey
        );
        
        const favoriteIcon = favoriteBtn.querySelector('ion-icon');
        
        if (favoriteIndex === -1) {
            // Add to favorites
            favorites.push({
                city: cityName,
                country: country,
                coords: currentWeatherData.coord
            });
            favoriteBtn.classList.add('active');
            favoriteIcon.setAttribute('name', 'star');
        } else {
            // Remove from favorites
            favorites.splice(favoriteIndex, 1);
            favoriteBtn.classList.remove('active');
            favoriteIcon.setAttribute('name', 'star-outline');
        }
        
        // Save to local storage
        localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
        
        // Update favorites dropdown
        updateFavoritesDropdown();
    }
    
    function updateFavoritesDropdown() {
        favoritesContent.innerHTML = '';
        
        if (favorites.length === 0) {
            favoritesContent.innerHTML = '<div class="no-favorites">No favorites yet</div>';
            return;
        }
        
        favorites.forEach((fav, index) => {
            const favItem = document.createElement('div');
            favItem.className = 'favorite-item';
            favItem.innerHTML = `
                <span>${fav.city}, ${fav.country}</span>
                <button class="remove-favorite" data-index="${index}">
                    <ion-icon name="close-outline"></ion-icon>
                </button>
            `;
            
            favItem.addEventListener('click', () => {
                if (fav.coords) {
                    fetchWeatherByCoords(fav.coords.lat, fav.coords.lon);
                } else {
                    fetchWeather(`${fav.city},${fav.country}`);
                }
                favoritesContent.classList.remove('show');
            });
            
            const removeBtn = favItem.querySelector('.remove-favorite');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                favorites.splice(index, 1);
                localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
                updateFavoritesDropdown();
                
                // Update favorite button if this was the current city
                if (currentWeatherData && 
                    currentWeatherData.name === fav.city && 
                    currentWeatherData.sys.country === fav.country) {
                    const favoriteIcon = favoriteBtn.querySelector('ion-icon');
                    favoriteBtn.classList.remove('active');
                    favoriteIcon.setAttribute('name', 'star-outline');
                }
            });
            
            favoritesContent.appendChild(favItem);
        });
    }
    
    function toggleUnits() {
        currentUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
        unitToggle.textContent = `°${currentUnit === 'metric' ? 'C' : 'F'}`;
        
        if (currentWeatherData) {
            if (currentWeatherData.coord) {
                fetchWeatherByCoords(currentWeatherData.coord.lat, currentWeatherData.coord.lon);
            } else {
                fetchWeather(`${currentWeatherData.name},${currentWeatherData.sys.country}`);
            }
        }
    }
    
    function updateDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('en-US', options);
    }
    
    function showError(message) {
        errorMessageEl.textContent = message;
        errorMessageEl.style.display = 'block';
        
        // Hide error after 5 seconds
        setTimeout(() => {
            errorMessageEl.style.display = 'none';
        }, 5000);
    }
});