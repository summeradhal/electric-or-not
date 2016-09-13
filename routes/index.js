var express = require('express');
var router = express.Router();

// 1. Connect to MongoDB.
var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient;
// console.log(mongoClient);
var mongoUrl = 'mongodb://localhost:27017/electric'
var db; //Global so all of our routes have access to the db connection

mongoClient.connect(mongoUrl, function(error, database){
	if(error){
		console.log(error); //Print out the error because there is one
	}else{
		db = database; //Set the database object that was passed back to our callback, to our global db.
		console.log("Connected to Mongo successfully.");
	}
});

/* GET home page. */

// General Steps for the app
// Get all the pictures into MongoDB
//////////Done via the terminal
// Get all the pictures from the MongoDB
// Get the current user from Mongo
// Find out what pictures the current user has voted on
// Load those pictures into an array
// Pick a random one
// Send the random one to EJS via a res.render('index', {picsArray})

router.get('/', function(req, res, next) {
	// console.dir(next);

	var userIP = req.ip;
	// 5. Find all the photos the user has voted on and load an array up with them.
	db.collection('votes').find({ip:userIP}).toArray(function(error, userResult){
		var photosVoted = [];
		if(error){
			console.log("There was an error fetching user votes.");
		}else{
			// console.log(userResult);
			for(var i=0; i<userResult.length; i++){
				photosVoted.push(userResult[i].image);
			}
		}

		// 2. Get picts from Mongo and store them in an array to pass to view.
		// 6. Limit the query to photos not voted on
		db.collection('images').find({imgSrc: { $nin: photosVoted } }).toArray(function(error, photos){
			if (photos.length === 0){
				// res.send("You have voted on all images.");
				res.redirect('/standings')
			}else{
				// 3. Grab a random image from that array
				var randomNum = Math.floor(Math.random() * photos.length);
				var randomPhoto = photos[randomNum].imgSrc;
				// 4. Send that image to the view
				res.render('index', { imageToRender: randomPhoto });
			}
		});
	});
});

router.post('/electric', function(req, res, next){
	// res.json(req.body);
	// 1. We know whether they voted electric or poser because it's in req.body.submit
	// 2. We know what image they voted on because it's in req.body.image	
	// 3. We know who they are because we have their IP address.

if(req.body.submit == 'Electric!'){
	var upDownVote = 1;
}else if(req.body.submit == 'Poser'){
	var upDownVote = -1;
}

	db.collection('votes').insertOne({
		ip: req.ip,
		vote: req.body.submit,
		image: req.body.image
	});

	// 7. Update the images collection so that the image voted on will have a new totalVotes
	db.collection('images').find({imgSrc: req.body.image}).toArray(function(error,result){
		var total;
		if(isNaN(result[0].totalVotes)){
			total = 0;
		}else{
			total = result[0].totalVotes;
		}

		db.collection('images').updateOne(
			{ imgSrc: req.body.image},
			{ 
				$set: {"totalVotes": (total + upDownVote)}
			}, function(error, results){
				//Check to see if there is an error
				//Check to see if the docuemtn was updated
			}
		)
	})

	// res.json("success");
	res.redirect('/');

});

router.get('/standings', function(req, res, next){
	db.collection('images').find().toArray(function(error, allResults){
		var standingsArray = [];
		allResults.sort(function(a,b){
			return (b.totalVotes - a.totalVotes);
		});
		res.render('standings', {theStandings: allResults});
	});
})

router.post('/resetUserVotes', (req, res, next) =>{
	db.collection('votes').deleteMany(
		{ip:req.ip},
		function(error, results){

		}
	);
	res.redirect('/');
});

module.exports = router;