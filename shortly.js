var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var bcrypt = require('bcrypt-nodejs');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
app.use(cookieParser());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.get('/login', function(req,res) {
  res.render('login');
});

app.get('/*', function(req, res, next) {
  if (req.cookies.username) {
    next();
  } else {
    res.redirect(301,'/login');
    // res.render('login');
      }
});

app.get('/', 
function(req, res) {
  if (req.cookies.username) {
    res.render('index');
  } else {
    res.render('login');
  }
});

app.get('/create', 
function(req, res) {

  res.render('index');
});


app.get('/signup', function (req, res) {
  res.render('signup');
});

app.get('/links', 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.get('/users', function(req,res) {
  Users.reset().fetch().then(function(users) {
    res.req.path = '/users';
    res.send(200, users.models);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});



/************************************************************/
// Write your authentication routes here
/************************************************************/
app.post('/signup', function(req, res) {
  new User({username: req.body.username}).fetch().then(function(found) {

    if (found) {
      res.send(200, 'Username taken');
    } else {
      console.log('Before user is made');
      var user = new User({
        username: req.body.username,
        password: req.body.password
      });

      console.log('When user is being saved');
      user.save().then(function(newUser) {
        Users.add(newUser);
        res.cookie('username', req.body.username);
        res.send(200, newUser);
      });
    }
  })
});

app.post('/login', function(req, res){
  console.log("-------- login post", req.body);
  new User({username: req.body.username}).fetch().then(function(found) {

    if (found) {
      console.log("=========found password", found.get('password'));
      var pass = bcrypt.hashSync(req.body.password ,found.get('salt'));
      var didPass = bcrypt.compareSync(req.body.password, pass);
      console.log('Should pass', didPass);
      console.log(pass);
      res.send(200);
    } else{
      res.send(404);
    }
  });
});


app.post('/*', function(req, res){
  console.log(req.url);
  console.log(req.body);
});


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
