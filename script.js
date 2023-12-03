'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; //in km/h
    this.duration = duration; //in mins
  }
  _setDescription() {
    //prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    //prettier-ignore
    this.description = `${
      this.type.slice(0, 1).toUpperCase() + this.type.slice(1)} on ${months[this.date.getMonth()]} 
      ${String(this.date.getDate()).padStart(2, 0)}`;
  }
  click() {
    this.clicks++;
    // console.log(this.clicks);
    // console.log(this);
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence, id, clicks) {
    super(coords, distance, duration);

    this.cadence = cadence;
    this.id = id;
    this.clicks = clicks;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elavationGain, id, clicks) {
    super(coords, distance, duration);

    this.elavationGain = elavationGain;
    this.id = id;
    this.clicks = clicks;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // min/km
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

let map, mapEvent;
class App {
  #mapZoomLevel = 13;
  #map;
  #mapEvent;
  #workouts = [];
  constructor() {
    //Get user's position
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }
  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Could not get your position.');
      }
    );
  }
  _loadMap(position) {
    {
      const { latitude } = position.coords;
      const { longitude } = position.coords;
      // console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);

      const coords = [latitude, longitude];

      this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

      L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(this.#map);

      //Handling clicks on map
      this.#map.on('click', this._showForm.bind(this));
      this.#workouts.forEach(work => {
        this._renderWorkoutMarker(work);
      });
    }
  }
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
    this.#map.removeEventListener();
  }
  _hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    setTimeout(() => (form.style.display = 'grid'), 100);
  }
  _toggleElevationField() {
    inputElevation.closest('div').classList.toggle('form__row--hidden');
    inputCadence.closest('div').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const isPositive = (...inputs) => inputs.every(inp => inp > 0);
    const isEmpty = (...inputs) => inputs.every(inp => inp !== '');

    e.preventDefault();

    //get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;

    let workout;

    //if activity is running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !isPositive(distance, duration, cadence) ||
        !isEmpty(distance, duration, cadence)
      )
        return;

      workout = new Running(
        [lat, lng],
        distance,
        duration,
        cadence,
        `${String(Date.now()).slice(-10)}`,
        0
      );
    }
    //if activity is cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !isPositive(distance, duration) ||
        !isEmpty(distance, duration, elevation)
      )
        return;
      workout = new Cycling(
        [lat, lng],
        distance,
        duration,
        elevation,
        `${String(Date.now()).slice(-10)}`,
        0
      );
    }
    //add new workout array
    this.#workouts.push(workout);

    //render new workout on map as marker
    this._renderWorkoutMarker(workout);
    //render workout on list
    this._renderWorkout(workout);
    //hude form + clear input fields
    this._hideForm();
    //Display marker

    //set local storage to all workouts
    this._setLocalStorage();

    this.#map.on('click', this._showForm.bind(this));
    form.removeEventListener('submit', this._newWorkout.bind(this));
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🚶‍♂️' : '🚴‍♂️'} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
`;
    if (workout.type === 'running')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    else
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}6</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elavationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(e => e.id === workoutEl.dataset.id);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    //using the public interface
    workout.click();
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    //data removes the prototype chain, so we need to readd the proto chain
    data.forEach(e => {
      if (e.type === 'running') {
        this.#workouts.push(
          new Running(
            e.coords,
            e.distance,
            e.duration,
            e.cadence,
            e.id,
            e.clicks
          )
        );
      }
      if (e.type === 'cycling') {
        this.#workouts.push(
          new Cycling(
            e.coords,
            e.distance,
            e.duration,
            e.elavationGain,
            e.id,
            e.clicks
          )
        );
      }
    });
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  reset() {
    this.#workouts.forEach(e => localStorage.removeItem(`${e.id}-clicks`));
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycle1 = new Running([39, -12], 27, 95, 523);

// console.log(cycle1);
// console.log(run1);
