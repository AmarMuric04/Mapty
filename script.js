'use strict';
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
// const btnReset = document.querySelector('.btn__reset');
const btnDeleteAll = document.querySelector('.btn__deleteAll');
const btnSort = document.querySelector('.btn__sort');
// const btnContinue = document.querySelector('.btn__continue');
// const btnClose = document.querySelector('.btn__close');
// const modal = document.querySelector('.modal');

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
    if (String(new Date().getDate()).endsWith('3')) {
      word = 'rd';
    } else if (String(new Date().getDate()).endsWith('2')) {
      word = 'nd';
    } else if (String(new Date().getDate()).endsWith('1')) {
      word = 'st';
    } else word = 'th';
    //prettier-ignore
    this.description = `${
      this.type.slice(0, 1).toUpperCase() + this.type.slice(1)} on ${months[this.date.getMonth()]} 
      ${this.date.getDate()}${word}`;
  }
  click() {
    this.clicks++;
    // console.log(this.clicks);
    // console.log(this);
  }
}
class Running extends Workout {
  type = 'running';
  sort = 1;

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
  sort = 2;

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
let map,
  mapEvent,
  markers = [],
  marker,
  sortDr = false,
  sortDi = false,
  sortTy = false,
  word,
  workoutEl;
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
    // btnReset.addEventListener('click', this._openModal.bind(this));
    btnDeleteAll.addEventListener('click', this._deleteAll.bind(this));
    btnSort.addEventListener('click', this._openSortModal.bind(this));
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

    // this.#map.removeEventListener();
    document.body.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        form.classList.add('hidden');
      }
    });
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
    marker = L.marker(workout.coords)
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
    markers.push(marker);
  }
  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${
            workout.description
          } <span class="exit">x</span></h2>
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
           <button class="edit__button _running">EDIT WORKOUT</button>
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
           <button class="edit__button _cycling">EDIT WORKOUT</button>
        </li>`;
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    workoutEl = e.target.closest('.workout');

    // console.log(e.target);

    if (e.target.classList.contains('edit__button')) {
      const form2 = document.createElement('div');
      form2.classList.add('form');
      form2.innerHTML = `<div class="form__row">
            <label class="form__label">Type</label>
            <select class="form__input form__input--type">
              <option value="running">Running</option>
              <option value="cycling">Cycling</option>
            </select>
          </div>
          <div class="form__row">
            <label class="form__label">Distance</label>
            <input class="form__input form__input--distance" placeholder="km" />
          </div>
          <div class="form__row">
            <label class="form__label">Duration</label>
            <input
              class="form__input form__input--duration"
              placeholder="min"
            />
          </div>
          <div class="form__row">
            <label class="form__label">Cadence</label>
            <input
              class="form__input form__input--cadence"
              placeholder="step/min"
            />
          </div>
          <div class="form__row form__row--hidden">
            <label class="form__label">Elev Gain</label>
            <input
              class="form__input form__input--elevation"
              placeholder="meters"
            />
          </div>
          <button class="form__btn">OK</button>`;
      // form2.classList.remove('hidden');
      form2.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') console.log(123);
      });
      e.target.closest('.workout').replaceWith(form2);
    }

    if (!workoutEl || e.target.classList.contains('edit__button')) return;
    const workout = this.#workouts.find(
      (e, i) => e.id === workoutEl.dataset.id
    );
    if (e.target.classList.contains('exit')) {
      workoutEl.remove();
      this.#workouts.splice(
        this.#workouts.findIndex(e => e.id === workoutEl.dataset.id),
        1
      );
      this._setLocalStorage();
      location.reload();
    }

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
  // _reset() {
  //   localStorage.removeItem('workouts');
  //   location.reload();
  // }
  // _openModal() {
  //   document.body.addEventListener('keydown', function (e) {
  //     if (e.key === 'Escape') {
  //       modal.classList.add('hidden');
  //       document.querySelector('.sidebar').style.filter = 'blur(0px)';
  //       document.querySelector('.buttons').style.filter = 'blur(0px)';
  //       document.querySelector('#map').style.filter = 'blur(0px)';
  //     }
  //   });
  //   modal.classList.remove('hidden');
  //   document.querySelector('.sidebar').style.filter = 'blur(5px)';
  //   document.querySelector('.buttons').style.filter = 'blur(5px)';
  //   document.querySelector('#map').style.filter = 'blur(5px)';
  //   modal.style.filter = 'blur(0px)';
  //   btnContinue.addEventListener('click', this._reset.bind(this));
  //   btnClose.addEventListener('click', function () {
  //     modal.classList.add('hidden');
  //     document.querySelector('.sidebar').style.filter = 'blur(0px)';
  //     document.querySelector('.buttons').style.filter = 'blur(0px)';
  //     document.querySelector('#map').style.filter = 'blur(0px)';
  //   });
  // }
  _deleteAll() {
    document.querySelectorAll('.workout').forEach(a => {
      a.remove();
      markers.forEach(e => e.remove(a.coords));
    });

    this.#workouts.splice(0, this.#workouts.length);
    localStorage.removeItem('workouts');
  }
  _openSortModal() {
    document.querySelector('.sort__options').classList.toggle('hidden');
    document
      .querySelector('.sortby__duration')
      .addEventListener('click', this._helperDuration.bind(this));
    document
      .querySelector('.sortby__distance')
      .addEventListener('click', this._helperDistance.bind(this));
    document
      .querySelector('.sortby__type')
      .addEventListener('click', this._helperType.bind(this));
    document
      .querySelector('.original')
      .addEventListener('click', this._sortOriginal.bind(this));
  }
  _helperDuration() {
    this._sortByDuration.call(this, !sortDr);
    sortDr = !sortDr;
  }
  _helperDistance() {
    this._sortByDistance.call(this, !sortDi);
    sortDi = !sortDi;
  }
  _helperType() {
    this._sortByType.call(this, !sortTy);
    sortTy = !sortTy;
  }
  _sortByDuration(sort) {
    document.querySelectorAll('.workout').forEach(a => {
      a.remove();
    });
    sortDr
      ? this.#workouts.sort((a, b) => a.duration - b.duration)
      : this.#workouts.sort((a, b) => b.duration - a.duration);
    this.#workouts.forEach(e => this._renderWorkout(e));
    sortTy = sortDi = true;
  }
  _sortByDistance(sort) {
    document.querySelectorAll('.workout').forEach(a => {
      a.remove();
    });
    sortDi
      ? this.#workouts.sort((a, b) => a.distance - b.distance)
      : this.#workouts.sort((a, b) => b.distance - a.distance);
    this.#workouts.forEach(e => this._renderWorkout(e));
    sortDr = sortTy = true;
  }
  _sortByType(sort) {
    document.querySelectorAll('.workout').forEach(a => {
      a.remove();
    });
    sortTy
      ? this.#workouts.sort((a, b) => a.sort - b.sort)
      : this.#workouts.sort((a, b) => b.sort - a.sort);
    this.#workouts.forEach(e => this._renderWorkout(e));
    sortDr = sortDi = true;
  }
  _sortOriginal(sort) {
    document.querySelectorAll('.workout').forEach(a => {
      a.remove();
    });
    this.#workouts.sort((a, b) => a.id - b.id);
    this.#workouts.forEach(e => this._renderWorkout(e));
  }
}
const app = new App();
