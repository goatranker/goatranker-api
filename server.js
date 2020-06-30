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

const Ranker = require('./algorithms/ranker.js')

//////////////////////////
// Globals
//////////////////////////
const whitelist = ['http://localhost:3000']

const corsOptions = (req, callback) => {
  let corsOptions;
  if (whitelist.indexOf(req.header('Origin')) !== -1) {
    corsOptions = { origin: true } // reflect (enable) the requested origin in the CORS response
  } else {
    corsOptions = { origin: false } // disable CORS for this request
  }
  callback(null, corsOptions) // callback expects two parameters: error and options
}
//////////////////////////
// Database
//////////////////////////

const db = mongoose.connection
const MONGODB_URI =
    process.env.MONGODB_URL || 'mongodb://localhost:27017/goatrankerfinal2';

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

/// Controllers
const usersController = require('./controllers/usersController.js')

//////////////////////////
// Models
//////////////////////////

const Artist = require("./models/artistSchema.js");
const Category = require("./models/categorySchema.js");

//////////////////////////
// Middleware
//////////////////////////

app.use(cors(corsOptions)) // cors middlewear, configured by 
app.use(express.json())
app.use(express.static('build'))

app.use('/users', usersController)
//////////////////////////
// Sessions
//////////////////////////


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
setInterval(authTheApp, 1200000)

// All controllers go here

// End controllers

app.get('/', (req, res) => {
  res.send('hello Goat')
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
    res.status(400)
  }  
});

// get votes for category
app.get('/categories/:genre', async (req, res) => {
  try {
    const findCat = await Category.findOne({name: req.params.genre})
    console.log(findCat);
    res.status(200).json(findCat)
  } catch (error) {
    res.status(400).json(error)
  }
})


// votes for the category
app.post("/categories/:genre", async (req, res) => {
  try {
    let firstVote = null;
    console.log(req.body);
    // needs to check if the category is made yet
    const catCheck = await Category.findOne({name: req.body.name},
      (err, foundCategory) => {
        if (err) {
          console.log(err);
        } else {
          firstVote = foundCategory
          console.log('found category', foundCategory);
          console.log('firstVote', firstVote);
        }
      })  
    // if category is made, add the vote, else create category
    const vote = await firstVote?

      Category.findByIdAndUpdate({_id: firstVote._id}, {
        $push: {
          userVotes: {$each: [
            {
              artistId: req.body.artistId,
               user_id: req.body.user_id,
               artistName: req.body.artistName
              }
          ]}
        }
      }, (err, addedVote) => {
        if (err){
          console.log(err);
        } else {
          console.log('added vote', addedVote);
          res.status(200).json({
            newVote: addedVote,
            voteStats: addedVote.userVotes.length
          })
        }
      })
      : 
      Category.create({
        name: req.body.name,
        userVotes: {
          artistId: req.body.artistId,
          user_id: req.body.user_id,
          artistName: req.body.artistName
        },
      },(err, createdCategory) => {
        if (err) {
          console.log(err);
        } else {
          console.log(createdCategory);
          res.status(200).json({
            firstVote: createdCategory,
            voteStats: createdCategory.userVotes.length
          })
      }
     });
  } catch (error) {
    console.log(error);
    res.status(400).json(error)
  }
});


//////////////////////////
// Listener
//////////////////////////
app.listen(PORT, () => console.log("Listening on port:", PORT));