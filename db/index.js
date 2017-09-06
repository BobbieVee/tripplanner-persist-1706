const Sequelize = require('sequelize');

const conn = new Sequelize(process.env.DATABASE_URL, {
  logging: false
});

const Day = conn.define('day', {

});

const Hotel = conn.define('hotel', {
  name: Sequelize.STRING
});

const Restaurant = conn.define('restaurant', {
  name: Sequelize.STRING
});

const Activity = conn.define('activity', {
  name: Sequelize.STRING
});

const Place = conn.define('place', {
  location: Sequelize.ARRAY(Sequelize.FLOAT)
});

Day.belongsToMany(Hotel, { through: 'days_hotels'});
Day.belongsToMany(Restaurant, { through: 'days_restaurants'});
Day.belongsToMany(Activity, { through: 'days_activities'});

Hotel.belongsTo(Place);
Restaurant.belongsTo(Place);
Activity.belongsTo(Place);


//Days Class functions
Day.removeItem = function(dayId, itemId, key) {
  const modelSelector = {
    'restaurants': Restaurant,
    'hotels': Hotel,
    'activities': Activity
  }
  const model = modelSelector[key];
  // creating the remove model command via manipulating the key string;
  const removeModel = `remove${key.charAt(0).toUpperCase()}${key.slice(1)}`;

  return Day.findOne({
    where: {
      id: dayId
    },
    include: [{
      model: model,
      where: {
        id: itemId
      }
    }]
  })
  .then((day) => {
    //Separating out the "included" item
    const item =  day[key][0];
    return day[removeModel](item);
  });
};

Day.addItem = function(dayId, itemId, key) {
  const modelSelector = {
    'restaurants': Restaurant,
    'hotels': Hotel,
    'activities': Activity
  }
  let model = modelSelector[key];

  //creating the add model command via manipulating the key string(nice Mike!);
  const addModel = `add${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  const _item = model.findOne({where: { id: itemId }})
  const _day = Day.findOne({where: { id: dayId }})

  return Promise.all([ _day, _item ])
  .then(([ day, item ]) => {
    return day[addModel](item);
  })
};


//sync and seed
const sync = ()=> {
  return conn.sync({ force: true });
};

const seed = ()=> {
  var data = require('./seed.js');
  const { hotels, restaurants, activities } = data;
  const options = {
    include: [ Place ]
  };
  let tripOptions;
  return Promise.all([
    Promise.all(hotels.map( item => Hotel.create(item, options))),
    Promise.all(restaurants.map( item => Restaurant.create(item, options))),
    Promise.all(activities.map( item => Activity.create(item, options)))
  ])
  .then( ([ hotels, restaurants, activities ])=> {
    return {
      hotels,
      restaurants,
      activities
    };
  })
  .then( _tripOptions => {
    tripOptions = _tripOptions;
    return Promise.all([
      Day.create(),
      Day.create()
    ])
  })
  .then(([day1, day2])=> {
    return Promise.all([
      day1.addHotel(tripOptions.hotels[0]),
      day1.addRestaurant(tripOptions.restaurants[0]),
      day1.addRestaurant(tripOptions.restaurants[1]),
      day1.addActivity(tripOptions.activities[0]),
      day2.addHotel(tripOptions.hotels[1]),
      day2.addRestaurant(tripOptions.restaurants[2]),
      day2.addRestaurant(tripOptions.restaurants[3]),
      day2.addActivity(tripOptions.activities[2])
    ])
  });
};

module.exports = {
  sync,
  seed,
  models: {
    Hotel,
    Restaurant,
    Activity,
    Place,
    Day
  }
};
