//////////////////////////
// Dependencies
//////////////////////////
const mongoose = require("mongoose");
const path = require('path')
const axios = require("axios").default;
const express = require('express')
const app = express()
const PORT = process.env.PORT || 8000
const cors = require('cors');
require('dotenv').config()

//////////////////////////
// Globals
//////////////////////////
// List of urls our API will accept calls from
// const whitelist = ['http://localhost:3000']

// const corsOptions = {
//     origin: function (origin, callback) {
//         if (whitelist.indexOf(origin) !== -1) {
//             callback(null, true);
//         } else {
//             callback(new Error('Not allowed by CORS'));
//         }
//     },
// };

//////////////////////////
// Database
//////////////////////////

const db = mongoose.connection
const MONGODB_URI =
    process.env.MONGODB_URL || 'mongodb://localhost:27017/goatrankertwo';

//...farther down the page

// Error / Disconnection
mongoose.connection.on('error', (err) =>
    console.log(err.message + ' is Mongod not running?')
);
mongoose.connection.on('disconnected', () => console.log('mongo disconnected'));

//...farther down the page

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.once('open', () => {
    console.log('connected to mongoose...');
});


//////////////////////////
// Models
//////////////////////////

const Artist = require("./models/artistSchema.js");
const User = require("./models/userSchema.js");
const Category = require("./models/categorySchema.js");

//////////////////////////
// Middleware
//////////////////////////

// app.use(cors(corsOptions)) // cors middlewear, configured by corsOptions
app.use(express.json())
app.use(express.static('build'))

//////////////////////////
// Sessions
//////////////////////////

app.use(
    session({
      secret: process.env.SECRET,
      resave: false,
      saveUninitialized: false,
    })
  )


////////////////
//Authorization Middleware
////////////////

const authCheck = (req, res, next) => {
    if (req.session.currentUser) {
      return next();
    } else {
      res.redirect('/');
    }
  };

//////////////////////////
// API
//////////////////////////
//////////////////////////
// Spotify
//////////////////////////
var SpotifyWebApi = require("spotify-web-api-node");

var clientId = process.env.CLIENTID,
  clientSecret = process.env.CLIENTSECRET;

// Create the api object with the credentials
var spotifyApi = new SpotifyWebApi({
  clientId: clientId,
  clientSecret: clientSecret
});

const authTheApp = () => {

  // Retrieve an access token.
spotifyApi.clientCredentialsGrant().then(
    function (data) {
      console.log('The access token expires in ' + data.body['expires_in']);
      console.log('The access token is ' + data.body['access_token']);

      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body['access_token']);
    },
    function (err) {
      console.log('Something went wrong when retrieving an access token', err);
    }
  );
}  

authTheApp()
// setInterval(authTheApp, 1200000)

// All controllers go here

// End controllers

app.get('/', (req, res) => {
  res.send('hello')
})

// General Search for all of spotify's artists. 
// Just like searching on the real spotify app
app.get(`/search/:searchParam`, async (req, res) => {
  try {
  const pull = await spotifyApi.searchArtists(req.params.searchParam)
    res.status(200).json(pull)
  } catch (error) {
    res.status(400).json(error)
  }      
});

/*
Artist show
If the artist that is selected is not in our goat database we will
add them to it
This is so we can display any votes on the artist show page
*////////////////////////////////
app.get("/artist/:id", async (req, res) => {
  try {
    const foundArtist = await spotifyApi.getArtist(req.params.id)
    const foundTracks = await spotifyApi.getArtistTopTracks(req.params.id,  "GB")
    const goatSearch = await Artist.find({
      spotifyId: foundArtist.body.id
    }, async (err, found) => {
      if (found.length === 1){
        console.log(`${found[0].name} already exists in GOAT DB`);
      } else {
        const goat = await Artist.create({
          name: foundArtist.body.name,
          spotifyId: foundArtist.body.id,
          images: foundArtist.body.images,
          popularity: foundArtist.body.popularity,
          genres: foundArtist.body.genres,
          followers: foundArtist.body.followers.total,
        },
        (err, createdArtist) => {
          if (err) {
            console.log(err);
          } else {
            const newGoat = createdArtist
            return newGoat
          } 
        })
      }
    })
    res.status(200).json({
      artist: foundArtist,
      tracks: foundTracks,
      goatData: goatSearch || newGoat
    })
  } catch (error) {
    res.status(400).json(error)
  }  
});

// votes for the category
app.post("/categories/:genre", async (req, res) => {
  try {
    const catCheck = await Category.findOne({name: req.body.genre},
      (err, foundCategory) => {
        if (err) {
          console.log(err);
        } else {
          return foundCategory
        }
      })
      const createCat = await catCheck? "Already Created": Category.create({
        name: req.body.name,
        userVotes: {
          artistId: req.body.artistId,
          user_id: req.body.user_id,
        },
      },
      (err, createdCategory) => {
        if (err) {
          console.log(err);
        } else {
          return createdCategory
        }
      })
      res.status(200).json({
        catCheck: catCheck,
        createCat: createCat
      })
  } catch (error) {
    res.status(400)
  }
});


//////////////////////////
// Listener
//////////////////////////
app.listen(PORT, () => console.log("Listening on port:", PORT));